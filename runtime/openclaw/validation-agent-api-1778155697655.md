# OpenClaw Output

model.run via local
provider: anthropic
model: claude-opus-4-7
outputs: 1
# NearJobs API - Production Implementation

A production-grade REST API for a location-based job search platform built with Node.js, Express, TypeScript, and PostgreSQL with PostGIS.

## Project Structure

```
nearjobs-api/
├── src/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── repositories/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   ├── validators/
│   ├── types/
│   ├── app.ts
│   └── server.ts
├── tests/
├── migrations/
├── .env.example
├── docker-compose.yml
├── Dockerfile
├── package.json
└── tsconfig.json
```

## package.json

```json
{
  "name": "nearjobs-api",
  "version": "1.0.0",
  "description": "Location-based job search API",
  "main": "dist/server.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/server.js",
    "dev": "ts-node-dev --respawn --transpile-only src/server.ts",
    "test": "jest --runInBand",
    "test:coverage": "jest --coverage --runInBand",
    "lint": "eslint . --ext .ts",
    "migrate": "node-pg-migrate up",
    "migrate:down": "node-pg-migrate down"
  },
  "dependencies": {
    "argon2": "^0.31.2",
    "compression": "^1.7.4",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "express-rate-limit": "^7.1.5",
    "helmet": "^7.1.0",
    "ioredis": "^5.3.2",
    "jsonwebtoken": "^9.0.2",
    "morgan": "^1.10.0",
    "pg": "^8.11.3",
    "pino": "^8.16.2",
    "pino-http": "^8.5.1",
    "uuid": "^9.0.1",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@types/compression": "^1.7.5",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jest": "^29.5.10",
    "@types/jsonwebtoken": "^9.0.5",
    "@types/morgan": "^1.9.9",
    "@types/node": "^20.10.0",
    "@types/pg": "^8.10.9",
    "@types/supertest": "^2.0.16",
    "@types/uuid": "^9.0.7",
    "jest": "^29.7.0",
    "node-pg-migrate": "^6.2.2",
    "supertest": "^6.3.3",
    "ts-jest": "^29.1.1",
    "ts-node-dev": "^2.0.0",
    "typescript": "^5.3.2"
  }
}
```

## tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

## src/config/env.ts

```typescript
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_SECRET: z.stri…32),
  JWT_REFRESH_SECRET: z.stri…32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  BCRYPT_ROUNDS: z.coerce.number().default(12),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  CORS_ORIGINS: z.string().default('*'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
```

## src/config/database.ts

```typescript
import { Pool, PoolConfig } from 'pg';
import { env } from './env';
import { logger } from '../utils/logger';

const poolConfig: PoolConfig = {
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
};

export const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  logger.error({ err }, 'Unexpected database pool error');
});

export async function query<T = any>(
  text: string,
  params?: unknown[]
): Promise<{ rows: T[]; rowCount: number }> {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 1000) {
      logger.warn({ text, duration, rows: result.rowCount }, 'Slow query');
    }
    return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
  } catch (err) {
    logger.error({ err, text }, 'Database query error');
    throw err;
  }
}

export async function transaction<T>(
  callback: (client: any) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function closeDatabase(): Promise<void> {
  await pool.end();
}
```

## src/config/redis.ts

```typescript
import Redis from 'ioredis';
import { env } from './env';
import { logger } from '../utils/logger';

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false,
});

redis.on('error', (err) => {
  logger.error({ err }, 'Redis error');
});

redis.on('connect', () => {
  logger.info('Redis connected');
});

export async function closeRedis(): Promise<void> {
  await redis.quit();
}
```

## src/utils/logger.ts

```typescript
import pino from 'pino';
import { env } from '../config/env';

export const logger = pino({
  level: env.LOG_LEVEL,
  ...(env.NODE_ENV !== 'production' && {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true },
    },
  }),
  redact: {
    paths: ['password', 'passwordHash', 'token', 'authorization', '*.password'],
    censor: '[REDACTED]',
  },
});
```

## src/utils/errors.ts

```typescript
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(message: string, statusCode: number, code: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', details);
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

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests') {
    super(message, 429, 'RATE_LIMITED');
  }
}
```

## src/types/index.ts

```typescript
export type UserRole = 'job_seeker' | 'employer' | 'admin';
export type JobType = 'full_time' | 'part_time' | 'contract' | 'internship' | 'temporary';
export type JobStatus = 'draft' | 'active' | 'closed' | 'expired';
export type ApplicationStatus = 'pending' | 'reviewed' | 'shortlisted' | 'rejected' | 'accepted';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  role: UserRole;
  phone?: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Job {
  id: string;
  employerId: string;
  title: string;
  description: string;
  jobType: JobType;
  status: JobStatus;
  salaryMin?: number;
  salaryMax?: number;
  currency: string;
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  country: string;
  skills: string[];
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  distanceMeters?: number;
}

export interface Application {
  id: string;
  jobId: string;
  applicantId: string;
  coverLetter?: string;
  status: ApplicationStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthPayload {
  userId: string;
  email: string;
  role: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
      requestId?: string;
    }
  }
}
```

## migrations/001_initial_schema.sql

```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('job_seeker','employer','admin')),
    phone VARCHAR(20),
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_users_email ON users(email);

-- Jobs table
CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    job_type VARCHAR(20) NOT NULL CHECK (job_type IN ('full_time','part_time','contract','internship','temporary')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('draft','active','closed','expired')),
    salary_min NUMERIC(12,2),
    salary_max NUMERIC(12,2),
    currency CHAR(3) NOT NULL DEFAULT 'USD',
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    country VARCHAR(100) NOT NULL,
    skills TEXT[] DEFAULT '{}',
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT salary_check CHECK (salary_min IS NULL OR salary_max IS NULL OR salary_min <= salary_max)
);
CREATE INDEX idx_jobs_location ON jobs USING GIST(location);
CREATE INDEX idx_jobs_status ON jobs(status) WHERE status = 'active';
CREATE INDEX idx_jobs_employer ON jobs(employer_id);
CREATE INDEX idx_jobs_skills ON jobs USING GIN(skills);
CREATE INDEX idx_jobs_title_trgm ON jobs USING GIN(title gin_trgm_ops);

-- Applications table
CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    applicant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cover_letter TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewed','shortlisted','rejected','accepted')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(job_id, applicant_id)
);
CREATE INDEX idx_applications_applicant ON applications(applicant_id);
CREATE INDEX idx_applications_job ON applications(job_id);

-- Refresh tokens
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_refresh_user ON refresh_tokens(user_id);

-- Update trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_jobs_updated BEFORE UPDATE ON jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_applications_updated BEFORE UPDATE ON applications FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

## src/validators/schemas.ts

```typescript
import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email().toLowerCase().max(255),
  password: z
    .string()
    .min(8)
    .max(128)
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[a-z]/, 'Must contain lowercase')
    .regex(/[0-9]/, 'Must contain number'),
  fullName: z.string().min(2).max(200).trim(),
  role: z.enum(['job_seeker', 'employer']),
  phone: z.string().regex(/^\+?[0-9]{7,15}$/).optional(),
});

export const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1).max(128),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export const createJobSchema = z.object({
  title: z.string().min(3).max(200).trim(),
  description: z.string().min(20).max(10000),
  jobType: z.enum(['full_time', 'part_time', 'contract', 'internship', 'temporary']),
  salaryMin: z.number().nonnegative().max(1e9).optional(),
  salaryMax: z.number().nonnegative().max(1e9).optional(),
  currency: z.string().length(3).default('USD'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().min(3).max(500),
  city: z.string().min(1).max(100),
  country: z.string().min(2).max(100),
  skills: z.array(z.string().max(50)).max(30).default([]),
  expiresAt: z.coerce.date().optional(),
}).refine(
  (d) => !d.salaryMin || !d.salaryMax || d.salaryMin <= d.salaryMax,
  { message: 'salaryMin must be <= salaryMax' }
);

export const updateJobSchema = createJobSchema.partial().extend({
  status: z.enum(['draft', 'active', 'closed']).optional(),
});

export const searchJobsSchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().positive().max(500).default(25),
  q: z.string().max(200).optional(),
  jobType: z.enum(['full_time', 'part_time', 'contract', 'internship', 'temporary']).optional(),
  salaryMin: z.coerce.number().nonnegative().optional(),
  skills: z.string().optional().transform((v) => v ? v.split(',').map((s) => s.trim()).filter(Boolean) : undefined),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const applySchema = z.object({
  coverLetter: z.string().max(5000).optional(),
});

export const updateApplicationSchema = z.object({
  status: z.enum(['pending', 'reviewed', 'shortlisted', 'rejected', 'accepted']),
});

export const uuidSchema = z.string().uuid();
```

## src/middleware/validate.ts

```typescript
import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../utils/errors';

type Source = 'body' | 'query' | 'params';

export const validate =
  (schema: ZodSchema, source: Source = 'body') =>
  (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const data = schema.parse(req[source]);
      // Reassign parsed (and coerced) data
      (req as any)[source] = data;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const details = err.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        }));
        next(new ValidationError('Validation failed', details));
        return;
      }
      next(err);
    }
  };
```

## src/middleware/auth.ts

```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';
import { AuthPayload, UserRole } from '../types';
import { redis } from '../config/redis';

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid Authorization header');
    }
    const token = header.slice(7);

    const blacklisted = await redis.get(`bl:${token}`);
    if (blacklisted) {
      throw new UnauthorizedError('Token revoked');
    }

    const payload = jwt.verify(token, env.JWT_SECRET, {
      algorithms: ['HS256'],
    }) as AuthPayload & { iat: number; exp: number };

    req.user = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
    };
    next();
  } catch (err) {
    if (err instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError('Invalid token'));
      return;
    }
    if (err instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedError('Token expired'));
      return;
    }
    next(err);
  }
}

export const authorize =
  (...roles: UserRole[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(new ForbiddenError('Insufficient permissions'));
      return;
    }
    next();
  };
```

## src/middleware/errorHandler.ts

```typescript
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import { logger } from '../utils/logger';
import { env } from '../config/env';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
      requestId: req.requestId,
    });
    return;
  }

  logger.error({ err, path: req.path, requestId: req.requestId }, 'Unhandled error');

  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    },
    requestId: req.requestId,
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
    requestId: req.requestId,
  });
}
```

## src/middleware/requestId.ts

```typescript
import { Request, Response, NextFunction } from 'express';
import { v4 as uuid } from 'uuid';

export function requestId(req: Request, res: Response, next: NextFunction): void {
  const id = (req.headers['x-request-id'] as string) || uuid();
  req.requestId = id;
  res.setHeader('X-Request-ID', id);
  next();
}
```

## src/middleware/rateLimit.ts

```typescript
import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

export const apiLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many auth attempts' } },
});
```

## src/repositories/userRepository.ts

```typescript
import { query, transaction } from '../config/database';
import { User, UserRole } from '../types';

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: UserRole;
  phone: string | null;
  email_verified: boolean;
  created_at: Date;
  updated_at: Date;
}

function mapUser(r: UserRow): User {
  return {
    id: r.id,
    email: r.email,
    passwordHash: r.password_hash,
    fullName: r.full_name,
    role: r.role,
    phone: r.phone ?? undefined,
    emailVerified: r.email_verified,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export const userRepository = {
  async findByEmail(email: string): Promise<User | null> {
    const { rows } = await query<UserRow>(
      'SELECT * FROM users WHERE email = $1 LIMIT 1',
      [email]
    );
    return rows[0] ? mapUser(rows[0]) : null;
  },

  async findById(id: string): Promise<User | null> {
    const { rows } = await query<UserRow>(
      'SELECT * FROM users WHERE id = $1 LIMIT 1',
      [id]
    );
    return rows[0] ? mapUser(rows[0]) : null;
  },

  async create(input: {
    email: string;
    passwordHash: string;
    fullName: string;
    role: UserRole;
    phone?: string;
  }): Promise<User> {
    const { rows } = await query<UserRow>(
      `INSERT INTO users (email, password_hash, full_name, role, phone)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [input.email, input.passwordHash, input.fullName, input.role, input.phone ?? null]
    );
    return mapUser(rows[0]);
  },
};
```

## src/repositories/jobRepository.ts

```typescript
import { query } from '../config/database';
import { Job, JobStatus, JobType } from '../types';

interface JobRow {
  id: string;
  employer_id: string;
  title: string;
  description: string;
  job_type: JobType;
  status: JobStatus;
  salary_min: string | null;
  salary_max: string | null;
  currency: string;
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  country: string;
  skills: string[];
  expires_at: Date | null;
  created_at: Date;
  updated_at: Date;
  distance_meters?: string;
}

function mapJob(r: JobRow): Job {
  return {
    id: r.id,
    employerId: r.employer_id,
    title: r.title,
    description: r.description,
    jobType: r.job_type,
    status: r.status,
    salaryMin: r.salary_min ? Number(r.salary_min) : undefined,
    salaryMax: r.salary_max ? Number(r.salary_max) : undefined,
    currency: r.currency,
    latitude: Number(r.latitude),
    longitude: Number(r.longitude),
    address: r.address,
    city: r.city,
    country: r.country,
    skills: r.skills,
    expiresAt: r.expires_at ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    distanceMeters: r.distance_meters ? Number(r.distance_meters) : undefined,
  };
}

const SELECT_BASE = `
  SELECT id, employer_id, title, description, job_type, status,
         salary_min, salary_max, currency,
         ST_Y(location::geometry) AS latitude,
         ST_X(location::geometry) AS longitude,
         address, city, country, skills, expires_at, created_at, updated_at
  FROM jobs
`;

export interface JobSearchParams {
  latitude: number;
  longitude: number;
  radiusKm: number;
  q?: string;
  jobType?: JobType;
  salaryMin?: number;
  skills?: string[];
  page: number;
  limit: number;
}

export const jobRepository = {
  async create(input: {
    employerId: string;
    title: string;
    description: string;
    jobType: JobType;
    salaryMin?: number;
    salaryMax?: number;
    currency: string;
    latitude: number;
    longitude: number;
    address: string;
    city: string;
    country: string;
    skills: string[];
    expiresAt?: Date;
  }): Promise<Job> {
    const { rows } = await query<JobRow>(
      `INSERT INTO jobs (employer_id, title, description, job_type, salary_min, salary_max,
                         currency, location, address, city, country, skills, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,
               ST_SetSRID(ST_MakePoint($8,$9),4326)::geography,
               $10,$11,$12,$13,$14)
       RETURNING id, employer_id, title, description, job_type, status,
                 salary_min, salary_max, currency,
                 ST_Y(location::geometry) AS latitude,
                 ST_X(location::geometry) AS longitude,
                 address, city, country, skills, expires_at, created_at, updated_at`,
      [
        input.employerId, input.title, input.description, input.jobType,
        input.salaryMin ?? null, input.salaryMax ?? null, input.currency,
        input.longitude, input.latitude,
        input.address, input.city, input.country, input.skills, input.expiresAt ?? null,
      ]
    );
    return mapJob(rows[0]);
  },

  async findById(id: string): Promise<Job | null> {
    const { rows } = await query<JobRow>(`${SELECT_BASE} WHERE id = $1 LIMIT 1`, [id]);
    return rows[0] ? mapJob(rows[0]) : null;
  },

  async update(id: string, fields: Record<string, unknown>): Promise<Job | null> {
    const allowed: Record<string, string> = {
      title: 'title',
      description: 'description',
      jobType: 'job_type',
      status: 'status',
      salaryMin: 'salary_min',
      salaryMax: 'salary_max',
      currency: 'currency',
      address: 'address',
      city: 'city',
      country: 'country',
      skills: 'skills',
      expiresAt: 'expires_at',
    };

    const sets: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    for (const [k, v] of Object.entries(fields)) {
      if (allowed[k] !== undefined && v !== undefined) {
        sets.push(`${allowed[k]} = $${i++}`);
        values.push(v);
      }
    }

    if (fields.latitude !== undefined && fields.longitude !== undefined) {
      sets.push(`location = ST_SetSRID(ST_MakePoint($${i++},$${i++}),4326)::geography`);
      values.push(fields.longitude, fields.latitude);
    }

    if (sets.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const { rows } = await query<JobRow>(
      `UPDATE jobs SET ${sets.join(', ')} WHERE id = $${i}
       RETURNING id, employer_id, title, description, job_type, status,
                 salary_min, salary_max, currency,
                 ST_Y(location::geometry) AS latitude,
                 ST_X(location::geometry) AS longitude,
                 address, city, country, skills, expires_at, created_at, updated_at`,
      values
    );
    return rows[0] ? mapJob(rows[0]) : null;
  },

  async delete(id: string, employerId: string): Promise<boolean> {
    const { rowCount } = await query(
      'DELETE FROM jobs WHERE id = $1 AND employer_id = $2',
      [id, employerId]
    );
    return rowCount > 0;
  },

  async search(params: JobSearchParams): Promise<{ jobs: Job[]; total: number }> {
    const { latitude, longitude, radiusKm, q, jobType, salaryMin, skills, page, limit } = params;
    const offset = (page - 1) * limit;
    const radiusMeters = radiusKm * 1000;

    const where: string[] = [
      `status = 'active'`,
      `(expires_at IS NULL OR expires_at > NOW())`,
      `ST_DWithin(location, ST_SetSRID(ST_MakePoint($1,$2),4326)::geography, $3)`,
    ];
    const values: unknown[] = [longitude, latitude, radiusMeters];
    let i = 4;

    if (q) {
      where.push(`(title ILIKE $${i} OR description ILIKE $${i})`);
      values.push(`%${q}%`);
      i++;
    }
    if (jobType) {
      where.push(`job_type = $${i++}`);
      values.push(jobType);
    }
    if (salaryMin !== undefined) {
      where.push(`(salary_max IS NULL OR salary_max >= $${i++})`);
      values.push(salaryMin);
    }
    if (skills && skills.length > 0) {
      where.push(`skills && $${i++}::text[]`);
      values.push(skills);
    }

    const whereClause = where.join(' AND ');

    const countSql = `SELECT COUNT(*)::int AS total FROM jobs WHERE ${whereClause}`;
    const countResult = await query<{ total: number }>(countSql, values);
    const total = countResult.rows[0].total;

    const dataSql = `
      SELECT id, employer_id, title, description, job_type, status,
             salary_min, salary_max, currency,
             ST_Y(location::geometry) AS latitude,
             ST_X(location::geometry) AS longitude,
             address, city, country, skills, expires_at, created_at, updated_at,
             ST_Distance(location, ST_SetSRID(ST_MakePoint($1,$2),4326)::geography) AS distance_meters
      FROM jobs
      WHERE ${whereClause}
      ORDER BY distance_meters ASC
      LIMIT $${i++} OFFSET $${i++}
    `;
    values.push(limit, offset);

    const { rows } = await query<JobRow>(dataSql, values);
    return { jobs: rows.map(mapJob), total };
  },

  async listByEmployer(employerId: string, page: number, limit: number): Promise<{ jobs: Job[]; total: number }> {
    const offset = (page - 1) * limit;
    const countResult = await query<{ total: number }>(
      'SELECT COUNT(*)::int AS total FROM jobs WHERE employer_id = $1',
      [employerId]
    );
    const { rows } = await query<JobRow>(
      `${SELECT_BASE} WHERE employer_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [employerId, limit, offset]
    );
    return { jobs: rows.map(mapJob), total: countResult.rows[0].total };
  },
};
```

## src/repositories/applicationRepository.ts

```typescript
import { query } from '../config/database';
import { Application, ApplicationStatus } from '../types';

interface AppRow {
  id: string;
  job_id: string;
  applicant_id: string;
  cover_letter: string | null;
  status: ApplicationStatus;
  created_at: Date;
  updated_at: Date;
}

function mapApp(r: AppRow): Application {
  return {
    id: r.id,
    jobId: r.job_id,
    applicantId: r.applicant_id,
    coverLetter: r.cover_letter ?? undefined,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export const applicationRepository = {
  async create(jobId: string, applicantId: string, coverLetter?: string): Promise<Application> {
    const { rows } = await query<AppRow>(
      `INSERT INTO applications (job_id, applicant_id, cover_letter)
       VALUES ($1,$2,$3) RETURNING *`,
      [jobId, applicantId, coverLetter ?? null]
    );
    return mapApp(rows[0]);
  },

  async findById(id: string): Promise<Application | null> {
    const { rows } = await query<AppRow>(
      'SELECT * FROM applications WHERE id = $1 LIMIT 1',
      [id]
    );
    return rows[0] ? mapApp(rows[0]) : null;
  },

  async existsForJobAndUser(jobId: string, userId: string): Promise<boolean> {
    const { rows } = await query<{ exists: boolean }>(
      'SELECT EXISTS(SELECT 1 FROM applications WHERE job_id=$1 AND applicant_id=$2) AS exists',
      [jobId, userId]
    );
    return rows[0].exists;
  },

  async listByApplicant(applicantId: string, page: number, limit: number): Promise<{ items: Application[]; total: number }> {
    const offset = (page - 1) * limit;
    const total = await query<{ total: number }>(
      'SELECT COUNT(*)::int AS total FROM applications WHERE applicant_id=$1',
      [applicantId]
    );
    const { rows } = await query<AppRow>(
      'SELECT * FROM applications WHERE applicant_id=$1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [applicantId, limit, offset]
    );
    return { items: rows.map(mapApp), total: total.rows[0].total };
  },

  async listByJob(jobId: string, page: number, limit: number): Promise<{ items: Application[]; total: number }> {
    const offset = (page - 1) * limit;
    const total = await query<{ total: number }>(
      'SELECT COUNT(*)::int AS total FROM applications WHERE job_id=$1',
      [jobId]
    );
    const { rows } = await query<AppRow>(
      'SELECT * FROM applications WHERE job_id=$1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [jobId, limit, offset]
    );
    return { items: rows.map(mapApp), total: total.rows[0].total };
  },

  async updateStatus(id: string, status: ApplicationStatus): Promise<Application | null> {
    const { rows } = await query<AppRow>(
      'UPDATE applications SET status=$1 WHERE id=$2 RETURNING *',
      [status, id]
    );
    return rows[0] ? mapApp(rows[0]) : null;
  },
};
```

## src/services/authService.ts

```typescript
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../config/env';
import { query } from '../config/database';
import { userRepository } from '../repositories/userRepository';
import { ConflictError, UnauthorizedError } from '../utils/errors';
import { AuthPayload, UserRole, User } from '../types';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

function signAccessToken(payload: AuthPayload): { token: string; expiresIn: number } {
  const token = jwt.sign(payload, env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: env.JWT_EXPIRES_IN,
  });
  const decoded = jwt.decode(token) as { exp: number };
  return { token, expiresIn: decoded.exp - Math.floor(Date.now() / 1000) };
}

function signRefreshToken(userId: string): string {
  return jwt.sign({ userId, type: 'refresh' }, env.JWT_REFRESH_SECRET, {
    algorithm: 'HS256',
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  });
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export const authService = {
  async register(input: {
    email: string;
    password: string;
    fullName: string;
    role: UserRole;
    phone?: string;
  }): Promise<{ user: Omit<User, 'passwordHash'>; tokens: TokenPair }> {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) {
      throw new ConflictError('Email already registered');
    }

    const passwordHash = await argon2.hash(input.password, {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });

    const user = await userRepository.create({
      email: input.email,
      passwordHash,
      fullName: input.fullName,
      role: input.role,
      phone: input.phone,
    });

    const tokens = await this.issueTokens(user);
    const { passwordHash: _, ...safe } = user;
    return { user: safe, tokens };
  },

  async login(email: string, password: string): Promise<{ user: Omit<User, 'passwordHash'>; tokens: TokenPair }> {
    const user = await userRepository.findByEmail(email);
    // Constant-time password verification with dummy hash to mitigate user enumeration timing
    const dummyHash = '$argon2id$v=19$m=19456,t=2,p=1$abcdefghijklmnop$0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcd';
    const hash = user?.passwordHash ?? dummyHash;
    const valid = await argon2.verify(hash, password).catch(() => false);

    if (!user || !valid) {
      throw new UnauthorizedError('Invalid credentials');
    }

    const tokens = await this.issueTokens(user);
    const { passwordHash: _, ...safe } = user;
    return { user: safe, tokens };
  },

  async refresh(refreshToken: string): Promise<TokenPair> {
    let payload: { userId: string; type: string };
    try {
      payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET, {
        algorithms: ['HS256'],
      }) as { userId: string; type: string };
    } catch {
      throw new UnauthorizedError('Invalid refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedError('Invalid token type');
    }

    const tokenHash = hashToken(refreshToken);
    const { rows } = await query<{ id: string; revoked_at: Date | null; expires_at: Date }>(
      'SELECT id, revoked_at, expires_at FROM refresh_tokens WHERE token_hash=$1',
      [tokenHash]
    );

    const record = rows[0];
    if (!record || record.revoked_at || record.expires_at < new Date()) {
      throw new UnauthorizedError('Refresh token invalid or expired');
    }

    const user = await userRepository.findById(payload.userId);
    if (!user) throw new UnauthorizedError('User not found');

    // Rotate
    await query('UPDATE refresh_tokens SET revoked_at=NOW() WHERE id=$1', [record.id]);
    return this.issueTokens(user);
  },

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = hashToken(refreshToken);
    await query(
      'UPDATE refresh_tokens SET revoked_at=NOW() WHERE token_hash=$1 AND revoked_at IS NULL',
      [tokenHash]
    );
  },

  async issueTokens(user: User): Promise<TokenPair> {
    const access = signAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });
    const refreshToken = signRefreshToken(user.id);
    const tokenHash = hashToken(refreshToken);
    const decoded = jwt.decode(refreshToken) as { exp: number };

    await query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1,$2,to_timestamp($3))`,
      [user.id, tokenHash, decoded.exp]
    );

    return {
      accessToken: access.token,
      refreshToken,
      expiresIn: access.expiresIn,
    };
  },
};
```

## src/services/jobService.ts

```typescript
import { jobRepository, JobSearchParams } from '../repositories/jobRepository';
import { ForbiddenError, NotFoundError } from '../utils/errors';
import { Job, JobType } from '../types';

export const jobService = {
  async create(employerId: string, input: {
    title: string;
    description: string;
    jobType: JobType;
    salaryMin?: number;
    salaryMax?: number;
    currency: string;
    latitude: number;
    longitude: number;
    address: string;
    city: string;
    country: string;
    skills: string[];
    expiresAt?: Date;
  }): Promise<Job> {
    return jobRepository.create({ employerId, ...input });
  },

  async getById(id: string): Promise<Job> {
    const job = await jobRepository.findById(id);
    if (!job) throw new NotFoundError('Job');
    return job;
  },

  async update(id: string, employerId: string, fields: Record<string, unknown>, isAdmin = false): Promise<Job> {
    const job = await jobRepository.findById(id);
    if (!job) throw new NotFoundError('Job');
    if (job.employerId !== employerId && !isAdmin) {
      throw new ForbiddenError('Not the owner of this job');
    }
    const updated = await jobRepository.update(id, fields);
    if (!updated) throw new NotFoundError('Job');
    return updated;
  },

  async delete(id: string, employerId: string): Promise<void> {
    const job = await jobRepository.findById(id);
    if (!job) throw new NotFoundError('Job');
    if (job.employerId !== employerId) throw new ForbiddenError();
    await jobRepository.delete(id, employerId);
  },

  async search(params: JobSearchParams): Promise<{ jobs: Job[]; total: number; page: number; limit: number }> {
    const { jobs, total } = await jobRepository.search(params);
    return { jobs, total, page: params.page, limit: params.limit };
  },

  async listByEmployer(employerId: string, page: number, limit: number) {
    const { jobs, total } = await jobRepository.listByEmployer(employerId, page, limit);
    return { jobs, total, page, limit };
  },
};
```

## src/services/applicationService.ts

```typescript
import { applicationRepository } from '../repositories/applicationRepository';
import { jobRepository } from '../repositories/jobRepository';
import { ConflictError, ForbiddenError, NotFoundError } from '../utils/errors';
import { ApplicationStatus } from '../types';

export const applicationService = {
  async apply(jobId: string, applicantId: string, coverLetter?: string) {
    const job = await jobRepository.findById(jobId);
    if (!job) throw new NotFoundError('Job');
    if (job.status !== 'active') {
      throw new ConflictError('Job is not accepting applications');
    }
    if (job.employerId === applicantId) {
      throw new ForbiddenError('Cannot apply to your own job');
    }
    const exists = await applicationRepository.existsForJobAndUser(jobId, applicantId);
    if (exists) throw new ConflictError('Already applied to this job');

    return applicationRepository.create(jobId, applicantId, coverLetter);
  },

  async listMine(applicantId: string, page: number, limit: number) {
    return applicationRepository.listByApplicant(applicantId, page, limit);
  },

  async listForJob(jobId: string, employerId: string, page: number, limit: number) {
    const job = await jobRepository.findById(jobId);
    if (!job) throw new NotFoundError('Job');
    if (job.employerId !== employerId) throw new ForbiddenError();
    return applicationRepository.listByJob(jobId, page, limit);
  },

  async updateStatus(applicationId: string, employerId: string, status: ApplicationStatus) {
    const app = await applicationRepository.findById(applicationId);
    if (!app) throw new NotFoundError('Application');
    const job = await jobRepository.findById(app.jobId);
    if (!job) throw new NotFoundError('Job');
    if (job.employerId !== employerId) throw new ForbiddenError();
    return applicationRepository.updateStatus(applicationId, status);
  },
};
```

## src/controllers/authController.ts

```typescript
import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService';

export const authController = {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.register(req.body);
      res.status(201).json(result);
    } catch (err) { next(err); }
  },

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await authService.login(req.body.email, req.body.password);
      res.json(result);
    } catch (err) { next(err); }
  },

  async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tokens = await authService.refresh(req.body.refreshToken);
      res.json({ tokens });
    } catch (err) { next(err); }
  },

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await authService.logout(req.body.refreshToken);
      res.status(204).send();
    } catch (err) { next(err); }
  },
};
```

## src/controllers/jobController.ts

```typescript
import { Request, Response, NextFunction } from 'express';
import { jobService } from '../services/jobService';

export const jobController = {
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const job = await jobService.create(req.user!.userId, req.body);
      res.status(201).json({ job });
    } catch (err) { next(err); }
  },

  async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const job = await jobService.getById(req.params.id);
      res.json({ job });
    } catch (err) { next(err); }
  },

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const job = await jobService.update(
        req.params.id,
        req.user!.userId,
        req.body,
        req.user!.role === 'admin'
      );
      res.json({ job });
    } catch (err) { next(err); }
  },

  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await jobService.delete(req.params.id, req.user!.userId);
      res.status(204).send();
    } catch (err) { next(err); }
  },

  async search(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await jobService.search(req.query as any);
      res.json(result);
    } catch (err) { next(err); }
  },

  async myJobs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const result = await jobService.listByEmployer(req.user!.userId, page, limit);
      res.json(result);
    } catch (err) { next(err); }
  },
};
```

## src/controllers/applicationController.ts

```typescript
import { Request, Response, NextFunction } from 'express';
import { applicationService } from '../services/applicationService';

export const applicationController = {
  async apply(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const app = await applicationService.apply(
        req.params.jobId,
        req.user!.userId,
        req.body.coverLetter
      );
      res.status(201).json({ application: app });
    } catch (err) { next(err); }
  },

  async listMine(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Math.min(Number(req.query.limit) || 20, 100);
      const result = await applicationService.listMine(req.user!.userId, page, limit);
      res.json(result);
    } catch (err) { next(err); }
  },

  async listForJob(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Math.min(Number(req.query.limit) || 20, 100);
      const result = await applicationService.listForJob(
        req.params.jobId,
        req.user!.userId,
        page,
        limit
      );
      res.json(result);
    } catch (err) { next(err); }
  },

  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const app = await applicationService.updateStatus(
        req.params.id,
        req.user!.userId,
        req.body.status
      );
      res.json({ application: app });
    } catch (err) { next(err); }
  },
};
```

## src/routes/index.ts

```typescript
import { Router } from 'express';
import { authRoutes } from './authRoutes';
import { jobRoutes } from './jobRoutes';
import { applicationRoutes } from './applicationRoutes';

export const router = Router();

router.use('/auth', authRoutes);
router.use('/jobs', jobRoutes);
router.use('/applications', applicationRoutes);
```

## src/routes/authRoutes.ts

```typescript
import { Router } from 'express';
import { authController } from '../controllers/authController';
import { validate } from '../middleware/validate';
import { authLimiter } from '../middleware/rateLimit';
import { loginSchema, refreshTokenSchema, registerSchema } from '../validators/schemas';

export const authRoutes = Router();

authRoutes.post('/register', authLimiter, validate(registerSchema), authController.register);
authRoutes.post('/login', authLimiter, validate(loginSchema), authController.login);
authRoutes.post('/refresh', validate(refreshTokenSchema), authController.refresh);
authRoutes.post('/logout', validate(refreshTokenSchema), authController.logout);
```

## src/routes/jobRoutes.ts

```typescript
import { Router } from 'express';
import { z } from 'zod';
import { jobController } from '../controllers/jobController';
import { applicationController } from '../controllers/applicationController';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createJobSchema,
  updateJobSchema,
  searchJobsSchema,
  applySchema,
  uuidSchema,
} from '../validators/schemas';

export const jobRoutes = Router();

const idParamSchema = z.object({ id: uuidSchema });
const jobIdParamSchema = z.object({ jobId: uuidSchema });

jobRoutes.get('/search', validate(searchJobsSchema, 'query'), jobController.search);
jobRoutes.get('/mine', authenticate, authorize('employer', 'admin'), jobController.myJobs);

jobRoutes.get('/:id', validate(idParamSchema, 'params'), jobController.getById);

jobRoutes.post(
  '/',
  authenticate,
  authorize('employer', 'admin'),
  validate(createJobSchema),
  jobController.create
);

jobRoutes.patch(
  '/:id',
  authenticate,
  authorize('employer', 'admin'),
  validate(idParamSchema, 'params'),
  validate(updateJobSchema),
  jobController.update
);

jobRoutes.delete(
  '/:id',
  authenticate,
  authorize('employer', 'admin'),
  validate(idParamSchema, 'params'),
  jobController.delete
);

jobRoutes.post(
  '/:jobId/apply',
  authenticate,
  authorize('job_seeker'),
  validate(jobIdParamSchema, 'params'),
  validate(applySchema),
  applicationController.apply
);

jobRoutes.get(
  '/:jobId/applications',
  authenticate,
  authorize('employer', 'admin'),
  validate(jobIdParamSchema, 'params'),
  applicationController.listForJob
);
```

## src/routes/applicationRoutes.ts

```typescript
import { Router } from 'express';
import { z } from 'zod';
import { applicationController } from '../controllers/applicationController';
import { authenticate, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { updateApplicationSchema, uuidSchema } from '../validators/schemas';

export const applicationRoutes = Router();
const idParam = z.object({ id: uuidSchema });

applicationRoutes.get('/me', authenticate, authorize('job_seeker'), applicationController.listMine);

applicationRoutes.patch(
  '/:id',
  authenticate,
  authorize('employer', 'admin'),
  validate(idParam, 'params'),
  validate(updateApplicationSchema),
  applicationController.updateStatus
);
```

## src/app.ts

```typescript
import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import pinoHttp from 'pino-http';
import { env } from './config/env';
import { logger } from './utils/logger';
import { router } from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { requestId } from './middleware/requestId';
import { apiLimiter } from './middleware/rateLimit';

export function createApp(): Application {
  const app = express();

  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(helmet());
  app.use(cors({
    origin: env.CORS_ORIGINS === '*' ? true : env.CORS_ORIGINS.split(','),
    credentials: true,
  }));
  app.use(compression());
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false, limit: '100kb' }));
  app.use(requestId);

  if (env.NODE_ENV !== 'test') {
    app.use(pinoHttp({ logger, customProps: (req) => ({ requestId: (req as any).requestId }) }));
  }

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.get('/ready', async (_req, res) => {
    try {
      const { pool } = await import('./config/database');
      await pool.query('SELECT 1');
      res.json({ status: 'ready' });
    } catch {
      res.status(503).json({ status: 'not ready' });
    }
  });

  app.use('/api/v1', apiLimiter, router);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
```

## src/server.ts

```typescript
import { createApp } from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { closeDatabase, pool } from './config/database';
import { closeRedis } from './config/redis';

async function bootstrap(): Promise<void> {
  // Verify connectivity
  await pool.query('SELECT 1');
  logger.info('Database connection verified');

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`NearJobs API listening on port ${env.PORT}`);
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Received ${signal}, shutting down`);
    server.close(async () => {
      try {
        await closeDatabase();
        await closeRedis();
        process.exit(0);
      } catch (err) {
        logger.error({ err }, 'Error during shutdown');
        process.exit(1);
      }
    });
    setTimeout(() => process.exit(1), 30000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => {
    logger.fatal({ reason }, 'Unhandled rejection');
  });
  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught exception');
    process.exit(1);
  });
}

bootstrap().catch((err) => {
  logger.fatal({ err }, 'Failed to start');
  process.exit(1);
});
```

## tests/auth.test.ts

```typescript
import request from 'supertest';
import { createApp } from '../src/app';
import { pool, closeDatabase } from '../src/config/database';
import { closeRedis } from '../src/config/redis';

const app = createApp();

beforeAll(async () => {
  await pool.query('TRUNCATE users, jobs, applications, refresh_tokens CASCADE');
});

afterAll(async () => {
  await closeDatabase();
  await closeRedis();
});

describe('Auth API', () => {
  const userPayload = {
    email: 'test@example.com',
    password: 'StrongPass123',
    fullName: 'Test User',
    role: 'job_seeker' as const,
  };

  it('registers a new user', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(userPayload);
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe(userPayload.email);
    expect(res.body.tokens.accessToken).toBeDefined();
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('rejects duplicate registration', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(userPayload);
    expect(res.status).toBe(409);
  });

  it('rejects weak passwords', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({
      ...userPayload,
      email: 'weak@example.com',
      password: 'weak',
    });
    expect(res.status).toBe(400);
  });

  it('logs in existing user', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: userPayload.email,
      password: userPayload.password,
    });
    expect(res.status).toBe(200);
    expect(res.body.tokens.accessToken).toBeDefined();
  });

  it('rejects invalid credentials', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: userPayload.email,
      password: 'WrongPassword1',
    });
    expect(res.status).toBe(401);
  });

  it('refreshes token', async () => {
    const login = await request(app).post('/api/v1/auth/login').send({
      email: userPayload.email,
      password: userPayload.password,
    });
    const res = await request(app).post('/api/v1/auth/refresh').send({
      refreshToken: login.body.tokens.refreshToken,
    });
    expect(res.status).toBe(200);
    expect(res.body.tokens.accessToken).toBeDefined();
  });
});
```

## tests/jobs.test.ts

```typescript
import request from 'supertest';
import { createApp } from '../src/app';
import { pool, closeDatabase } from '../src/config/database';
import { closeRedis } from '../src/config/redis';

const app = createApp();

let employerToken: string;
let seekerToken: string;
let jobId: string;

beforeAll(async () => {
  await pool.query('TRUNCATE users, jobs, applications, refresh_tokens CASCADE');

  const employer = await request(app).post('/api/v1/auth/register').send({
    email: 'employer@x.com',
    password: 'StrongPass123',
    fullName: 'Employer Co',
    role: 'employer',
  });
  employerToken = employer.body.tokens.accessToken;

  const seeker = await request(app).post('/api/v1/auth/register').send({
    email: 'seeker@x.com',
    password: 'StrongPass123',
    fullName: 'Job Seeker',
    role: 'job_seeker',
  });
  seekerToken = seeker.body.tokens.accessToken;
});

afterAll(async () => {
  await closeDatabase();
  await closeRedis();
});

describe('Jobs API', () => {
  it('creates a job (employer)', async () => {
    const res = await request(app)
      .post('/api/v1/jobs')
      .set('Authorization', `Bearer ${employerToken}`)
      .send({
        title: 'Senior Backend Engineer',
        description: 'Build great things using Node.js and PostgreSQL daily',
        jobType: 'full_time',
        salaryMin: 100000,
        salaryMax: 150000,
        currency: 'USD',
        latitude: 37.7749,
        longitude: -122.4194,
        address: '1 Market St',
        city: 'San Francisco',
        country: 'USA',
        skills: ['nodejs', 'postgresql'],
      });
    expect(res.status).toBe(201);
    expect(res.body.job.id).toBeDefined();
    jobId = res.body.job.id;
  });

  it('forbids seeker from creating jobs', async () => {
    const res = await request(app)
      .post('/api/v1/jobs')
      .set('Authorization', `Bearer ${seekerToken}`)
      .send({
        title: 'X', description: 'Y', jobType: 'full_time',
        latitude: 0, longitude: 0, address: 'a', city: 'c', country: 'co',
      });
    expect([400, 403]).toContain(res.status);
  });

  it('searches jobs by location', async () => {
    const res = await request(app).get('/api/v1/jobs/search').query({
      latitude: 37.78,
      longitude: -122.42,
      radiusKm: 10,
    });
    expect(res.status).toBe(200);
    expect(res.body.total).toBeGreaterThan(0);
    expect(res.body.jobs[0].distanceMeters).toBeDefined();
  });

  it('finds no jobs outside radius', async () => {
    const res = await request(app).get('/api/v1/jobs/search').query({
      latitude: 40.7128,
      longitude: -74.006,
      radiusKm: 5,
    });
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(0);
  });

  it('seeker applies to job', async () => {
    const res = await request(app)
      .post(`/api/v1/jobs/${jobId}/apply`)
      .set('Authorization', `Bearer ${seekerToken}`)
      .send({ coverLetter: 'I am interested' });
    expect(res.status).toBe(201);
  });

  it('prevents duplicate application', async () => {
    const res = await request(app)
      .post(`/api/v1/jobs/${jobId}/apply`)
      .set('Authorization', `Bearer ${seekerToken}`)
      .send({});
    expect(res.status).toBe(409);
  });

  it('employer lists applications', async () => {
    const res = await request(app)
      .get(`/api/v1/jobs/${jobId}/applications`)
      .set('Authorization', `Bearer ${employerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
  });

  it('seeker cannot view applications list', async () => {
    const res = await request(app)
      .get(`/api/v1/jobs/${jobId}/applications`)
      .set('Authorization', `Bearer ${seekerToken}`);
    expect(res.status).toBe(403);
  });

  it('updates job', async () => {
    const res = await request(app)
      .patch(`/api/v1/jobs/${jobId}`)
      .set('Authorization', `Bearer ${employerToken}`)
      .send({ status: 'closed' });
    expect(res.status).toBe(200);
    expect(res.body.job.status).toBe('closed');
  });
});
```

## jest.config.js

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  setupFiles: ['<rootDir>/tests/setup.ts'],
  collectCoverageFrom: ['src/**/*.ts', '!src/server.ts'],
  coverageThreshold: {
    global: { branches: 70, functions: 75, lines: 80, statements: 80 },
  },
};
```

## tests/setup.ts

```typescript
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-s…long';
process.env.JWT_REFRESH_SECRET = 'test-r…long';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/nearjobs_test';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379/1';
process.env.LOG_LEVEL = 'error';
```

## .env.example

```
NODE_ENV=development
PORT=3000
DATABASE_URL=postgres://postgres:postgres@localhost:5432/nearjobs
REDIS_URL=redis://localhost:6379
JWT_SECRET=change…hars
JWT_REFRESH_SECRET=change…hars
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
CORS_ORIGINS=*
LOG_LEVEL=info
```

## Dockerfile

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm ci
COPY src ./src
RUN npm run build && npm prune --production

FROM node:20-alpine
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
COPY --from=builder --chown=app:app /app/node_modules ./node_modules
COPY --from=builder --chown=app:app /app/dist ./dist
COPY --chown=app:app package*.json ./
USER app
ENV NODE_ENV=production
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "dist/server.js"]
```

## docker-compose.yml

```yaml
version: '3.9'
services:
  postgres:
    image: postgis/postgis:16-3.4
    environment:
      POSTGRES_PASSWORD: ***
      POSTGRES_DB: nearjobs
    ports: ['5432:5432']
    volumes: ['pgdata:/var/lib/postgresql/data']
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U postgres']
      interval: 5s
  redis:
    image: redis:7-alpine
    ports: ['6379:6379']
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 5s
  api:
    build: .
    depends_on:
      postgres: { condition: service_healthy }
      redis: { condition: service_healthy }
    environment:
      DATABASE_URL: postgres://postgres:postgres@postgres:5432/nearjobs
      REDIS_URL: redis://redis:6379
      JWT_SECRET: prod-s…cret
      JWT_REFRESH_SECRET: prod-r…cret
    ports: ['3000:3000']
volumes:
  pgdata:
```

## Key Production Features

**Security**
- Argon2id password hashing
- JWT access + rotating refresh tokens (hashed at rest)
- Helmet security headers, CORS allowlist
- Per-route rate limiting (auth + global)
- Strict Zod input validation on body/query/params
- Parameterized queries (zero SQL injection surface)
- PII redaction in logs
- Constant-time login response (anti-enumeration)

**Reliability**
- Connection pooling with health checks
- Graceful shutdown (SIGTERM/SIGINT)
- Slow query logging
- Transaction helper
- `/health` and `/ready` endpoints

**Architecture**
- Clean layering: routes → controllers → services → repositories
- PostGIS geographic search with `ST_DWithin` + GiST index
- Result pagination, distance sorting
- Role-based authorization (job_seeker / employer / admin)
- Request ID propagation for tracing
- Structured logging with Pino

**Quality**
- Strict TypeScript configuration
- Integration tests covering auth, jobs, applications, RBAC
- 80% coverage threshold enforced
- Multi-stage Docker build with non-root user
- Configuration validated on boot via Zod

Run with: `docker-compose up`, then run migration `migrations/001_initial_schema.sql` against the database.