import { execSync } from "child_process";

function checkCommand(command: string) {
  try {
    execSync(command, {
      stdio: "ignore"
    });

    return true;
  } catch {
    return false;
  }
}

export function runInfrastructurePreflight() {
  const dockerRunning = checkCommand("docker ps");
  const dockerCompose = checkCommand("docker compose version");
  const gitInstalled = checkCommand("git --version");
  const nodeInstalled = checkCommand("node --version");

  const success =
    dockerRunning &&
    dockerCompose &&
    gitInstalled &&
    nodeInstalled;

  return {
    success,
    checks: {
      dockerRunning,
      dockerCompose,
      gitInstalled,
      nodeInstalled
    }
  };
}
