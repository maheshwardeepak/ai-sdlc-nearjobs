# OpenClaw Output

model.run via local
provider: anthropic
model: claude-opus-4-7
outputs: 1
# NearJobs - Production Backend Implementation

I'll build a production-grade backend for **NearJobs** - a location-based job marketplace where users find jobs near them.

## Tech Stack
- **Node.js + TypeScript** + **Fastify** (faster than Express)
- **PostgreSQL + PostGIS** (geospatial queries)
- **Prisma ORM**
- **Redis** (caching, rate limiting)
- **JWT** auth with refresh tokens
- **Argon2** password hashing
- **Zod** validation
- **Pino** logging
- **Vitest** testing
- **Docker** deployment

---

## Project Structure

```
nearjobs/
├── src/
│   ├── config/
│   ├── modules/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── jobs/
│   │   └── applications/
│   ├── plugins/
│   ├── lib/
│   ├── middleware/
│   ├── types/
│   ├── app.ts
│   └── server.ts
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── tests/
├── Dockerfile
├── docker-compose.yml
└── package.json
```

---

### `package.json`

```json
{
  "name": "nearjobs-backend",
  "version": "1.0.0",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "start": "node dist/server.js",
    "dev": "tsx watch src/server.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate deploy",
    "prisma:migrate:dev": "prisma migrate dev",
    "lint": "eslint src --ext .ts"
  },
  "dependencies": {
    "@fastify/cors": "^9.0.1",
    "@fastify/helmet": "^11.1.1",
    "@fastify/jwt": "^8.0.0",
    "@fastify/rate-limit": "^9.1.0",
    "@fastify/swagger": "^8.14.0",
    "@fastify/swagger-ui": "^3.0.0",
    "@prisma/client": "^5.10.2",
    "argon2": "^0.40.1",
    "dotenv": "^16.4.5",
    "fastify": "^4.26.2",
    "fastify-plugin": "^4.5.1",
    "ioredis": "^5.3.2",
    "pino": "^8.19.0",
    "pino-pretty": "^10.3.1",
    "uuid": "^9.0.1",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/node": "^20.11.24",
    "@types/uuid": "^9.0.8",
    "@vitest/coverage-v8": "^1.3.1",
    "eslint": "^8.57.0",
    "prisma": "^5.10.2",
    "tsx": "^4.7.1",
    "typescript": "^5.3.3",
    "vitest": "^1.3.1"
  }
}
```

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": false,
    "sourceMap": true,
    "baseUrl": "./src",
    "paths": {
      "@/*": ["*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### `prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [postgis]
}

enum UserRole {
  SEEKER
  EMPLOYER
  ADMIN
}

enum JobStatus {
  OPEN
  CLOSED
  DRAFT
}

enum ApplicationStatus {
  PENDING
  REVIEWED
  ACCEPTED
  REJECTED
  WITHDRAWN
}

model User {
  id            String        @id @default(uuid()) @db.Uuid
  email         String        @unique
  passwordHash  String
  fullName      String
  phone         String?
  role          UserRole      @default(SEEKER)
  emailVerified Boolean       @default(false)
  isActive      Boolean       @default(true)
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  jobs          Job[]
  applications  Application[]
  refreshTokens RefreshToken[]

  @@index([email])
}

model RefreshToken {
  id         String   @id @default(uuid()) @db.Uuid
  userId     String   @db.Uuid
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  tokenHash  String   @unique
  expiresAt  DateTime
  revokedAt  DateTime?
  userAgent  String?
  ipAddress  String?
  createdAt  DateTime @default(now())

  @@index([userId])
  @@index([tokenHash])
}

model Job {
  id            String        @id @default(uuid()) @db.Uuid
  title         String
  description   String        @db.Text
  category      String
  salaryMin     Int?
  salaryMax     Int?
  currency      String        @default("USD")
  address       String
  city          String
  country       String
  // Lat/Lng stored separately + PostGIS geography column managed via raw SQL trigger
  latitude      Float
  longitude     Float
  status        JobStatus     @default(OPEN)
  employerId    String        @db.Uuid
  employer      User          @relation(fields: [employerId], references: [id], onDelete: Cascade)
  expiresAt     DateTime?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  applications  Application[]

  @@index([employerId])
  @@index([status])
  @@index([category])
}

model Application {
  id          String            @id @default(uuid()) @db.Uuid
  jobId       String            @db.Uuid
  job         Job               @relation(fields: [jobId], references: [id], onDelete: Cascade)
  seekerId    String            @db.Uuid
  seeker      User              @relation(fields: [seekerId], references: [id], onDelete: Cascade)
  coverLetter String?           @db.Text
  resumeUrl   String?
  status      ApplicationStatus @default(PENDING)
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  @@unique([jobId, seekerId])
  @@index([seekerId])
  @@index([status])
}
```

### `prisma/migrations/postgis_setup.sql`
(Run after initial migration to add geography column + GiST index)

```sql
-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add a geography column to Job and keep it in sync via trigger
ALTER TABLE "Job" ADD COLUMN IF NOT EXISTS location geography(Point, 4326);

CREATE OR REPLACE FUNCTION update_job_location() RETURNS trigger AS $$
BEGIN
  NEW.location := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326)::geography;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS job_location_trigger ON "Job";
