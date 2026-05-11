import fs from "fs";
import path from "path";
import { logger } from "./logger.js";
import { executeOpenClawTask } from "./openclawAdapter.js";
import { recordAgentRun } from "./db/runtimeDb.js";

export type WorkerExecution = {
  workerId: string;
  role: string;
  workspacePath: string;
  objective: string;
};

export type WorkerExecutionResult = {
  success: boolean;
  generatedFiles: string[];
  logs: string[];
  aiOutputFile?: string;
};

function writeGeneratedSourceFile(execution: WorkerExecution): string {
  const roleLayouts: Record<string, string[]> = {
    backend: ["backend/src/routes", "backend/src/services", "backend/tests"],
    frontend: ["frontend/src/components", "frontend/src/pages", "frontend/src/api"],
    database: ["database/migrations", "database/seeds"],
    tests: ["tests/unit", "tests/integration"],
    build: ["build/scripts"],
    api: ["api/contracts", "api/smoke"],
    playwright: ["playwright/tests"],
    security: ["security/checks"]
  };

  const dirs = roleLayouts[execution.role] || [`${execution.role}/src`];

  const generatedFiles: string[] = [];

  for (const dir of dirs) {
    const fullDir = path.join(execution.workspacePath, dir);
    fs.mkdirSync(fullDir, { recursive: true });

    const filePath = path.join(fullDir, `${execution.role}.generated.ts`);
    const content = [
      `export const role = ${JSON.stringify(execution.role)};`,
      `export const workerId = ${JSON.stringify(execution.workerId)};`,
      `export const objective = ${JSON.stringify(execution.objective)};`,
      "",
      "export function describeGeneratedWork(): string {",
      "  return `Generated structured implementation for ${role} by ${workerId}`;",
      "}",
      ""
    ].join("\n");

    fs.writeFileSync(filePath, content);
    generatedFiles.push(filePath);
  }

  return generatedFiles.join(",");
}

