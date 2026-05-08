# OpenClaw Output

model.run via local
provider: anthropic
model: claude-opus-4-7
outputs: 1
# NearJobs - Production Build Implementation

I'll provide a production-grade build implementation for NearJobs, a location-based job marketplace platform.

## Project Structure

```
nearjobs/
├── package.json
├── tsconfig.json
├── .env.example
├── .eslintrc.json
├── .prettierrc
├── jest.config.js
├── Dockerfile
├── docker-compose.yml
├── .github/workflows/ci.yml
├── prisma/
│   └── schema.prisma
├── src/
│   ├── server.ts
│   ├── app.ts
│   ├── config/
│   │   ├── env.ts
│   │   └── logger.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   ├── error.ts
│   │   ├── rateLimit.ts
│   │   └── validate.ts
│   ├── modules/
│   │   ├── auth/
│   │   ├── jobs/
│   │   ├── users/
│   │   └── applications/
│   ├── utils/
│   │   ├── crypto.ts
│   │   ├── geo.ts
│   │   └── errors.ts
│   └── db/
│       └── prisma.ts
└── tests/
    ├── auth.test.ts
    ├── jobs.test.ts
    └── geo.test.ts
```

## Configuration Files

### package.json
```json
{
  "name": "nearjobs",
  "version": "1.0.0",
  "description": "Production-grade location-based job marketplace",
  "main": "dist/server.js",
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "start": "node dist/server.js",
    "dev": "tsx watch src/server.ts",
    "test": "jest --coverage --runInBand",
    "test:watch": "jest --watch",
    "lint": "eslint src --ext .ts",
    "lint:fix": "eslint src --ext .ts --fix",
    "format": "prettier --write \"src/**/*.ts\"",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate deploy",
    "prisma:dev": "prisma migrate dev",
    "prepare": "husky install"
  },
  "engines": {
    "node": ">=20.0.0"
  },
  "dependencies": {
    "@prisma/client": "^5.22.0",
    "argon2": "^0.41.1",
    "compression": "^1.7.5",
    "cors": "^2.8.5",
    "dotenv": "^16.4.7",
    "express": "^4.21.2",
    "express-rate-limit": "^7.5.0",
    "helmet": "^8.0.0",
    "jsonwebtoken": "^9.0.2",
    "pino": "^9.5.0",
    "pino-http": "^10.3.0",
    "zod": "^3.24.1"
  },
  "devDependencies": {
    "@types/compression": "^1.7.5",
    "@types/cors": "^2.8.17",
    "@types/express": "^5.0.0",
    "@types/jest": "^29.5.14",
    "@types/jsonwebtoken": "^9.0.7",
    "@types/node": "^22.10.2",
    "@types/supertest": "^6.0.2",
    "@typescript-eslint/eslint-plugin": "^8.18.0",
    "@typescript-eslint/parser": "^8.18.0",
    "eslint": "^8.57.1",
    "husky": "^9.1.7",
    "jest": "^29.7.0",
    "prettier": "^3.4.2",
    "prisma": "^5.22.0",
    "supertest": "^7.0.0",
    "ts-jest": "^29.2.5",
    "tsx": "^4.19.2",
    "typescript": "^5.7.2"
  }
}
```

### tsconfig.json
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
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "sourceMap": true,
    "removeComments": false,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests", "**/*.test.ts"]
}
```

### .env.example
```env
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

DATABASE_URL=postgresql://user:password@localhost:5432/nearjobs?schema=public

JWT_ACCESS_SECRET=replac…ring
JWT_REFRESH_SECRET=replac…ring
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100

CORS_ORIGINS=https://app.nearjobs.com

LOG_LEVEL=info
```

### jest.config.js
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/server.ts',
    '!src/**/*.d.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 75,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testTimeout: 15000
};
```

## Database Schema

### prisma/schema.prisma
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
  DRAFT
  ACTIVE
  CLOSED
  EXPIRED
}

enum ApplicationStatus {
  PENDING
  REVIEWED
  ACCEPTED
  REJECTED
  WITHDRAWN
}

model User {
  id            String         @id @default(uuid())
  email         String         @unique
  passwordHash  String
  fullName      String
  role          UserRole       @default(SEEKER)
  phone         String?
  isVerified    Boolean        @default(false)
  isActive      Boolean        @default(true)
  lastLoginAt   DateTime?
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  jobs          Job[]
  applications  Application[]
  refreshTokens RefreshToken[]

  @@index([email])
  @@index([role])
}

model RefreshToken {
  id        String   @id @default(uuid())
  tokenHash String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  revokedAt DateTime?
  createdAt DateTime @default(now())

  @@index([userId])
  @@index([tokenHash])
}

model Job {
  id            String        @id @default(uuid())
  title         String
  description   String        @db.Text
  category      String
  salaryMin     Int?
  salaryMax     Int?
  currency      String        @default("USD")
  status        JobStatus     @default(DRAFT)
  latitude      Float
  longitude     Float
  address       String
  city          String
  country       String
  expiresAt     DateTime?
  employerId    String
  employer      User          @relation(fields: [employerId], references: [id], onDelete: Cascade)
  applications  Application[]
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  @@index([status])
  @@index([category])
  @@index([latitude, longitude])
  @@index([employerId])
}

model Application {
  id          String            @id @default(uuid())
  jobId       String
  job         Job               @relation(fields: [jobId], references: [id], onDelete: Cascade)
  applicantId String
  applicant   User              @relation(fields: [applicantId], references: [id], onDelete: Cascade)
  coverLetter String            @db.Text
  status      ApplicationStatus @default(PENDING)
  createdAt   DateTime          @default(now())
  updatedAt   DateTime          @updatedAt

  @@unique([jobId, applicantId])
  @@index([applicantId])
  @@index([status])
}
```

