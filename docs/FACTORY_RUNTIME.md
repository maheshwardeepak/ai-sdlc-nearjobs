# AI SDLC Factory Runtime

## Current Runtime Status

The factory runtime is operational.

Verified capabilities:

- Factory CLI
- Human approval flow
- Workspace creation
- Agent clone creation
- Project-scoped clone execution
- Parallel OpenClaw execution
- DAG execution
- Delivery gating
- Incremental verification
- Dependency impact graph
- Infrastructure preflight
- Artifact validation
- Merge safety engine
- Rollback snapshots
- GitHub Actions CI

## Main Verification Commands

```bash
pnpm exec tsc -p orchestrator/tsconfig.json --noEmit
pnpm exec tsx orchestrator/src/factoryCli.ts verify-incremental
pnpm exec tsx orchestrator/src/factoryCli.ts autonomous-health-gate
pnpm exec tsx orchestrator/src/factoryCli.ts dashboard
```

## Factory Execution Flow

```bash
pnpm exec tsx orchestrator/src/factoryCli.ts init
pnpm exec tsx orchestrator/src/factoryCli.ts request-approval
pnpm exec tsx orchestrator/src/factoryCli.ts approve
pnpm exec tsx orchestrator/src/factoryCli.ts create-workspace "ProjectName"
pnpm exec tsx orchestrator/src/factoryCli.ts create-clones "ProjectName"
pnpm exec tsx orchestrator/src/factoryCli.ts execute-clones "ProjectName"
pnpm exec tsx orchestrator/src/factoryCli.ts run-approved
pnpm exec tsx orchestrator/src/factoryCli.ts state
```

## Runtime Isolation Rule

Runtime execution state must stay out of git.
