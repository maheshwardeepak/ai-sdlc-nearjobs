import fs from "node:fs";
import path from "node:path";

export type RuntimeContractValidation = {
  success: boolean;
  errors: string[];
  checked: string[];
};

export function validateRuntimeContracts(workspaceRoot: string): RuntimeContractValidation {
  const errors: string[] = [];
  const checked: string[] = [];

  const workersRoot = path.join(workspaceRoot, "workers");

  if (!fs.existsSync(workersRoot)) {
    return {
      success: false,
      errors: [`workers directory not found: ${workersRoot}`],
      checked
    };
  }

  const workerDirs = fs.readdirSync(workersRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(workersRoot, entry.name));

  for (const workerDir of workerDirs) {
    const backendRoot = path.join(workerDir, "backend");
    const frontendRoot = path.join(workerDir, "frontend");

    const pomPath = path.join(backendRoot, "pom.xml");
    if (fs.existsSync(pomPath)) {
      checked.push("spring-boot-backend");

      const propertiesPath = path.join(
        backendRoot,
        "src/main/resources/application.properties"
      );

      if (!fs.existsSync(propertiesPath)) {
        errors.push(`missing Spring Boot application.properties: ${propertiesPath}`);
      } else {
        const properties = fs.readFileSync(propertiesPath, "utf8");

        if (!properties.includes("server.port=3000")) {
          errors.push("Spring Boot must bind server.port=3000");
        }

        if (!properties.includes("spring.datasource.url=${DATABASE_URL}")) {
          errors.push("Spring Boot must use DATABASE_URL env mapping");
        }

        if (!properties.includes("management.endpoints.web.exposure.include")) {
          errors.push("Spring Boot actuator health exposure missing");
        }
      }

      const pom = fs.readFileSync(pomPath, "utf8");
      if (!pom.includes("spring-boot-starter-actuator")) {
        errors.push("Spring Boot actuator dependency missing");
      }
    }

    const packagePath = path.join(frontendRoot, "package.json");
    if (fs.existsSync(packagePath)) {
      checked.push("frontend-package");

      const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));

      if (!pkg.scripts?.build) {
        errors.push(`frontend build script missing: ${packagePath}`);
      }

      if (!pkg.dependencies?.react && !pkg.dependencies?.["@angular/core"] && !pkg.dependencies?.vue && !pkg.dependencies?.next) {
        errors.push("frontend framework dependency missing");
      }
    }
  }

  return {
    success: errors.length === 0,
    errors,
    checked
  };
}