CREATE TRIGGER job_location_trigger
BEFORE INSERT OR UPDATE OF latitude, longitude ON "Job"
FOR EACH ROW EXECUTE FUNCTION update_job_location();

CREATE INDEX IF NOT EXISTS job_location_gix ON "Job" USING GIST (location);
```

### `src/config/env.ts`

```ts
import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  HOST: z.string().default('0.0.0.0'),

  DATABASE_URL: z.string().url(),

  REDIS_URL: z.string().url(),

  JWT_ACCESS_SECRET: z.stri…32),
  JWT_REFRESH_SECRET: z.stri…32),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(30),

  CORS_ORIGINS: z.string().default('*'),

  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),

  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW: z.string().default('1 minute'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
```

### `src/lib/logger.ts`

```ts
import pino from 'pino';
import { env } from '@/config/env';

export const logger = pino({
  level: env.LOG_LEVEL,
  base: { service: 'nearjobs-api' },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', '*.password', '*.passwordHash'],
    remove: true,
  },
  transport:
    env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } }
      : undefined,
});
```

### `src/lib/prisma.ts`

```ts
import { PrismaClient } from '@prisma/client';
import { env } from '@/config/env';

export const prisma = new PrismaClient({
  log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

export async function disconnectPrisma() {
  await prisma.$disconnect();
}
```

### `src/lib/redis.ts`

```ts
import Redis from 'ioredis';
import { env } from '@/config/env';
import { logger } from './logger';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false,
});

redis.on('error', (err) => logger.error({ err }, 'Redis error'));
redis.on('connect', () => logger.info('Redis connected'));
```

### `src/lib/errors.ts`

```ts
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR', details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(details: unknown) {
    super('Validation failed', 422, 'VALIDATION_ERROR', details);
  }
}
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}
export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}
export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}
```

### `src/lib/crypto.ts`

```ts
import argon2 from 'argon2';
import crypto from 'crypto';

export const hashPassword = (plain: string): Promise<string> =>
  argon2.hash(plain, {
    type: argon2.argon2id,
    memoryCost: 19456, // 19 MiB
    timeCost: 2,
    parallelism: 1,
  });

export const verifyPassword = (hash: string, plain: string): Promise<boolean> =>
  argon2.verify(hash, plain);

export const sha256 = (input: string): string =>
  crypto.createHash('sha256').update(input).digest('hex');

export const randomToken = (bytes = 48): string =>
  crypto.randomBytes(bytes).toString('base64url');
```

### `src/plugins/error-handler.ts`

```ts
import fp from 'fastify-plugin';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError } from '@/lib/errors';

export default fp(async (app) => {
  app.setErrorHandler((error, request, reply) => {
    const reqId = request.id;

    if (error instanceof ZodError) {
      request.log.warn({ err: error.flatten(), reqId }, 'Validation error');
      return reply.status(422).send({
        error: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: error.flatten().fieldErrors,
        requestId: reqId,
      });
    }

    if (error instanceof AppError) {
      request.log.warn({ err: error.message, code: error.code, reqId }, 'App error');
      return reply.status(error.statusCode).send({
        error: error.code,
        message: error.message,
        details: error.details,
        requestId: reqId,
      });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return reply.status(409).send({
          error: 'CONFLICT',
          message: 'Resource already exists',
          requestId: reqId,
        });
      }
      if (error.code === 'P2025') {
        return reply.status(404).send({
          error: 'NOT_FOUND',
          message: 'Resource not found',
          requestId: reqId,
        });
      }
    }

    if (error.validation) {
      return reply.status(400).send({
        error: 'BAD_REQUEST',
        message: error.message,
        requestId: reqId,
      });
    }

    request.log.error({ err: error, reqId }, 'Unhandled error');
    return reply.status(500).send({
      error: 'INTERNAL_ERROR',
      message: 'Internal server error',
      requestId: reqId,
    });
  });

  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      error: 'NOT_FOUND',
      message: `Route ${request.method} ${request.url} not found`,
      requestId: request.id,
    });
  });
});
```

### `src/plugins/auth.ts`

```ts
import fp from 'fastify-plugin';
import jwt from '@fastify/jwt';
import { FastifyReply, FastifyRequest } from 'fastify';
import { env } from '@/config/env';
import { ForbiddenError, UnauthorizedError } from '@/lib/errors';
import { UserRole } from '@prisma/client';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string; role: UserRole; email: string };
    user: { sub: string; role: UserRole; email: string };
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    authorize: (
      ...roles: UserRole[]
    ) => (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export default fp(async (app) => {
  await app.register(jwt, {
    secret: env.JWT_ACCESS_SECRET,
    sign: { expiresIn: env.JWT_ACCESS_TTL },
  });

  app.decorate('authenticate', async (req: FastifyRequest) => {
    try {
      await req.jwtVerify();
    } catch {
      throw new UnauthorizedError('Invalid or expired token');
    }
  });

  app.decorate(
    'authorize',
    (...roles: UserRole[]) =>
      async (req: FastifyRequest) => {
        if (!req.user) throw new UnauthorizedError();
        if (!roles.includes(req.user.role)) {
          throw new ForbiddenError('Insufficient permissions');
        }
      },
  );
});
```

### `src/modules/auth/auth.schemas.ts`

```ts
import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email().max(255).toLowerCase(),
  password: z
    .string()
    .min(8)
    .max(128)
    .regex(/[A-Z]/, 'Must contain an uppercase letter')
    .regex(/[a-z]/, 'Must contain a lowercase letter')
    .regex(/[0-9]/, 'Must contain a number'),
  fullName: z.string().min(2).max(100),
  phone: z.string().min(7).max(20).optional(),
  role: z.enum(['SEEKER', 'EMPLOYER']).default('SEEKER'),
});

