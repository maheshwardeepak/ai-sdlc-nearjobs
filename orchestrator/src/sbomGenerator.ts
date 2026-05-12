import fs from "fs";
import path from "path";

type PackageJson = {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

type SbomPackage = {
  name: string;
  version: string;
  type: "dependency" | "devDependency";
};

type SbomEntry = {
  appPath: string;
  packages: SbomPackage[];
};

type SbomReport = {
  success: boolean;
  appsChecked: number;
  entries: SbomEntry[];
  createdAt: string;
};

function findPackageJsonFiles(rootDir: string): string[] {
  const results: string[] = [];

  function walk(dir: string) {
    if (!fs.existsSync(dir)) return;

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory() && entry.name !== "node_modules") {
        walk(fullPath);
      }

      if (entry.isFile() && entry.name === "package.json") {
        results.push(fullPath);
      }
    }
  }

  walk(rootDir);

  return results;
}

export function generateSbom(
  rootDir = "runtime/workspaces"
): SbomReport {
  const packageFiles = findPackageJsonFiles(
    path.resolve(process.cwd(), rootDir)
  );

  const entries: SbomEntry[] = packageFiles.map((pkgFile) => {
    const pkg = JSON.parse(
      fs.readFileSync(pkgFile, "utf8")
    ) as PackageJson;

    const packages: SbomPackage[] = [];

    for (const [name, version] of Object.entries(
      pkg.dependencies || {}
    )) {
      packages.push({
        name,
        version,
        type: "dependency"
      });
    }

    for (const [name, version] of Object.entries(
      pkg.devDependencies || {}
    )) {
      packages.push({
        name,
        version,
        type: "devDependency"
      });
    }

    return {
      appPath: path.dirname(pkgFile),
      packages
    };
  });

  const report: SbomReport = {
    success: true,
    appsChecked: entries.length,
    entries,
    createdAt: new Date().toISOString()
  };

  const reportsDir = path.resolve(
    process.cwd(),
    "artifacts/reports"
  );

  fs.mkdirSync(reportsDir, { recursive: true });

  fs.writeFileSync(
    path.join(reportsDir, "sbom-report.json"),
    JSON.stringify(report, null, 2)
  );

  return report;
}

if (process.argv[1]?.includes("sbomGenerator")) {
  const result = generateSbom(process.argv[2]);

  console.log(JSON.stringify(result, null, 2));
}
