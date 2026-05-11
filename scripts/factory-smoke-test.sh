#!/usr/bin/env bash
set -euo pipefail

PROJECT_NAME="${1:-FactorySmokeTest}"

echo "==> Typecheck"
pnpm exec tsc -p orchestrator/tsconfig.json --noEmit

echo "==> Incremental verification"
pnpm exec tsx orchestrator/src/factoryCli.ts verify-incremental

echo "==> Init"
pnpm exec tsx orchestrator/src/factoryCli.ts init

echo "==> Approval flow"
pnpm exec tsx orchestrator/src/factoryCli.ts request-approval
pnpm exec tsx orchestrator/src/factoryCli.ts approve

echo "==> Workspace"
pnpm exec tsx orchestrator/src/factoryCli.ts create-workspace "$PROJECT_NAME"

echo "==> Clones"
pnpm exec tsx orchestrator/src/factoryCli.ts create-clones "$PROJECT_NAME"
pnpm exec tsx orchestrator/src/factoryCli.ts execute-clones "$PROJECT_NAME"

echo "==> Approved DAG"
pnpm exec tsx orchestrator/src/factoryCli.ts run-approved

echo "==> Final state"
pnpm exec tsx orchestrator/src/factoryCli.ts state

echo "==> Factory smoke test completed"