export async function executeWorker(
  execution: WorkerExecution
): Promise<WorkerExecutionResult> {
  logger.info({
    type: "WORKER_EXECUTION_START",
    workerId: execution.workerId,
    role: execution.role
  });

  const generatedFiles: string[] = [];

  const metadataFile = path.join(
    execution.workspacePath,
    `${execution.role}.metadata.txt`
  );

  fs.writeFileSync(
    metadataFile,
    [
      `WORKER: ${execution.workerId}`,
      `ROLE: ${execution.role}`,
      `OBJECTIVE: ${execution.objective}`,
      `GENERATED_AT: ${new Date().toISOString()}`
    ].join("\n")
  );

  generatedFiles.push(metadataFile);

  const generatedSourceFiles = writeGeneratedSourceFile(execution)
    .split(",")
    .filter(Boolean);
  generatedFiles.push(...generatedSourceFiles);
  if (execution.role === "backend") {
    const serverFile = path.join(
      execution.workspacePath,
      "backend/src/server.ts"
    );

    const backendPackageFile = path.join(
      execution.workspacePath,
      "backend/package.json"
    );

    fs.writeFileSync(
      backendPackageFile,
      JSON.stringify(
        {
          type: "module",
          scripts: {
            dev: "tsx src/server.ts",
            build: "tsc --noEmit"
          },
          dependencies: {
            express: "^5.2.1"
          },
          devDependencies: {
            "@types/express": "^5.0.6",
            tsx: "^4.21.0",
            typescript: "^6.0.3"
          }
        },
        null,
        2
      )
    );

    const backendTsconfigFile = path.join(
      execution.workspacePath,
      "backend/tsconfig.json"
    );

    fs.writeFileSync(
      backendTsconfigFile,
      JSON.stringify(
        {
          compilerOptions: {
            target: "ES2022",
            module: "NodeNext",
            moduleResolution: "NodeNext",
            strict: true,
            esModuleInterop: true,
            skipLibCheck: true,
            noEmit: true
          },
          include: ["src/**/*.ts"]
        },
        null,
        2
      )
    );

    generatedFiles.push(backendTsconfigFile);

    generatedFiles.push(backendPackageFile);

    fs.writeFileSync(
      serverFile,
      [
        'import express from "express";',
        "",
        "const app = express();",
        "const port = 3000;",
        "",
        'app.get("/health", (_req, res) => {',
        '  res.json({ success: true, service: "backend" });',
        "});",
        "",
        "app.listen(port, () => {",
        '  console.log(`Backend running on port ${port}`);',
        "});",
        ""
      ].join("\n")
    );

    generatedFiles.push(serverFile);
  }

  if (execution.role === "frontend") {
    const appFile = path.join(
      execution.workspacePath,
      "frontend/src/App.tsx"
    );

    const frontendPackageFile = path.join(
      execution.workspacePath,
      "frontend/package.json"
    );

    fs.writeFileSync(
      frontendPackageFile,
      JSON.stringify(
        {
          type: "module",
          scripts: {
            dev: "vite",
            build: "tsc --noEmit"
          },
          dependencies: {
            react: "^19.2.6",
            "react-dom": "^19.2.6"
          },
          devDependencies: {
            "@vitejs/plugin-react": "^6.0.1",
            vite: "^8.0.11",
            "@types/react": "^19.2.14",
            "@types/react-dom": "^19.2.3",
            typescript: "^6.0.3"
          }
        },
        null,
        2
      )
    );

    const frontendTsconfigFile = path.join(
      execution.workspacePath,
      "frontend/tsconfig.json"
    );

    fs.writeFileSync(
      frontendTsconfigFile,
      JSON.stringify(
        {
          compilerOptions: {
            target: "ES2022",
            module: "ESNext",
            moduleResolution: "Bundler",
            jsx: "react-jsx",
            jsxImportSource: "react",
            strict: true,
            skipLibCheck: true,
            esModuleInterop: true,
            allowSyntheticDefaultImports: true,
            noEmit: true,
            lib: ["ES2022", "DOM"]
          },
          include: ["src/**/*.ts", "src/**/*.tsx", "src/**/*.d.ts"]
        },
        null,
        2
      )
    );

    generatedFiles.push(frontendTsconfigFile);

    const frontendViteEnvFile = path.join(
      execution.workspacePath,
      "frontend/src/vite-env.d.ts"
    );

    fs.writeFileSync(
      frontendViteEnvFile,
      '/// <reference types="vite/client" />\n'
    );

    generatedFiles.push(frontendViteEnvFile);


    generatedFiles.push(frontendPackageFile);

    fs.writeFileSync(
      appFile,
      [
        'export default function App() {',
        '  return <h1>AI SDLC Factory Frontend</h1>;',
        '}',
        ""
      ].join("\n")
    );

    generatedFiles.push(appFile);


    const mainFile = path.join(
      execution.workspacePath,
      "frontend/src/main.tsx"
    );

    fs.writeFileSync(
      mainFile,
      [
        'import React from "react";',
        'import ReactDOM from "react-dom/client";',
        'import App from "./App";',
        '',
        'ReactDOM.createRoot(document.getElementById("root")!).render(',
        '  <React.StrictMode>',
        '    <App />',
        '  </React.StrictMode>',
        ');',
        ''
      ].join("\n")
    );

    generatedFiles.push(mainFile);

  }


  const aiResult = await executeOpenClawTask({
    workerId: execution.workerId,
    workspacePath: execution.workspacePath,
    prompt: `
You are a senior ${execution.role} engineer.

Objective:
${execution.objective}

Requirements:
- production-grade quality
- real implementation
- no scaffolds
- deployment-ready
- enterprise quality
- secure coding
- include validation
- include tests
`
  });

  logger.info({
    type: "WORKER_EXECUTION_COMPLETE",
    workerId: execution.workerId,
    success: aiResult.success
  });

  try {
    await recordAgentRun({
      agent: execution.workerId.split("-").slice(0, 2).join("-"),
      role: execution.role,
      workerId: execution.workerId,
      status: aiResult.success ? "SUCCESS" : "FAILED",
      outputFile: aiResult.outputFile
    });
  } catch (error) {
    logger.error({
      type: "WORKER_DB_RECORD_FAILED",
      workerId: execution.workerId,
      error: error instanceof Error ? error.message : String(error)
    });
  }

  return {
    success: aiResult.success,
    generatedFiles,
    logs: [],
    aiOutputFile: aiResult.outputFile
  };
}
