import fs from "fs";
import path from "path";

function safeWrite(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}

function sanitizeTsFiles(root: string): void {
  if (!fs.existsSync(root)) return;

  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);

    if (entry.isDirectory()) {
      sanitizeTsFiles(full);
      continue;
    }

    if (!full.endsWith(".ts") && !full.endsWith(".tsx")) continue;

    let text = fs.readFileSync(full, "utf8");

    text = text
      .replace(/z\.stri…\((\d+),/g, "z.string().min($1,")
      .replace(/z\.stri…l\(\)/g, "z.string().optional()")
      .replace(/z\.stri…ult\(/g, "z.string().default(")
      .replace(/z\.stri…/g, "z.string")
      .replace(/proces…CRET/g, "process.env.JWT_SECRET");

    fs.writeFileSync(full, text);
  }
}


function removeExpressArtifacts(backendRoot: string): void {
  const routesRoot = path.join(backendRoot, "src/routes");

  if (!fs.existsSync(routesRoot)) return;

  for (const file of fs.readdirSync(routesRoot)) {
    const full = path.join(routesRoot, file);

    if (!full.endsWith(".ts")) continue;

    const text = fs.readFileSync(full, "utf8");

    if (
      text.includes("from 'express'") ||
      text.includes('from "express"')
    ) {
      fs.unlinkSync(full);
    }
  }
}

function stabilizeExpressRoutes(backendRoot: string): void {
  const routesRoot = path.join(backendRoot, "src/routes");
  if (!fs.existsSync(routesRoot)) return;

  for (const file of fs.readdirSync(routesRoot)) {
    if (!file.endsWith(".ts")) continue;

    const full = path.join(routesRoot, file);
    let text = fs.readFileSync(full, "utf8");

    if (text.includes('from "express"') && !text.includes("type Router as ExpressRouter")) {
      text = text.replace(
        'import { Router } from "express";',
        'import { Router, type Router as ExpressRouter } from "express";'
      );

      text = text.replace(
        /const router = Router\(\);/g,
        "const router: ExpressRouter = Router();"
      );

      text = text.replace(
        /export const usersRouter = Router\(\);/g,
        "export const usersRouter: ExpressRouter = Router();"
      );

      fs.writeFileSync(full, text);
    }
  }
}


function stabilizeFastifyBackend(backendRoot: string): void {
  const appFile = path.join(backendRoot, "src/http/app.ts");
  if (fs.existsSync(appFile)) {
    let text = fs.readFileSync(appFile, "utf8");

    text = text.replace(
      "import Fastify, { FastifyInstance } from 'fastify';",
      "import Fastify, { type FastifyInstance, type RawServerDefault } from 'fastify';"
    );

    text = text.replace(
      "import Fastify, { type FastifyInstance } from 'fastify';",
      "import Fastify, { type FastifyInstance, type RawServerDefault } from 'fastify';"
    );

    text = text.replace("import { getLogger } from '../logging/logger';\n", "");
    text = text.replace("    logger: getLogger(),\n", "    logger: true,\n");

    text = text.replace(
      "  const app = Fastify({ http2: false,",
      "  const app: FastifyInstance<RawServerDefault> = Fastify({"
    );

    text = text.replace(
      "  const app = Fastify({",
      "  const app: FastifyInstance<RawServerDefault> = Fastify({"
    );

    fs.writeFileSync(appFile, text);
  }

  const routesFile = path.join(backendRoot, "src/http/routes.ts");
  if (fs.existsSync(routesFile)) {
    let text = fs.readFileSync(routesFile, "utf8");

    text = text.replace(
      "import type { FastifyInstance } from 'fastify';",
      "import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';"
    );

    text = text.replace(
      "    async (req, reply) => {",
      "    async (req: FastifyRequest, reply: FastifyReply) => {"
    );

    text = text.replace(
      "        await req.jwtVerify();",
      "        await (req as FastifyRequest & { jwtVerify: () => Promise<void> }).jwtVerify();"
    );

    text = text.replace(
      "        const payload = req.user as JwtPayload;",
      "        const payload = (req as FastifyRequest & { user: JwtPayload }).user;"
    );

    fs.writeFileSync(routesFile, text);
  }

  const userRepoFile = path.join(backendRoot, "src/repositories/userRepository.ts");
  if (fs.existsSync(userRepoFile)) {
    let text = fs.readFileSync(userRepoFile, "utf8");

    text = text.replace(
      "  return result.rows[0];",
      "  const user = result.rows[0];\n  if (!user) {\n    throw new Error('User creation failed: no row returned');\n  }\n  return user;"
    );

    fs.writeFileSync(userRepoFile, text);
  }
}


