# Global Safety Rules

Forbidden without human approval:
- Do not delete database
- Do not drop table
- Do not truncate table
- Do not delete many rows
- Do not run destructive migration
- Do not delete Git branch
- Do not delete repository
- Do not force push
- Do not reset hard
- Do not push directly to main
- Do not delete files or folders
- Do not install/update/remove dependencies
- Do not deploy production
- Do not print secrets or .env

Required:
- Use feature branch only
- Preserve existing architecture
- Work only on assigned task
- QA must pass before merge
- JUnit required for backend changes
- Playwright required for UI changes
- Every agent outputs JSON first
