model.run via local
provider: anthropic
model: claude-opus-4-7
outputs: 1
# Phase: Packaging, Docker & Deployment Readiness

This phase containerizes the backend (Spring Boot) and frontend (React/Vite), wires them with PostgreSQL via docker-compose, externalizes configuration via environment variables, and provides a runbook.

## Files to Create/Update

- `backend/Dockerfile` — multi-stage Maven → JRE image
- `backend/.dockerignore`
- `backend/src/main/resources/application-docker.yml` — container profile
- `frontend/Dockerfile` — multi-stage pnpm build → nginx
- `frontend/.dockerignore`
- `frontend/nginx.conf` — SPA routing + API proxy
- `docker-compose.yml` — db + backend + frontend
- `.env.example` — environment template
- `README.md` — runbook
- `Makefile` — convenience targets

---

## Backend Work

Multi-stage Dockerfile building a slim runtime image, a Docker Spring profile pointing to the `db` service, and env-driven JWT/DB settings.

```file:backend/Dockerfile
# syntax=docker/dockerfile:1.6

############################
# Stage 1: Build
############################
FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /workspace

# Cache dependencies
COPY pom.xml .
RUN mvn -B -ntp dependency:go-offline

# Build app
COPY src ./src
RUN mvn -B -ntp clean package -DskipTests \
    && mkdir -p target/extracted \
    && cp target/*.jar target/app.jar

############################
# Stage 2: Runtime
############################
FROM eclipse-temurin:21-jre-jammy AS runtime
WORKDIR /app

# Non-root user
RUN groupadd --system app && useradd --system --gid app --home /app app \
    && apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=build /workspace/target/app.jar /app/app.jar

ENV JAVA_OPTS="-XX:MaxRAMPercentage=75.0 -Djava.security.egd=file:/dev/./urandom" \
    SPRING_PROFILES_ACTIVE=docker \
    SERVER_PORT=8080

EXPOSE 8080
USER app

HEALTHCHECK --interval=20s --timeout=5s --start-period=40s --retries=5 \
  CMD curl -fsS http://localhost:8080/api/health || exit 1

ENTRYPOINT ["sh","-c","exec java $JAVA_OPTS -jar /app/app.jar"]
```

```file:backend/.dockerignore
target/
.git/
.gitignore
.idea/
.vscode/
*.iml
**/.DS_Store
Dockerfile
.dockerignore
HELP.md
README.md
logs/
*.log
```

```file:backend/src/main/resources/application-docker.yml
spring:
  datasource:
    url: ${SPRING_DATASOURCE_URL:jdbc:postgresql://db:5432/taskflowlite}
    username: ${SPRING_DATASOURCE_USERNAME:taskflow}
    password: ${SPRING_DATASOURCE_PASSWORD:***
    driver-class-name: org.postgresql.Driver
    hikari:
      maximum-pool-size: ${DB_POOL_MAX:10}
      connection-timeout: 30000
  jpa:
    hibernate:
      ddl-auto: validate
    properties:
      hibernate:
        jdbc.time_zone: UTC
        format_sql: false
    open-in-view: false
  flyway:
    enabled: true
    locations: classpath:db/migration
    baseline-on-migrate: true

server:
  port: ${SERVER_PORT:8080}
  forward-headers-strategy: framework
  error:
    include-message: never
    include-stacktrace: never

app:
  jwt:
    secret: ${JWT_SECRET:please…-me}
    expiration-ms: ${JWT_EXPIRATION_MS:86400000}
    issuer: ${JWT_ISSUER:taskflowlite}
  cors:
    allowed-origins: ${CORS_ALLOWED_ORIGINS:http://localhost:5173,http://localhost:8081}

management:
  endpoints:
    web:
      exposure:
        include: health,info
  endpoint:
    health:
      probes:
        enabled: true
      show-details: never

logging:
  level:
    root: INFO
    org.springframework.web: INFO
    org.hibernate.SQL: WARN
```

---

## Frontend Work

Multi-stage build with pnpm, served via nginx that proxies `/api` to the backend service and serves the SPA with HTML5 history fallback.