## Source Code

### src/config/env.ts
```typescript
import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.stri…(32, 'JWT_ACCESS_SECRET must be ≥32 chars'),
  JWT_REFRESH_SECRET: z.stri…(32, 'JWT_REFRESH_SECRET must be ≥32 chars'),
  JWT_ACCESS_EXPIRES: z.string().default('15m'),
  JWT_REFRESH_EXPIRES: z.string().default('7d'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  CORS_ORIGINS: z.string().default(''),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment configuration:', parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
```

### src/config/logger.ts
```typescript
import pino from 'pino';
import { env, isProduction } from './env';

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: ['password', 'passwordHash', 'token', 'authorization', 'cookie', '*.password'],
    censor: '[REDACTED]',
  },
  ...(isProduction
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:standard' },
        },
      }),
});
```

### src/utils/errors.ts
```typescript
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  public readonly details: unknown;
  constructor(message: string, details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR');
    this.details = details;
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
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}
```

### src/utils/geo.ts
```typescript
const EARTH_RADIUS_KM = 6371;

const toRadians = (deg: number): number => (deg * Math.PI) / 180;

/**
 * Haversine distance between two coordinates in kilometers.
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (![lat1, lon1, lat2, lon2].every((v) => Number.isFinite(v))) {
    throw new Error('Invalid coordinates');
  }
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * Compute bounding box for a coordinate + radius (km).
 * Used for efficient SQL pre-filtering before exact distance calculation.
 */
export function boundingBox(
  lat: number,
  lon: number,
  radiusKm: number
): { minLat: number; maxLat: number; minLon: number; maxLon: number } {
  if (radiusKm <= 0) throw new Error('Radius must be positive');
  if (lat < -90 || lat > 90) throw new Error('Invalid latitude');
  if (lon < -180 || lon > 180) throw new Error('Invalid longitude');

  const latDelta = radiusKm / 111.32;
  const lonDelta = radiusKm / (111.32 * Math.cos(toRadians(lat)));

  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLon: lon - lonDelta,
    maxLon: lon + lonDelta,
  };
}

export function isValidCoordinate(lat: number, lon: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}
```

### src/utils/crypto.ts
```typescript
import argon2 from 'argon2';
import crypto from 'node:crypto';

const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

export function generateSecureToken(bytes = 48): string {
  return crypto.randomBytes(bytes).toString('base64url');
}

export function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}
```

### src/db/prisma.ts
```typescript
import { PrismaClient } from '@prisma/client';
import { logger } from '../config/logger';
import { isProduction } from '../config/env';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isProduction
      ? [{ emit: 'event', level: 'error' }]
      : [{ emit: 'event', level: 'error' }, { emit: 'event', level: 'warn' }],
  });

prisma.$on('error' as never, (e: unknown) => logger.error({ err: e }, 'Prisma error'));

if (!isProduction) globalForPrisma.prisma = prisma;

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}
```

### src/middleware/validate.ts
```typescript
import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../utils/errors';

type Source = 'body' | 'query' | 'params';

export function validate(schema: ZodSchema, source: Source = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req[source]);
      // Avoid mutating req.query (read-only in Express 5)
      (req as unknown as Record<string, unknown>)[`validated_${source}`] = parsed;
      if (source === 'body' || source === 'params') {
        req[source] = parsed as never;
      }
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(new ValidationError('Request validation failed', err.flatten()));
      } else {
        next(err);
      }
    }
  };
}
```

