import fs from "fs";
import path from "path";
import net from "net";
import { loadTechnologyStackContract } from "./technologyStackContract.js";


const PORT_REGISTRY_PATH = path.resolve(
  process.cwd(),
  "runtime/port-registry.json"
);


function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once("error", () => {
      resolve(false);
    });

    server.once("listening", () => {
      server.close(() => resolve(true));
    });

    server.listen(port, "0.0.0.0");
  });
}

async function findAvailablePort(
  start: number,
  usedPorts: Set<number>
): Promise<number> {
  let port = start;

  while (true) {
    const available =
      !usedPorts.has(port) &&
      await isPortAvailable(port);

    if (available) {
      usedPorts.add(port);
      return port;
    }

    port++;
  }
}


type RuntimePorts = {
  backend: number;
  frontend: number;
  postgres: number;
  redis: number;
};

function loadPortRegistry(): Record<string, RuntimePorts> {
  if (!fs.existsSync(PORT_REGISTRY_PATH)) {
    return {};
  }

  return JSON.parse(fs.readFileSync(PORT_REGISTRY_PATH, "utf8"));
}

function savePortRegistry(registry: Record<string, RuntimePorts>): void {
  fs.mkdirSync(path.dirname(PORT_REGISTRY_PATH), { recursive: true });

  fs.writeFileSync(
    PORT_REGISTRY_PATH,
    JSON.stringify(registry, null, 2)
  );
}

async function allocatePorts(projectName: string): Promise<RuntimePorts> {
  const registry = loadPortRegistry();

  if (registry[projectName]) {
    return registry[projectName];
  }

  const usedPorts = new Set<number>();

  Object.values(registry).forEach((ports) => {
    usedPorts.add(ports.backend);
    usedPorts.add(ports.frontend);
    usedPorts.add(ports.postgres);
    usedPorts.add(ports.redis);
  });

  const ports: RuntimePorts = {
    backend: await findAvailablePort(3000, usedPorts),
    frontend: await findAvailablePort(5173, usedPorts),
    postgres: await findAvailablePort(5432, usedPorts),
    redis: await findAvailablePort(6379, usedPorts)
  };

  registry[projectName] = ports;

  savePortRegistry(registry);

  return ports;
}


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
  if (
    stack.backend.language === "Java" &&
    stack.backend.framework === "Spring Boot"
  ) {
    return [
      "FROM maven:3.9.9-eclipse-temurin-21-alpine AS build",
      "WORKDIR /app",
      "COPY pom.xml ./",
      "RUN mvn -q dependency:go-offline",
      "COPY src ./src",
      "RUN mvn -q package",
      "",
      "FROM eclipse-temurin:21-jre-alpine",
      "WORKDIR /app",
      "COPY --from=build /app/target/*.jar app.jar",
      "EXPOSE 3000",
      "CMD [\"java\", \"-jar\", \"app.jar\"]",
      ""
    ].join("\n");
  }


  if (
    stack.backend.language === "Python" &&
    stack.backend.framework === "FastAPI"
  ) {
    return [
      "FROM python:3.12-alpine",
      "WORKDIR /app",
      "COPY requirements.txt ./",
      "RUN pip install --no-cache-dir -r requirements.txt",
      "COPY . .",
      "EXPOSE 3000",
      'CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "3000"]',
      ""
    ].join("\\n");
  }


  if (
    stack.backend.language === "C#" &&
    stack.backend.framework === "ASP.NET Core"
  ) {
    return [
      "FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build",
      "WORKDIR /src",
      "COPY . .",
      "RUN dotnet publish -c Release -o /app/publish",
      "",
      "FROM mcr.microsoft.com/dotnet/aspnet:8.0",
      "WORKDIR /app",
      "COPY --from=build /app/publish .",
      "EXPOSE 3000",
      'ENV ASPNETCORE_URLS=http://+:3000',
      'CMD ["dotnet", "App.dll"]',
      ""
    ].join("\\n");
  }


  if (
    stack.backend.language === "TypeScript" &&
    stack.backend.framework === "NestJS"
  ) {
    return [
      "FROM node:22-alpine",
      "WORKDIR /app",
      "COPY package.json pnpm-lock.yaml* ./",
      "RUN corepack enable && corepack prepare pnpm@10.17.1 --activate && pnpm install --frozen-lockfile=false",
      "COPY . .",
      "RUN corepack enable && corepack prepare pnpm@10.17.1 --activate && pnpm run build",
      "EXPOSE 3000",
      'CMD ["pnpm", "start:prod"]',
      ""
    ].join("\\n");
  }

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
    "RUN corepack enable && corepack prepare pnpm@10.17.1 --activate && pnpm install --frozen-lockfile=false",
    "",
    "FROM node:22-alpine AS build",
    "WORKDIR /app",
    "COPY . .",
    "RUN corepack enable && corepack prepare pnpm@10.17.1 --activate && pnpm install --frozen-lockfile=false",
    "RUN corepack enable && corepack prepare pnpm@10.17.1 --activate && pnpm run build",
    "",
    "FROM node:22-alpine",
    "WORKDIR /app",
    "COPY --from=build /app .",
    "EXPOSE 3000",
    "CMD [\"sh\", \"-c\", \"corepack enable && corepack prepare pnpm@10.17.1 --activate && pnpm run dev\"]",
    ""
  ].join("\n");
}