export const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(20),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
```

### `src/modules/auth/auth.service.ts`

```ts
import { PrismaClient, UserRole } from '@prisma/client';
import { FastifyInstance } from 'fastify';
import { hashPassword, randomToken, sha256, verifyPassword } from '@/lib/crypto';
import { ConflictError, UnauthorizedError } from '@/lib/errors';
import { env } from '@/config/env';
import type { LoginInput, RegisterInput } from './auth.schemas';

interface AuthDeps {
  prisma: PrismaClient;
  app: FastifyInstance;
}

export class AuthService {
  constructor(private readonly deps: AuthDeps) {}

  async register(input: RegisterInput, ctx: { ip?: string; userAgent?: string }) {
    const { prisma } = this.deps;

    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw new ConflictError('Email already registered');

    const passwordHash = await hashPassword(input.password);

    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        fullName: input.fullName,
        phone: input.phone,
        role: input.role as UserRole,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        createdAt: true,
      },
    });

    const tokens = await this.issueTokens(user.id, user.role, user.email, ctx);
    return { user, ...tokens };
  }

  async login(input: LoginInput, ctx: { ip?: string; userAgent?: string }) {
    const { prisma } = this.deps;
    const user = await prisma.user.findUnique({ where: { email: input.email } });
    if (!user || !user.isActive) throw new UnauthorizedError('Invalid credentials');

    const ok = await verifyPassword(user.passwordHash, input.password);
    if (!ok) throw new UnauthorizedError('Invalid credentials');

    const tokens = await this.issueTokens(user.id, user.role, user.email, ctx);
    return {
      user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
      ...tokens,
    };
  }

  async refresh(refreshToken: string, ctx: { ip?: string; userAgent?: string }) {
    const { prisma } = this.deps;
    const tokenHash = sha256(refreshToken);

    const stored = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Token rotation - revoke old, issue new
    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(stored.user.id, stored.user.role, stored.user.email, ctx);
  }

  async logout(refreshToken: string) {
    const { prisma } = this.deps;
    const tokenHash = sha256(refreshToken);
    await prisma.refreshToken
      .update({
        where: { tokenHash },
        data: { revokedAt: new Date() },
      })
      .catch(() => {
        /* token already gone */
      });
  }

  private async issueTokens(
    userId: string,
    role: UserRole,
    email: string,
    ctx: { ip?: string; userAgent?: string },
  ) {
    const { prisma, app } = this.deps;

    const accessToken = app.jwt.sign({ sub: userId, role, email });

    const refreshToken = randomToken(48);
    const tokenHash = sha256(refreshToken);
    const expiresAt = new Date(Date.now() + env.JWT_REFRESH_TTL_DAYS * 86400000);

    await prisma.refreshToken.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
        ipAddress: ctx.ip,
        userAgent: ctx.userAgent,
      },
    });

    return { accessToken, refreshToken, expiresAt };
  }
}
```

### `src/modules/auth/auth.routes.ts`

```ts
import { FastifyInstance } from 'fastify';
import { prisma } from '@/lib/prisma';
import { AuthService } from './auth.service';
import { loginSchema, refreshSchema, registerSchema } from './auth.schemas';

