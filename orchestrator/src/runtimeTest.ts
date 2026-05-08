import { runTask } from "./taskRuntime.js";

async function main() {
  const result = await runTask({
    id: "node-version-test",
    name: "Node Version Test",
    command: "node",
    args: ["-v"]
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch(console.error);
