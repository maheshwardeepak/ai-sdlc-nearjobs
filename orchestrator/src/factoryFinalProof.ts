import { runFactoryReadinessCheck } from "./factoryReadinessCheck.js";
import { runSelfHealingBuildLoop } from "./selfHealingBuildLoop.js";

export type FactoryFinalProof = {
  success: boolean;
  readiness: ReturnType<typeof runFactoryReadinessCheck>;
  selfHealingBuild: ReturnType<typeof runSelfHealingBuildLoop>;
  createdAt: string;
};

export function runFactoryFinalProof(workspaceRoot: string): FactoryFinalProof {
  const readiness = runFactoryReadinessCheck();
  const selfHealingBuild = runSelfHealingBuildLoop(workspaceRoot);

  return {
    success: readiness.success && selfHealingBuild.success,
    readiness,
    selfHealingBuild,
    createdAt: new Date().toISOString()
  };
}
