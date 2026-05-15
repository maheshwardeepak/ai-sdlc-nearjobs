import fs from "fs";
import path from "path";

export type DependencyRepairPlan = {
  packageManager: string;
  installCommand: string;
  detectedPackages: string[];
};

const TS_PACKAGE_MAP: Record<string, string> = {
  react: "react",
  "react-dom": "react-dom",
  vite: "vite",
  vitest: "vitest",
  jsdom: "jsdom",
  "@testing-library/jest-dom": "@testing-library/jest-dom",
  "@testing-library/react": "@testing-library/react",
  "@testing-library/user-event": "@testing-library/user-event",
  "@vitejs/plugin-react": "@vitejs/plugin-react"
};

const TYPE_PACKAGE_MAP: Record<string, string> = {
  react: "@types/react",
  "react-dom": "@types/react-dom",
  node: "@types/node"
};

function detectMissingPackages(output: string): string[] {
  const packages = new Set<string>();

  const regexes = [
    /Cannot find module ['"]([^'"]+)['"]/g,
    /Cannot find type definition file for ['"]([^'"]+)['"]/g
  ];

  for (const regex of regexes) {
    for (const match of output.matchAll(regex)) {
      const name = match[1];

      if (!name) {
        continue;
      }

      const runtimePackage = TS_PACKAGE_MAP[name];
      if (runtimePackage) {
        packages.add(runtimePackage);
      }

      const typePackage = TYPE_PACKAGE_MAP[name];
      if (typePackage) {
        packages.add(typePackage);
      }

      if (name.startsWith("@types/")) {
        packages.add(name);
      }
    }
  }

  return [...packages];
}

function detectPackageManager(root: string): string {
  if (fs.existsSync(path.join(root, "pnpm-lock.yaml"))) {
    return "pnpm";
  }

  if (fs.existsSync(path.join(root, "package-lock.json"))) {
    return "npm";
  }

  if (fs.existsSync(path.join(root, "yarn.lock"))) {
    return "yarn";
  }

  return "pnpm";
}

export function buildDependencyRepairPlan(
  root: string,
  buildOutput: string
): DependencyRepairPlan | null {
  const detectedPackages = detectMissingPackages(buildOutput);

  if (detectedPackages.length === 0) {
    return null;
  }

  const packageManager = detectPackageManager(root);

  let installCommand = "";

  if (packageManager === "pnpm") {
    installCommand =
      `pnpm add -D ${detectedPackages.join(" ")} --ignore-workspace`;
  }

  if (packageManager === "npm") {
    installCommand =
      `npm install -D ${detectedPackages.join(" ")}`;
  }

  if (packageManager === "yarn") {
    installCommand =
      `yarn add -D ${detectedPackages.join(" ")}`;
  }

  return {
    packageManager,
    installCommand,
    detectedPackages
  };
}
