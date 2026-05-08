import { regenerateInvalidArtifacts } from "./regenerationEngine.js";

async function main() {
  const projectName = process.argv[2];

  if (!projectName) {
    throw new Error("Project name is required.");
  }

  console.log("Starting invalid artifact regeneration...");

  const results = await regenerateInvalidArtifacts(projectName);

  console.log("Invalid artifacts regenerated.");
  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