function frontendDockerfile(stack: ReturnType<typeof loadTechnologyStackContract>): string {
  if (stack.frontend.framework === "Next.js") {
    return [
      "FROM node:22-alpine AS deps",
      "WORKDIR /app",
      "COPY package.json pnpm-lock.yaml* ./",
      "RUN corepack enable && corepack prepare pnpm@10.17.1 --activate && pnpm install --frozen-lockfile=false",
      "",
      "FROM node:22-alpine AS build",
      "WORKDIR /app",
      "COPY --from=deps /app/node_modules ./node_modules",
      "COPY . .",
      "RUN corepack enable && corepack prepare pnpm@10.17.1 --activate && pnpm run build",
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
    "RUN corepack enable && corepack prepare pnpm@10.17.1 --activate && pnpm install --frozen-lockfile=false",
    "",
    "FROM node:22-alpine AS build",
    "WORKDIR /app",
    "COPY . .",
    "RUN corepack enable && corepack prepare pnpm@10.17.1 --activate && pnpm install --frozen-lockfile=false",
    "RUN corepack enable && corepack prepare pnpm@10.17.1 --activate && pnpm run build",
    "",
    "FROM nginx:1.27-alpine",
    "COPY --from=build /app/dist /usr/share/nginx/html",
    "EXPOSE 80",
    ""
  ].join("\n");
}

function composeDatabase(stack: ReturnType<typeof loadTechnologyStackContract>, ports: RuntimePorts): string[] {
  if (stack.database.engine === "SQLite") {
    return [];
  }

  if (stack.database.engine === "MongoDB") {
    return [
      "  database:",
      "    image: mongo:7",
      "    environment:",
      "      MONGO_INITDB_DATABASE: app",
      "    ports:",
      `      - "${ports.postgres}:27017"`,
      "    healthcheck:",
      "      test: [\"CMD\", \"mongosh\", \"--eval\", \"db.adminCommand('ping')\"]",
      "      interval: 10s",
      "      timeout: 5s",
      "      retries: 5"
    ];
  }

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
      `      - "${ports.postgres}:3306"`,
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
    `      - "${ports.postgres}:5432"`,
    "    healthcheck:",
    "      test: [\"CMD-SHELL\", \"pg_isready -U app -d app\"]",
    "      interval: 10s",
    "      timeout: 5s",
    "      retries: 5"
  ];
}


function databaseUrl(stack: ReturnType<typeof loadTechnologyStackContract>): string {
  if (stack.database.engine === "MySQL") {
    return "jdbc:mysql://database:3306/app";
  }

  if (stack.database.engine === "MongoDB") {
    return "mongodb://database:27017/app";
  }

  if (stack.database.engine === "SQLite") {
    return "file:./data/app.db";
  }

  return "jdbc:postgresql://database:5432/app";
}

