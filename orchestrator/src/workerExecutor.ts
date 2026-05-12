import fs from "fs";
import path from "path";
import { logger } from "./logger.js";
import { executeOpenClawTask } from "./openclawAdapter.js";
import { assertSupportedDefaultStack } from "./technologyStackContract.js";
import { recordAgentRun } from "./db/runtimeDb.js";
import { extractArtifactsFromMarkdown, writeExtractedArtifacts } from "./aiArtifactExtractor.js";


function safeWriteFile(
  filePath: string,
  content: string | NodeJS.ArrayBufferView
): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

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

    safeWriteFile(filePath, content);
    generatedFiles.push(filePath);
  }

  return generatedFiles.join(",");
}

export async function executeWorker(
  execution: WorkerExecution
): Promise<WorkerExecutionResult> {
  const stackContract = assertSupportedDefaultStack();
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

  safeWriteFile(
    metadataFile,
    [
      `WORKER: ${execution.workerId}`,
      `ROLE: ${execution.role}`,
      `OBJECTIVE: ${execution.objective}`,
      `STACK_BACKEND: ${stackContract.backend.language}/${stackContract.backend.framework}/${stackContract.backend.runtime}`,
      `STACK_FRONTEND: ${stackContract.frontend.language}/${stackContract.frontend.framework}/${stackContract.frontend.runtime}`,
      `STACK_DATABASE: ${stackContract.database.engine}`,
      `GENERATED_AT: ${new Date().toISOString()}`
    ].join("\n")
  );

  generatedFiles.push(metadataFile);

  let fallbackSourceFiles: string[] = [];
  if (execution.role === "backend") {
    const serverFile = path.join(
      execution.workspacePath,
      "backend/src/server.ts"
    );

    fs.mkdirSync(path.dirname(serverFile), { recursive: true });

    const backendPackageFile = path.join(
      execution.workspacePath,
      "backend/package.json"
    );

    fs.mkdirSync(path.dirname(backendPackageFile), { recursive: true });

    safeWriteFile(
      backendPackageFile,
      JSON.stringify(
        {
          type: "module",
          scripts: {
            dev: "tsx src/server.ts",
            build: "tsc --noEmit"
          },
          dependencies: {
            express: "^5.2.1",
            pg: "^8.20.0"
          },
          devDependencies: {
            "@types/express": "^5.0.6",
            "@types/pg": "^8.20.0",
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

    fs.mkdirSync(path.dirname(backendTsconfigFile), { recursive: true });

    safeWriteFile(
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

    safeWriteFile(
      serverFile,
      [
        'import express from "express";',
        'import { usersRouter } from "./routes/users.js";',
        "",
        "const app = express();",
        "const port = Number(process.env.PORT || 3000);",
        "",
        "app.use(express.json());",
        "",
        'app.get("/health", (_req, res) => {',
        '  res.json({ success: true, service: "backend" });',
        "});",
        "",
        'app.use("/users", usersRouter);',
        "",
        "app.listen(port, () => {",
        '  console.log(`Backend running on port ${port}`);',
        "});",
        ""
      ].join("\n")
    );

    generatedFiles.push(serverFile);


    const backendDockerfile = path.join(
      execution.workspacePath,
      "backend/Dockerfile"
    );

    safeWriteFile(
      backendDockerfile,
      [
        "FROM node:22-alpine",
        "",
        "WORKDIR /app",
        "",
        "COPY package.json ./",
        "RUN npm install",
        "",
        "COPY . .",
        "",
        "EXPOSE 3000",
        "",
        'HEALTHCHECK CMD wget --spider -q http://localhost:3000/health || exit 1',
        "",
        'CMD ["npm", "run", "dev"]',
        ""
      ].join("\n")
    );

    generatedFiles.push(backendDockerfile);

    const backendCompose = path.join(
      execution.workspacePath,
      "backend/docker-compose.yml"
    );

    safeWriteFile(
      backendCompose,
      [
        "services:",
        "  backend:",
        "    build: .",
        "    ports:",
        '      - "3000:3000"',
        ""
      ].join("\n")
    );

    generatedFiles.push(backendCompose);

    const dbFile = path.join(
      execution.workspacePath,
      "backend/src/db/db.ts"
    );

    fs.mkdirSync(path.dirname(dbFile), { recursive: true });

    safeWriteFile(
      dbFile,
      [
        'import pg from "pg";',
        "",
        "const { Pool } = pg;",
        "",
        "export const pool = new Pool({",
        '  connectionString: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/postgres"',
        "});",
        ""
      ].join("\n")
    );

    generatedFiles.push(dbFile);

    const repositoryFile = path.join(
      execution.workspacePath,
      "backend/src/repositories/userRepository.ts"
    );

    fs.mkdirSync(path.dirname(repositoryFile), { recursive: true });

    safeWriteFile(
      repositoryFile,
      [
        'import { pool } from "../db/db.js";',
        "",
        "export type User = {",
        "  id: number;",
        "  name: string;",
        "  email: string;",
        "};",
        "",
        "export async function listUsers(): Promise<User[]> {",
        "  const result = await pool.query<User>('SELECT id, name, email FROM users ORDER BY id ASC');",
        "  return result.rows;",
        "}",
        "",
        "export async function createUser(input: Omit<User, 'id'>): Promise<User> {",
        "  const result = await pool.query<User>(",
        "    'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING id, name, email',",
        "    [input.name, input.email]",
        "  );",
        "  return result.rows[0];",
        "}",
        ""
      ].join("\n")
    );

    generatedFiles.push(repositoryFile);

    const usersRouteFile = path.join(
      execution.workspacePath,
      "backend/src/routes/users.ts"
    );

    safeWriteFile(
      usersRouteFile,
      [
        'import { Router } from "express";',
        'import { createUser, listUsers } from "../repositories/userRepository.js";',
        "",
        "export const usersRouter = Router();",
        "",
        'usersRouter.get("/", async (_req, res, next) => {',
        "  try {",
        "    res.json({ success: true, users: await listUsers() });",
        "  } catch (error) {",
        "    next(error);",
        "  }",
        "});",
        "",
        'usersRouter.post("/", async (req, res, next) => {',
        "  try {",
        "    const { name, email } = req.body;",
        "    if (!name || !email) {",
        '      res.status(400).json({ success: false, error: "name-and-email-required" });',
        "      return;",
        "    }",
        "",
        "    const user = await createUser({ name, email });",
        "    res.status(201).json({ success: true, user });",
        "  } catch (error) {",
        "    next(error);",
        "  }",
        "});",
        ""
      ].join("\n")
    );

    generatedFiles.push(usersRouteFile);

    const sqlFile = path.join(
      execution.workspacePath,
      "backend/sql/init.sql"
    );

    fs.mkdirSync(path.dirname(sqlFile), { recursive: true });

    safeWriteFile(
      sqlFile,
      [
        "CREATE TABLE IF NOT EXISTS users (",
        "  id SERIAL PRIMARY KEY,",
        "  name TEXT NOT NULL,",
        "  email TEXT NOT NULL UNIQUE",
        ");",
        ""
      ].join("\n")
    );

    generatedFiles.push(sqlFile);

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

    fs.mkdirSync(path.dirname(frontendPackageFile), { recursive: true });

    safeWriteFile(
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
            typescript: "^6.0.3",
            vitest: "^2.1.9",
            jsdom: "^24.1.3",
            "@testing-library/jest-dom": "^6.9.1",
            "@testing-library/react": "^16.3.2",
            "@testing-library/user-event": "^14.6.1"
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

    fs.mkdirSync(path.dirname(frontendTsconfigFile), { recursive: true });

    safeWriteFile(
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

    safeWriteFile(
      frontendViteEnvFile,
      '/// <reference types="vite/client" />\n'
    );

    generatedFiles.push(frontendViteEnvFile);


    generatedFiles.push(frontendPackageFile);

    fs.mkdirSync(path.dirname(appFile), { recursive: true });

    safeWriteFile(
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

    safeWriteFile(
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


    const frontendDockerfile = path.join(
      execution.workspacePath,
      "frontend/Dockerfile"
    );

    safeWriteFile(
      frontendDockerfile,
      [
        "FROM node:22-alpine",
        "",
        "WORKDIR /app",
        "",
        "COPY package.json ./",
        "RUN npm install",
        "",
        "COPY . .",
        "",
        "EXPOSE 5173",
        "",
        'HEALTHCHECK CMD wget --spider -q http://localhost:5173 || exit 1',
        "",
        'CMD ["npm", "run", "dev", "--", "--host"]',
        ""
      ].join("\n")
    );

    generatedFiles.push(frontendDockerfile);

    const frontendCompose = path.join(
      execution.workspacePath,
      "frontend/docker-compose.yml"
    );

    safeWriteFile(
      frontendCompose,
      [
        "services:",
        "  frontend:",
        "    build: .",
        "    ports:",
        '      - "5173:5173"',
        ""
      ].join("\n")
    );

    generatedFiles.push(frontendCompose);

  }


  const roleSpecificRequirements =
    execution.role === "frontend"
      ? `
FRONTEND REQUIREMENTS:
- Generate a REAL React + TypeScript application.
- Generate real UI components, not metadata files.
- Generate real pages, forms, API client, typed models, loading state, empty state, and error state.
- Integrate with backend endpoints GET /users and POST /users.
- Use accessible labels, buttons, semantic HTML, and responsive layout.
- Do not emit role/objective/workerId metadata placeholder modules as implementation.
- Do not emit files whose only logic is describeGeneratedWork().
- Do not emit placeholder generated.ts files.
- Do not only describe the implementation.

REQUIRED FRONTEND FILES:
\`\`\`file:src/App.tsx
// complete React app
\`\`\`

\`\`\`file:src/types.ts
// User and API response types
\`\`\`

\`\`\`file:src/api/client.ts
// getUsers and createUser implementation
\`\`\`

\`\`\`file:src/components/UserForm.tsx
// real create-user form
\`\`\`

\`\`\`file:src/components/UserList.tsx
// real user list component
\`\`\`

\`\`\`file:src/pages/HomePage.tsx
// real page composing form and list
\`\`\`

All required files must contain complete working implementation code.
`
      : "";

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
${roleSpecificRequirements}

IMPORTANT OUTPUT FORMAT:
When you provide code, emit files using this exact format:

\`\`\`file:src/example.ts
export const example = true;
\`\`\`

Rules:
- Every code artifact must use a file: fenced code block.
- File paths must be relative to the ${execution.role} app root.
- Do not only describe code.
- Emit complete files.
`
  });

  if (aiResult.outputFile && fs.existsSync(aiResult.outputFile)) {
    const markdown = fs.readFileSync(aiResult.outputFile, "utf8");
    const artifacts = extractArtifactsFromMarkdown(markdown);
    const extractedFiles = writeExtractedArtifacts(
      execution.workspacePath,
      execution.role,
      artifacts
    );

    generatedFiles.push(...extractedFiles);

    logger.info({
      type: "AI_ARTIFACT_EXTRACTION_COMPLETE",
      workerId: execution.workerId,
      role: execution.role,
      extractedFiles: extractedFiles.length
    });

    if (extractedFiles.length === 0) {
      fallbackSourceFiles = writeGeneratedSourceFile(execution)
        .split(",")
        .filter(Boolean);
      generatedFiles.push(...fallbackSourceFiles);

      logger.info({
        type: "AI_ARTIFACT_FALLBACK_USED",
        workerId: execution.workerId,
        role: execution.role,
        fallbackFiles: fallbackSourceFiles.length
      });
    }
  } else {
    fallbackSourceFiles = writeGeneratedSourceFile(execution)
      .split(",")
      .filter(Boolean);
    generatedFiles.push(...fallbackSourceFiles);

    logger.info({
      type: "AI_ARTIFACT_FALLBACK_USED",
      workerId: execution.workerId,
      role: execution.role,
      fallbackFiles: fallbackSourceFiles.length
    });
  }

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
