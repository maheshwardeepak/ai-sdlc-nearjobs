import fs from "fs";
import path from "path";
import { loadTechnologyStackContract } from "./technologyStackContract.js";

export type StackInfraOutput = {
  success: boolean;
  stack: unknown;
  generatedFiles: string[];
  createdAt: string;
};

function write(filePath: string, content: string): string {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
  return filePath;
}

function backendDockerfile(stack: ReturnType<typeof loadTechnologyStackContract>): string {
  if (stack.backend.language === "Go") {
    return [
      "FROM golang:1.23-alpine AS builder",
      "WORKDIR /app",
      "COPY go.mod go.sum* ./",
      "RUN go mod download",
      "COPY . .",
      "RUN go build -o server ./cmd/server",
      "",
      "FROM alpine:3.20",
      "WORKDIR /app",
      "COPY --from=builder /app/server ./server",
      "EXPOSE 3000",
      "CMD [\"./server\"]",
      ""
    ].join("\n");
  }

  return [
    "FROM node:22-alpine AS deps",
    "WORKDIR /app",
    "COPY package.json pnpm-lock.yaml* ./",
    "RUN corepack enable && pnpm install --frozen-lockfile=false",
    "",
    "FROM node:22-alpine AS build",
    "WORKDIR /app",
    "COPY --from=deps /app/node_modules ./node_modules",
    "COPY . .",
    "RUN corepack enable && pnpm run build",
    "",
    "FROM node:22-alpine",
    "WORKDIR /app",
    "COPY --from=build /app .",
    "EXPOSE 3000",
    "CMD [\"pnpm\", \"run\", \"dev\"]",
    ""
  ].join("\n");
}

function frontendDockerfile(stack: ReturnType<typeof loadTechnologyStackContract>): string {
  if (stack.frontend.framework === "Next.js") {
    return [
      "FROM node:22-alpine AS deps",
      "WORKDIR /app",
      "COPY package.json pnpm-lock.yaml* ./",
      "RUN corepack enable && pnpm install --frozen-lockfile=false",
      "",
      "FROM node:22-alpine AS build",
      "WORKDIR /app",
      "COPY --from=deps /app/node_modules ./node_modules",
      "COPY . .",
      "RUN corepack enable && pnpm run build",
      "",
      "FROM node:22-alpine",
      "WORKDIR /app",
      "COPY --from=build /app .",
      "EXPOSE 3000",
      "CMD [\"pnpm\", \"start\"]",
      ""
    ].join("\n");
  }

  return [
    "FROM node:22-alpine AS deps",
    "WORKDIR /app",
    "COPY package.json pnpm-lock.yaml* ./",
    "RUN corepack enable && pnpm install --frozen-lockfile=false",
    "",
    "FROM node:22-alpine AS build",
    "WORKDIR /app",
    "COPY --from=deps /app/node_modules ./node_modules",
    "COPY . .",
    "RUN corepack enable && pnpm run build",
    "",
    "FROM nginx:1.27-alpine",
    "COPY --from=build /app/dist /usr/share/nginx/html",
    "EXPOSE 80",
    ""
  ].join("\n");
}

function composeDatabase(stack: ReturnType<typeof loadTechnologyStackContract>): string[] {
  if (stack.database.engine === "MySQL") {
    return [
      "  database:",
      "    image: mysql:8.4",
      "    environment:",
      "      MYSQL_ROOT_PASSWORD: root",
      "      MYSQL_DATABASE: app",
      "      MYSQL_USER: app",
      "      MYSQL_PASSWORD: app",
      "    ports:",
      '      - "3306:3306"',
      "    healthcheck:",
      "      test: [\"CMD\", \"mysqladmin\", \"ping\", \"-h\", \"localhost\"]",
      "      interval: 10s",
      "      timeout: 5s",
      "      retries: 5"
    ];
  }

  return [
    "  database:",
    "    image: postgres:16-alpine",
    "    environment:",
    "      POSTGRES_DB: app",
    "      POSTGRES_USER: app",
    "      POSTGRES_PASSWORD: app",
    "    ports:",
    '      - "5432:5432"',
    "    healthcheck:",
    "      test: [\"CMD-SHELL\", \"pg_isready -U app -d app\"]",
    "      interval: 10s",
    "      timeout: 5s",
    "      retries: 5"
  ];
}

