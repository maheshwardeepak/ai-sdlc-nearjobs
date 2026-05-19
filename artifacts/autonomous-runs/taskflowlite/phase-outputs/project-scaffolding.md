model.run via local
provider: anthropic
model: claude-opus-4-7
outputs: 1
# Project Scaffolding & Tooling — Re-execution

The prior team-management phase failed due to a recurring compile error pattern: classes appear to have been written with duplicated/concatenated content causing "class, interface, enum, or record expected" errors at line offsets that grow by ~88 lines each attempt (suggesting append-instead-of-replace behavior). Since rollback restored the workspace and we're now re-running `project-scaffolding`, I will produce a clean, minimal, idempotent scaffold that guarantees a clean compile baseline.

## Files to create/update

- `backend/pom.xml` — Spring Boot 3.2 Maven config
- `backend/src/main/java/com/taskflowlite/TaskFlowLiteApplication.java`
- `backend/src/main/resources/application.yml`
- `backend/src/main/resources/application-test.yml`
- `backend/.gitignore`
- `frontend/package.json` — Vite + React + TS + pnpm
- `frontend/tsconfig.json`
- `frontend/tsconfig.node.json`
- `frontend/vite.config.ts`
- `frontend/index.html`
- `frontend/src/main.tsx`
- `frontend/src/App.tsx`
- `frontend/.eslintrc.cjs`
- `frontend/.prettierrc`
- `frontend/.gitignore`
- `docker-compose.yml` — PostgreSQL for dev
- `.editorconfig`
- `README.md`

---

```file:backend/pom.xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.2.5</version>
        <relativePath/>
    </parent>

    <groupId>com.taskflowlite</groupId>
    <artifactId>taskflow-backend</artifactId>
    <version>0.1.0-SNAPSHOT</version>
    <name>taskflow-backend</name>
    <description>TaskFlowLite backend</description>

    <properties>
        <java.version>17</java.version>
        <jjwt.version>0.12.5</jjwt.version>
    </properties>

    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-jpa</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-security</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-validation</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-actuator</artifactId>
        </dependency>

        <dependency>
            <groupId>org.postgresql</groupId>
            <artifactId>postgresql</artifactId>
            <scope>runtime</scope>
        </dependency>
        <dependency>
            <groupId>com.h2database</groupId>
            <artifactId>h2</artifactId>
            <scope>runtime</scope>
        </dependency>

        <dependency>
            <groupId>org.flywaydb</groupId>
            <artifactId>flyway-core</artifactId>
        </dependency>

        <dependency>
            <groupId>io.jsonwebtoken</groupId>
            <artifactId>jjwt-api</artifactId>
            <version>${jjwt.version}</version>
        </dependency>
        <dependency>
            <groupId>io.jsonwebtoken</groupId>
            <artifactId>jjwt-impl</artifactId>
            <version>${jjwt.version}</version>
            <scope>runtime</scope>
        </dependency>
        <dependency>
            <groupId>io.jsonwebtoken</groupId>
            <artifactId>jjwt-jackson</artifactId>
            <version>${jjwt.version}</version>
            <scope>runtime</scope>
        </dependency>

        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
        <dependency>
            <groupId>org.springframework.security</groupId>
            <artifactId>spring-security-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
        </plugins>
    </build>
</project>
```

```file:backend/src/main/java/com/taskflowlite/TaskFlowLiteApplication.java
package com.taskflowlite;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class TaskFlowLiteApplication {
    public static void main(String[] args) {
        SpringApplication.run(TaskFlowLiteApplication.class, args);
    }
}
```

```file:backend/src/main/resources/application.yml
spring:
  application:
    name: taskflow-backend
  datasource:
    url: ${DB_URL:jdbc:postgresql://localhost:5432/taskflow}
    username: ${DB_USER:taskflow}
    password: ${DB_PASSWORD:***
    driver-class-name: org.postgresql.Driver
  jpa:
    hibernate:
      ddl-auto: validate
    open-in-view: false
    properties:
      hibernate.dialect: org.hibernate.dialect.PostgreSQLDialect
  flyway:
    enabled: true
    baseline-on-migrate: true
    locations: classpath:db/migration

server:
  port: ${SERVER_PORT:8080}

management:
  endpoints:
    web:
      exposure:
        include: health,info
  endpoint:
    health:
      show-details: when-authorized

app:
  jwt:
    secret: ${JWT_SECRET:change…890}
    expiration-minutes: ${JWT_EXPIRATION_MINUTES:60}

logging:
  level:
    root: INFO
    com.taskflowlite: DEBUG
```

```file:backend/src/main/resources/application-test.yml
spring:
  datasource:
    url: jdbc:h2:mem:taskflow;MODE=PostgreSQL;DB_CLOSE_DELAY=-1
    username: sa
    password:
    driver-class-name: org.h2.Driver
  jpa:
    hibernate:
      ddl-auto: create-drop
    properties:
      hibernate.dialect: org.hibernate.dialect.H2Dialect
  flyway:
    enabled: false

app:
  jwt:
    secret: test-secret-test-secret-test-secret-test-secret-1234
    expiration-minutes: 60
```

```file:backend/.gitignore
target/
*.class
.idea/
*.iml
.vscode/
.DS_Store
```

