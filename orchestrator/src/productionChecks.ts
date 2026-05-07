import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

function sh(command: string, cwd: string) {
  const r = spawnSync(command, {
    cwd,
    shell: true,
    encoding: "utf8",
    timeout: 1000 * 60 * 5
  });

  return {
    command,
    cwd,
    status: r.status,
    passed: r.status === 0,
    output: `${r.stdout || ""}\n${r.stderr || ""}`.trim()
  };
}

function exists(p: string) {
  return fs.existsSync(p);
}

export function runProductionChecks(projectPath: string, runDir: string) {
  const checks: any[] = [];

  const backend = path.join(projectPath, "backend");
  const frontend = path.join(projectPath, "frontend");

  checks.push(sh(`find . -type f | wc -l`, projectPath));

  checks.push(sh(
    `grep -RInE "TODO|placeholder|dummy|return null|UnsupportedOperationException|throw new RuntimeException\\(\\"not implemented" . --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=target || true`,
    projectPath
  ));

  checks.push(sh(
    `find . -name "*.java" ! -name "package-info.java" | wc -l`,
    projectPath
  ));

  if (exists(path.join(backend, "pom.xml"))) {
    checks.push(sh(`test -f pom.xml`, backend));
    checks.push(sh(`test -d src/main/java`, backend));
    checks.push(sh(`test -d src/test/java`, backend));
    checks.push(sh(`test -d src/main/resources/db/migration`, backend));
  }

  if (exists(path.join(frontend, "package.json"))) {
    checks.push(sh(`test -f package.json`, frontend));
    checks.push(sh(`test -d src`, frontend));
    checks.push(sh(`test -f playwright.config.ts`, frontend));
    checks.push(sh(`test -d tests/playwright`, frontend));
  }

  checks.push(sh(`test -f README.md`, projectPath));
  checks.push(sh(`test -d docs`, projectPath));
  checks.push(sh(`test -d scripts`, projectPath));

  const report = {
    passed: checks.every((c) => c.passed),
    checks
  };

  fs.writeFileSync(
    path.join(runDir, "production_checks.json"),
    JSON.stringify(report, null, 2),
    "utf8"
  );

  return report;
}
