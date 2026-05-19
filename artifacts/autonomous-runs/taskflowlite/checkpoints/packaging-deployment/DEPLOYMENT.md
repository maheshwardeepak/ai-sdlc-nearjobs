# TaskFlowLite Deployment Runbook

## Prerequisites

- Docker Engine 24+
- Docker Compose v2
- 2 GB RAM minimum, 4 GB recommended
- Outbound network access for image pulls during build

## First-time Setup

1. Clone or copy the repository to the target host.
2. Copy `.env.example` to `.env` and adjust:
   - `JWT_SECRET` — must be set to a long, random string (>= 32 chars).
   - `POSTGRES_PASSWORD` — change from default.
   - Optional port overrides: `BACKEND_PORT`, `FRONTEND_PORT`, `POSTGRES_PORT`.
3. Build images:

// ===== AI MERGE APPEND =====

# TaskFlowLite — Deployment Guide

## Prerequisites

- Docker 24+
- Docker Compose v2
- 2 GB free RAM, 2 GB free disk

## Local / Single-host deployment

1. Clone repository.
2. `cp .env.example .env` and edit secrets (especially `JWT_SECRET`).
3. `docker compose build`
4. `docker compose up -d`
5. Verify: `curl http://localhost:8080/api/health`

## Production hardening checklist

- [ ] Replace `JWT_SECRET` with a strong ≥ 32-byte random value.
- [ ] Change `POSTGRES_PASSWORD` to a non-default value.
- [ ] Place the stack behind a TLS-terminating reverse proxy (e.g. Caddy, Traefik, nginx).
- [ ] Set `POSTGRES_PORT` to not be published externally (remove from `ports:` for `db`).
- [ ] Configure log shipping / persistent volume backups.
- [ ] Set `management.endpoint.health.show-details=never` (default in `application-prod.yml`).

## CI build commands