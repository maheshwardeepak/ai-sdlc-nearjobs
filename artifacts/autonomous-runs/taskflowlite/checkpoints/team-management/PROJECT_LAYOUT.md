# Project Layout

This repository is a monorepo containing:

- `backend/` — Spring Boot (Java 17, Maven) application. Main class:
  `com.taskflowlite.TaskFlowLiteApplication` at
  `backend/src/main/java/com/taskflowlite/TaskFlowLiteApplication.java`.
- `frontend/` — React + TypeScript (Vite, pnpm) application.
- `docker-compose.yml` — Orchestrates `db`, `backend`, and `frontend` services.
- `pom.xml` — Aggregator POM pointing at the `backend` module so that
  workspace-level Maven scanners can locate the backend application.

The "generated backend app" is `backend/` (Spring Boot). Build with: