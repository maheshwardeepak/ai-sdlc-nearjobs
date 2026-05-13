import fs from "fs";
import path from "path";
import { logger } from "./logger.js";
import { executeOpenClawTask } from "./openclawAdapter.js";
import { ensureTechnologyStackConfirmed } from "./technologyStackContract.js";
import { recordAgentRun } from "./db/runtimeDb.js";
import { extractArtifactsFromMarkdown, writeExtractedArtifacts } from "./aiArtifactExtractor.js";
import { stabilizeGeneratedApp } from "./generatedAppStabilizer.js";


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


function isSpringBootBackend(stackContract: ReturnType<typeof ensureTechnologyStackConfirmed>): boolean {
  return (
    stackContract.backend.language === "Java" &&
    stackContract.backend.framework === "Spring Boot"
  );
}

function writeSpringBootBackend(execution: WorkerExecution): string[] {
  const files: string[] = [];

  const backendRoot = path.join(execution.workspacePath, "backend");

  const write = (relativePath: string, content: string) => {
    const file = path.join(backendRoot, relativePath);
    safeWriteFile(file, content);
    files.push(file);
  };

  write(
    "pom.xml",
    [
      '<project xmlns="http://maven.apache.org/POM/4.0.0"',
      '         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"',
      '         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">',
      "  <modelVersion>4.0.0</modelVersion>",
      "  <parent>",
      "    <groupId>org.springframework.boot</groupId>",
      "    <artifactId>spring-boot-starter-parent</artifactId>",
      "    <version>3.3.5</version>",
      "  </parent>",
      "  <groupId>com.aifactory</groupId>",
      "  <artifactId>ai-chatbot-platform</artifactId>",
      "  <version>1.0.0</version>",
      "  <properties>",
      "    <java.version>21</java.version>",
      "  </properties>",
      "  <dependencies>",
      "    <dependency>",
      "      <groupId>org.springframework.boot</groupId>",
      "      <artifactId>spring-boot-starter-web</artifactId>",
      "    </dependency>",
      "    <dependency>",
      "      <groupId>org.springframework.boot</groupId>",
      "      <artifactId>spring-boot-starter-actuator</artifactId>",
      "    </dependency>",
      "    <dependency>",
      "      <groupId>org.springframework.boot</groupId>",
      "      <artifactId>spring-boot-starter-validation</artifactId>",
      "    </dependency>",
      "    <dependency>",
      "      <groupId>org.springframework.boot</groupId>",
      "      <artifactId>spring-boot-starter-data-jpa</artifactId>",
      "    </dependency>",
      "    <dependency>",
      "      <groupId>org.postgresql</groupId>",
      "      <artifactId>postgresql</artifactId>",
      "      <scope>runtime</scope>",
      "    </dependency>",
      "  </dependencies>",
      "  <build>",
      "    <plugins>",
      "      <plugin>",
      "        <groupId>org.springframework.boot</groupId>",
      "        <artifactId>spring-boot-maven-plugin</artifactId>",
      "      </plugin>",
      "    </plugins>",
      "  </build>",
      "</project>",
      ""
    ].join("\n")
  );

  write(
    "src/main/java/com/aifactory/chatbot/AiChatbotPlatformApplication.java",
    [
      "package com.aifactory.chatbot;",
      "",
      "import org.springframework.boot.SpringApplication;",
      "import org.springframework.boot.autoconfigure.SpringBootApplication;",
      "",
      "@SpringBootApplication",
      "public class AiChatbotPlatformApplication {",
      "  public static void main(String[] args) {",
      "    SpringApplication.run(AiChatbotPlatformApplication.class, args);",
      "  }",
      "}",
      ""
    ].join("\n")
  );

  write(
    "src/main/java/com/aifactory/chatbot/controller/HealthController.java",
    [
      "package com.aifactory.chatbot.controller;",
      "",
      "import java.util.Map;",
      "import org.springframework.web.bind.annotation.GetMapping;",
      "import org.springframework.web.bind.annotation.RestController;",
      "",
      "@RestController",
      "public class HealthController {",
      "  @GetMapping(\"/health\")",
      "  public Map<String, Object> health() {",
      "    return Map.of(\"success\", true, \"service\", \"spring-boot-backend\");",
      "  }",
      "}",
      ""
    ].join("\n")
  );

  write(
    "src/main/java/com/aifactory/chatbot/controller/ChatbotController.java",
    [
      "package com.aifactory.chatbot.controller;",
      "",
      "import java.util.List;",
      "import java.util.Map;",
      "import org.springframework.web.bind.annotation.GetMapping;",
      "import org.springframework.web.bind.annotation.PostMapping;",
      "import org.springframework.web.bind.annotation.RequestBody;",
      "import org.springframework.web.bind.annotation.RequestMapping;",
      "import org.springframework.web.bind.annotation.RestController;",
      "",
      "@RestController",
      "@RequestMapping(\"/api/chatbots\")",
      "public class ChatbotController {",
      "  @GetMapping",
      "  public Map<String, Object> list() {",
      "    return Map.of(\"success\", true, \"chatbots\", List.of());",
      "  }",
      "",
      "  @PostMapping",
      "  public Map<String, Object> create(@RequestBody Map<String, Object> input) {",
      "    return Map.of(\"success\", true, \"chatbot\", input);",
      "  }",
      "}",
      ""
    ].join("\n")
  );

  write(
    "src/main/resources/application.yml",
    [
      "server:",
      "  port: ${PORT:3000}",
      "",
      "spring:",
      "  datasource:",
      "    url: ${DATABASE_URL:jdbc:postgresql://database:5432/app}",
      "    username: ${DATABASE_USER:app}",
      "    password: ${DATABASE_PASSWORD:app}",
      "  jpa:",
      "    hibernate:",
      "      ddl-auto: update",
      "management:",
      "  endpoints:",
      "    web:",
      "      exposure:",
      "        include: health,info",
      ""
    ].join("\n")
  );

  write(
    "Dockerfile",
    [
      "FROM maven:3.9.9-eclipse-temurin-21-alpine AS build",
      "WORKDIR /app",
      "COPY pom.xml ./",
      "RUN mvn -q -DskipTests dependency:go-offline",
      "COPY src ./src",
      "RUN mvn -q -DskipTests package",
      "",
      "FROM eclipse-temurin:21-jre-alpine",
      "WORKDIR /app",
      "COPY --from=build /app/target/*.jar app.jar",
      "EXPOSE 3000",
      'HEALTHCHECK CMD wget --spider -q http://localhost:3000/health || exit 1',
      'CMD ["java", "-jar", "app.jar"]',
      ""
    ].join("\n")
  );

  return files;
}


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
  const stackContract = ensureTechnologyStackConfirmed();
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
  if (execution.role === "backend" && isSpringBootBackend(stackContract)) {
    const springFiles = writeSpringBootBackend(execution);
    generatedFiles.push(...springFiles);
  } else if (execution.role === "backend") {
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
            express: "^4.22.1",
            pg: "^8.20.0",
            zod: "^3.25.76",
            helmet: "^7.2.0",
            "pino-http": "^8.6.1",
            pino: "^8.21.0",
            ioredis: "^5.10.1",
            bullmq: "^5.76.7",
            uuid: "^9.0.1"
          },
          devDependencies: {
            "@types/express": "^4.17.25",
            "@types/pg": "^8.20.0",
            "@types/node": "^20.19.40",
            "@types/jest": "^29.5.14",
            "@types/uuid": "^9.0.8",
            tsx: "^4.21.0",
            typescript: "^5.9.3",
            jest: "^29.7.0",
            "ts-jest": "^29.4.9",
            "ioredis-mock": "^8.13.1",
            supertest: "^7.2.0",
            "@types/supertest": "^6.0.3"
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
            build: "tsc -b && vite build",
            preview: "vite preview",
            test: "vitest run"
          },
          dependencies: {
            react: "^18.3.1",
            "react-dom": "^18.3.1"
          },
          devDependencies: {
            "@vitejs/plugin-react": "^4.7.0",
            vite: "^5.4.21",
            typescript: "^5.9.3",
            vitest: "^2.1.9",
            jsdom: "^24.1.3",
            "@types/node": "^20.19.40",
            "@types/react": "^18.3.28",
            "@types/react-dom": "^18.3.7",
            "@testing-library/jest-dom": "^6.9.1",
            "@testing-library/react": "^14.3.1",
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
            useDefineForClassFields: true,
            lib: ["DOM", "DOM.Iterable", "ES2022"],
            allowJs: false,
            skipLibCheck: true,
            esModuleInterop: true,
            allowSyntheticDefaultImports: true,
            strict: true,
            forceConsistentCasingInFileNames: true,
            module: "ESNext",
            moduleResolution: "bundler",
            resolveJsonModule: true,
            isolatedModules: true,
            noEmit: true,
            jsx: "react-jsx",
            types: ["node", "vitest/globals", "@testing-library/jest-dom"]
          },
          include: ["src"]
        },
        null,
        2
      )
    );

    generatedFiles.push(frontendTsconfigFile);

    const frontendViteConfigFile = path.join(
      execution.workspacePath,
      "frontend/vite.config.ts"
    );

    safeWriteFile(
      frontendViteConfigFile,
      [
        "import { defineConfig } from 'vite';",
        "import react from '@vitejs/plugin-react';",
        "",
        "export default defineConfig({",
        "  plugins: [react()],",
        "  test: {",
        "    globals: true,",
        "    environment: 'jsdom',",
        "    setupFiles: './src/setupTests.ts'",
        "  }",
        "});",
        ""
      ].join("\n")
    );

    generatedFiles.push(frontendViteConfigFile);

    const frontendIndexHtmlFile = path.join(
      execution.workspacePath,
      "frontend/index.html"
    );

    safeWriteFile(
      frontendIndexHtmlFile,
      [
        "<!doctype html>",
        "<html lang=\"en\">",
        "  <head>",
        "    <meta charset=\"UTF-8\" />",
        "    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\" />",
        "    <title>AI SDLC Generated App</title>",
        "  </head>",
        "  <body>",
        "    <div id=\"root\"></div>",
        "    <script type=\"module\" src=\"/src/main.tsx\"></script>",
        "  </body>",
        "</html>",
        ""
      ].join("\n")
    );

    generatedFiles.push(frontendIndexHtmlFile);

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


  const stackSpecificRequirements = `
APPROVED TECHNOLOGY STACK:
- Backend: ${stackContract.backend.language} / ${stackContract.backend.framework} / ${stackContract.backend.runtime} / ${stackContract.backend.packageManager}
- Frontend: ${stackContract.frontend.language} / ${stackContract.frontend.framework} / ${stackContract.frontend.runtime} / ${stackContract.frontend.packageManager}
- Database: ${stackContract.database.engine}

STACK COMPLIANCE RULES:
- You MUST generate code only for the approved stack.
- If role is backend, use ONLY ${stackContract.backend.language} and ${stackContract.backend.framework}.
- If role is frontend, use ONLY ${stackContract.frontend.language} and ${stackContract.frontend.framework}.
- If role is database, use ONLY ${stackContract.database.engine}.
- Do NOT generate Express/Node/TypeScript backend unless backend stack explicitly says TypeScript/Express.
- Do NOT generate Spring Boot unless backend stack explicitly says Java/Spring Boot.
- Do NOT generate files from another backend framework.
- Required backend build system must be ${stackContract.backend.packageManager}.
- Required frontend package manager must be ${stackContract.frontend.packageManager}.
`;

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
${stackSpecificRequirements}

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

    const stabilized = stabilizeGeneratedApp(execution.workspacePath, execution.role);

    logger.info({
      type: "GENERATED_APP_STABILIZATION_COMPLETE",
      workerId: execution.workerId,
      role: execution.role,
      stabilized
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