export async function authRoutes(app: FastifyInstance) {
  const service = new AuthService({ prisma, app });

  app.post('/register', async (req, reply) => {
    const input = registerSchema.parse(req.body);
    const result = await service.register(input, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return reply.status(201).send(result);
  });

  app.post('/login', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  }, async (req, reply) => {
    const input = loginSchema.parse(req.body);
    const result = await service.login(input, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return reply.send(result);
  });

  app.post('/refresh', async (req, reply) => {
    const { refreshToken } = refreshSchema.parse(req.body);
    const result = await service.refresh(refreshToken, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return reply.send(result);
  });

  app.post('/logout', async (req, reply) => {
    const { refreshToken } = refreshSchema.parse(req.body);
    await service.logout(refreshToken);
    return reply.status(204).send();
  });

  app.get(
    '/me',
    { preHandler: [app.authenticate] },
    async (req) => {
      const user = await prisma.user.findUnique({
        where: { id: req.user.sub },
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          role: true,
          emailVerified: true,
          createdAt: true,
        },
      });
      return user;
    },
  );
}
```

### `src/modules/jobs/jobs.schemas.ts`

```ts
import { z } from 'zod';

export const createJobSchema = z.object({
  title: z.string().min(3).max(150),
  description: z.string().min(20).max(10000),
  category: z.string().min(2).max(50),
  salaryMin: z.number().int().nonnegative().optional(),
  salaryMax: z.number().int().nonnegative().optional(),
  currency: z.string().length(3).default('USD'),
  address: z.string().min(3).max(255),
  city: z.string().min(1).max(100),
  country: z.string().min(2).max(100),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  expiresAt: z.coerce.date().optional(),
}).refine(
  (d) => !d.salaryMin || !d.salaryMax || d.salaryMax >= d.salaryMin,
  { message: 'salaryMax must be >= salaryMin', path: ['salaryMax'] },
);

export const updateJobSchema = createJobSchema.partial().extend({
  status: z.enum(['OPEN', 'CLOSED', 'DRAFT']).optional(),
});

export const searchJobsSchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().positive().max(500).default(25),
  category: z.string().optional(),
  q: z.string().max(100).optional(),
  salaryMin: z.coerce.number().int().nonnegative().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateJobInput = z.infer<typeof createJobSchema>;
export type UpdateJobInput = z.infer<typeof updateJobSchema>;
export type SearchJobsInput = z.infer<typeof searchJobsSchema>;
```

### `src/modules/jobs/jobs.service.ts`

```ts
import { JobStatus, Prisma, PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { ForbiddenError, NotFoundError } from '@/lib/errors';
import type { CreateJobInput, SearchJobsInput, UpdateJobInput } from './jobs.schemas';

interface JobsDeps {
  prisma: PrismaClient;
  redis: Redis;
}

const SEARCH_CACHE_TTL = 60; // seconds

export class JobsService {
  constructor(private readonly deps: JobsDeps) {}

  async create(employerId: string, input: CreateJobInput) {
    return this.deps.prisma.job.create({
      data: { ...input, employerId },
    });
  }

  async update(jobId: string, employerId: string, input: UpdateJobInput) {
    const job = await this.deps.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundError('Job');
    if (job.employerId !== employerId) throw new ForbiddenError('Not your job');

    return this.deps.prisma.job.update({
      where: { id: jobId },
      data: input as Prisma.JobUpdateInput,
    });
  }

  async delete(jobId: string, employerId: string) {
    const job = await this.deps.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundError('Job');
    if (job.employerId !== employerId) throw new ForbiddenError('Not your job');

    await this.deps.prisma.job.delete({ where: { id: jobId } });
  }

  async getById(jobId: string) {
    const job = await this.deps.prisma.job.findUnique({
      where: { id: jobId },
      include: {
        employer: { select: { id: true, fullName: true, email: true } },
        _count: { select: { applications: true } },
      },
    });
    if (!job) throw new NotFoundError('Job');
    return job;
  }

  async search(input: SearchJobsInput) {
    const cacheKey = `search:${JSON.stringify(input)}`;
    const cached = await this.deps.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const { latitude, longitude, radiusKm, category, q, salaryMin, page, limit } = input;
    const offset = (page - 1) * limit;
    const radiusMeters = radiusKm * 1000;

    // PostGIS geospatial query
    const filters: Prisma.Sql[] = [
      Prisma.sql`status = 'OPEN'::"JobStatus"`,
      Prisma.sql`(expires_at IS NULL OR expires_at > NOW())`,
      Prisma.sql`ST_DWithin(location, ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography, ${radiusMeters})`,
    ];

    if (category) filters.push(Prisma.sql`category = ${category}`);
    if (salaryMin !== undefined) filters.push(Prisma.sql`COALESCE(salary_max, salary_min, 0) >= ${salaryMin}`);
    if (q) {
      const term = `%${q}%`;
      filters.push(Prisma.sql`(title ILIKE ${term} OR description ILIKE ${term})`);
    }

    const whereSql = Prisma.join(filters, ' AND ');

    const rows = await this.deps.prisma.$queryRaw<
      Array<{
        id: string;
        title: string;
        description: string;
        category: string;
        salary_min: number | null;
        salary_max: number | null;
        currency: string;
        city: string;
        country: string;
        latitude: number;
        longitude: number;
        distance_m: number;
        created_at: Date;
      }>
    >(Prisma.sql`
      SELECT id, title, description, category, salary_min, salary_max, currency,
             city, country, latitude, longitude, created_at,
             ST_Distance(location, ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography) AS distance_m
      FROM "Job"
      WHERE ${whereSql}
      ORDER BY distance_m ASC
      LIMIT ${limit} OFFSET ${offset};
    `);

    const total = await this.deps.prisma.$queryRaw<Array<{ count: bigint }>>(Prisma.sql`
      SELECT COUNT(*)::bigint as count FROM "Job" WHERE ${whereSql};
    `);

    const result = {
      data: rows.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
        category: r.category,
        salaryMin: r.salary_min,
        salaryMax: r.salary_max,
        currency: r.currency,
        city: r.city,
        country: r.country,
        latitude: r.latitude,
        longitude: r.longitude,
        distanceKm: Math.round((r.distance_m / 1000) * 100) / 100,
        createdAt: r.created_at,
      })),
      pagination: {
        page,
        limit,
        total: Number(total[0]?.count ?? 0),
      },
    };

    await this.deps.redis.set(cacheKey, JSON.stringify(result), 'EX', SEARCH_CACHE_TTL);
    return result;
  }

  async listByEmployer(employerId: string, page = 1, limit = 20) {
    const [data, total] = await Promise.all([
      this.deps.prisma.job.findMany({
        where: { employerId },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { applications: true } } },
      }),
      this.deps.prisma.job.count({ where: { employerId } }),
    ]);
    return { data, pagination: { page, limit, total } };
  }
}
```

### `src/modules/jobs/jobs.routes.ts`

```ts
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { redis } from '@/lib/redis';
import { JobsService } from './jobs.service';
import {
  createJobSchema,
  searchJobsSchema,
  updateJobSchema,
} from './jobs.schemas';