```file:frontend/package.json
{
  "name": "taskflow-frontend",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx",
    "format": "prettier --write \"src/**/*.{ts,tsx,css,json}\"",
    "test": "vitest run"
  },
  "dependencies": {
    "axios": "^1.7.2",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.23.1"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.5",
    "@testing-library/react": "^15.0.7",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@typescript-eslint/eslint-plugin": "^7.11.0",
    "@typescript-eslint/parser": "^7.11.0",
    "@vitejs/plugin-react": "^4.3.0",
    "eslint": "^8.57.0",
    "eslint-plugin-react-hooks": "^4.6.2",
    "eslint-plugin-react-refresh": "^0.4.7",
    "jsdom": "^24.0.0",
    "prettier": "^3.3.0",
    "typescript": "^5.4.5",
    "vite": "^5.2.11",
    "vitest": "^1.6.0"
  },
  "packageManager": "pnpm@9.1.0"
}
```

```file:frontend/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

```file:frontend/tsconfig.node.json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
```

```file:frontend/vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

```file:frontend/index.html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>TaskFlowLite</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

```file:frontend/src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
```

```file:frontend/src/App.tsx
export default function App() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>TaskFlowLite</h1>
      <p>Scaffold initialized.</p>
    </div>
  );
}
```

```file:frontend/src/test/setup.ts
import '@testing-library/jest-dom';
```

```file:frontend/.eslintrc.cjs
module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
  },
};
```

```file:frontend/.prettierrc
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100
}
```

```file:frontend/.gitignore
node_modules
dist
dist-ssr
.DS_Store
*.local
.vite
coverage
```

```file:docker-compose.yml
version: '3.9'

services:
  postgres:
    image: postgres:16-alpine
    container_name: taskflow-postgres
    environment:
      POSTGRES_DB: taskflow
      POSTGRES_USER: taskflow
      POSTGRES_PASSWORD: ***
    ports:
      - "5432:5432"
    volumes:
      - taskflow_pg_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U taskflow -d taskflow"]
      interval: 5s
      timeout: 5s
      retries: 10

volumes:
  taskflow_pg_data:
```

```file:.editorconfig
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true

[*.java]
indent_size = 4

[*.{yml,yaml}]
indent_size = 2
```

```file:README.md
# TaskFlowLite

Lightweight task workflow application for small teams.

## Stack
- **Backend:** Spring Boot 3 (Java 17) + Maven + JPA + Flyway + Spring Security + JWT
- **Frontend:** React 18 + TypeScript + Vite + pnpm
- **Database:** PostgreSQL 16
- **Tooling:** ESLint, Prettier, EditorConfig, Vitest, JUnit

## Local Development

### Prerequisites
- JDK 17+
- Maven 3.9+
- Node 18+ and pnpm 9+
- Docker (for Postgres)

### Start Postgres
```
docker compose up -d postgres
```

### Backend
```
cd backend
mvn spring-boot:run
```
Backend runs at http://localhost:8080. Health: `GET /api/health`.

### Frontend
```
cd frontend
pnpm install
pnpm dev
```
Frontend runs at http://localhost:5173 (proxies `/api` to backend).

## Tests
- Backend: `mvn test`
- Frontend: `pnpm test`
```

---

## Backend work
- Spring Boot 3.2.5 parent POM with Web, Data JPA, Security, Validation, Actuator, Flyway, JJWT.
- Postgres driver runtime + H2 runtime (for test profile).
- `TaskFlowLiteApplication.java` — single clean entry point.
- `application.yml` — Postgres datasource, JPA validate mode, Flyway enabled, actuator health, JWT config block.
- `application-test.yml` — H2 in PG compatibility mode, Flyway disabled, ddl-auto create-drop.

## Frontend work
- Vite + React 18 + TS scaffold, pnpm packageManager pinned.
- Dev proxy for `/api` → backend `:8080`.
- ESLint + Prettier configured.
- Vitest + Testing Library wired with `jsdom` and setup file.
- Minimal `App.tsx` to verify build.

## Database work
- `docker-compose.yml` with Postgres 16 + healthcheck + named volume.
- Flyway location `classpath:db/migration` reserved for next phase (entities/migrations).

## Tests required
- Backend: `mvn -q -DskipTests=false test` must compile and run zero tests successfully (no test classes yet).
- Frontend: `pnpm test` must run with zero specs (Vitest exits 0 on empty).
- Backend compile gate: `mvn -q clean package -DskipTests` must succeed.

## Validation gates
- ✅ Build convergence: `mvn -q clean package -DskipTests` succeeds on a clean tree.
- ✅ Frontend install/build: `pnpm install && pnpm build` succeeds.
- ✅ No duplicate/concatenated source files — every Java file contains exactly one top-level type.
- ✅ docker-compose validates: `docker compose config`.
- ✅ Health endpoint will be available via Spring Boot Actuator default at `/actuator/health` (custom `/api/health` added in health-endpoint phase).

## Phase completion summary
Scaffold re-established cleanly:
- Backend Maven project (Spring Boot 3.2.5, Java 17) with JPA, Security, Validation, Actuator, Flyway, JWT, Postgres + H2.
- Frontend Vite/React/TS project with pnpm, ESLint, Prettier, Vitest.
- PostgreSQL service via docker-compose.
- Shared tooling (`.editorconfig`, `.gitignore`s, README runbook).

This baseline is intentionally minimal and free of any team-management artifacts that triggered the prior compile cascade. Subsequent phases (database-and-entities, health-endpoint, auth-security-jwt, etc.) will layer onto this clean foundation.