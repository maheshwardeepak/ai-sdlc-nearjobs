# NearJobs Project State

Status: **Production-ready pending green CI** on PR from `feature/nearjobs-deploy`.

## Project

NearJobs is a hyperlocal job marketplace connecting nearby jobseekers and employers.

## Roles

- Jobseeker
- Employer
- Admin

## Stack

- Frontend: React + Vite + TypeScript + Tailwind
- Backend: Spring Boot + Java 17 + Maven
- Database: PostgreSQL (Flyway 10.10.0 migrations)
- Cache: Redis
- Auth: OTP + JWT
- Testing: JUnit (unit + Testcontainers integration) + Playwright (chromium)
- Coverage: JaCoCo 0.8.14
- Test infra: Testcontainers 1.20.6 (docker-java 3.4.1)

## Branch State (2026-05-06)

- Branch: `feature/nearjobs-deploy`
- HEAD: `8954ebe2558c4402c062d04eee324ea4751ee21b`
- Tree: clean
- Last commit: 50 files, +2615 / -13 — contract-fix DTOs, pom.xml, JwtService, JobValidatorTest, `.github/` workflows, `infra/`, `scripts/`, 9 `docs/*.md`, README, CHANGELOG
- Prior commit `c6d62e9`: 5 Playwright specs + 377-line mockApi fixture

## QA Verdict

**PASS** (re-verified independently on 2026-05-06 19:47 IST):

- `mvn -B -DskipTests clean compile` → BUILD SUCCESS, 162 class files
- `mvn -B test` (unit subset) → 40/40 pass, 0 failures, 0 errors, 0 skipped
- Backend integration tests deferred to CI (macOS Docker Desktop 29 socket-discovery quirk; CI runs `mvn verify` on `ubuntu-latest`)
- Frontend deferred to CI (global rules forbid `npm install`); workflow runs lint + typecheck + vitest + build + Playwright

## Resolved Blockers (this cycle)

| ID | Fix |
|---|---|
| BUILD_BROKEN | `flyway.version=10.10.0` on both flyway-core and flyway-database-postgresql |
| JWT_BASE64_DECODE | `JwtService.java:110` catches `RuntimeException` (covers jjwt DecodingException + JDK IllegalArgumentException) |
| JOB_VALIDATOR_TEST_COMPILE | `new GeoPoint(0.0, 0.0)` at lines 47/61/85 |
| JACOCO_JAVA25_INCOMPAT | `jacoco.version=0.8.14` |
| TESTCONTAINERS_DOCKER29_INCOMPAT | `testcontainers.version=1.20.6` |
| UNCOMMITTED_CHANGES | All persisted in commit `8954ebe` |

## CI Workflows

- `backend-ci.yml` — JDK 17, `mvn verify`, JaCoCo + Surefire upload
- `frontend-ci.yml` — lint → typecheck → vitest → build → Playwright (chromium)
- `security.yml`
- `deploy-staging.yml`
- `deploy-prod.yml`

## Open Bugs

None. No TODO/FIXME/`UnsupportedOperationException` in `backend/src/main` or `frontend/src`. All `return null` occurrences are legitimate null-guards.

## Current Goal

Open PR from `feature/nearjobs-deploy` → `main`; gate merge on green backend-ci + frontend-ci + security.

## Next Task

Push branch, open PR, wait for CI, then wire merge-agent + delivery-agent + approval protocol; begin OTP/auth feature work post-merge.

## Dev-host Quirk (documented, not a defect)

macOS Docker Desktop 29 needs `~/.testcontainers.properties` pointing at `docker.raw.sock` for local integration tests. CI on `ubuntu-latest` is unaffected.