const idParam = z.object({ id: z.string().uuid() });

export async function jobsRoutes(app: FastifyInstance) {
  const service = new JobsService({ prisma, redis });

  // Public search
  app.get('/search', async (req) => {
    const input = searchJobsSchema.parse(req.query);
    return service.search(input);
  });

  // Public detail
  app.get('/:id', async (req) => {
    const { id } = idParam.parse(req.params);
    return service.getById(id);
  });

  // Employer creates job
  app.post(
    '/',
    { preHandler: [app.authenticate, app.authorize('EMPLOYER', 'ADMIN')] },
    async (req, reply) => {
      const input = createJobSchema.parse(req.body);
      const job = await service.create(req.user.sub, input);
      return reply.status(201).send(job);
    },
  );

  // Update
  app.patch(
    '/:id',
    { preHandler: [app.authenticate, app.authorize('EMPLOYER', 'ADMIN')] },
    async (req) => {
      const { id } = idParam.parse(req.params);
      const input = updateJobSchema.parse(req.body);
      return service.update(id, req.user.sub, input);
    },
  );

  // Delete
  app.delete(
    '/:id',
    { preHandler: [app.authenticate, app.authorize('EMPLOYER', 'ADMIN')] },
    async (req, reply) => {
      const { id } = idParam.parse(req.params);
      await service.delete(id, req.user.sub);
      return reply.status(204).send();
    },
  );

  // List my jobs (employer)
  app.get(
    '/mine/list',
    { preHandler: [app.authenticate, app.authorize('EMPLOYER', 'ADMIN')] },
    async (req) => {
      const q = z
        .object({
          page: z.coerce.number().int().positive().default(1),
          limit: z.coerce.number().int().positive().max(100).default(20),
        })
        .parse(req.query);
      return service.listByEmployer(req.user.sub, q.page, q.limit);
    },
  );
}
```

### `src/modules/applications/applications.schemas.ts`

```ts
import { z } from 'zod';

export const createApplicationSchema = z.object({
  jobId: z.string().uuid(),
  coverLetter: z.string().max(5000).optional(),
  resumeUrl: z.string().url().max(500).optional(),
});

export const updateApplicationStatusSchema = z.object({
  status: z.enum(['REVIEWED', 'ACCEPTED', 'REJECTED']),
});

export type CreateApplicationInput = z.infer<typeof createApplicationSchema>;
```

### `src/modules/applications/applications.service.ts`

```ts
import { ApplicationStatus, PrismaClient } from '@prisma/client';
import { ConflictError, ForbiddenError, NotFoundError } from '@/lib/errors';
import type { CreateApplicationInput } from './applications.schemas';

export class ApplicationsService {
  constructor(private readonly prisma: PrismaClient) {}

  async apply(seekerId: string, input: CreateApplicationInput) {
    const job = await this.prisma.job.findUnique({ where: { id: input.jobId } });
    if (!job) throw new NotFoundError('Job');
    if (job.status !== 'OPEN') throw new ConflictError('Job is not open');
    if (job.employerId === seekerId) throw new ForbiddenError('Cannot apply to own job');

    try {
      return await this.prisma.application.create({
        data: {
          jobId: input.jobId,
          seekerId,
          coverLetter: input.coverLetter,
          resumeUrl: input.resumeUrl,
        },
      });
    } catch (e: any) {
      if (e.code === 'P2002') throw new ConflictError('Already applied to this job');
      throw e;
    }
  }

  async withdraw(applicationId: string, seekerId: string) {
    const app = await this.prisma.application.findUnique({ where: { id: applicationId } });
    if (!app) throw new NotFoundError('Application');
    if (app.seekerId !== seekerId) throw new ForbiddenError();

    return this.prisma.application.update({
      where: { id: applicationId },
      data: { status: ApplicationStatus.WITHDRAWN },
    });
  }

  async updateStatus(applicationId: string, employerId: string, status: ApplicationStatus) {
    const app = await this.prisma.application.findUnique({
      where: { id: applicationId },
      include: { job: true },
    });
    if (!app) throw new NotFoundError('Application');
    if (app.job.employerId !== employerId) throw new ForbiddenError();

    return this.prisma.application.update({
      where: { id: applicationId },
      data: { status },
    });
  }

  async listForSeeker(seekerId: string, page = 1, limit = 20) {
    const [data, total] = await Promise.all([
      this.prisma.application.findMany({
        where: { seekerId },
        include: { job: { select: { id: true, title: true, city: true, country: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.application.count({ where: { seekerId } }),
    ]);
    return { data, pagination: { page, limit, total } };
  }

  async listForJob(jobId: string, employerId: string, page = 1, limit = 20) {
    const job = await this.prisma.job.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundError('Job');
    if (job.employerId !== employerId) throw new ForbiddenError();

    const [data, total] = await Promise.all([
      this.prisma.application.findMany({
        where: { jobId },
        include: {
          seeker: { select: { id: true, fullName: true, email: true, phone: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.application.count({ where: { jobId } }),
    ]);
    return { data, pagination: { page, limit, total } };
  }
}
```

### `src/modules/applications/applications.routes.ts`

```ts
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { ApplicationsService } from './applications.service';
import {
  createApplicationSchema,
  updateApplicationStatusSchema,
} from './applications.schemas';

const idParam = z.object({ id: z.string().uuid() });
const pagingSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export async function applicationsRoutes(app: FastifyInstance) {
  const service = new ApplicationsService(prisma);

  app.post(
    '/',
    { preHandler: [app.authenticate, app.authorize('SEEKER')] },
    async (req, reply) => {
      const input = createApplicationSchema.parse(req.body);
      const result = await service.apply(req.user.sub, input);
      return reply.status(201).send(result);
    },
  );

  app.post(
    '/:id/withdraw',
    { preHandler: [app.authenticate, app.authorize('SEEKER')] },
    async (req) => {
      const { id } = idParam.parse(req.params);
      return service.withdraw(id, req.user.sub);
    },
  );

  app.patch(
    '/:id/status',
    { preHandler: [app.authenticate, app.authorize('EMPLOYER', 'ADMIN')] },
    async (req) => {
      const { id } = idParam.parse(req.params);
      const { status } = updateApplicationStatusSchema.parse(req.body);
      return service.updateStatus(id, req.user.sub, status);
    },
  );

  app.get(
    '/mine',
    { preHandler: [app.authenticate, app.authorize('SEEKER')] },
    async (req) => {
      const q = pagingSchema.parse(req.query);
      return service.listForSeeker(req.user.sub, q.page, q.limit);
    },
  );

  app.get(
    '/job/:id',
    { preHandler: [app.authenticate, app.authorize('EMPLOYER', 'ADMIN')] },
    async (req) => {
      const { id } = idParam.parse(req.params);
      const q = pagingSchema.parse(req.query);
      return service.listForJob(id, req.user.sub, q.page, q.limit);
    },
  );
}
```

### `src/app.ts`

```ts
import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import { randomUUID } from 'crypto';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';
import { redis } from '@/lib/redis';
import errorHandler from '@/plugins/error-handler';
import authPlugin from '@/plugins/auth';
import { authRoutes } from '@/modules/auth/auth.routes';
import { jobsRoutes } from '@/modules/jobs/jobs.routes';
import { applicationsRoutes } from '@/modules/applications/applications.routes';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger,
    genReqId: () => randomUUID(),
    trustProxy: true,
    bodyLimit: 1_048_576, // 1MB
    disableRequestLogging: env.NODE_ENV === 'test',
  });

  // Security
  await app.register(helmet, { global: true });
  await app.register(cors, {
    origin: env.CORS_ORIGINS === '*' ? true : env.CORS_ORIGINS.split(','),
    credentials: true,
  });
  await app.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW,
    redis,
    keyGenerator: (req) => `${req.ip}:${req.routeOptions.url ?? req.url}`,
  });

  // OpenAPI docs
  if (env.NODE_ENV !== 'production') {
    await app.register(swagger, {
      openapi: {
        info: { title: 'NearJobs API', version: '1.0.0' },
        servers: [{ url: `http://localhost:${env.PORT}` }],
        components: {
          securitySchemes: {
            bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
          },
        },
      },
    });
    await app.register(swaggerUI, { routePrefix: '/docs' });
  }

  // Plugins
  await app.register(errorHandler);
  await app.register(authPlugin);

  // Health
  app.get('/health', async () => ({ status: 'ok', uptime: process.uptime() }));
  app.get('/ready', async (_, reply) => {
    try {
      await redis.ping();
      return reply.send({ status: 'ready' });
    } catch {
      return reply.status(503).send({ status: 'not ready' });
    }
  });

  // Routes
  await app.register(authRoutes, { prefix: '/api/v1/auth' });
  await app.register(jobsRoutes, { prefix: '/api/v1/jobs' });
  await app.register(applicationsRoutes, { prefix: '/api/v1/applications' });

  return app;
}
```

### `src/server.ts`

```ts
import { buildApp } from './app';
import { env } from './config/env';
import { logger } from './lib/logger';
import { disconnectPrisma } from './lib/prisma';
import { redis } from './lib/redis';

async function main() {
  const app = await buildApp();

  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Graceful shutdown initiated');
    try {
      await app.close();
      await disconnectPrisma();
      redis.disconnect();
      logger.info('Shutdown complete');
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'Shutdown error');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => {
    logger.fatal({ reason }, 'Unhandled rejection');
    process.exit(1);
  });
  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught exception');
    process.exit(1);
  });

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
  } catch (err) {
    logger.fatal({ err }, 'Failed to start server');
    process.exit(1);
  }
}

void main();
```

---

## Tests

### `tests/setup.ts`

```ts
import { beforeAll, afterAll } from 'vitest';
import { prisma } from '../src/lib/prisma';
import { redis } from '../src/lib/redis';

beforeAll(async () => {
  // Clean DB
  await prisma.application.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.job.deleteMany();
  await prisma.user.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
  redis.disconnect();
});
```

### `tests/auth.test.ts`

```ts
import { describe, it, expect, beforeAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app';
import './setup';

let app: FastifyInstance;

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
});

describe('Auth', () => {
  const userPayload = {
    email: 'test@example.com',
    password: 'StrongPass123',
    fullName: 'Test User',
    role: 'SEEKER',
  };

  it('rejects weak passwords', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { ...userPayload, password: 'weak' },
    });
    expect(res.statusCode).toBe(422);
  });

  it('registers a user', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: userPayload,
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.user.email).toBe(userPayload.email);
    expect(body.accessToken).toBeTruthy();
    expect(body.refreshToken).toBeTruthy();
  });

  it('rejects duplicate email', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: userPayload,
    });
    expect(res.statusCode).toBe(409);
  });

  it('logs in valid user', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: userPayload.email, password: userPayload.password },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().accessToken).toBeTruthy();
  });

  it('rejects invalid credentials', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: userPayload.email, password: 'wrong' },
    });
    expect(res.statusCode).toBe(401);
  });

  it('refreshes access tokens (rotation)', async () => {
    const login = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: { email: userPayload.email, password: userPayload.password },
    });
    const { refreshToken } = login.json();

    const refreshed = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refreshToken },
    });
    expect(refreshed.statusCode).toBe(200);
    expect(refreshed.json().accessToken).toBeTruthy();

    // Old token should now be invalid
    const reuse = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/refresh',
      payload: { refreshToken },
    });
    expect(reuse.statusCode).toBe(401);
  });
});
```

### `tests/jobs.test.ts`

```ts
import { describe, it, expect, beforeAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app';
import './setup';

let app: FastifyInstance;
let employerToken: string;
let seekerToken: string;

beforeAll(async () => {
  app = await buildApp();
  await app.ready();

  const employer = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: {
      email: 'emp@example.com',
      password: 'StrongPass123',
      fullName: 'Emp User',
      role: 'EMPLOYER',
    },
  });
  employerToken = employer.json().accessToken;

  const seeker = await app.inject({
    method: 'POST',
    url: '/api/v1/auth/register',
    payload: {
      email: 'seek@example.com',
      password: 'StrongPass123',
      fullName: 'Seek User',
      role: 'SEEKER',
    },
  });
  seekerToken = seeker.json().accessToken;
});

