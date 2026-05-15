import fs from "node:fs";
import path from "node:path";
import { runFactoryReadinessCheck } from "./factoryReadinessCheck.js";

export type EnterpriseReadinessCheck = {
  success: boolean;
  checks: Record<string, boolean>;
  missing: string[];
  createdAt: string;
};

export function runEnterpriseReadinessCheck(): EnterpriseReadinessCheck {
  const requiredFiles = [
    "orchestrator/src/aiProjectPlanner.ts",
    "orchestrator/src/projectPlanningEngine.ts",
    "orchestrator/src/planDiffEngine.ts",
    "orchestrator/src/projectPhaseDag.ts",
    "orchestrator/src/projectPhaseRunner.ts",
    "orchestrator/src/projectPhaseOrchestrator.ts",
    "orchestrator/src/projectPhaseMemory.ts",
    "orchestrator/src/projectSyncMemory.ts",
    "orchestrator/src/phaseArtifactExtractor.ts",
    "orchestrator/src/phaseArtifactWriter.ts",
    "orchestrator/src/semanticMergeEngine.ts",
    "orchestrator/src/phaseCheckpoint.ts",
    "orchestrator/src/projectPhaseRetryRunner.ts",
    "orchestrator/src/projectPhaseRunHistory.ts",
    "orchestrator/src/phaseTestConvergence.ts",
    "orchestrator/src/phaseRuntimeConvergence.ts",
    "orchestrator/src/contractDriftDetector.ts",
    "orchestrator/src/phaseSecurityComplianceGate.ts",
    "orchestrator/src/dependencyReconciler.ts",
    "orchestrator/src/factoryFinalProof.ts",
    "orchestrator/src/stackProofMatrix.ts",
    "orchestrator/src/provenStackGuard.ts",
    "orchestrator/src/projectMemoryCompactor.ts",
    "orchestrator/src/contractDriftRepair.ts",
    "orchestrator/src/frontendBackendContractValidator.ts"
  ];

  const readiness = runFactoryReadinessCheck();

  const checks: Record<string, boolean> = {
    environment: readiness.success
  };

  for (const file of requiredFiles) {
    checks[file] = fs.existsSync(path.resolve(process.cwd(), file));
  }

  const missing = Object.entries(checks)
    .filter(([, ok]) => !ok)
    .map(([name]) => name);

  return {
    success: missing.length === 0,
    checks,
    missing,
    createdAt: new Date().toISOString()
  };
}
