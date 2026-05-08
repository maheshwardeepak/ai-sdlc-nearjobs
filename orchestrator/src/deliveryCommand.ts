import { runProjectVerificationGate } from "./projectVerificationGate.js";
import { generateReleaseReport } from "./releaseReporter.js";
import { generateReleaseManifest } from "./releaseManifest.js";
import { updateReleaseHistory } from "./releaseHistory.js";

export async function runDelivery(projectName: string) {
  const verification = await runProjectVerificationGate(projectName);

  if (!verification.success) {
    return {
      success: false,
      projectName,
      message: "Delivery blocked: verification failed.",
      verification
    };
  }

  const report = await generateReleaseReport(projectName);
  const manifest = await generateReleaseManifest(projectName);
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
