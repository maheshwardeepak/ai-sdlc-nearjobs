import { runDelivery } from "./deliveryCommand.js";

async function main() {
  const project = process.argv[2];

  if (!project) {
    throw new Error("Project name required");
  }

  console.log(`Starting continuous delivery for ${project}...`);

  const result = await runDelivery(project);

  console.log(JSON.stringify(result, null, 2));

  if (!result.success) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
