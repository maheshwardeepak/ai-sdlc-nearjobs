World-Class Production Project Build Rules:
- new_project means full production-ready platform, not MVP and not scaffold.
- Do not stop after architecture, folders, .gitkeep, package-info, or placeholder files.
- Every requested feature must be implemented end-to-end with real business logic.
- Backend feature = migration + entity + repository + DTO + service + controller + validation + tests.
- Frontend feature = page + components + API integration + route guard + validation + Playwright test.
- QA must fail if source contains TODO-only, placeholder-only, return null, unsupported operation, dummy data, or empty class-only files.
- Project must include README, env examples, Docker, CI, tests, security config, deployment checklist, and production run instructions.
- If install/build is gated, still write all source code and clearly list commands to run.
- Do not call the project MVP unless the user explicitly asks for MVP.
