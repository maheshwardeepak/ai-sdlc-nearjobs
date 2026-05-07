# World-Class Autonomous Project Factory Rules

new_project means complete production-ready platform.

Required output for every new project:
- isolated workspace under projects/<slug>
- isolated memory under memory/projects/<slug>
- isolated run artifacts under artifacts/runs/<slug>
- dedicated worker agent <slug>-worker
- real backend business logic
- real frontend UI and API integration
- real database migrations
- tests
- Docker/dev setup
- CI pipeline
- deployment instructions
- README and docs
- QA report
- delivery report

Forbidden:
- scaffold-only output
- empty class-only files
- .gitkeep-only features
- package-info-only backend
- placeholder methods
- dummy data as final behavior
- return null
- UnsupportedOperationException
- "not implemented"
- calling production project MVP unless user says MVP

Backend feature definition:
migration + entity + repository + DTO + service + controller + validation + tests

Frontend feature definition:
route + page + component + API client + form validation + state + Playwright test

QA must fail if requested business logic is missing.