function stabilizeFrontend(frontendRoot: string): void {
  if (!fs.existsSync(frontendRoot)) return;

  safeWrite(
    path.join(frontendRoot, "index.html"),
    [
      "<!doctype html>",
      '<html lang="en">',
      "  <head>",
      '    <meta charset="UTF-8" />',
      '    <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
      "    <title>AI SDLC Generated App</title>",
      "  </head>",
      "  <body>",
      '    <div id="root"></div>',
      '    <script type="module" src="/src/main.tsx"></script>',
      "  </body>",
      "</html>",
      ""
    ].join("\n")
  );

  safeWrite(
    path.join(frontendRoot, "vite.config.ts"),
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

  safeWrite(
    path.join(frontendRoot, "tsconfig.json"),
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

  const pkgPath = path.join(frontendRoot, "package.json");
  const pkg = fs.existsSync(pkgPath)
    ? JSON.parse(fs.readFileSync(pkgPath, "utf8"))
    : {};

  pkg.type = "module";
  pkg.scripts = {
    dev: "vite",
    build: "tsc -b && vite build",
    preview: "vite preview",
    test: "vitest run"
  };
  pkg.dependencies = {
    react: "^18.3.1",
    "react-dom": "^18.3.1"
  };
  pkg.devDependencies = {
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
  };

  safeWrite(pkgPath, JSON.stringify(pkg, null, 2));
}


function reconcileNodeDependencies(appRoot: string): void {
  const pkgPath = path.join(appRoot, "package.json");

  if (!fs.existsSync(pkgPath)) return;

  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  pkg.dependencies = pkg.dependencies || {};
  pkg.devDependencies = pkg.devDependencies || {};

  const sourceRoot = path.join(appRoot, "src");
  if (!fs.existsSync(sourceRoot)) return;

  const importMap: Record<string, string> = {
    helmet: "^7.2.0",
    compression: "^1.8.1",
    "pino-http": "^9.0.0",
    dotenv: "^16.6.1",
    "express-rate-limit": "^7.5.1",
    argon2: "^0.31.2",
    jsonwebtoken: "^9.0.3",
    uuid: "^9.0.1",
    openai: "^4.104.0",
    ioredis: "^5.10.1",
    zod: "^3.25.76",
    cors: "^2.8.6",
    express: "^4.22.2",
    pg: "^8.20.0",
    pino: "^8.21.0"
  };

  const devImportMap: Record<string, string> = {
    "@types/compression": "^1.8.1",
    "@types/jsonwebtoken": "^9.0.10",
    "@types/uuid": "^9.0.8",
    "@types/cors": "^2.8.19",
    "@types/express": "^4.17.25",
    "@types/pg": "^8.20.0",
    "@types/node": "^20.19.40",
    typescript: "^5.9.3"
  };

  const files = fs.readdirSync(sourceRoot, { recursive: true })
    .filter((file) => String(file).endsWith(".ts"))
    .map((file) => path.join(sourceRoot, String(file)));

  const source = files
    .map((file) => fs.readFileSync(file, "utf8"))
    .join("\n");

  for (const [dependency, version] of Object.entries(importMap)) {
    if (
      source.includes(`from '${dependency}'`) ||
      source.includes(`from "${dependency}"`) ||
      source.includes(`require('${dependency}')`) ||
      source.includes(`require("${dependency}")`)
    ) {
      pkg.dependencies[dependency] = pkg.dependencies[dependency] || version;
    }
  }

  for (const [dependency, version] of Object.entries(devImportMap)) {
    pkg.devDependencies[dependency] = pkg.devDependencies[dependency] || version;
  }

  safeWrite(pkgPath, JSON.stringify(pkg, null, 2));
}


export function stabilizeGeneratedApp(workerPath: string, role: string): string[] {
  const touched: string[] = [];

  if (role === "frontend") {
    stabilizeFrontend(path.join(workerPath, "frontend"));
    touched.push("frontend");
  }

  if (role === "backend") {
    sanitizeTsFiles(path.join(workerPath, "backend/src"));
    reconcileNodeDependencies(path.join(workerPath, "backend"));
    stabilizeExpressRoutes(path.join(workerPath, "backend"));
    stabilizeFastifyBackend(path.join(workerPath, "backend"));
    touched.push("backend");
  }

  return touched;
}