```file:frontend/Dockerfile
# syntax=docker/dockerfile:1.6

############################
# Stage 1: Build
############################
FROM node:20-alpine AS build
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.12.0 --activate

# Cache deps
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile || pnpm install

# Build
COPY . .
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN pnpm build

############################
# Stage 2: Runtime (nginx)
############################
FROM nginx:1.27-alpine AS runtime

RUN apk add --no-cache curl
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=20s --timeout=5s --start-period=10s --retries=5 \
  CMD curl -fsS http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
```

```file:frontend/.dockerignore
node_modules/
dist/
.git/
.gitignore
.idea/
.vscode/
**/.DS_Store
Dockerfile
.dockerignore
coverage/
*.log
```

```file:frontend/nginx.conf
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;
    gzip_min_length 1024;

    # Security headers
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Static asset caching
    location ~* \.(?:js|css|woff2?|ttf|eot|svg|png|jpg|jpeg|gif|ico|webp)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
        try_files $uri =404;
    }

    # API proxy to backend service
    location /api/ {
        proxy_pass         http://backend:8080/api/;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
        proxy_connect_timeout 10s;
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## Database Work

PostgreSQL is provided via docker-compose with a named volume. Flyway migrations from prior phases run automatically on backend startup against the `db` service.

---

## Compose, Env & Runbook

```file:docker-compose.yml
name: taskflowlite