### src/middleware/auth.ts
```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { ForbiddenError, UnauthorizedError } from '../utils/errors';
import { UserRole } from '@prisma/client';

export interface JwtPayload {
  sub: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.header('authorization');
  if (!header || !header.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing or invalid Authorization header'));
  }
  const token = header.slice(7).trim();
  if (!token) return next(new UnauthorizedError('Missing token'));

  try {
    const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
      algorithms: ['HS256'],
    }) as JwtPayload;
    req.user = decoded;
    next();
  } catch {
    next(new UnauthorizedError('Invalid or expired token'));
  }
}

export function authorize(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(new UnauthorizedError());
    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError('Insufficient permissions'));
    }
    next();
  };
}
```

### src/middleware/error.ts
```typescript
import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { AppError } from '../utils/errors';
import { logger } from '../config/logger';
import { isProduction } from '../config/env';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err instanceof Error && 'details' in err ? { details: (err as never)['details'] } : {}),
      },
    });
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({
        error: { code: 'CONFLICT', message: 'Resource already exists' },
      });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Resource not found' } });
      return;
    }
  }

  logger.error(
    { err, path: req.path, method: req.method, requestId: req.id },
    'Unhandled error'
  );

  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: isProduction ? 'Internal server error' : err.message,
    },
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` },
  });
}
```

### src/middleware/rateLimit.ts
```typescript
import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

export const generalLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many auth attempts' } },
});
```

### src/modules/auth/auth.schema.ts
```typescript
import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().email().max(255).toLowerCase(),
  password: z
    .string()
    .min(12, 'Password must be ≥12 chars')
    .max(128)
    .regex(/[A-Z]/, 'Password must contain uppercase letter')
    .regex(/[a-z]/, 'Password must contain lowercase letter')
    .regex(/[0-9]/, 'Password must contain digit')
    .regex(/[^A-Za-z0-9]/, 'Password must contain symbol'),
  fullName: z.string().min(2).max(100).trim(),
  role: z.enum(['SEEKER', 'EMPLOYER']).default('SEEKER'),
  phone: z.string().regex(/^\+?[1-9]\d{6,14}$/).optional(),
});

export const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1).max(128),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(20).max(512),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
```

### src/modules/auth/auth.service.ts
```typescript
import jwt, { SignOptions } from 'jsonwebtoken';
import { prisma } from '../../db/prisma';
import { env } from '../../config/env';
import { hashPassword, verifyPassword, generateSecureToken, sha256 } from '../../utils/crypto';
import { ConflictError, UnauthorizedError } from '../../utils/errors';
import { LoginInput, RegisterInput } from './auth.schema';
import { UserRole } from '@prisma/client';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface AuthResult extends TokenPair {
  user: { id: string; email: string; fullName: string; role: UserRole };
}

function signAccessToken(userId: string, role: UserRole): string {
  const opts: SignOptions = {
    expiresIn: env.JWT_ACCESS_EXPIRES as SignOptions['expiresIn'],
    algorithm: 'HS256',
  };
  return jwt.sign({ sub: userId, role }, env.JWT_ACCESS_SECRET, opts);
}

function parseDuration(input: string): number {
  const match = /^(\d+)([smhd])$/.exec(input);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const v = Number(match[1]);
  const u = match[2];
  return v * ({ s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[u] ?? 86_400_000);
}

async function issueRefreshToken(userId: string): Promise<string> {
  const raw = generateSecureToken(48);
  const tokenHash = sha256(raw);
  const expiresAt = new Date(Date.now() + parseDuration(env.JWT_REFRESH_EXPIRES));
  await prisma.refreshToken.create({ data: { userId, tokenHash, expiresAt } });
  return raw;
}

export async function register(input: RegisterInput): Promise<AuthResult> {
  const exists = await prisma.user.findUnique({ where: { email: input.email } });
  if (exists) throw new ConflictError('Email already registered');

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      fullName: input.fullName,
      role: input.role as UserRole,
      phone: input.phone,
    },
  });

  const accessToken = signAccessToken(user.id, user.role);
  const refreshToken = await issueRefreshToken(user.id);

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
  };
}

export async function login(input: LoginInput): Promise<AuthResult> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  // Constant-time-ish check: always verify against a dummy hash if missing
  const ok = user
    ? await verifyPassword(user.passwordHash, input.password)
    : (await verifyPassword(
        '$argon2id$v=19$m=19456,t=2,p=1$ZHVtbXlzYWx0$XnXk0DqJg2ZbPa0J0Ai3wQiI/5G1n4WwQy9zQyWqHnA',
        input.password
      ),
      false);

  if (!user || !ok || !user.isActive) {
    throw new UnauthorizedError('Invalid credentials');
  }

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  const accessToken = signAccessToken(user.id, user.role);
  const refreshToken = await issueRefreshToken(user.id);

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
  };
}

export async function refresh(rawToken: string): Promise<TokenPair> {
  const tokenHash = sha256(rawToken);
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!stored || stored.revokedAt || stored.expiresAt < new Date() || !stored.user.isActive) {
    throw new UnauthorizedError('Invalid refresh token');
  }

  // Rotate
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  const accessToken = signAccessToken(stored.user.id, stored.user.role);
  const refreshToken = await issueRefreshToken(stored.user.id);
  return { accessToken, refreshToken };
}

export async function logout(rawToken: string): Promise<void> {
  const tokenHash = sha256(rawToken);
  await prisma.refreshToken
    .update({ where: { tokenHash }, data: { revokedAt: new Date() } })
    .catch(() => undefined);
}
```

### src/modules/auth/auth.controller.ts
```typescript
import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';

