import { runProjectVerificationGate } from "./projectVerificationGate.js";
import { runAutonomousHealthGate } from "./autonomousHealthGate.js";
import { runInfrastructurePreflight } from "./infrastructurePreflight.js";
import { loadVerificationResult } from "./verificationCache.js";
import { generateReleaseReport } from "./releaseReporter.js";
import { generateReleaseManifest } from "./releaseManifest.js";
import { updateReleaseHistory } from "./releaseHistory.js";

type VerificationResult = {
  success: boolean;
  gates: {
    build: { success: boolean };
    runtime: { success: boolean }[];
    apiSmoke: { success: boolean };
    playwright: { success: boolean };
    security: { success: boolean };
  };
  [key: string]: unknown;
};

export async function runDelivery(projectName: string) {
  const infrastructure = runInfrastructurePreflight();

  if (!infrastructure.success) {
    return {
      success: false,
      projectName,
      message: "Delivery blocked by infrastructure preflight.",
      infrastructure
    };
  }

  const healthGate = runAutonomousHealthGate();

  if (!healthGate.success) {
    return {
      success: false,
      projectName,
      message: "Delivery blocked by autonomous platform health gate.",
      healthGate
    };
  }

  const verification = (
    loadVerificationResult() ||
    await runProjectVerificationGate(projectName)
  ) as VerificationResult;

  if (!verification.success) {
    return {
      success: false,
      projectName,
      message: "Delivery blocked: verification failed.",
      verification
    };
  }

  const report = await generateReleaseReport(projectName);
  const manifest = await generateReleaseManifest(
    projectName,
    verification
  );
  const history = updateReleaseHistory(projectName, manifest.manifest);

  return {
    success: true,
    projectName,
    message: "Delivery complete. Project is ready for release.",
    report,
    manifest,
    history
  };
}
