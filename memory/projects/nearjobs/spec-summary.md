# NearJobs - Spec Summary

**Generated:** 2026-05-06 by prompt-agent
**Worker:** nearjobs-worker
**Spec file:** `/Users/nanofactory/ai-sdlc-factory/projects/nearjobs/SPEC.json`

## What it is

Production-ready, location-aware job marketplace. Not MVP. Not scaffold.

## Stack

- **Backend:** Spring Boot 3.2 (Java 17), Maven, JPA, Flyway, Spring Security, JWT, Spring WebSocket
- **DB:** PostgreSQL 16 + PostGIS (geospatial), Redis 7 (OTP, cache, rate limiting)
- **Frontend:** React 18 + Vite + TypeScript, Redux Toolkit + RTK Query, Tailwind, Leaflet maps, react-i18next
- **Auth:** OTP-first (SMS via Twilio, email via SMTP) + JWT (15m access / 30d refresh, rotation), password fallback
- **Roles:** JOBSEEKER, EMPLOYER, ADMIN
- **Infra:** Docker, docker-compose, Kubernetes manifests + Helm, Nginx, MinIO/S3, Prometheus/Grafana/Loki/Sentry
- **CI/CD:** GitHub Actions (backend CI, frontend CI, security scans, staging+prod deploy)

## Key features

- Geospatial nearby job discovery (PostGIS ST_DWithin + ST_Distance, ranking by distance + skills + recency)
- Job posting with map picker, full lifecycle (DRAFT → PENDING_REVIEW → ACTIVE → CLOSED)
- Application pipeline (SUBMITTED → VIEWED → SHORTLISTED → INTERVIEW → HIRED/REJECTED) with audit
- Real-time notifications via WebSocket/STOMP, plus email + SMS channels
- Admin moderation: job approval queue, employer KYC verification, reports inbox, analytics dashboard
- Saved jobs, recommendations (daily scheduled job), full-text search (tsvector)

## Testing

- Backend: JUnit 5 + Mockito + Testcontainers (PG+PostGIS, Redis), ≥80% coverage, JaCoCo gate
- Frontend: Vitest + RTL + Playwright E2E, ≥75% coverage
- CI gates: lint + unit + integration + E2E + Trivy + OWASP dep-check + gitleaks + CodeQL

## Domain entities

User, JobseekerProfile, EmployerProfile, Job, Application, Notification, OtpToken, RefreshToken, SavedJob, Report, AuditLog

## Compliance / NFR

- GDPR/DPDP: data export, soft-delete with PII anonymization
- 99.9% SLO, RTO 1h, RPO 15m
- WCAG 2.1 AA, i18n (en + hi)
- Performance: p95 search <300ms, p95 API <200ms, 500 RPS, 5000 concurrent users

## Handoff

Worker `nearjobs-worker` should implement on a feature branch (no direct main pushes), output JSON status first, and meet QA gates before merge.
