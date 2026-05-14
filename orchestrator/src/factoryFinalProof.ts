import { runFactoryReadinessCheck } from "./factoryReadinessCheck.js";
import { runSelfHealingBuildLoop } from "./selfHealingBuildLoop.js";
import { verifyDockerRuntime } from "./dockerRuntimeVerifier.js";
import { verifyRuntimeHealth } from "./runtimeHealthVerifier.js";

export type FactoryFinalProof = {
  success: boolean;
  readiness: ReturnType<typeof runFactoryReadinessCheck>;
  selfHealingBuild: ReturnType<typeof runSelfHealingBuildLoop>;
  dockerRuntime: ReturnType<typeof verifyDockerRuntime>;
  runtimeHealth: Awaited<ReturnType<typeof verifyRuntimeHealth>>;
  createdAt: string;
};

export async function runFactoryFinalProof(workspaceRoot: string): Promise<FactoryFinalProof> {
  const readiness = runFactoryReadinessCheck();
  const selfHealingBuild = runSelfHealingBuildLoop(workspaceRoot);
  const dockerRuntime = verifyDockerRuntime(workspaceRoot);
  const runtimeHealth = await verifyRuntimeHealth();

  return {
    success:
      readiness.success &&
      selfHealingBuild.success &&
      dockerRuntime.success &&
      runtimeHealth.success,
    readiness,
    selfHealingBuild,
    dockerRuntime,
    runtimeHealth,
    createdAt: new Date().toISOString()
  };
}