describe('Jobs', () => {
  let jobId: string;

  it('seeker cannot create jobs', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/jobs',
      headers: { authorization: `Bearer ${seekerToken}` },
      payload: jobPayload(),
    });
    expect(res.statusCode).toBe(403);
  });

  it('employer creates a job', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/jobs',
      headers: { authorization: `Bearer ${employerToken}` },
      payload: jobPayload(),
    });
    expect(res.statusCode).toBe(201);
    jobId = res.json().id;
  });

  it('searches by location', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/jobs/search?latitude=40.7128&longitude=-74.0060&radiusKm=50',
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().data.length).toBeGreaterThan(0);
  });

  it('rejects invalid coordinates', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/v1/jobs/search?latitude=200&longitude=-74.0060',
    });
    expect(res.statusCode).toBe(422);
  });

  it('seeker applies', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/applications',
      headers: { authorization: `Bearer ${seekerToken}` },
      payload: { jobId, coverLetter: 'I am interested.' },
    });
    expect(res.statusCode).toBe(201);
  });

  it('cannot apply twice', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/applications',
      headers: { authorization: `Bearer ${seekerToken}` },
      payload: { jobId, coverLetter: 'again' },
    });
    expect(res.statusCode).toBe(409);
  });
});

function jobPayload() {
  return {
    title: 'Senior Backend Engineer',
    description: 'We are hiring a senior backend engineer with strong PostgreSQL and Node.js skills.',
    category: 'engineering',
    salaryMin: 80000,
    salaryMax: 120000,
    address: '350 5th Ave',
    city: 'New York',
    country: 'USA',
    latitude: 40.7128,
    longitude: -74.006,
  };
}
```

### `vitest.config.ts`

```ts
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    testTimeout: 20000,
    setupFiles: [],
    coverage: {
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/server.ts', 'src/config/**'],
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
});
```

---

## Deployment

### `Dockerfile`

```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package*.json tsconfig.json ./
COPY prisma ./prisma
RUN npm ci
COPY src ./src
RUN npx prisma generate && npm run build && npm prune --production

# Runtime stage
FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache tini && addgroup -S app && adduser -S app -G app
COPY --from=builder --chown=app:app /app/node_modules ./node_modules
COPY --from=builder --chown=app:app /app/dist ./dist
COPY --from=builder --chown=app:app /app/prisma ./prisma
COPY --from=builder --chown=app:app /app/package.json ./

ENV NODE_ENV=production
USER app
EXPOSE 4000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
```

### `docker-compose.yml`

```yaml
version: '3.9'
services:
  postgres:
    image: postgis/postgis:16-3.4
    environment:
      POSTGRES_USER: nearjobs
      POSTGRES_PASSWORD: ***
      POSTGRES_DB: nearjobs
    ports: ['5432:5432']
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U nearjobs']
      interval: 5s
      retries: 10

  redis:
    image: redis:7-alpine
    command: redis-server --save 60 1 --loglevel warning
    ports: ['6379:6379']
    volumes: [redisdata:/data]

  api:
    build: .
    depends_on:
      postgres: { condition: service_healthy }
      redis: { condition: service_started }
    environment:
      DATABASE_URL: postgresql://nearjobs:nearjobs@postgres:5432/nearjobs
      REDIS_URL: redis://redis:6379
      JWT_ACCESS_SECRET: ${JWT_…RET}
      JWT_REFRESH_SECRET: ${JWT_…RET}
      NODE_ENV: production
    ports: ['4000:4000']

volumes:
  pgdata:
  redisdata:
```

### `.env.example`

```bash
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://nearjobs:nearjobs@localhost:5432/nearjobs
REDIS_URL=redis://localhost:6379
JWT_ACCESS_SECRET=replac…1234
JWT_REFRESH_SECRET=replac…5678
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL_DAYS=30
CORS_ORIGINS=http://localhost:3000
LOG_LEVEL=info
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=1 minute
```

---

## Security & Production Highlights

| Concern | Implementation |
|---|---|
| **Password storage** | Argon2id (OWASP recommended) |
| **JWT** | Access (15m) + refresh token rotation, hashed in DB |
| **Token revocation** | Per-token DB record with `revokedAt` |
| **Rate limiting** | Per-IP+route via Redis-backed `@fastify/rate-limit` |
| **HTTP hardening** | Helmet, CORS allowlist, body size limit |
| **Validation** | Zod on every input (body, query, params) |
| **SQL injection** | Prisma + parameterized `Prisma.sql` raw queries |
| **Geospatial** | PostGIS `geography` + GiST index, `ST_DWithin` |
| **Caching** | Redis with TTL on hot search endpoints |
| **Logging** | Structured JSON via Pino + secret redaction |
| **Errors** | Centralized handler, mapped Prisma codes, request IDs |
| **Graceful shutdown** | SIGTERM/SIGINT handlers close server, DB, Redis |
| **Multi-stage Docker** | Non-root user, tini init, minimal Alpine image |
| **Tests** | Auth lifecycle, RBAC, geo search, dup-application, refresh rotation |

## Run

```bash
cp .env.example .env
docker-compose up -d postgres redis
npm install
npm run prisma:migrate:dev
psql $DATABASE_URL < prisma/migrations/postgis_setup.sql
npm run dev
# Tests
npm test
# Docs: http://localhost:4000/docs
```

This is a deployment-ready, enterprise-grade backend. Extend by adding email verification (SendGrid), file uploads (S3 presigned URLs), notifications (BullMQ), and observability (OpenTelemetry).