function dockerCompose(stack: ReturnType<typeof loadTechnologyStackContract>): string {
  const frontendPort = stack.frontend.framework === "Next.js" ? "3001:3000" : "5173:80";

  return [
    "services:",
    "  backend:",
    "    build: ./backend",
    "    environment:",
    "      DATABASE_HOST: database",
    "      DATABASE_NAME: app",
    "      DATABASE_USER: app",
    "      DATABASE_PASSWORD: app",
    "    ports:",
    '      - "3000:3000"',
    "    depends_on:",
    "      database:",
    "        condition: service_healthy",
    "",
    "  frontend:",
    "    build: ./frontend",
    "    environment:",
    "      API_BASE_URL: http://localhost:3000",
    "    ports:",
    `      - "${frontendPort}"`,
    "    depends_on:",
    "      - backend",
    "",
    ...composeDatabase(stack),
    ""
  ].join("\n");
}

function buildCommands(stack: ReturnType<typeof loadTechnologyStackContract>): string[] {
  const backend =
    stack.backend.language === "Go"
      ? "cd backend && go mod tidy && go build ./..."
      : "cd backend && pnpm install && pnpm run build";

  const frontend =
    stack.frontend.framework === "Next.js"
      ? "cd frontend && pnpm install && pnpm run build"
      : "cd frontend && pnpm install && pnpm run build";

  return [
    backend,
    frontend,
    "docker compose build",
    "docker compose up -d",
    "docker compose ps"
  ];
}

export function generateStackInfra(outputRoot = "artifacts/infra"): StackInfraOutput {
  const stack = loadTechnologyStackContract();
  const root = path.resolve(process.cwd(), outputRoot);
  const generatedFiles: string[] = [];

  generatedFiles.push(write(path.join(root, "backend/Dockerfile"), backendDockerfile(stack)));
  generatedFiles.push(write(path.join(root, "frontend/Dockerfile"), frontendDockerfile(stack)));
  generatedFiles.push(write(path.join(root, "docker-compose.yml"), dockerCompose(stack)));
  generatedFiles.push(
    write(
      path.join(root, "build-commands.json"),
      JSON.stringify({ commands: buildCommands(stack) }, null, 2)
    )
  );

  const output = {
    success: true,
    stack,
    generatedFiles,
    createdAt: new Date().toISOString()
  };

  generatedFiles.push(
    write(path.join(root, "stack-infra-report.json"), JSON.stringify(output, null, 2))
  );

  return output;
}

function findWorkerAppRoot(workspaceRoot: string, appName: "backend" | "frontend"): string | null {
  const workersRoot = path.join(workspaceRoot, "workers");

  if (!fs.existsSync(workersRoot)) {
    return null;
  }

  for (const worker of fs.readdirSync(workersRoot, { withFileTypes: true })) {
    if (!worker.isDirectory()) continue;

    const appRoot = path.join(workersRoot, worker.name, appName);
    const packageJson = path.join(appRoot, "package.json");

    if (fs.existsSync(packageJson)) {
      return appRoot;
    }
  }

  return null;
}

export function generateStackInfraForWorkspace(
  workspaceRootInput: string
): StackInfraOutput {
  const stack = loadTechnologyStackContract();
  const workspaceRoot = path.resolve(process.cwd(), workspaceRootInput);

  const backendRoot = findWorkerAppRoot(workspaceRoot, "backend");
  const frontendRoot = findWorkerAppRoot(workspaceRoot, "frontend");

  if (!backendRoot) {
    throw new Error(`Generated backend app not found in ${workspaceRoot}`);
  }

  if (!frontendRoot) {
    throw new Error(`Generated frontend app not found in ${workspaceRoot}`);
  }

  const generatedFiles: string[] = [];

  generatedFiles.push(write(path.join(backendRoot, "Dockerfile"), backendDockerfile(stack)));
  generatedFiles.push(write(path.join(frontendRoot, "Dockerfile"), frontendDockerfile(stack)));

  const compose = dockerCompose(stack)
    .replace("build: ./backend", `build: ${path.relative(workspaceRoot, backendRoot)}`)
    .replace("build: ./frontend", `build: ${path.relative(workspaceRoot, frontendRoot)}`);

  generatedFiles.push(write(path.join(workspaceRoot, "docker-compose.yml"), compose));

  generatedFiles.push(
    write(
      path.join(workspaceRoot, "build-commands.json"),
      JSON.stringify({ commands: buildCommands(stack) }, null, 2)
    )
  );

  const output = {
    success: true,
    stack,
    generatedFiles,
    createdAt: new Date().toISOString()
  };

  generatedFiles.push(
    write(path.join(workspaceRoot, "stack-infra-report.json"), JSON.stringify(output, null, 2))
  );

  return output;
}