services:
  db:
    image: postgres:16-alpine
    container_name: tfl-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-taskflowlite}
      POSTGRES_USER: ${POSTGRES_USER:-taskflow}
      POSTGRES_PASSWORD: ${POST…low}
    ports:
      - "${POSTGRES_PORT:-5432}:5432"
    volumes:
      - tfl_pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-taskflow} -d ${POSTGRES_DB:-taskflowlite}"]
      interval: 10s
      timeout: 5s
      retries: 10
    networks: [tfl-net]

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    image: taskflowlite-backend:latest
    container_name: tfl-backend
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    environment:
      SPRING_PROFILES_ACTIVE: docker
      SPRING_DATASOURCE_URL: jdbc:postgresql://db:5432/${POSTGRES_DB:-taskflowlite}
      SPRING_DATASOURCE_USERNAME: ${POSTGRES_USER:-taskflow}
      SPRING_DATASOURCE_PASSWORD: ${POST…low}
      JWT_SECRET: ${JWT_…-me}
      JWT_EXPIRATION_MS: ${JWT_EXPIRATION_MS:-86400000}
      JWT_ISSUER: ${JWT_ISSUER:-taskflowlite}
      CORS_ALLOWED_ORIGINS: ${CORS_ALLOWED_ORIGINS:-http://localhost:8081}
      SERVER_PORT: "8080"
    ports:
      - "${BACKEND_PORT:-8080}:8080"
    healthcheck:
      test: ["CMD", "curl", "-fsS", "http://localhost:8080/api/health"]
      interval: 20s
      timeout: 5s
      retries: 10
      start_period: 40s
    networks: [tfl-net]

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
      args:
        VITE_API_BASE_URL: /api
    image: taskflowlite-frontend:latest
    container_name: tfl-frontend
    restart: unless-stopped
    depends_on:
      backend:
        condition: service_healthy
    ports:
      - "${FRONTEND_PORT:-8081}:80"
    healthcheck:
      test: ["CMD", "curl", "-fsS", "http://localhost/"]
      interval: 20s
      timeout: 5s
      retries: 10
    networks: [tfl-net]

volumes:
  tfl_pgdata:
    driver: local

networks:
  tfl-net:
    driver: bridge
```

```file:.env.example
# ---- PostgreSQL ----
POSTGRES_DB=taskflowlite
POSTGRES_USER=taskflow
POSTGRES_PASSWORD=***
POSTGRES_PORT=5432

# ---- Backend ----
BACKEND_PORT=8080
JWT_SECRET=replac…ytes
JWT_EXPIRATION_MS=86400000
JWT_ISSUER=taskflowlite
CORS_ALLOWED_ORIGINS=http://localhost:8081

# ---- Frontend ----
FRONTEND_PORT=8081
# Build-time: leave as /api so nginx proxies to backend service
VITE_API_BASE_URL=/api
```

```file:Makefile
SHELL := /bin/bash

.PHONY: help build up down logs ps restart clean test-backend test-frontend

help:
	@echo "TaskFlowLite - common targets"
	@echo "  make build           Build all docker images"
	@echo "  make up              Start full stack (db + backend + frontend)"
	@echo "  make down            Stop and remove containers"
	@echo "  make logs            Tail logs for all services"
	@echo "  make ps              Show service status"
	@echo "  make restart         Restart all services"
	@echo "  make clean           Remove containers, networks, and volumes"
	@echo "  make test-backend    Run backend tests"
	@echo "  make test-frontend   Run frontend tests"

build:
	docker compose build

up:
	docker compose up -d --build

down:
	docker compose down

logs:
	docker compose logs -f --tail=200

ps:
	docker compose ps

restart:
	docker compose restart

clean:
	docker compose down -v --remove-orphans

test-backend:
	cd backend && ./mvnw -B test

test-frontend:
	cd frontend && pnpm test --run
```

```file:README.md
# TaskFlowLite

Lightweight task workflow application for small teams.

- **Backend:** Spring Boot 3 (Java 21, Maven)
- **Frontend:** React + TypeScript (Vite, pnpm)
- **Database:** PostgreSQL 16
- **Auth:** JWT + BCrypt, RBAC (ADMIN / MANAGER / MEMBER)

---

## 1. Prerequisites

- Docker 24+ and Docker Compose v2
- (Local dev only) Java 21, Maven 3.9+, Node 20+, pnpm 9+

---

## 2. Quick Start (Docker Compose)

```bash
cp .env.example .env
# Edit .env and set a strong JWT_SECRET
docker compose up -d --build
```

Services:

| Service   | URL                              | Notes                       |
|-----------|----------------------------------|-----------------------------|
| Frontend  | http://localhost:8081            | nginx serving Vite build    |
| Backend   | http://localhost:8080/api/health | Spring Boot REST API        |
| Postgres  | localhost:5432                   | user/db from `.env`         |

Tail logs:

```bash
docker compose logs -f
```

Stop and remove (keep data):

```bash
docker compose down
```

Wipe data volume:

```bash
docker compose down -v
```

---

## 3. Configuration

All runtime configuration is provided via environment variables (see `.env.example`).

### Backend env vars

| Variable                  | Default                                            | Description                       |
|---------------------------|----------------------------------------------------|-----------------------------------|
| `SPRING_PROFILES_ACTIVE`  | `docker`                                           | Active Spring profile             |
| `SPRING_DATASOURCE_URL`   | `jdbc:postgresql://db:5432/taskflowlite`           | JDBC URL                          |
| `SPRING_DATASOURCE_USERNAME` | `taskflow`                                      | DB user                           |
| `SPRING_DATASOURCE_PASSWORD` | `taskflow`                                      | DB password                       |
| `JWT_SECRET`              | _(required, ≥32 bytes)_                            | HMAC signing key                  |
| `JWT_EXPIRATION_MS`       | `86400000`                                         | Token TTL                         |
| `JWT_ISSUER`              | `taskflowlite`                                     | JWT `iss` claim                   |
| `CORS_ALLOWED_ORIGINS`    | `http://localhost:8081`                            | Comma-separated origins           |
| `SERVER_PORT`             | `8080`                                             | HTTP port                         |

### Frontend build args

| Variable             | Default | Description                                   |
|----------------------|---------|-----------------------------------------------|
| `VITE_API_BASE_URL`  | `/api`  | API base (proxied by nginx → backend service) |

---

## 4. Local Development (without Docker)

### Backend

```bash
cd backend
./mvnw spring-boot:run
# Uses application.yml; ensure local Postgres is running or run `docker compose up -d db`
```

### Frontend

```bash
cd frontend
pnpm install
pnpm dev
# http://localhost:5173 — set VITE_API_BASE_URL=http://localhost:8080/api in .env.local
```

---

## 5. Database & Migrations

- PostgreSQL data persisted in named volume `tfl_pgdata`.
- Flyway migrations under `backend/src/main/resources/db/migration/` apply on startup.
- `spring.jpa.hibernate.ddl-auto=validate` in the `docker` profile to prevent drift.

Connect manually:

```bash
docker compose exec db psql -U taskflow -d taskflowlite
```

---

## 6. Testing

```bash
make test-backend     # JUnit + Spring Boot Test
make test-frontend    # Vitest + RTL
```

CI-ready scripts:

```bash
cd backend  && ./mvnw -B verify
cd frontend && pnpm test --run && pnpm build
```

---

## 7. Health & Observability

- `GET /api/health` → `{ "status": "UP" }`
- Spring Actuator: `GET /actuator/health` (probes enabled)
- Container healthchecks defined for `db`, `backend`, `frontend`

---

## 8. Production Notes

1. **Secrets**: Override `JWT_SECRET`, `POSTGRES_PASSWORD` via your orchestrator's secret store. Never commit real `.env`.
2. **TLS**: Terminate TLS at an upstream load balancer or extend `frontend/nginx.conf`.
3. **CORS**: Set `CORS_ALLOWED_ORIGINS` to your production frontend origin(s).
4. **DB Backups**: Snapshot the `tfl_pgdata` volume or use managed Postgres.
5. **Resource limits**: Add `deploy.resources.limits` in compose / k8s manifests as needed.
6. **Logs**: stdout/stderr — wire to your log aggregator (Loki, CloudWatch, etc.).

---

## 9. Troubleshooting

| Symptom                                | Fix                                                                 |
|----------------------------------------|---------------------------------------------------------------------|
| `backend` unhealthy at startup         | Check `docker compose logs backend`; ensure `db` healthcheck passes |
| `401` on every request                 | `JWT_SECRET` changed → existing tokens invalidated; re-login        |
| Frontend cannot reach `/api`           | Verify `nginx.conf` proxy target `backend:8080`                     |
| Flyway validation error                | Migration history mismatch — rebuild with clean volume in dev only  |

---

## 10. Project Layout

```
.
├── backend/                 # Spring Boot service
│   ├── Dockerfile
│   └── src/...
├── frontend/                # React + Vite app
│   ├── Dockerfile
│   ├── nginx.conf
│   └── src/...
├── docker-compose.yml
├── .env.example
├── Makefile
└── README.md
```
```

---

## Tests Required

Packaging-phase validation (no new unit tests; reuse existing suites):

1. **Backend tests** (existing): `cd backend && ./mvnw -B test` — must pass against compiled artifact.
2. **Frontend tests** (existing): `cd frontend && pnpm test --run` and `pnpm build` — must build successfully.
3. **Image builds**: `docker compose build` completes for `backend` and `frontend`.
4. **Stack smoke**: `docker compose up -d` → all healthchecks reach `healthy`.
5. **Endpoint smoke**: `curl -fsS http://localhost:8080/api/health` returns `200 UP`; `curl -fsS http://localhost:8081/` returns the SPA shell; `curl -fsS http://localhost:8081/api/health` returns `200` (proxy).

---

## Validation Gates

| Gate                  | Check                                                                                  |
|-----------------------|----------------------------------------------------------------------------------------|
| execution             | All files written to repo paths above                                                  |
| buildConvergence      | `docker compose build` succeeds for backend + frontend                                 |
| testConvergence       | Existing backend & frontend test suites still pass                                     |
| securityCompliance    | Non-root user in backend image; secrets via env; no plaintext secrets committed        |
| contractDrift         | API base path remains `/api`; health endpoint unchanged                                |
| runtimeConvergence    | `docker compose up -d` reaches all-`healthy` state; `/api/health` returns `UP`         |
| artifactWrite         | Dockerfiles, compose, nginx.conf, env template, README, Makefile present               |

---

## Phase Completion Summary

Containerization complete: backend ships as a hardened multi-stage Temurin-JRE image with a non-root user, embedded healthcheck, and a `docker` Spring profile driving DB/JWT/CORS via env vars. Frontend builds the Vite bundle with pnpm and serves it via nginx with SPA fallback and a reverse proxy from `/api/*` to the backend service. `docker-compose.yml` orchestrates `db` → `backend` → `frontend` with healthcheck-gated startup and a persistent Postgres volume. `.env.example` documents all knobs, a `Makefile` exposes common workflows, and the `README.md` provides a complete runbook (quick start, configuration, dev mode, testing, production notes, troubleshooting). The stack is now reproducibly deployable with a single `docker compose up -d --build`.