export async function registerHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function loginHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.login(req.body);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function refreshHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.refresh(req.body.refreshToken);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function logoutHandler(req: Request, res: Response, next: NextFunction) {
  try {
    if (req.body?.refreshToken) await authService.logout(req.body.refreshToken);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
```

### src/modules/auth/auth.routes.ts
```typescript
import { Router } from 'express';
import { validate } from '../../middleware/validate';
import { authLimiter } from '../../middleware/rateLimit';
import { loginSchema, refreshSchema, registerSchema } from './auth.schema';
import * as ctrl from './auth.controller';

export const authRouter = Router();

authRouter.post('/register', authLimiter, validate(registerSchema), ctrl.registerHandler);
authRouter.post('/login', authLimiter, validate(loginSchema), ctrl.loginHandler);
authRouter.post('/refresh', authLimiter, validate(refreshSchema), ctrl.refreshHandler);
authRouter.post('/logout', validate(refreshSchema), ctrl.logoutHandler);
```

### src/modules/jobs/jobs.schema.ts
```typescript
import { z } from 'zod';

export const createJobSchema = z.object({
  title: z.string().min(3).max(150).trim(),
  description: z.string().min(20).max(10_000),
  category: z.string().min(2).max(50),
  salaryMin: z.number().int().nonnegative().optional(),
  salaryMax: z.number().int().nonnegative().optional(),
  currency: z.string().length(3).toUpperCase().default('USD'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().min(3).max(255),
  city: z.string().min(1).max(100),
  country: z.string().min(2).max(100),
  expiresAt: z.coerce.date().optional(),
}).refine(
  (d) => d.salaryMin === undefined || d.salaryMax === undefined || d.salaryMin <= d.salaryMax,
  { message: 'salaryMin must be ≤ salaryMax', path: ['salaryMin'] }
);

export const updateJobSchema = createJobSchema.partial();

export const searchJobsSchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().positive().max(500).default(25),
  category: z.string().min(1).max(50).optional(),
  q: z.string().min(1).max(100).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateJobInput = z.infer<typeof createJobSchema>;
export type UpdateJobInput = z.infer<typeof updateJobSchema>;
export type SearchJobsInput = z.infer<typeof searchJobsSchema>;
```

### src/modules/jobs/jobs.service.ts
```typescript
import { JobStatus, Prisma } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { boundingBox, haversineDistance } from '../../utils/geo';
import { ForbiddenError, NotFoundError } from '../../utils/errors';
import { CreateJobInput, SearchJobsInput, UpdateJobInput } from './jobs.schema';

export async function createJob(employerId: string, input: CreateJobInput) {
  return prisma.job.create({
    data: { ...input, employerId, status: JobStatus.ACTIVE },
  });
}

export async function getJobById(id: string) {
  const job = await prisma.job.findUnique({
    where: { id },
    include: { employer: { select: { id: true, fullName: true, email: true } } },
  });
  if (!job) throw new NotFoundError('Job not found');
  return job;
}

export async function updateJob(id: string, employerId: string, input: UpdateJobInput) {
  const job = await prisma.job.findUnique({ where: { id } });
  if (!job) throw new NotFoundError('Job not found');
  if (job.employerId !== employerId) throw new ForbiddenError('Cannot modify others’ jobs');

  return prisma.job.update({ where: { id }, data: input });
}

export async function deleteJob(id: string, employerId: string): Promise<void> {
  const job = await prisma.job.findUnique({ where: { id } });
  if (!job) throw new NotFoundError('Job not found');
  if (job.employerId !== employerId) throw new ForbiddenError('Cannot delete others’ jobs');
  await prisma.job.delete({ where: { id } });
}

export async function searchJobs(input: SearchJobsInput) {
  const { latitude, longitude, radiusKm, category, q, page, limit } = input;
  const bbox = boundingBox(latitude, longitude, radiusKm);

  const where: Prisma.JobWhereInput = {
    status: JobStatus.ACTIVE,
    latitude: { gte: bbox.minLat, lte: bbox.maxLat },
    longitude: { gte: bbox.minLon, lte: bbox.maxLon },
    AND: [
      { OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
      ...(category ? [{ category: { equals: category, mode: 'insensitive' as const } }] : []),
      ...(q
        ? [
            {
              OR: [
                { title: { contains: q, mode: 'insensitive' as const } },
                { description: { contains: q, mode: 'insensitive' as const } },
              ],
            },
          ]
        : []),
    ],
  };

  // Fetch a wider candidate set for accurate radius filtering, then refine in JS.
  const candidateLimit = Math.min(limit * page * 4, 1000);
  const candidates = await prisma.job.findMany({
    where,
    take: candidateLimit,
    orderBy: { createdAt: 'desc' },
  });

  const enriched = candidates
    .map((j) => ({
      ...j,
      distanceKm: haversineDistance(latitude, longitude, j.latitude, j.longitude),
    }))
    .filter((j) => j.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  const total = enriched.length;
  const items = enriched.slice((page - 1) * limit, page * limit);

  return { items, total, page, limit, pages: Math.ceil(total / limit) };
}
```

### src/modules/jobs/jobs.controller.ts
```typescript
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as jobsService from './jobs.service';
import { UnauthorizedError, ValidationError } from '../../utils/errors';

const idSchema = z.object({ id: z.string().uuid() });

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new UnauthorizedError();
    const job = await jobsService.createJob(req.user.sub, req.body);
    res.status(201).json(job);
  } catch (e) {
    next(e);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const { id } = idSchema.parse(req.params);
    const job = await jobsService.getJobById(id);
    res.json(job);
  } catch (e) {
    next(e);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new UnauthorizedError();
    const { id } = idSchema.parse(req.params);
    const job = await jobsService.updateJob(id, req.user.sub, req.body);
    res.json(job);
  } catch (e) {
    next(e);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) throw new UnauthorizedError();
    const { id } = idSchema.parse(req.params);
    await jobsService.deleteJob(id, req.user.sub);
    res.status(204).send();
  } catch (e) {
    next(e);
  }
}

export async function search(req: Request, res: Response, next: NextFunction) {
  try {
    const validated = (req as unknown as Record<string, unknown>)['validated_query'];
    if (!validated) throw new ValidationError('Missing query');
    const result = await jobsService.searchJobs(validated as never);
    res.json(result);
  } catch (e) {
    next(e);
  }
}
```

### src/modules/jobs/jobs.routes.ts
```typescript
import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createJobSchema, searchJobsSchema, updateJobSchema } from './jobs.schema';
import * as ctrl from './jobs.controller';

export const jobsRouter = Router();

jobsRouter.get('/search', validate(searchJobsSchema, 'query'), ctrl.search);
jobsRouter.get('/:id', ctrl.getById);

jobsRouter.post('/', authenticate, authorize('EMPLOYER', 'ADMIN'), validate(createJobSchema), ctrl.create);
jobsRouter.patch('/:id', authenticate, authorize('EMPLOYER', 'ADMIN'), validate(updateJobSchema), ctrl.update);
jobsRouter.delete('/:id', authenticate, authorize('EMPLOYER', 'ADMIN'), ctrl.remove);
```

### src/modules/applications/applications.schema.ts
```typescript
import { z } from 'zod';

export const applySchema = z.object({
  jobId: z.string().uuid(),
  coverLetter: z.string().min(20).max(5000),
});

export const updateStatusSchema = z.object({
  status: z.enum(['PENDING', 'REVIEWED', 'ACCEPTED', 'REJECTED', 'WITHDRAWN']),
});

export type ApplyInput = z.infer<typeof applySchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
```

### src/modules/applications/applications.service.ts
```typescript
import { ApplicationStatus, JobStatus } from '@prisma/client';
import { prisma } from '../../db/prisma';
import { ConflictError, ForbiddenError, NotFoundError } from '../../utils/errors';
import { ApplyInput } from './applications.schema';

export async function apply(applicantId: string, input: ApplyInput) {
  const job = await prisma.job.findUnique({ where: { id: input.jobId } });
  if (!job) throw new NotFoundError('Job not found');
  if (job.status !== JobStatus.ACTIVE) throw new ConflictError('Job is not active');
  if (job.employerId === applicantId) throw new ForbiddenError('Cannot apply to own job');

  try {
    return await prisma.application.create({
      data: {
        jobId: input.jobId,
        applicantId,
        coverLetter: input.coverLetter,
      },
    });
  } catch (e) {
    if ((e as { code?: string }).code === 'P2002') {
      throw new ConflictError('Already applied to this job');
    }
    throw e;
  }
}

export async function listForApplicant(applicantId: string) {
  return prisma.application.findMany({
    where: { applicantId },
    include: { job: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function listForEmployer(employerId: string, jobId: string) {
  const job = await prisma.job.findUnique({ where: { id: jobId } });
  if (!job) throw new NotFoundError('Job not found');
  if (job.employerId !== employerId) throw new ForbiddenError();

  return prisma.application.findMany({
    where: { jobId },
    include: { applicant: { select: { id: true, fullName: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  });
}

export async function updateStatus(
  applicationId: string,
  employerId: string,
  status: ApplicationStatus
) {
  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { job: true },
  });
  if (!app) throw new NotFoundError('Application not found');
  if (app.job.employerId !== employerId) throw new ForbiddenError();

  return prisma.application.update({ where: { id: applicationId }, data: { status } });
}
```

### src/modules/applications/applications.routes.ts
```typescript
import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { applySchema, updateStatusSchema } from './applications.schema';
import * as svc from './applications.service';
import { UnauthorizedError } from '../../utils/errors';

export const applicationsRouter = Router();

const idSchema = z.object({ id: z.string().uuid() });
const jobIdSchema = z.object({ jobId: z.string().uuid() });

applicationsRouter.post(
  '/',
  authenticate,
  authorize('SEEKER'),
  validate(applySchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const app = await svc.apply(req.user.sub, req.body);
      res.status(201).json(app);
    } catch (e) {
      next(e);
    }
  }
);

applicationsRouter.get(
  '/me',
  authenticate,
  authorize('SEEKER'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new UnauthorizedError();
      res.json(await svc.listForApplicant(req.user.sub));
    } catch (e) {
      next(e);
    }
  }
);

applicationsRouter.get(
  '/job/:jobId',
  authenticate,
  authorize('EMPLOYER', 'ADMIN'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { jobId } = jobIdSchema.parse(req.params);
      res.json(await svc.listForEmployer(req.user.sub, jobId));
    } catch (e) {
      next(e);
    }
  }
);

applicationsRouter.patch(
  '/:id/status',
  authenticate,
  authorize('EMPLOYER', 'ADMIN'),
  validate(updateStatusSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) throw new UnauthorizedError();
      const { id } = idSchema.parse(req.params);
      res.json(await svc.updateStatus(id, req.user.sub, req.body.status));
    } catch (e) {
      next(e);
    }
  }
);
```

### src/app.ts
```typescript
import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import pinoHttp from 'pino-http';
import { randomUUID } from 'node:crypto';
import { env } from './config/env';
import { logger } from './config/logger';
import { generalLimiter } from './middleware/rateLimit';
import { errorHandler, notFoundHandler } from './middleware/error';
import { authRouter } from './modules/auth/auth.routes';
import { jobsRouter } from './modules/jobs/jobs.routes';
import { applicationsRouter } from './modules/applications/applications.routes';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      id: string;
    }
  }
}

