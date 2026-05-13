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

export function stabilizeGeneratedApp(workerPath: string, role: string): string[] {
  const touched: string[] = [];

  if (role === "frontend") {
    stabilizeFrontend(path.join(workerPath, "frontend"));
    touched.push("frontend");
  }

  if (role === "backend") {
    sanitizeTsFiles(path.join(workerPath, "backend/src"));
    stabilizeExpressRoutes(path.join(workerPath, "backend"));
    stabilizeFastifyBackend(path.join(workerPath, "backend"));
    touched.push("backend");
  }

  return touched;
}
