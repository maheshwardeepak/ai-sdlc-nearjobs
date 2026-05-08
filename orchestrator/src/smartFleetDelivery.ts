import { detectChangedProjects } from "./gitChangeDetector.js";
import { runDelivery } from "./deliveryCommand.js";

export async function runSmartFleetDelivery() {
  const changedProjects = detectChangedProjects();

  console.log("Changed projects:", changedProjects);

  const results = [];

  for (const project of changedProjects) {
    const result = await runDelivery(project);

    results.push({
      project,
      success: result.success
    });
  }

  return {
    success: results.every((r) => r.success),
    changedProjects,
    results
  };
}