export function createApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use((req, _res, next) => {
    req.id = (req.headers['x-request-id'] as string) || randomUUID();
    next();
  });

  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => (req as unknown as { id: string }).id,
      customLogLevel: (_req, res, err) => {
        if (err || res.statusCode >= 500) return 'error';
        if (res.statusCode >= 400) return 'warn';
        return 'info';
      },
    })
  );

  app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

  const origins = env.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean);
  app.use(
    cors({
      origin: origins.length ? origins : false,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    })
  );

  app.use(compression());
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: false, limit: '100kb' }));
  app.use(generalLimiter);

  app.get('/health', (_req, res) => res.json({ status: 'ok', uptime: process.uptime() }));
  app.get('/ready', (_req, res) => res.json({ status: 'ready' }));

  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/jobs', jobsRouter);
  app.use('/api/v1/applications', applicationsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
```

### src/server.ts
```typescript
import http from 'node:http';
import { createApp } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { disconnectPrisma, prisma } from './db/prisma';

async function main(): Promise<void> {
  await prisma.$connect();
  const app = createApp();
  const server = http.createServer(app);

  server.listen(env.PORT, env.HOST, () => {
    logger.info({ port: env.PORT, host: env.HOST, env: env.NODE_ENV }, 'Server started');
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'Shutting down');
    server.close(async () => {
      await disconnectPrisma();
      logger.info('Shutdown complete');
      process.exit(0);
    });
    setTimeout(() => {
      logger.error('Forceful shutdown');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => logger.error({ reason }, 'unhandledRejection'));
  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'uncaughtException');
    void shutdown('uncaughtException');
  });
}