function backendDependsOn(stack: ReturnType<typeof loadTechnologyStackContract>): string[] {
  if (stack.database.engine === "SQLite") {
    return [
      "    depends_on:",
      "      redis:",
      "        condition: service_started"
    ];
  }

  return [
    "    depends_on:",
    "      database:",
    "        condition: service_healthy",
    "      redis:",
    "        condition: service_started"
  ];
}


function dockerCompose(stack: ReturnType<typeof loadTechnologyStackContract>, ports: RuntimePorts): string {
  const frontendPort =
    stack.frontend.framework === "Next.js"
      ? `${ports.frontend}:3000`
      : `${ports.frontend}:80`;
  const dbUrl = databaseUrl(stack);
  const backendDependencies = backendDependsOn(stack);

  return [
    "services:",
    "  backend:",
    "    build: ./backend",
    "    environment:",
    "      DATABASE_HOST: database",
    "      DATABASE_NAME: app",
    "      DATABASE_USER: app",
    "      DATABASE_PASSWORD: app",
    `      DATABASE_URL: ${dbUrl}`,
    "      REDIS_URL: redis://redis:6379",
    "      JWT_SECRET: development-super-secret-jwt-key-32chars",
    "      JWT_ISSUER: ai-sdlc-factory",
    "      JWT_AUDIENCE: ai-sdlc-clients",
    "    ports:",
    `      - "${ports.backend}:3000"`,
    ...backendDependencies,
    "",
    "  frontend:",
    "    build: ./frontend",
    "    environment:",
    `      API_BASE_URL: http://localhost:${ports.backend}`,
    "    ports:",
    `      - "${frontendPort}"`,
    "    depends_on:",
    "      - backend",
    "",
    ...composeDatabase(stack, ports),
    "",
    "  redis:",
    "    image: redis:7-alpine",
    "    ports:",
    `      - "${ports.redis}:6379"`,
    ""
  ].join("\n");
}

function buildCommands(stack: ReturnType<typeof loadTechnologyStackContract>): string[] {
  let backend = "cd backend && pnpm install && pnpm run build";

  if (
    stack.backend.language === "Java" &&
    stack.backend.framework === "Spring Boot"
  ) {
    backend = "cd backend && mvn -q package";
  }

  if (
    stack.backend.language === "TypeScript" &&
    stack.backend.framework === "NestJS"
  ) {
    backend = "cd backend && pnpm install && pnpm run build";
  }

  if (
    stack.backend.language === "Python" &&
    stack.backend.framework === "FastAPI"
  ) {
    backend = "cd backend && pip install -r requirements.txt";
  }

  if (stack.backend.language === "Go") {
    backend = "cd backend && go mod tidy && go build ./...";
  }

  if (
    stack.backend.language === "C#" &&
    stack.backend.framework === "ASP.NET Core"
  ) {
    backend = "cd backend && dotnet publish -c Release";
  }

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

export async function generateStackInfra(outputRoot = "artifacts/infra"): Promise<StackInfraOutput> {
  const stack = loadTechnologyStackContract();
  const root = path.resolve(process.cwd(), outputRoot);
  const generatedFiles: string[] = [];
  const projectName = path.basename(root).toLowerCase();
  const ports = await allocatePorts(projectName);

  generatedFiles.push(write(path.join(root, "backend/Dockerfile"), backendDockerfile(stack)));
  generatedFiles.push(write(path.join(root, "frontend/Dockerfile"), frontendDockerfile(stack)));
  generatedFiles.push(write(path.join(root, "docker-compose.yml"), dockerCompose(stack, ports)));
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

    const markers = [
      "package.json",
      "pom.xml",
      "build.gradle",
      "go.mod",
      "pyproject.toml",
      "Cargo.toml"
    ];

    const found = markers.some((marker) =>
      fs.existsSync(path.join(appRoot, marker))
    );

    if (found) {
      return appRoot;
    }
  }

  return null;
}

export async function generateStackInfraForWorkspace(
  workspaceRootInput: string
): Promise<StackInfraOutput> {
  const stack = loadTechnologyStackContract();
  const workspaceRoot = path.resolve(process.cwd(), workspaceRootInput);
  const projectName = path.basename(workspaceRoot).toLowerCase();
  const ports = await allocatePorts(projectName);

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

  const compose = dockerCompose(stack, ports)
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
