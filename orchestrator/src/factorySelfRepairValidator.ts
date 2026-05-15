import { execSync } from "node:child_process";

export function validateFactoryAfterSelfRepair() {
  try {
    const output = execSync(
      "pnpm exec tsc -p orchestrator/tsconfig.json --noEmit",
      {
        cwd: process.cwd(),
        stdio: "pipe",
        encoding: "utf8",
        shell: "/bin/bash"
      }
    );

    return {
      success: true,
      output
    };
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string; message?: string };

    return {
      success: false,
      output: [err.stdout, err.stderr, err.message].filter(Boolean).join("\n")
    };
  }
}