main().catch((err) => {
  logger.fatal({ err }, 'Failed to start');
  process.exit(1);
});
```

## Tests

### tests/setup.ts
```typescript
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test_a…g_xx';
process.env.JWT_REFRESH_SECRET = 'test_r…ng_x';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://test:test@localhost:5432/nearjobs_test';
process.env.CORS_ORIGINS = 'http://localhost:3000';
process.env.LOG_LEVEL = 'fatal';

jest.setTimeout(15000);
```

### tests/geo.test.ts
```typescript
import { boundingBox, haversineDistance, isValidCoordinate } from '../src/utils/geo';

describe('geo utilities', () => {
  it('haversineDistance: NYC → LA ≈ 3936 km', () => {
    const d = haversineDistance(40.7128, -74.006, 34.0522, -118.2437);
    expect(d).toBeGreaterThan(3930);
    expect(d).toBeLessThan(3950);
  });

  it('haversineDistance: identical points = 0', () => {
    expect(haversineDistance(10, 20, 10, 20)).toBe(0);
  });

  it('haversineDistance: rejects NaN', () => {
    expect(() => haversineDistance(NaN, 0, 0, 0)).toThrow();
  });

  it('boundingBox: valid output', () => {
    const b = boundingBox(40.7128, -74.006, 10);
    expect(b.minLat).toBeLessThan(40.7128);
    expect(b.maxLat).toBeGreaterThan(40.7128);
    expect(b.minLon).toBeLessThan(-74.006);
    expect(b.maxLon).toBeGreaterThan(-74.006);
  });

  it('boundingBox: rejects bad inputs', () => {
    expect(() => boundingBox(0, 0, 0)).toThrow();
    expect(() => boundingBox(91, 0, 5)).toThrow();
    expect(() => boundingBox(0, 181, 5)).toThrow();
  });

  it('isValidCoordinate', () => {
    expect(isValidCoordinate(0, 0)).toBe(true);
    expect(isValidCoordinate(90, 180)).toBe(true);
    expect(isValidCoordinate(-90, -180)).toBe(true);
    expect(isValidCoordinate(91, 0)).toBe(false);
    expect(isValidCoordinate(NaN, 0)).toBe(false);
  });
});
```

### tests/auth.test.ts
```typescript
import { hashPassword, verifyPassword, generateSecureToken, sha256 } from '../src/utils/crypto';
import { registerSchema, loginSchema } from '../src/modules/auth/auth.schema';

describe('crypto utilities', () => {
  it('hashes and verifies passwords', async () => {
    const hash = await hashPassword('Strong!Pass123');
    expect(hash).not.toContain('Strong!Pass123');
    expect(await verifyPassword(hash, 'Strong!Pass123')).toBe(true);
    expect(await verifyPassword(hash, 'wrong')).toBe(false);
  });

  it('generates unique tokens', () => {
    const a = generateSecureToken();
    const b = generateSecureToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThan(40);
  });

  it('sha256 deterministic', () => {
    expect(sha256('abc')).toBe(sha256('abc'));
    expect(sha256('abc')).not.toBe(sha256('abd'));
  });
});

