import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

type QaResult = {
  command: string;
  cwd: string;
  passed: boolean;
  output: string;
};

function run(command: string, cwd: string): QaResult {
  const result = spawnSync(command, {
    cwd,
    shell: true,
    encoding: "utf8",
    timeout: 1000 * 60 * 10
  });

  return {
    command,
    cwd,
    passed: result.status === 0,
    output: `${result.stdout || ""}\n${result.stderr || ""}`.trim()
  };
}

function exists(p: string) {
  return fs.existsSync(p);
}

function countRealJavaFiles(projectPath: string) {
  const src = path.join(projectPath, "backend", "src", "main", "java");
  if (!exists(src)) return 0;

  const out = spawnSync(
    `find "${src}" -name "*.java" ! -name "package-info.java" | wc -l`,
    { shell: true, encoding: "utf8" }
  );

  return Number(String(out.stdout || "0").trim());
}

function hasPlaceholders(projectPath: string) {
  const src = projectPath;
  const result = spawnSync(
    `grep -RInE "TODO|throw new UnsupportedOperationException|return null|placeholder|dummy" "${src}" --exclude-dir=node_modules --exclude-dir=target --exclude-dir=.git || true`,
    { shell: true, encoding: "utf8" }
  );

  return String(result.stdout || "").trim();
}

export function runQualityGate(projectPath: string, runDir: string) {
  const results: QaResult[] = [];

  const realJavaCount = countRealJavaFiles(projectPath);
  const placeholders = hasPlaceholders(projectPath);

  const backend = path.join(projectPath, "backend");
  const frontend = path.join(projectPath, "frontend");

  if (exists(path.join(backend, "mvnw"))) {
    results.push(run("./mvnw -B -ntp test", backend));
  } else if (exists(path.join(backend, "pom.xml"))) {
    results.push(run("mvn -B -ntp test", backend));
  }

  if (exists(path.join(frontend, "package.json"))) {
    if (exists(path.join(frontend, "node_modules"))) {
      results.push(run("npm run build", frontend));
      results.push(run("npm run test:e2e", frontend));
    } else {
      results.push({
        command: "npm run build && npm run test:e2e",
        cwd: frontend,
        passed: false,
        output: "node_modules missing. Dependency install required before frontend QA can pass."
      });
    }
  }

  const passed =
    realJavaCount >= 20 &&
    !placeholders &&
    results.length > 0 &&
    results.every((r) => r.passed);

  const report = {
    passed,
    realJavaCount,
    placeholders,
    results
  };

  fs.writeFileSync(
    path.join(runDir, "real_quality_gate.json"),
    JSON.stringify(report, null, 2),
    "utf8"
  );

  return report;
}