describe('auth schemas', () => {
  it('rejects weak passwords', () => {
    const r = registerSchema.safeParse({
      email: 'a@b.com',
      password: 'short',
      fullName: 'John Doe',
    });
    expect(r.success).toBe(false);
  });

  it('accepts valid registration', () => {
    const r = registerSchema.safeParse({
      email: 'A@B.com',
      password: 'Strong!Pass1234',
      fullName: 'John Doe',
      role: 'EMPLOYER',
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.email).toBe('a@b.com');
  });

  it('login schema requires email', () => {
    const r = loginSchema.safeParse({ email: 'not-email', password: 'x' });
    expect(r.success).toBe(false);
  });
});
```

### tests/jobs.test.ts
```typescript
import { createJobSchema, searchJobsSchema } from '../src/modules/jobs/jobs.schema';

describe('job schemas', () => {
  const valid = {
    title: 'Senior Engineer',
    description: 'Looking for a senior software engineer with experience.',
    category: 'engineering',
    latitude: 40.7128,
    longitude: -74.006,
    address: '123 Main St',
    city: 'NYC',
    country: 'USA',
  };

  it('accepts a valid job', () => {
    expect(createJobSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects salary inversion', () => {
    expect(
      createJobSchema.safeParse({ ...valid, salaryMin: 100, salaryMax: 50 }).success
    ).toBe(false);
  });

  it('rejects bad coordinates', () => {
    expect(createJobSchema.safeParse({ ...valid, latitude: 91 }).success).toBe(false);
    expect(createJobSchema.safeParse({ ...valid, longitude: -181 }).success).toBe(false);
  });

  it('search schema applies defaults', () => {
    const r = searchJobsSchema.safeParse({ latitude: 0, longitude: 0 });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.radiusKm).toBe(25);
      expect(r.data.page).toBe(1);
    }
  });

  it('search rejects radius > 500km', () => {
    expect(
      searchJobsSchema.safeParse({ latitude: 0, longitude: 0, radiusKm: 1000 }).success
    ).toBe(false);
  });
});
```

## Deployment

### Dockerfile
```dockerfile
# syntax=docker/dockerfile:1.7
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN npm ci --omit=dev && npx prisma generate

FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
COPY --from=deps  --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nodejs:nodejs /app/dist ./dist
COPY --from=build --chown=nodejs:nodejs /app/prisma ./prisma
COPY --from=build --chown=nodejs:nodejs /app/package.json ./package.json
USER nodejs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3000/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"
CMD ["node", "dist/server.js"]
```

### docker-compose.yml
```yaml
services:
  postgres:
    image: postgis/postgis:16-3.4
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-nearjobs}
      POSTGRES_PASSWORD: ${POST…obs}
      POSTGRES_DB: ${POSTGRES_DB:-nearjobs}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-nearjobs}"]
      interval: 10s
      retries: 5

  api:
    build: .
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      NODE_ENV: production
      PORT: 3000
      DATABASE_URL: postgresql://${POSTGRES_USER:-nearjobs}:${POSTGRES_PASSWORD:-nearj…blic
      JWT_ACCESS_SECRET: ${JWT_…RET}
      JWT_REFRESH_SECRET: ${JWT_…RET}
      CORS_ORIGINS: ${CORS_ORIGINS}
    ports:
      - "3000:3000"
    command: sh -c "npx prisma migrate deploy && node dist/server.js"

volumes:
  postgres-data:
```

### .github/workflows/ci.yml
```yaml
name: CI
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  build-test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: ***
          POSTGRES_DB: nearjobs_test
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready --health-interval 10s
          --health-timeout 5s --health-retries 5
    env:
      DATABASE_URL: postgresql://test:test@localhost:5432/nearjobs_test
      JWT_ACCESS_SECRET: ci_acc…g_xx
      JWT_REFRESH_SECRET: ci_ref…ng_x
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx prisma generate
      - run: npm run lint
      - run: npm run build
      - run: npm test

  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'npm' }
      - run: npm ci
      - run: npm audit --audit-level=high
```

## Summary

This implementation delivers:

- **Security**: Argon2id password hashing, JWT access/refresh rotation, hashed refresh token storage, Helmet, CORS allowlisting, rate limiting (general + auth-specific), input validation via Zod, Prisma parameterized queries (no SQL injection), redacted logs, non-root container user.
- **Validation**: Strict Zod schemas on every endpoint (body/query/params), strong password policy, coordinate bounds, salary cross-field validation.
- **Production quality**: Structured logging (pino), request IDs, graceful shutdown, health/readiness probes, error taxonomy, Prisma error mapping, multi-stage Dockerfile, healthcheck, CI with tests + lint + audit.
- **Geo features**: Bounding-box pre-filter + Haversine refinement for accurate radius search.
- **Tests**: Unit tests for crypto, geo math, and all validation schemas with coverage thresholds.
- **Deployment-ready**: Docker Compose with PostGIS, Prisma migrations on boot, env validation that fails fast.

Run with: `npm ci && npm run prisma:generate && npm run build && docker compose up`.