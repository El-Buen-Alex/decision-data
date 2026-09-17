# Backend & Infrastructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the NestJS backend and Postgres infrastructure for Decision Data Ruta: a deterministic mortgage-eligibility rules engine, its data model, and an AI agent that explains results without ever calculating numbers itself.

**Architecture:** NestJS modules (`rules-engine`, `underwriting`, `auth`, `agent`) on top of a Postgres database accessed via TypeORM, with a global response envelope and exception filter. The rules engine is pure/deterministic and reads its parameters from a database table instead of hardcoded constants. The agent module calls an LLM only to generate template text; a deterministic resolver substitutes real numbers from the rules engine before any response leaves the backend.

**Tech Stack:** NestJS 10, TypeScript (strict), TypeORM, PostgreSQL 16, class-validator/class-transformer, @nestjs/jwt + passport-jwt, @nestjs/throttler, @nestjs/config + Joi, @anthropic-ai/sdk, Jest.

**Spec:** `docs/superpowers/specs/2026-09-16-decision-data-ruta-design.md`

## Global Constraints

- TypeScript `strict: true` everywhere, no unjustified `any`.
- DTOs, interfaces, and entities live in separate files from controllers/services — never mixed in one file.
- Every API response uses the envelope: `{ "status": "success" | "error", "message": string, "data": {} | null }`.
- A global `AllExceptionsFilter` converts every error (validation, business, unhandled) into that same envelope shape.
- No complex inline expressions (nested ternaries, compressed chains) — use named intermediate variables.
- Functions are 40-80 lines; outside that range only with explicit justification.
- All configuration comes from environment variables from the first commit; `.env.example` has no secrets.
- Nothing is shared between `backend/`, `frontend/`, `infrastructure/` — this plan only touches `backend/` and `infrastructure/`.
- Commit messages are human/professional in style, no AI-attribution trailers.
- Every `UnderwritingRuleParameter` seed row carries a real `source` citation (from the spec's Section 4.1 table) or an explicit "not public — illustrative" note.

---

## Task 1: Infrastructure scaffolding (Postgres via Docker Compose)

**Files:**
- Create: `infrastructure/docker-compose.yml`
- Create: `infrastructure/.env.example`
- Create: `.gitignore` (repo root)

**Interfaces:**
- Produces: a Postgres instance reachable at `localhost:5432`, database `decision_data_ruta`, credentials from env vars `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`.

- [ ] **Step 1: Create the root `.gitignore`**

```
node_modules/
dist/
.env
.env.local
*.log
.DS_Store
```

- [ ] **Step 2: Create `infrastructure/.env.example`**

```
POSTGRES_USER=decision_data
POSTGRES_PASSWORD=change_me_locally
POSTGRES_DB=decision_data_ruta
POSTGRES_PORT=5432
```

- [ ] **Step 3: Create `infrastructure/docker-compose.yml`**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    ports:
      - "${POSTGRES_PORT}:5432"
    volumes:
      - decision_data_pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  decision_data_pgdata:
```

- [ ] **Step 4: Verify Postgres starts**

Run: `cd infrastructure && cp .env.example .env && docker compose up -d && docker compose ps`
Expected: service `postgres` shows state `running (healthy)`.

- [ ] **Step 5: Commit**

```bash
git add .gitignore infrastructure/docker-compose.yml infrastructure/.env.example
git commit -m "chore: add postgres infrastructure via docker compose"
```

---

## Task 2: NestJS project scaffolding with strict TypeScript

**Files:**
- Create: `backend/` (via Nest CLI)
- Modify: `backend/tsconfig.json`
- Create: `backend/.env.example`

**Interfaces:**
- Produces: a runnable NestJS app skeleton at `backend/` with strict TypeScript.

- [ ] **Step 1: Scaffold the Nest project**

Run: `npx @nestjs/cli@10 new backend --package-manager npm --skip-git`

- [ ] **Step 2: Enable strict TypeScript**

In `backend/tsconfig.json`, ensure the `compilerOptions` block includes:

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "module": "commonjs",
    "target": "ES2021",
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

- [ ] **Step 3: Create `backend/.env.example`**

```
NODE_ENV=development
PORT=3001
DATABASE_URL=postgres://decision_data:change_me_locally@localhost:5432/decision_data_ruta
JWT_SECRET=change_me_to_a_long_random_string
JWT_EXPIRES_IN=1d
ANTHROPIC_API_KEY=sk-ant-replace-me
AGENT_MODEL=claude-sonnet-5
THROTTLE_TTL_SECONDS=60
THROTTLE_LIMIT=20
```

- [ ] **Step 4: Verify the app boots**

Run: `cd backend && npm run start:dev` (then stop it, Ctrl+C, once you see "Nest application successfully started")
Expected: no compile errors, server listens on port 3000 (default, changed in Task 3).

- [ ] **Step 5: Commit**

```bash
git add backend/ 
git commit -m "chore: scaffold nestjs backend with strict typescript"
```

---

## Task 3: Env validation, response envelope, and global exception filter

**Files:**
- Create: `backend/src/config/env-validation.schema.ts`
- Modify: `backend/src/app.module.ts`
- Create: `backend/src/common/interceptors/response-envelope.interceptor.ts`
- Create: `backend/src/common/filters/all-exceptions.filter.ts`
- Create: `backend/src/common/interfaces/api-response.interface.ts`
- Modify: `backend/src/main.ts`
- Test: `backend/src/common/filters/all-exceptions.filter.spec.ts`

**Interfaces:**
- Produces: `ApiResponse<T>` interface `{ status: 'success' | 'error'; message: string; data: T | null }`, used by every controller response from here on.

- [ ] **Step 1: Define the envelope interface**

`backend/src/common/interfaces/api-response.interface.ts`:

```typescript
export interface ApiResponse<T> {
  status: 'success' | 'error';
  message: string;
  data: T | null;
}
```

- [ ] **Step 2: Write the failing test for the exception filter**

`backend/src/common/filters/all-exceptions.filter.spec.ts`:

```typescript
import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

function buildMockHost(jsonSpy: jest.Mock, statusSpy: jest.Mock): ArgumentsHost {
  const response = { status: statusSpy, json: jsonSpy };
  statusSpy.mockReturnValue(response);
  return {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => ({ url: '/test' }),
    }),
  } as unknown as ArgumentsHost;
}

describe('AllExceptionsFilter', () => {
  it('wraps an HttpException in the standard envelope', () => {
    const filter = new AllExceptionsFilter();
    const jsonSpy = jest.fn();
    const statusSpy = jest.fn();
    const host = buildMockHost(jsonSpy, statusSpy);
    const exception = new HttpException('Recurso no encontrado', HttpStatus.NOT_FOUND);

    filter.catch(exception, host);

    expect(statusSpy).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(jsonSpy).toHaveBeenCalledWith({
      status: 'error',
      message: 'Recurso no encontrado',
      data: null,
    });
  });

  it('wraps an unknown error as a 500 with a generic message', () => {
    const filter = new AllExceptionsFilter();
    const jsonSpy = jest.fn();
    const statusSpy = jest.fn();
    const host = buildMockHost(jsonSpy, statusSpy);

    filter.catch(new Error('unexpected failure'), host);

    expect(statusSpy).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(jsonSpy).toHaveBeenCalledWith({
      status: 'error',
      message: 'Ocurrió un error inesperado.',
      data: null,
    });
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd backend && npx jest all-exceptions.filter.spec.ts`
Expected: FAIL with "Cannot find module './all-exceptions.filter'"

- [ ] **Step 4: Implement the exception filter**

`backend/src/common/filters/all-exceptions.filter.ts`:

```typescript
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiResponse } from '../interfaces/api-response.interface';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const httpContext = host.switchToHttp();
    const response = httpContext.getResponse<Response>();

    const isKnownHttpException = exception instanceof HttpException;
    const statusCode = isKnownHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = this.resolveMessage(exception, isKnownHttpException);

    const envelope: ApiResponse<null> = {
      status: 'error',
      message,
      data: null,
    };

    response.status(statusCode).json(envelope);
  }

  private resolveMessage(exception: unknown, isKnownHttpException: boolean): string {
    if (!isKnownHttpException) {
      return 'Ocurrió un error inesperado.';
    }

    const httpException = exception as HttpException;
    const response = httpException.getResponse();

    if (typeof response === 'string') {
      return response;
    }

    const responseObject = response as { message?: string | string[] };
    if (Array.isArray(responseObject.message)) {
      return responseObject.message.join(' ');
    }

    return responseObject.message ?? httpException.message;
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd backend && npx jest all-exceptions.filter.spec.ts`
Expected: PASS (2 tests)

- [ ] **Step 6: Implement the success-response envelope interceptor**

`backend/src/common/interceptors/response-envelope.interceptor.ts`:

```typescript
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse } from '../interfaces/api-response.interface';

@Injectable()
export class ResponseEnvelopeInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((payload) => ({
        status: 'success' as const,
        message: 'OK',
        data: payload,
      })),
    );
  }
}
```

- [ ] **Step 7: Define the env validation schema**

`backend/src/config/env-validation.schema.ts`:

```typescript
import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().default(3001),
  DATABASE_URL: Joi.string().uri().required(),
  JWT_SECRET: Joi.string().min(16).required(),
  JWT_EXPIRES_IN: Joi.string().default('1d'),
  ANTHROPIC_API_KEY: Joi.string().required(),
  AGENT_MODEL: Joi.string().default('claude-sonnet-5'),
  THROTTLE_TTL_SECONDS: Joi.number().default(60),
  THROTTLE_LIMIT: Joi.number().default(20),
});
```

- [ ] **Step 8: Wire ConfigModule validation into `app.module.ts`**

In `backend/src/app.module.ts`, import and register:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { envValidationSchema } from './config/env-validation.schema';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),
  ],
})
export class AppModule {}
```

- [ ] **Step 9: Register the filter, interceptor, and global validation pipe in `main.ts`**

`backend/src/main.ts`:

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ResponseEnvelopeInterceptor } from './common/interceptors/response-envelope.interceptor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new ResponseEnvelopeInterceptor());
  app.enableCors();

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
}

bootstrap();
```

- [ ] **Step 10: Verify the app still boots with validation active**

Run: `cd backend && cp .env.example .env && npm run start:dev` (Ctrl+C once started)
Expected: boots cleanly on port 3001; if you temporarily remove `JWT_SECRET` from `.env` it should crash immediately with a Joi validation error — put it back afterward.

- [ ] **Step 11: Commit**

```bash
git add backend/src/config backend/src/common backend/src/main.ts backend/src/app.module.ts backend/.env.example
git commit -m "feat: add env validation, response envelope, and global exception filter"
```

---

## Task 4: Database connection and TypeORM setup

**Files:**
- Create: `backend/src/database/database.module.ts`
- Modify: `backend/src/app.module.ts`
- Create: `backend/src/database/data-source.ts`
- Create: `backend/package.json` (modify: add scripts)

**Interfaces:**
- Produces: a global `TypeOrmModule` connection other modules register entities against; a CLI `DataSource` for running migrations.

- [ ] **Step 1: Install TypeORM and the Postgres driver**

Run: `cd backend && npm install @nestjs/typeorm typeorm pg`

- [ ] **Step 2: Create the CLI data source**

`backend/src/database/data-source.ts`:

```typescript
import 'dotenv/config';
import { DataSource } from 'typeorm';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [__dirname + '/../**/*.entity.{ts,js}'],
  migrations: [__dirname + '/migrations/*.{ts,js}'],
  synchronize: false,
});
```

- [ ] **Step 3: Create the database module**

`backend/src/database/database.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('DATABASE_URL'),
        autoLoadEntities: true,
        synchronize: false,
      }),
    }),
  ],
})
export class DatabaseModule {}
```

- [ ] **Step 4: Register `DatabaseModule` in `app.module.ts`**

Add `DatabaseModule` to the `imports` array in `backend/src/app.module.ts`, after `ConfigModule.forRoot(...)`.

- [ ] **Step 5: Install ts-node and add migration scripts**

Run: `cd backend && npm install --save-dev ts-node dotenv`

Add to `backend/package.json` under `"scripts"`:

```json
"typeorm": "typeorm-ts-node-commonjs -d src/database/data-source.ts",
"migration:generate": "npm run typeorm -- migration:generate",
"migration:run": "npm run typeorm -- migration:run",
"migration:revert": "npm run typeorm -- migration:revert"
```

- [ ] **Step 6: Verify the connection works**

Run: `cd backend && npm run start:dev` (Ctrl+C once started, with `infrastructure` Postgres running from Task 1)
Expected: no TypeORM connection errors in the log.

- [ ] **Step 7: Commit**

```bash
git add backend/src/database backend/package.json backend/package-lock.json
git commit -m "feat: wire typeorm to postgres with a cli data source"
```

---

## Task 5: Core entities and initial migration

**Files:**
- Create: `backend/src/users/entities/user.entity.ts`
- Create: `backend/src/underwriting/entities/credit-profile.entity.ts`
- Create: `backend/src/underwriting/entities/mortgage-goal.entity.ts`
- Create: `backend/src/underwriting/entities/underwriting-rule-parameter.entity.ts`
- Create: `backend/src/underwriting/entities/simulation.entity.ts`
- Create: `backend/src/underwriting/entities/plan.entity.ts`
- Create: `backend/src/underwriting/entities/milestone.entity.ts`
- Create: `backend/src/agent/entities/agent-log.entity.ts`
- Create: `backend/src/database/migrations/<timestamp>-InitialSchema.ts` (generated)

**Interfaces:**
- Produces: TypeORM entities `User`, `CreditProfile`, `MortgageGoal`, `UnderwritingRuleParameter`, `Simulation`, `Plan`, `Milestone`, `AgentLog`, each with a UUID primary key `id`.

- [ ] **Step 1: Create `User`**

`backend/src/users/entities/user.entity.ts`:

```typescript
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column()
  passwordHash!: string;

  @Column()
  displayName!: string;

  @CreateDateColumn()
  createdAt!: Date;
}
```

- [ ] **Step 2: Create `CreditProfile`**

`backend/src/underwriting/entities/credit-profile.entity.ts`:

```typescript
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum IncomeType {
  FORMAL = 'formal',
  INFORMAL = 'informal',
}

@Entity('credit_profiles')
export class CreditProfile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'user_id' })
  userId!: string;

  @Column('int')
  score!: number;

  @Column('decimal', { precision: 5, scale: 2, name: 'card_utilization_percent' })
  cardUtilizationPercent!: string;

  @Column('decimal', { precision: 12, scale: 2, name: 'monthly_income' })
  monthlyIncome!: string;

  @Column({ type: 'enum', enum: IncomeType, name: 'income_type' })
  incomeType!: IncomeType;

  @Column('int', { name: 'months_employed' })
  monthsEmployed!: number;

  @Column('boolean', { name: 'recent_delinquency', default: false })
  recentDelinquency!: boolean;

  @Column('decimal', { precision: 12, scale: 2, name: 'existing_monthly_debt' })
  existingMonthlyDebt!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
```

- [ ] **Step 3: Create `MortgageGoal`**

`backend/src/underwriting/entities/mortgage-goal.entity.ts`:

```typescript
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum PropertyType {
  PRIVATE = 'private',
  VIS = 'vis',
}

@Entity('mortgage_goals')
export class MortgageGoal {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'user_id' })
  userId!: string;

  @Column('decimal', { precision: 12, scale: 2, name: 'property_value' })
  propertyValue!: string;

  @Column({ type: 'enum', enum: PropertyType, name: 'property_type' })
  propertyType!: PropertyType;

  @Column('decimal', { precision: 12, scale: 2, name: 'desired_loan_amount' })
  desiredLoanAmount!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
```

- [ ] **Step 4: Create `UnderwritingRuleParameter`**

`backend/src/underwriting/entities/underwriting-rule-parameter.entity.ts`:

```typescript
import { Column, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('underwriting_rule_parameters')
export class UnderwritingRuleParameter {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  key!: string;

  @Column('decimal', { precision: 10, scale: 4 })
  value!: string;

  @Column('text')
  description!: string;

  @Column('text')
  source!: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
```

- [ ] **Step 5: Create `Simulation`**

`backend/src/underwriting/entities/simulation.entity.ts`:

```typescript
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { MortgageGoal } from './mortgage-goal.entity';

@Entity('simulations')
export class Simulation {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'user_id' })
  userId!: string;

  @ManyToOne(() => MortgageGoal, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'mortgage_goal_id' })
  mortgageGoal!: MortgageGoal;

  @Column({ name: 'mortgage_goal_id' })
  mortgageGoalId!: string;

  @Column('jsonb')
  inputs!: Record<string, unknown>;

  @Column('jsonb')
  outputs!: Record<string, unknown>;

  @Column('jsonb', { name: 'rule_snapshot' })
  ruleSnapshot!: Record<string, number>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
```

- [ ] **Step 6: Create `Plan` and `Milestone`**

`backend/src/underwriting/entities/plan.entity.ts`:

```typescript
import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Simulation } from './simulation.entity';

export enum PlanStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
}

@Entity('plans')
export class Plan {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'user_id' })
  userId!: string;

  @ManyToOne(() => Simulation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'simulation_id' })
  simulation!: Simulation;

  @Column({ name: 'simulation_id' })
  simulationId!: string;

  @Column({ type: 'enum', enum: PlanStatus, default: PlanStatus.ACTIVE })
  status!: PlanStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
```

`backend/src/underwriting/entities/milestone.entity.ts`:

```typescript
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Plan } from './plan.entity';

export enum MilestoneStatus {
  PENDING = 'pending',
  DONE = 'done',
}

@Entity('milestones')
export class Milestone {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Plan, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'plan_id' })
  plan!: Plan;

  @Column({ name: 'plan_id' })
  planId!: string;

  @Column('int', { name: 'sequence_number' })
  sequenceNumber!: number;

  @Column('text', { nullable: true })
  description!: string | null;

  @Column({ name: 'target_metric' })
  targetMetric!: string;

  @Column('decimal', { precision: 10, scale: 2, name: 'target_value' })
  targetValue!: string;

  @Column('date', { name: 'target_date' })
  targetDate!: string;

  @Column({ type: 'enum', enum: MilestoneStatus, default: MilestoneStatus.PENDING })
  status!: MilestoneStatus;
}
```

- [ ] **Step 7: Create `AgentLog`**

`backend/src/agent/entities/agent-log.entity.ts`:

```typescript
import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('agent_logs')
export class AgentLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', nullable: true })
  userId!: string | null;

  @Column()
  endpoint!: string;

  @Column('jsonb', { name: 'context_sent' })
  contextSent!: Record<string, unknown>;

  @Column('text', { name: 'raw_response' })
  rawResponse!: string;

  @Column('text', { name: 'resolved_response' })
  resolvedResponse!: string;

  @Column('boolean', { name: 'validation_passed' })
  validationPassed!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
```

- [ ] **Step 8: Generate the initial migration**

Run: `cd backend && npm run migration:generate -- src/database/migrations/InitialSchema`
Expected: a new file `backend/src/database/migrations/<timestamp>-InitialSchema.ts` containing `CREATE TABLE` statements for all eight entities.

- [ ] **Step 9: Run the migration**

Run: `cd backend && npm run migration:run`
Expected: "InitialSchema<timestamp> has been executed successfully."

- [ ] **Step 10: Verify tables exist**

Run: `docker exec -it $(docker ps -qf "name=postgres") psql -U decision_data -d decision_data_ruta -c "\dt"`
Expected: lists `users`, `credit_profiles`, `mortgage_goals`, `underwriting_rule_parameters`, `simulations`, `plans`, `milestones`, `agent_logs`.

- [ ] **Step 11: Commit**

```bash
git add backend/src/users backend/src/underwriting/entities backend/src/agent/entities backend/src/database/migrations
git commit -m "feat: add core entities and initial database migration"
```

---

## Task 6: Rule parameters and synthetic data seed script

**Files:**
- Create: `backend/src/database/seeds/rule-parameters.seed.ts`
- Create: `backend/src/database/seeds/synthetic-user.seed.ts`
- Create: `backend/src/database/seeds/run-seed.ts`
- Modify: `backend/package.json`

**Interfaces:**
- Consumes: entities from Task 5 (`UnderwritingRuleParameter`, `User`, `CreditProfile`, `MortgageGoal`).
- Produces: a runnable `npm run seed` that populates rule parameters (with sources) and the demo persona "Ana".

- [ ] **Step 1: Write the rule-parameter seed data**

`backend/src/database/seeds/rule-parameters.seed.ts`:

```typescript
import { DataSource } from 'typeorm';
import { UnderwritingRuleParameter } from '../../underwriting/entities/underwriting-rule-parameter.entity';

interface RuleParameterSeed {
  key: string;
  value: string;
  description: string;
  source: string;
}

const RULE_PARAMETERS: RuleParameterSeed[] = [
  {
    key: 'BASE_ANNUAL_INTEREST_RATE',
    value: '0.0735',
    description: 'Tasa hipotecaria anual base para vivienda terminada, banca privada.',
    source: 'BCE, promedio 7.35% anual, junio 2026 (via Primicias).',
  },
  {
    key: 'VIS_ANNUAL_INTEREST_RATE',
    value: '0.0499',
    description: 'Tasa anual para vivienda de interés social/público (VIS/VIP).',
    source: 'El Diario, tasas vigentes marzo 2026.',
  },
  {
    key: 'VIS_PROPERTY_VALUE_THRESHOLD',
    value: '90000',
    description: 'Valor máximo de inmueble para calificar como segmento VIS/VIP.',
    source: 'Reglamento operativo del Programa de Vivienda de Interés Social y Público.',
  },
  {
    key: 'MAX_HOUSING_DTI_RATIO',
    value: '0.40',
    description: 'Máximo porcentaje del ingreso que puede representar la cuota hipotecaria nueva.',
    source: 'Primicias, "consejos crédito hipotecario": bancos evalúan cuota <= 40% del ingreso.',
  },
  {
    key: 'MAX_TOTAL_DTI_RATIO',
    value: '0.50',
    description: 'Máximo porcentaje del ingreso que puede representar toda la deuda, incluida la nueva cuota.',
    source: 'Primicias, rango recomendado 35%-50% de deuda total sobre ingreso.',
  },
  {
    key: 'MAX_LTV_BASE',
    value: '0.80',
    description: 'Relación préstamo/valor máxima para score en banda no excelente.',
    source: 'Banco Pichincha, financiamiento hasta 80-83%; Banco Internacional exige 20% de entrada.',
  },
  {
    key: 'MAX_LTV_EXCELLENT_SCORE',
    value: '0.85',
    description: 'Relación préstamo/valor máxima cuando el score está en banda excelente.',
    source: 'Extrapolación razonada sobre el rango 80-83% reportado por bancos privados (no oficial).',
  },
  {
    key: 'DEFAULT_TERM_YEARS',
    value: '20',
    description: 'Plazo por defecto del crédito hipotecario simulado.',
    source: 'Primicias: bancos privados ofrecen plazos típicos de hasta 20-25 años.',
  },
  {
    key: 'SCORE_BAND_VERY_HIGH_RISK_MAX',
    value: '549',
    description: 'Límite superior de la banda de score "muy alto riesgo".',
    source: 'Banda propia, no oficial de ningún buró — ver spec sección 4.1.',
  },
  {
    key: 'SCORE_BAND_HIGH_RISK_MAX',
    value: '699',
    description: 'Límite superior de la banda de score "alto riesgo".',
    source: 'Banda propia, no oficial de ningún buró.',
  },
  {
    key: 'SCORE_BAND_MODERATE_MAX',
    value: '799',
    description: 'Límite superior de la banda de score "riesgo moderado".',
    source: 'Banda propia, no oficial de ningún buró.',
  },
  {
    key: 'SCORE_BAND_GOOD_MAX',
    value: '899',
    description: 'Límite superior de la banda de score "bueno"; calibrada sobre el promedio nacional real (862/999).',
    source: 'Extra.ec: promedio nacional de score en Ecuador 2024 = 862 (escala 1-999).',
  },
];

export async function seedRuleParameters(dataSource: DataSource): Promise<void> {
  const repository = dataSource.getRepository(UnderwritingRuleParameter);

  for (const parameter of RULE_PARAMETERS) {
    const existing = await repository.findOne({ where: { key: parameter.key } });
    if (existing) {
      continue;
    }
    await repository.save(repository.create(parameter));
  }
}
```

- [ ] **Step 2: Write the synthetic persona seed**

`backend/src/database/seeds/synthetic-user.seed.ts`:

```typescript
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { CreditProfile, IncomeType } from '../../underwriting/entities/credit-profile.entity';
import { MortgageGoal, PropertyType } from '../../underwriting/entities/mortgage-goal.entity';

export async function seedSyntheticPersona(dataSource: DataSource): Promise<void> {
  const userRepository = dataSource.getRepository(User);
  const profileRepository = dataSource.getRepository(CreditProfile);
  const goalRepository = dataSource.getRepository(MortgageGoal);

  const existingUser = await userRepository.findOne({ where: { email: 'ana.demo@decisiondata.test' } });
  if (existingUser) {
    return;
  }

  const passwordHash = await bcrypt.hash('demo1234', 10);
  const user = await userRepository.save(
    userRepository.create({
      email: 'ana.demo@decisiondata.test',
      passwordHash,
      displayName: 'Ana (perfil demo)',
    }),
  );

  await profileRepository.save(
    profileRepository.create({
      userId: user.id,
      score: 640,
      cardUtilizationPercent: '78.00',
      monthlyIncome: '1200.00',
      incomeType: IncomeType.FORMAL,
      monthsEmployed: 18,
      recentDelinquency: false,
      existingMonthlyDebt: '310.00',
    }),
  );

  await goalRepository.save(
    goalRepository.create({
      userId: user.id,
      propertyValue: '85000.00',
      propertyType: PropertyType.VIS,
      desiredLoanAmount: '76500.00',
    }),
  );
}
```

- [ ] **Step 3: Write the seed runner**

`backend/src/database/seeds/run-seed.ts`:

```typescript
import 'dotenv/config';
import { AppDataSource } from '../data-source';
import { seedRuleParameters } from './rule-parameters.seed';
import { seedSyntheticPersona } from './synthetic-user.seed';

async function run(): Promise<void> {
  await AppDataSource.initialize();
  await seedRuleParameters(AppDataSource);
  await seedSyntheticPersona(AppDataSource);
  await AppDataSource.destroy();
}

run()
  .then(() => process.stdout.write('Seed completado.\n'))
  .catch((error) => {
    process.stderr.write(`Seed falló: ${String(error)}\n`);
    process.exit(1);
  });
```

- [ ] **Step 4: Install bcrypt and add the seed script**

Run: `cd backend && npm install bcrypt && npm install --save-dev @types/bcrypt`

Add to `backend/package.json` under `"scripts"`:

```json
"seed": "ts-node -r tsconfig-paths/register src/database/seeds/run-seed.ts"
```

- [ ] **Step 5: Run the seed and verify**

Run: `cd backend && npm run seed`
Expected: "Seed completado."

Run: `docker exec -it $(docker ps -qf "name=postgres") psql -U decision_data -d decision_data_ruta -c "SELECT key, value FROM underwriting_rule_parameters;"`
Expected: 11 rows.

- [ ] **Step 6: Commit**

```bash
git add backend/src/database/seeds backend/package.json backend/package-lock.json
git commit -m "feat: seed researched rule parameters and a synthetic demo persona"
```

---

## Task 7: Rules engine — DTI calculator

**Files:**
- Create: `backend/src/rules-engine/interfaces/rule-parameters.interface.ts`
- Create: `backend/src/rules-engine/calculators/dti.calculator.ts`
- Test: `backend/src/rules-engine/calculators/dti.calculator.spec.ts`

**Interfaces:**
- Produces: `calculateDti(input: DtiInput, params: RuleParameters): DtiResult`, used by Task 11's orchestrator.

- [ ] **Step 1: Define the shared `RuleParameters` type**

`backend/src/rules-engine/interfaces/rule-parameters.interface.ts`:

```typescript
export interface RuleParameters {
  baseAnnualInterestRate: number;
  visAnnualInterestRate: number;
  visPropertyValueThreshold: number;
  maxHousingDtiRatio: number;
  maxTotalDtiRatio: number;
  maxLtvBase: number;
  maxLtvExcellentScore: number;
  defaultTermYears: number;
  scoreBandVeryHighRiskMax: number;
  scoreBandHighRiskMax: number;
  scoreBandModerateMax: number;
  scoreBandGoodMax: number;
}
```

- [ ] **Step 2: Write the failing test**

`backend/src/rules-engine/calculators/dti.calculator.spec.ts`:

```typescript
import { calculateDti } from './dti.calculator';
import { RuleParameters } from '../interfaces/rule-parameters.interface';

const params: RuleParameters = {
  baseAnnualInterestRate: 0.0735,
  visAnnualInterestRate: 0.0499,
  visPropertyValueThreshold: 90000,
  maxHousingDtiRatio: 0.4,
  maxTotalDtiRatio: 0.5,
  maxLtvBase: 0.8,
  maxLtvExcellentScore: 0.85,
  defaultTermYears: 20,
  scoreBandVeryHighRiskMax: 549,
  scoreBandHighRiskMax: 699,
  scoreBandModerateMax: 799,
  scoreBandGoodMax: 899,
};

describe('calculateDti', () => {
  it('flags a housing ratio above the limit as failing', () => {
    const result = calculateDti(
      { existingMonthlyDebt: 310, newMonthlyPayment: 550, monthlyIncome: 1200 },
      params,
    );

    expect(result.housingRatio).toBeCloseTo(0.4583, 3);
    expect(result.passesHousingLimit).toBe(false);
  });

  it('passes both ratios when comfortably under the limits', () => {
    const result = calculateDti(
      { existingMonthlyDebt: 100, newMonthlyPayment: 300, monthlyIncome: 1500 },
      params,
    );

    expect(result.housingRatio).toBeCloseTo(0.2, 3);
    expect(result.totalRatio).toBeCloseTo(0.2667, 3);
    expect(result.passesHousingLimit).toBe(true);
    expect(result.passesTotalLimit).toBe(true);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd backend && npx jest dti.calculator.spec.ts`
Expected: FAIL with "Cannot find module './dti.calculator'"

- [ ] **Step 4: Implement the calculator**

`backend/src/rules-engine/calculators/dti.calculator.ts`:

```typescript
import { RuleParameters } from '../interfaces/rule-parameters.interface';

export interface DtiInput {
  existingMonthlyDebt: number;
  newMonthlyPayment: number;
  monthlyIncome: number;
}

export interface DtiResult {
  housingRatio: number;
  totalRatio: number;
  passesHousingLimit: boolean;
  passesTotalLimit: boolean;
}

export function calculateDti(input: DtiInput, params: RuleParameters): DtiResult {
  const housingRatio = input.newMonthlyPayment / input.monthlyIncome;
  const totalDebt = input.existingMonthlyDebt + input.newMonthlyPayment;
  const totalRatio = totalDebt / input.monthlyIncome;

  const passesHousingLimit = housingRatio <= params.maxHousingDtiRatio;
  const passesTotalLimit = totalRatio <= params.maxTotalDtiRatio;

  return {
    housingRatio,
    totalRatio,
    passesHousingLimit,
    passesTotalLimit,
  };
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd backend && npx jest dti.calculator.spec.ts`
Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

```bash
git add backend/src/rules-engine
git commit -m "feat: add dti calculator to the rules engine"
```

---

## Task 8: Rules engine — LTV calculator

**Files:**
- Create: `backend/src/rules-engine/calculators/ltv.calculator.ts`
- Test: `backend/src/rules-engine/calculators/ltv.calculator.spec.ts`

**Interfaces:**
- Consumes: `RuleParameters` (Task 7).
- Produces: `calculateLtv(input: LtvInput, params: RuleParameters): LtvResult`, used by Task 11's orchestrator.

- [ ] **Step 1: Write the failing test**

`backend/src/rules-engine/calculators/ltv.calculator.spec.ts`:

```typescript
import { calculateLtv } from './ltv.calculator';
import { RuleParameters } from '../interfaces/rule-parameters.interface';

const params: RuleParameters = {
  baseAnnualInterestRate: 0.0735,
  visAnnualInterestRate: 0.0499,
  visPropertyValueThreshold: 90000,
  maxHousingDtiRatio: 0.4,
  maxTotalDtiRatio: 0.5,
  maxLtvBase: 0.8,
  maxLtvExcellentScore: 0.85,
  defaultTermYears: 20,
  scoreBandVeryHighRiskMax: 549,
  scoreBandHighRiskMax: 699,
  scoreBandModerateMax: 799,
  scoreBandGoodMax: 899,
};

describe('calculateLtv', () => {
  it('uses the base LTV limit for a non-excellent score', () => {
    const result = calculateLtv(
      { loanAmount: 76500, propertyValue: 85000, isExcellentScoreBand: false },
      params,
    );

    expect(result.ltv).toBeCloseTo(0.9, 3);
    expect(result.appliedMaxLtv).toBe(0.8);
    expect(result.passesLimit).toBe(false);
  });

  it('uses the higher LTV limit for an excellent score', () => {
    const result = calculateLtv(
      { loanAmount: 72250, propertyValue: 85000, isExcellentScoreBand: true },
      params,
    );

    expect(result.ltv).toBeCloseTo(0.85, 3);
    expect(result.appliedMaxLtv).toBe(0.85);
    expect(result.passesLimit).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd backend && npx jest ltv.calculator.spec.ts`
Expected: FAIL with "Cannot find module './ltv.calculator'"

- [ ] **Step 3: Implement the calculator**

`backend/src/rules-engine/calculators/ltv.calculator.ts`:

```typescript
import { RuleParameters } from '../interfaces/rule-parameters.interface';

export interface LtvInput {
  loanAmount: number;
  propertyValue: number;
  isExcellentScoreBand: boolean;
}

export interface LtvResult {
  ltv: number;
  appliedMaxLtv: number;
  passesLimit: boolean;
}

export function calculateLtv(input: LtvInput, params: RuleParameters): LtvResult {
  const ltv = input.loanAmount / input.propertyValue;
  const appliedMaxLtv = input.isExcellentScoreBand ? params.maxLtvExcellentScore : params.maxLtvBase;
  const passesLimit = ltv <= appliedMaxLtv;

  return { ltv, appliedMaxLtv, passesLimit };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd backend && npx jest ltv.calculator.spec.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/src/rules-engine
git commit -m "feat: add ltv calculator to the rules engine"
```

---

## Task 9: Rules engine — amortization (monthly payment) calculator

**Files:**
- Create: `backend/src/rules-engine/calculators/amortization.calculator.ts`
- Test: `backend/src/rules-engine/calculators/amortization.calculator.spec.ts`

**Interfaces:**
- Produces: `calculateMonthlyPayment(input: AmortizationInput): number`, used by Task 11's orchestrator.

- [ ] **Step 1: Write the failing test**

`backend/src/rules-engine/calculators/amortization.calculator.spec.ts`:

```typescript
import { calculateMonthlyPayment } from './amortization.calculator';

describe('calculateMonthlyPayment', () => {
  it('matches the known French amortization result for a standard loan', () => {
    const payment = calculateMonthlyPayment({
      loanAmount: 76500,
      annualInterestRate: 0.0499,
      termYears: 20,
    });

    expect(payment).toBeCloseTo(504.6, 0);
  });

  it('returns exactly the principal divided by term when rate is zero', () => {
    const payment = calculateMonthlyPayment({
      loanAmount: 12000,
      annualInterestRate: 0,
      termYears: 1,
    });

    expect(payment).toBeCloseTo(1000, 2);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd backend && npx jest amortization.calculator.spec.ts`
Expected: FAIL with "Cannot find module './amortization.calculator'"

- [ ] **Step 3: Implement the calculator**

`backend/src/rules-engine/calculators/amortization.calculator.ts`:

```typescript
export interface AmortizationInput {
  loanAmount: number;
  annualInterestRate: number;
  termYears: number;
}

export function calculateMonthlyPayment(input: AmortizationInput): number {
  const totalPayments = input.termYears * 12;

  if (input.annualInterestRate === 0) {
    return input.loanAmount / totalPayments;
  }

  const monthlyRate = input.annualInterestRate / 12;
  const growthFactor = Math.pow(1 + monthlyRate, totalPayments);
  const numerator = input.loanAmount * monthlyRate * growthFactor;
  const denominator = growthFactor - 1;

  return numerator / denominator;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd backend && npx jest amortization.calculator.spec.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/src/rules-engine
git commit -m "feat: add amortization calculator to the rules engine"
```

---

## Task 10: Rules engine — score bands and approval-probability scorer

**Files:**
- Create: `backend/src/rules-engine/calculators/score-band.classifier.ts`
- Test: `backend/src/rules-engine/calculators/score-band.classifier.spec.ts`
- Create: `backend/src/rules-engine/calculators/approval-probability.scorer.ts`
- Test: `backend/src/rules-engine/calculators/approval-probability.scorer.spec.ts`

**Interfaces:**
- Consumes: `RuleParameters` (Task 7), `DtiResult` (Task 7), `LtvResult` (Task 8).
- Produces: `classifyScoreBand(score, params): ScoreBand`, `calculateApprovalProbability(input, params): ApprovalResult`, both used by Task 11.

- [ ] **Step 1: Write the failing test for score bands**

`backend/src/rules-engine/calculators/score-band.classifier.spec.ts`:

```typescript
import { classifyScoreBand, ScoreBand } from './score-band.classifier';
import { RuleParameters } from '../interfaces/rule-parameters.interface';

const params: RuleParameters = {
  baseAnnualInterestRate: 0.0735,
  visAnnualInterestRate: 0.0499,
  visPropertyValueThreshold: 90000,
  maxHousingDtiRatio: 0.4,
  maxTotalDtiRatio: 0.5,
  maxLtvBase: 0.8,
  maxLtvExcellentScore: 0.85,
  defaultTermYears: 20,
  scoreBandVeryHighRiskMax: 549,
  scoreBandHighRiskMax: 699,
  scoreBandModerateMax: 799,
  scoreBandGoodMax: 899,
};

describe('classifyScoreBand', () => {
  it('classifies 640 as high risk', () => {
    expect(classifyScoreBand(640, params)).toBe(ScoreBand.HIGH_RISK);
  });

  it('classifies 950 as excellent', () => {
    expect(classifyScoreBand(950, params)).toBe(ScoreBand.EXCELLENT);
  });

  it('classifies 500 as very high risk', () => {
    expect(classifyScoreBand(500, params)).toBe(ScoreBand.VERY_HIGH_RISK);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd backend && npx jest score-band.classifier.spec.ts`
Expected: FAIL with "Cannot find module './score-band.classifier'"

- [ ] **Step 3: Implement the classifier**

`backend/src/rules-engine/calculators/score-band.classifier.ts`:

```typescript
import { RuleParameters } from '../interfaces/rule-parameters.interface';

export enum ScoreBand {
  VERY_HIGH_RISK = 'very_high_risk',
  HIGH_RISK = 'high_risk',
  MODERATE = 'moderate',
  GOOD = 'good',
  EXCELLENT = 'excellent',
}

export function classifyScoreBand(score: number, params: RuleParameters): ScoreBand {
  if (score <= params.scoreBandVeryHighRiskMax) {
    return ScoreBand.VERY_HIGH_RISK;
  }
  if (score <= params.scoreBandHighRiskMax) {
    return ScoreBand.HIGH_RISK;
  }
  if (score <= params.scoreBandModerateMax) {
    return ScoreBand.MODERATE;
  }
  if (score <= params.scoreBandGoodMax) {
    return ScoreBand.GOOD;
  }
  return ScoreBand.EXCELLENT;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd backend && npx jest score-band.classifier.spec.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Write the failing test for approval probability**

`backend/src/rules-engine/calculators/approval-probability.scorer.spec.ts`:

```typescript
import { calculateApprovalProbability, ApprovalCategory } from './approval-probability.scorer';
import { ScoreBand } from './score-band.classifier';
import { IncomeType } from '../../underwriting/entities/credit-profile.entity';

describe('calculateApprovalProbability', () => {
  it('returns LOW when DTI and LTV both fail with a high-risk score', () => {
    const result = calculateApprovalProbability({
      scoreBand: ScoreBand.HIGH_RISK,
      passesHousingDti: false,
      passesTotalDti: false,
      passesLtv: false,
      incomeType: IncomeType.INFORMAL,
      monthsEmployed: 6,
      recentDelinquency: true,
    });

    expect(result.category).toBe(ApprovalCategory.LOW);
    expect(result.percentage).toBeLessThan(35);
  });

  it('returns HIGH when everything passes with a good score and stable job', () => {
    const result = calculateApprovalProbability({
      scoreBand: ScoreBand.EXCELLENT,
      passesHousingDti: true,
      passesTotalDti: true,
      passesLtv: true,
      incomeType: IncomeType.FORMAL,
      monthsEmployed: 36,
      recentDelinquency: false,
    });

    expect(result.category).toBe(ApprovalCategory.HIGH);
    expect(result.percentage).toBeGreaterThanOrEqual(75);
  });
});
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `cd backend && npx jest approval-probability.scorer.spec.ts`
Expected: FAIL with "Cannot find module './approval-probability.scorer'"

- [ ] **Step 7: Implement the scorer**

`backend/src/rules-engine/calculators/approval-probability.scorer.ts`:

```typescript
import { ScoreBand } from './score-band.classifier';
import { IncomeType } from '../../underwriting/entities/credit-profile.entity';

export enum ApprovalCategory {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

export interface ApprovalProbabilityInput {
  scoreBand: ScoreBand;
  passesHousingDti: boolean;
  passesTotalDti: boolean;
  passesLtv: boolean;
  incomeType: IncomeType;
  monthsEmployed: number;
  recentDelinquency: boolean;
}

export interface ApprovalResult {
  points: number;
  percentage: number;
  category: ApprovalCategory;
}

const SCORE_BAND_POINTS: Record<ScoreBand, number> = {
  [ScoreBand.VERY_HIGH_RISK]: 0,
  [ScoreBand.HIGH_RISK]: 10,
  [ScoreBand.MODERATE]: 20,
  [ScoreBand.GOOD]: 30,
  [ScoreBand.EXCELLENT]: 40,
};

export function calculateApprovalProbability(input: ApprovalProbabilityInput): ApprovalResult {
  let points = SCORE_BAND_POINTS[input.scoreBand];

  points += input.passesHousingDti ? 15 : 0;
  points += input.passesTotalDti ? 15 : 0;
  points += input.passesLtv ? 15 : 0;
  points += input.incomeType === IncomeType.FORMAL ? 5 : 0;
  points += input.monthsEmployed >= 24 ? 5 : 0;
  points += input.recentDelinquency ? -20 : 0;

  const percentage = Math.max(0, Math.min(100, points));
  const category = resolveCategory(percentage);

  return { points, percentage, category };
}

function resolveCategory(percentage: number): ApprovalCategory {
  if (percentage < 35) {
    return ApprovalCategory.LOW;
  }
  if (percentage < 75) {
    return ApprovalCategory.MEDIUM;
  }
  return ApprovalCategory.HIGH;
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `cd backend && npx jest approval-probability.scorer.spec.ts`
Expected: PASS (2 tests)

- [ ] **Step 9: Commit**

```bash
git add backend/src/rules-engine
git commit -m "feat: add score band classifier and approval probability scorer"
```

---

## Task 11: Rules engine orchestrator

**Files:**
- Create: `backend/src/rules-engine/rules-engine.service.ts`
- Create: `backend/src/rules-engine/rules-engine.module.ts`
- Create: `backend/src/rules-engine/interfaces/simulation-result.interface.ts`
- Test: `backend/src/rules-engine/rules-engine.service.spec.ts`

**Interfaces:**
- Consumes: all calculators from Tasks 7-10; `UnderwritingRuleParameter` repository (Task 5); `IncomeType` (Task 5).
- Produces: `RulesEngineService.runSimulation(input: SimulationInput): Promise<SimulationOutput>`, consumed by Task 15 (`underwriting` module) and Task 18 (`agent` context builder).

- [ ] **Step 1: Define the simulation result interface**

`backend/src/rules-engine/interfaces/simulation-result.interface.ts`:

```typescript
import { ScoreBand } from '../calculators/score-band.classifier';
import { ApprovalCategory } from '../calculators/approval-probability.scorer';
import { IncomeType } from '../../underwriting/entities/credit-profile.entity';

export interface SimulationInput {
  score: number;
  existingMonthlyDebt: number;
  monthlyIncome: number;
  incomeType: IncomeType;
  monthsEmployed: number;
  recentDelinquency: boolean;
  propertyValue: number;
  loanAmount: number;
  isVisEligible: boolean;
  termYears?: number;
}

export interface SimulationOutput {
  scoreBand: ScoreBand;
  housingDtiRatio: number;
  totalDtiRatio: number;
  passesHousingDti: boolean;
  passesTotalDti: boolean;
  ltv: number;
  passesLtv: boolean;
  monthlyPayment: number;
  approvalPercentage: number;
  approvalCategory: ApprovalCategory;
  qualifiesToday: boolean;
  ruleSnapshot: Record<string, number>;
}
```

- [ ] **Step 2: Write the failing test**

`backend/src/rules-engine/rules-engine.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RulesEngineService } from './rules-engine.service';
import { UnderwritingRuleParameter } from '../underwriting/entities/underwriting-rule-parameter.entity';
import { IncomeType } from '../underwriting/entities/credit-profile.entity';
import { ApprovalCategory } from './calculators/approval-probability.scorer';

const MOCK_PARAMETERS = [
  { key: 'BASE_ANNUAL_INTEREST_RATE', value: '0.0735' },
  { key: 'VIS_ANNUAL_INTEREST_RATE', value: '0.0499' },
  { key: 'VIS_PROPERTY_VALUE_THRESHOLD', value: '90000' },
  { key: 'MAX_HOUSING_DTI_RATIO', value: '0.40' },
  { key: 'MAX_TOTAL_DTI_RATIO', value: '0.50' },
  { key: 'MAX_LTV_BASE', value: '0.80' },
  { key: 'MAX_LTV_EXCELLENT_SCORE', value: '0.85' },
  { key: 'DEFAULT_TERM_YEARS', value: '20' },
  { key: 'SCORE_BAND_VERY_HIGH_RISK_MAX', value: '549' },
  { key: 'SCORE_BAND_HIGH_RISK_MAX', value: '699' },
  { key: 'SCORE_BAND_MODERATE_MAX', value: '799' },
  { key: 'SCORE_BAND_GOOD_MAX', value: '899' },
];

describe('RulesEngineService', () => {
  let service: RulesEngineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RulesEngineService,
        {
          provide: getRepositoryToken(UnderwritingRuleParameter),
          useValue: { find: jest.fn().mockResolvedValue(MOCK_PARAMETERS) },
        },
      ],
    }).compile();

    service = module.get(RulesEngineService);
  });

  it('marks Ana-like profile as not qualifying today, with a LOW/MEDIUM approval category', async () => {
    const result = await service.runSimulation({
      score: 640,
      existingMonthlyDebt: 310,
      monthlyIncome: 1200,
      incomeType: IncomeType.FORMAL,
      monthsEmployed: 18,
      recentDelinquency: false,
      propertyValue: 85000,
      loanAmount: 76500,
      isVisEligible: true,
    });

    expect(result.qualifiesToday).toBe(false);
    expect([ApprovalCategory.LOW, ApprovalCategory.MEDIUM]).toContain(result.approvalCategory);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd backend && npx jest rules-engine.service.spec.ts`
Expected: FAIL with "Cannot find module './rules-engine.service'"

- [ ] **Step 4: Implement the orchestrator**

`backend/src/rules-engine/rules-engine.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UnderwritingRuleParameter } from '../underwriting/entities/underwriting-rule-parameter.entity';
import { RuleParameters } from './interfaces/rule-parameters.interface';
import { SimulationInput, SimulationOutput } from './interfaces/simulation-result.interface';
import { calculateDti } from './calculators/dti.calculator';
import { calculateLtv } from './calculators/ltv.calculator';
import { calculateMonthlyPayment } from './calculators/amortization.calculator';
import { classifyScoreBand, ScoreBand } from './calculators/score-band.classifier';
import { calculateApprovalProbability } from './calculators/approval-probability.scorer';

@Injectable()
export class RulesEngineService {
  constructor(
    @InjectRepository(UnderwritingRuleParameter)
    private readonly ruleParameterRepository: Repository<UnderwritingRuleParameter>,
  ) {}

  async runSimulation(input: SimulationInput): Promise<SimulationOutput> {
    const params = await this.loadParameters();
    const scoreBand = classifyScoreBand(input.score, params);
    const isExcellentScoreBand = scoreBand === ScoreBand.EXCELLENT;

    const termYears = input.termYears ?? params.defaultTermYears;
    const annualRate = this.resolveInterestRate(input.isVisEligible, params);
    const monthlyPayment = calculateMonthlyPayment({
      loanAmount: input.loanAmount,
      annualInterestRate: annualRate,
      termYears,
    });

    const dtiResult = calculateDti(
      {
        existingMonthlyDebt: input.existingMonthlyDebt,
        newMonthlyPayment: monthlyPayment,
        monthlyIncome: input.monthlyIncome,
      },
      params,
    );

    const ltvResult = calculateLtv(
      {
        loanAmount: input.loanAmount,
        propertyValue: input.propertyValue,
        isExcellentScoreBand,
      },
      params,
    );

    const approvalResult = calculateApprovalProbability({
      scoreBand,
      passesHousingDti: dtiResult.passesHousingLimit,
      passesTotalDti: dtiResult.passesTotalLimit,
      passesLtv: ltvResult.passesLimit,
      incomeType: input.incomeType,
      monthsEmployed: input.monthsEmployed,
      recentDelinquency: input.recentDelinquency,
    });

    const qualifiesToday =
      dtiResult.passesHousingLimit && dtiResult.passesTotalLimit && ltvResult.passesLimit;

    return {
      scoreBand,
      housingDtiRatio: dtiResult.housingRatio,
      totalDtiRatio: dtiResult.totalRatio,
      passesHousingDti: dtiResult.passesHousingLimit,
      passesTotalDti: dtiResult.passesTotalLimit,
      ltv: ltvResult.ltv,
      passesLtv: ltvResult.passesLimit,
      monthlyPayment,
      approvalPercentage: approvalResult.percentage,
      approvalCategory: approvalResult.category,
      qualifiesToday,
      ruleSnapshot: this.toSnapshot(params),
    };
  }

  private resolveInterestRate(isVisEligible: boolean, params: RuleParameters): number {
    return isVisEligible ? params.visAnnualInterestRate : params.baseAnnualInterestRate;
  }

  private toSnapshot(params: RuleParameters): Record<string, number> {
    return { ...params };
  }

  private async loadParameters(): Promise<RuleParameters> {
    const rows = await this.ruleParameterRepository.find();
    const byKey = new Map(rows.map((row) => [row.key, Number(row.value)]));

    return {
      baseAnnualInterestRate: this.readRequired(byKey, 'BASE_ANNUAL_INTEREST_RATE'),
      visAnnualInterestRate: this.readRequired(byKey, 'VIS_ANNUAL_INTEREST_RATE'),
      visPropertyValueThreshold: this.readRequired(byKey, 'VIS_PROPERTY_VALUE_THRESHOLD'),
      maxHousingDtiRatio: this.readRequired(byKey, 'MAX_HOUSING_DTI_RATIO'),
      maxTotalDtiRatio: this.readRequired(byKey, 'MAX_TOTAL_DTI_RATIO'),
      maxLtvBase: this.readRequired(byKey, 'MAX_LTV_BASE'),
      maxLtvExcellentScore: this.readRequired(byKey, 'MAX_LTV_EXCELLENT_SCORE'),
      defaultTermYears: this.readRequired(byKey, 'DEFAULT_TERM_YEARS'),
      scoreBandVeryHighRiskMax: this.readRequired(byKey, 'SCORE_BAND_VERY_HIGH_RISK_MAX'),
      scoreBandHighRiskMax: this.readRequired(byKey, 'SCORE_BAND_HIGH_RISK_MAX'),
      scoreBandModerateMax: this.readRequired(byKey, 'SCORE_BAND_MODERATE_MAX'),
      scoreBandGoodMax: this.readRequired(byKey, 'SCORE_BAND_GOOD_MAX'),
    };
  }

  private readRequired(byKey: Map<string, number>, key: string): number {
    const value = byKey.get(key);
    if (value === undefined) {
      throw new Error(`Falta el parámetro de reglas requerido: ${key}`);
    }
    return value;
  }
}
```

- [ ] **Step 5: Create the module**

`backend/src/rules-engine/rules-engine.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UnderwritingRuleParameter } from '../underwriting/entities/underwriting-rule-parameter.entity';
import { RulesEngineService } from './rules-engine.service';

@Module({
  imports: [TypeOrmModule.forFeature([UnderwritingRuleParameter])],
  providers: [RulesEngineService],
  exports: [RulesEngineService],
})
export class RulesEngineModule {}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `cd backend && npx jest rules-engine.service.spec.ts`
Expected: PASS (1 test)

- [ ] **Step 7: Register the module in `app.module.ts`**

Add `RulesEngineModule` to the `imports` array in `backend/src/app.module.ts`.

- [ ] **Step 8: Commit**

```bash
git add backend/src/rules-engine backend/src/app.module.ts
git commit -m "feat: add rules engine orchestrator combining all calculators"
```

---

## Task 12: Auth module (JWT login for the demo persona)

**Files:**
- Create: `backend/src/auth/dto/login.dto.ts`
- Create: `backend/src/auth/interfaces/authenticated-user.interface.ts`
- Create: `backend/src/auth/auth.service.ts`
- Create: `backend/src/auth/auth.controller.ts`
- Create: `backend/src/auth/jwt.strategy.ts`
- Create: `backend/src/auth/jwt-auth.guard.ts`
- Create: `backend/src/auth/auth.module.ts`
- Test: `backend/src/auth/auth.service.spec.ts`

**Interfaces:**
- Consumes: `User` entity (Task 5).
- Produces: `POST /auth/login` returning `{ accessToken: string }`; `JwtAuthGuard` used by every protected controller from Task 15 onward.

- [ ] **Step 1: Write the login DTO**

`backend/src/auth/dto/login.dto.ts`:

```typescript
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}
```

- [ ] **Step 2: Write the authenticated-user interface**

`backend/src/auth/interfaces/authenticated-user.interface.ts`:

```typescript
export interface AuthenticatedUser {
  userId: string;
  email: string;
}
```

- [ ] **Step 3: Write the failing test for `AuthService`**

`backend/src/auth/auth.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { User } from '../users/entities/user.entity';

describe('AuthService', () => {
  let service: AuthService;
  const findOneMock = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: { findOne: findOneMock } },
        { provide: JwtService, useValue: { sign: jest.fn().mockReturnValue('signed-token') } },
      ],
    }).compile();

    service = module.get(AuthService);
    findOneMock.mockReset();
  });

  it('throws UnauthorizedException for an unknown email', async () => {
    findOneMock.mockResolvedValue(null);
    await expect(service.login('missing@test.com', 'whatever')).rejects.toThrow(UnauthorizedException);
  });

  it('returns a signed token for correct credentials', async () => {
    const passwordHash = await bcrypt.hash('demo1234', 10);
    findOneMock.mockResolvedValue({ id: 'user-1', email: 'ana.demo@decisiondata.test', passwordHash });

    const result = await service.login('ana.demo@decisiondata.test', 'demo1234');

    expect(result.accessToken).toBe('signed-token');
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `cd backend && npx jest auth.service.spec.ts`
Expected: FAIL with "Cannot find module './auth.service'"

- [ ] **Step 5: Implement `AuthService`**

`backend/src/auth/auth.service.ts`:

```typescript
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';

export interface LoginResult {
  accessToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async login(email: string, password: string): Promise<LoginResult> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    const accessToken = this.jwtService.sign({ sub: user.id, email: user.email });
    return { accessToken };
  }
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `cd backend && npx jest auth.service.spec.ts`
Expected: PASS (2 tests)

- [ ] **Step 7: Implement the JWT strategy and guard**

Run: `cd backend && npm install @nestjs/jwt @nestjs/passport passport passport-jwt && npm install --save-dev @types/passport-jwt`

`backend/src/auth/jwt.strategy.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthenticatedUser } from './interfaces/authenticated-user.interface';

interface JwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  validate(payload: JwtPayload): AuthenticatedUser {
    return { userId: payload.sub, email: payload.email };
  }
}
```

`backend/src/auth/jwt-auth.guard.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

- [ ] **Step 8: Implement the controller and module**

`backend/src/auth/auth.controller.ts`:

```typescript
import { Body, Controller, Post } from '@nestjs/common';
import { AuthService, LoginResult } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() loginDto: LoginDto): Promise<LoginResult> {
    return this.authService.login(loginDto.email, loginDto.password);
  }
}
```

`backend/src/auth/auth.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get<string>('JWT_EXPIRES_IN') },
      }),
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [PassportModule],
})
export class AuthModule {}
```

- [ ] **Step 9: Register `AuthModule` in `app.module.ts`**

Add `AuthModule` to the `imports` array.

- [ ] **Step 10: Verify login works end-to-end**

Run: `cd backend && npm run start:dev` (in one terminal), then in another:
`curl -X POST http://localhost:3001/auth/login -H "Content-Type: application/json" -d "{\"email\":\"ana.demo@decisiondata.test\",\"password\":\"demo1234\"}"`
Expected: `{"status":"success","message":"OK","data":{"accessToken":"..."}}`

- [ ] **Step 11: Commit**

```bash
git add backend/src/auth backend/src/app.module.ts backend/package.json backend/package-lock.json
git commit -m "feat: add jwt auth for the demo persona login"
```

---

## Task 13: Underwriting module — profile/goal retrieval and simulation endpoints

**Files:**
- Create: `backend/src/underwriting/dto/create-simulation.dto.ts`
- Create: `backend/src/underwriting/interfaces/simulation-response.interface.ts`
- Create: `backend/src/underwriting/underwriting.service.ts`
- Create: `backend/src/underwriting/underwriting.controller.ts`
- Create: `backend/src/underwriting/underwriting.module.ts`
- Test: `backend/src/underwriting/underwriting.service.spec.ts`

**Interfaces:**
- Consumes: `RulesEngineService.runSimulation` (Task 11), `JwtAuthGuard` (Task 12), `AuthenticatedUser` (Task 12).
- Produces: `GET /underwriting/profile`, `GET /underwriting/goal`, `POST /underwriting/simulations`, `GET /underwriting/simulations`, used by the frontend plan and by Task 18 (agent context builder).

- [ ] **Step 1: Write the create-simulation DTO**

`backend/src/underwriting/dto/create-simulation.dto.ts`:

```typescript
import { IsBoolean, IsInt, IsNumber, IsOptional, Min } from 'class-validator';

export class CreateSimulationDto {
  @IsNumber()
  @Min(0)
  adjustedExistingMonthlyDebt!: number;

  @IsNumber()
  @Min(0)
  adjustedMonthlyIncome!: number;

  @IsNumber()
  @Min(0)
  adjustedPropertyValue!: number;

  @IsNumber()
  @Min(0)
  adjustedLoanAmount!: number;

  @IsInt()
  @Min(1)
  projectedScore!: number;

  @IsBoolean()
  @IsOptional()
  isVisEligible?: boolean;
}
```

- [ ] **Step 2: Write the failing test**

`backend/src/underwriting/underwriting.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { UnderwritingService } from './underwriting.service';
import { RulesEngineService } from '../rules-engine/rules-engine.service';
import { CreditProfile, IncomeType } from './entities/credit-profile.entity';
import { MortgageGoal, PropertyType } from './entities/mortgage-goal.entity';
import { Simulation } from './entities/simulation.entity';
import { ApprovalCategory } from '../rules-engine/calculators/approval-probability.scorer';
import { ScoreBand } from '../rules-engine/calculators/score-band.classifier';

describe('UnderwritingService', () => {
  let service: UnderwritingService;
  const findOneProfileMock = jest.fn();
  const findOneGoalMock = jest.fn();
  const saveSimulationMock = jest.fn();
  const runSimulationMock = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UnderwritingService,
        { provide: getRepositoryToken(CreditProfile), useValue: { findOne: findOneProfileMock } },
        { provide: getRepositoryToken(MortgageGoal), useValue: { findOne: findOneGoalMock } },
        {
          provide: getRepositoryToken(Simulation),
          useValue: { save: saveSimulationMock, create: (v: unknown) => v, find: jest.fn() },
        },
        { provide: RulesEngineService, useValue: { runSimulation: runSimulationMock } },
      ],
    }).compile();

    service = module.get(UnderwritingService);
    findOneProfileMock.mockReset();
    findOneGoalMock.mockReset();
    saveSimulationMock.mockReset();
    runSimulationMock.mockReset();
  });

  it('throws NotFoundException when the user has no credit profile', async () => {
    findOneProfileMock.mockResolvedValue(null);
    await expect(service.getProfile('user-1')).rejects.toThrow(NotFoundException);
  });

  it('persists a simulation using the rules engine output', async () => {
    findOneGoalMock.mockResolvedValue({
      id: 'goal-1',
      userId: 'user-1',
      propertyValue: '85000.00',
      propertyType: PropertyType.VIS,
      desiredLoanAmount: '76500.00',
    });
    findOneProfileMock.mockResolvedValue({
      id: 'profile-1',
      userId: 'user-1',
      score: 640,
      incomeType: IncomeType.FORMAL,
      monthsEmployed: 18,
      recentDelinquency: false,
    });
    runSimulationMock.mockResolvedValue({
      scoreBand: ScoreBand.HIGH_RISK,
      housingDtiRatio: 0.46,
      totalDtiRatio: 0.5,
      passesHousingDti: false,
      passesTotalDti: false,
      ltv: 0.9,
      passesLtv: false,
      monthlyPayment: 550,
      approvalPercentage: 30,
      approvalCategory: ApprovalCategory.LOW,
      qualifiesToday: false,
      ruleSnapshot: {},
    });
    saveSimulationMock.mockImplementation(async (entity) => ({ id: 'sim-1', ...entity }));

    const result = await service.createSimulation('user-1', {
      adjustedExistingMonthlyDebt: 310,
      adjustedMonthlyIncome: 1200,
      adjustedPropertyValue: 85000,
      adjustedLoanAmount: 76500,
      projectedScore: 640,
    });

    expect(result.qualifiesToday).toBe(false);
    expect(saveSimulationMock).toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd backend && npx jest underwriting.service.spec.ts`
Expected: FAIL with "Cannot find module './underwriting.service'"

- [ ] **Step 4: Define the simulation response interface**

`backend/src/underwriting/interfaces/simulation-response.interface.ts`:

```typescript
import { ScoreBand } from '../../rules-engine/calculators/score-band.classifier';
import { ApprovalCategory } from '../../rules-engine/calculators/approval-probability.scorer';

export interface SimulationResponse {
  id: string;
  scoreBand: ScoreBand;
  housingDtiRatio: number;
  totalDtiRatio: number;
  ltv: number;
  monthlyPayment: number;
  approvalPercentage: number;
  approvalCategory: ApprovalCategory;
  qualifiesToday: boolean;
  createdAt: Date;
}
```

- [ ] **Step 5: Implement `UnderwritingService`**

`backend/src/underwriting/underwriting.service.ts`:

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreditProfile } from './entities/credit-profile.entity';
import { MortgageGoal, PropertyType } from './entities/mortgage-goal.entity';
import { Simulation } from './entities/simulation.entity';
import { RulesEngineService } from '../rules-engine/rules-engine.service';
import { CreateSimulationDto } from './dto/create-simulation.dto';
import { SimulationResponse } from './interfaces/simulation-response.interface';

@Injectable()
export class UnderwritingService {
  constructor(
    @InjectRepository(CreditProfile)
    private readonly creditProfileRepository: Repository<CreditProfile>,
    @InjectRepository(MortgageGoal)
    private readonly mortgageGoalRepository: Repository<MortgageGoal>,
    @InjectRepository(Simulation)
    private readonly simulationRepository: Repository<Simulation>,
    private readonly rulesEngineService: RulesEngineService,
  ) {}

  async getProfile(userId: string): Promise<CreditProfile> {
    const profile = await this.creditProfileRepository.findOne({ where: { userId } });
    if (!profile) {
      throw new NotFoundException('No existe un perfil de crédito para este usuario.');
    }
    return profile;
  }

  async getGoal(userId: string): Promise<MortgageGoal> {
    const goal = await this.mortgageGoalRepository.findOne({ where: { userId } });
    if (!goal) {
      throw new NotFoundException('No existe una meta hipotecaria para este usuario.');
    }
    return goal;
  }

  async createSimulation(userId: string, dto: CreateSimulationDto): Promise<SimulationResponse> {
    const profile = await this.getProfile(userId);
    const goal = await this.getGoal(userId);
    const isVisEligible = dto.isVisEligible ?? goal.propertyType === PropertyType.VIS;

    const output = await this.rulesEngineService.runSimulation({
      score: dto.projectedScore,
      existingMonthlyDebt: dto.adjustedExistingMonthlyDebt,
      monthlyIncome: dto.adjustedMonthlyIncome,
      incomeType: profile.incomeType,
      monthsEmployed: profile.monthsEmployed,
      recentDelinquency: profile.recentDelinquency,
      propertyValue: dto.adjustedPropertyValue,
      loanAmount: dto.adjustedLoanAmount,
      isVisEligible,
    });

    const savedSimulation = await this.simulationRepository.save(
      this.simulationRepository.create({
        userId,
        mortgageGoalId: goal.id,
        inputs: { ...dto },
        outputs: { ...output },
        ruleSnapshot: output.ruleSnapshot,
      }),
    );

    return {
      id: savedSimulation.id,
      scoreBand: output.scoreBand,
      housingDtiRatio: output.housingDtiRatio,
      totalDtiRatio: output.totalDtiRatio,
      ltv: output.ltv,
      monthlyPayment: output.monthlyPayment,
      approvalPercentage: output.approvalPercentage,
      approvalCategory: output.approvalCategory,
      qualifiesToday: output.qualifiesToday,
      createdAt: savedSimulation.createdAt,
    };
  }

  async listSimulations(userId: string): Promise<Simulation[]> {
    return this.simulationRepository.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `cd backend && npx jest underwriting.service.spec.ts`
Expected: PASS (2 tests)

- [ ] **Step 7: Implement the controller**

`backend/src/underwriting/underwriting.controller.ts`:

```typescript
import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { UnderwritingService } from './underwriting.service';
import { CreateSimulationDto } from './dto/create-simulation.dto';

interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

@UseGuards(JwtAuthGuard)
@Controller('underwriting')
export class UnderwritingController {
  constructor(private readonly underwritingService: UnderwritingService) {}

  @Get('profile')
  getProfile(@Req() request: AuthenticatedRequest) {
    return this.underwritingService.getProfile(request.user.userId);
  }

  @Get('goal')
  getGoal(@Req() request: AuthenticatedRequest) {
    return this.underwritingService.getGoal(request.user.userId);
  }

  @Post('simulations')
  createSimulation(@Req() request: AuthenticatedRequest, @Body() dto: CreateSimulationDto) {
    return this.underwritingService.createSimulation(request.user.userId, dto);
  }

  @Get('simulations')
  listSimulations(@Req() request: AuthenticatedRequest) {
    return this.underwritingService.listSimulations(request.user.userId);
  }
}
```

- [ ] **Step 8: Implement the module**

`backend/src/underwriting/underwriting.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreditProfile } from './entities/credit-profile.entity';
import { MortgageGoal } from './entities/mortgage-goal.entity';
import { Simulation } from './entities/simulation.entity';
import { Plan } from './entities/plan.entity';
import { Milestone } from './entities/milestone.entity';
import { RulesEngineModule } from '../rules-engine/rules-engine.module';
import { AuthModule } from '../auth/auth.module';
import { UnderwritingService } from './underwriting.service';
import { UnderwritingController } from './underwriting.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([CreditProfile, MortgageGoal, Simulation, Plan, Milestone]),
    RulesEngineModule,
    AuthModule,
  ],
  providers: [UnderwritingService],
  controllers: [UnderwritingController],
  exports: [UnderwritingService],
})
export class UnderwritingModule {}
```

- [ ] **Step 9: Register `UnderwritingModule` in `app.module.ts`**

- [ ] **Step 10: Verify end-to-end with curl**

Run: `cd backend && npm run start:dev`, log in via Task 12's curl command to get a token, then:
`curl http://localhost:3001/underwriting/profile -H "Authorization: Bearer <token>"`
Expected: envelope with Ana's credit profile in `data`.

- [ ] **Step 11: Commit**

```bash
git add backend/src/underwriting backend/src/app.module.ts
git commit -m "feat: add underwriting endpoints for profile, goal, and simulations"
```

---

## Task 14: Rule-parameter admin endpoints (live-edit panel support)

**Files:**
- Create: `backend/src/underwriting/dto/update-rule-parameter.dto.ts`
- Modify: `backend/src/underwriting/underwriting.service.ts`
- Modify: `backend/src/underwriting/underwriting.controller.ts`
- Test: `backend/src/underwriting/underwriting.service.spec.ts` (extend)

**Interfaces:**
- Consumes: `UnderwritingRuleParameter` entity (Task 5).
- Produces: `GET /underwriting/rule-parameters`, `PATCH /underwriting/rule-parameters/:key`, used by the frontend's rules admin panel (the live-modification demo moment).

- [ ] **Step 1: Write the update DTO**

`backend/src/underwriting/dto/update-rule-parameter.dto.ts`:

```typescript
import { IsNumber } from 'class-validator';

export class UpdateRuleParameterDto {
  @IsNumber()
  value!: number;
}
```

- [ ] **Step 2: Add the failing test case**

Append to `backend/src/underwriting/underwriting.service.spec.ts` (inside the existing `describe` block, add a new `it`, plus a repository mock for `UnderwritingRuleParameter` provided alongside the others in `beforeEach`):

```typescript
it('updates a rule parameter value by key', async () => {
  const findOneParamMock = jest.fn().mockResolvedValue({ key: 'MAX_HOUSING_DTI_RATIO', value: '0.40' });
  const saveParamMock = jest.fn().mockImplementation(async (entity) => entity);
  (service as unknown as { ruleParameterRepository: unknown }).ruleParameterRepository = {
    findOne: findOneParamMock,
    save: saveParamMock,
  };

  const result = await service.updateRuleParameter('MAX_HOUSING_DTI_RATIO', 0.35);

  expect(saveParamMock).toHaveBeenCalledWith(expect.objectContaining({ value: 0.35 }));
  expect(result.value).toBe(0.35);
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd backend && npx jest underwriting.service.spec.ts`
Expected: FAIL — `service.updateRuleParameter is not a function`

- [ ] **Step 4: Add the repository and methods to `UnderwritingService`**

In `backend/src/underwriting/underwriting.service.ts`, add the import and constructor parameter:

```typescript
import { UnderwritingRuleParameter } from './entities/underwriting-rule-parameter.entity';
```

Add to the constructor's injected parameters:

```typescript
@InjectRepository(UnderwritingRuleParameter)
private readonly ruleParameterRepository: Repository<UnderwritingRuleParameter>,
```

Add these methods to the class:

```typescript
async listRuleParameters(): Promise<UnderwritingRuleParameter[]> {
  return this.ruleParameterRepository.find({ order: { key: 'ASC' } });
}

async updateRuleParameter(key: string, value: number): Promise<UnderwritingRuleParameter> {
  const parameter = await this.ruleParameterRepository.findOne({ where: { key } });
  if (!parameter) {
    throw new NotFoundException(`No existe el parámetro de reglas "${key}".`);
  }
  parameter.value = String(value);
  return this.ruleParameterRepository.save(parameter);
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd backend && npx jest underwriting.service.spec.ts`
Expected: PASS (3 tests)

- [ ] **Step 6: Add the controller endpoints**

Add to `backend/src/underwriting/underwriting.controller.ts`:

```typescript
@Get('rule-parameters')
listRuleParameters() {
  return this.underwritingService.listRuleParameters();
}

@Patch('rule-parameters/:key')
updateRuleParameter(@Param('key') key: string, @Body() dto: UpdateRuleParameterDto) {
  return this.underwritingService.updateRuleParameter(key, dto.value);
}
```

Update the imports at the top of the file to add `Param`, `Patch` from `@nestjs/common` and `UpdateRuleParameterDto`.

- [ ] **Step 7: Register the entity in `underwriting.module.ts`**

Add `UnderwritingRuleParameter` to the `TypeOrmModule.forFeature([...])` array in `backend/src/underwriting/underwriting.module.ts`.

- [ ] **Step 8: Verify with curl**

Run: `curl -X PATCH http://localhost:3001/underwriting/rule-parameters/MAX_HOUSING_DTI_RATIO -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d "{\"value\":0.35}"`
Expected: envelope with the updated parameter in `data`.

- [ ] **Step 9: Commit**

```bash
git add backend/src/underwriting
git commit -m "feat: add admin endpoints to view and edit rule parameters live"
```

---

## Task 15: Plan and milestone generation (deterministic)

**Files:**
- Create: `backend/src/underwriting/dto/create-plan.dto.ts`
- Create: `backend/src/underwriting/plan-generator.service.ts`
- Modify: `backend/src/underwriting/underwriting.controller.ts`
- Modify: `backend/src/underwriting/underwriting.module.ts`
- Test: `backend/src/underwriting/plan-generator.service.spec.ts`

**Interfaces:**
- Consumes: `Simulation` entity (Task 5), `SimulationOutput` shape (Task 11).
- Produces: `PlanGeneratorService.generateFromSimulation(userId, simulationId): Promise<PlanWithMilestones>` and `PlanGeneratorService.getPlanWithMilestones(userId, planId): Promise<PlanWithMilestones>`, exposed via `POST /underwriting/plans` and `GET /underwriting/plans/:id`. `PlanWithMilestones` is `{ plan: Plan; milestones: Milestone[] }` — the frontend plan/hitos screen (Plan B) depends on this exact shape, including after a page reload.

- [ ] **Step 1: Write the create-plan DTO**

`backend/src/underwriting/dto/create-plan.dto.ts`:

```typescript
import { IsUUID } from 'class-validator';

export class CreatePlanDto {
  @IsUUID()
  simulationId!: string;
}
```

- [ ] **Step 2: Write the failing test**

`backend/src/underwriting/plan-generator.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { PlanGeneratorService } from './plan-generator.service';
import { Simulation } from './entities/simulation.entity';
import { Plan } from './entities/plan.entity';
import { Milestone } from './entities/milestone.entity';

describe('PlanGeneratorService', () => {
  let service: PlanGeneratorService;
  const findOneSimulationMock = jest.fn();
  const savePlanMock = jest.fn();
  const saveMilestonesMock = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlanGeneratorService,
        { provide: getRepositoryToken(Simulation), useValue: { findOne: findOneSimulationMock } },
        {
          provide: getRepositoryToken(Plan),
          useValue: { save: savePlanMock, create: (v: unknown) => v },
        },
        {
          provide: getRepositoryToken(Milestone),
          useValue: { save: saveMilestonesMock, create: (v: unknown) => v, find: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(PlanGeneratorService);
    findOneSimulationMock.mockReset();
    savePlanMock.mockReset();
    saveMilestonesMock.mockReset();
  });

  it('throws NotFoundException for a simulation that does not belong to the user', async () => {
    findOneSimulationMock.mockResolvedValue(null);
    await expect(service.generateFromSimulation('user-1', 'sim-x')).rejects.toThrow(NotFoundException);
  });

  it('creates three milestones with increasing target dates', async () => {
    findOneSimulationMock.mockResolvedValue({
      id: 'sim-1',
      userId: 'user-1',
      outputs: { housingDtiRatio: 0.46, ltv: 0.9, approvalPercentage: 40 },
    });
    savePlanMock.mockImplementation(async (entity) => ({ id: 'plan-1', ...entity }));
    saveMilestonesMock.mockImplementation(async (entities) => entities);

    const result = await service.generateFromSimulation('user-1', 'sim-1');

    expect(result.plan.id).toBe('plan-1');
    expect(result.milestones).toHaveLength(3);
    expect(result.milestones[0].sequenceNumber).toBe(1);
    expect(saveMilestonesMock).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd backend && npx jest plan-generator.service.spec.ts`
Expected: FAIL with "Cannot find module './plan-generator.service'"

- [ ] **Step 4: Implement `PlanGeneratorService`**

`backend/src/underwriting/plan-generator.service.ts`:

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Simulation } from './entities/simulation.entity';
import { Plan } from './entities/plan.entity';
import { Milestone } from './entities/milestone.entity';

export interface PlanWithMilestones {
  plan: Plan;
  milestones: Milestone[];
}

@Injectable()
export class PlanGeneratorService {
  constructor(
    @InjectRepository(Simulation)
    private readonly simulationRepository: Repository<Simulation>,
    @InjectRepository(Plan)
    private readonly planRepository: Repository<Plan>,
    @InjectRepository(Milestone)
    private readonly milestoneRepository: Repository<Milestone>,
  ) {}

  async generateFromSimulation(userId: string, simulationId: string): Promise<PlanWithMilestones> {
    const simulation = await this.simulationRepository.findOne({
      where: { id: simulationId, userId },
    });
    if (!simulation) {
      throw new NotFoundException('No existe esa simulación para este usuario.');
    }

    const savedPlan = await this.planRepository.save(
      this.planRepository.create({ userId, simulationId: simulation.id }),
    );

    const milestoneDefinitions = this.buildMilestoneDefinitions(simulation);
    const milestonesToSave = milestoneDefinitions.map((definition, index) =>
      this.milestoneRepository.create({
        planId: savedPlan.id,
        sequenceNumber: index + 1,
        description: null,
        targetMetric: definition.targetMetric,
        targetValue: String(definition.targetValue),
        targetDate: definition.targetDate,
      }),
    );

    const savedMilestones = await this.milestoneRepository.save(milestonesToSave);

    return { plan: savedPlan, milestones: savedMilestones };
  }

  async getPlanWithMilestones(userId: string, planId: string): Promise<PlanWithMilestones> {
    const plan = await this.planRepository.findOne({ where: { id: planId, userId } });
    if (!plan) {
      throw new NotFoundException('No existe ese plan para este usuario.');
    }

    const milestones = await this.milestoneRepository.find({
      where: { planId: plan.id },
      order: { sequenceNumber: 'ASC' },
    });

    return { plan, milestones };
  }

  private buildMilestoneDefinitions(simulation: Simulation): {
    targetMetric: string;
    targetValue: number;
    targetDate: string;
  }[] {
    const outputs = simulation.outputs as { housingDtiRatio: number; ltv: number };
    const today = new Date();

    const dtiMilestoneDate = this.addMonths(today, 2);
    const ltvMilestoneDate = this.addMonths(today, 4);
    const finalMilestoneDate = this.addMonths(today, 6);

    return [
      { targetMetric: 'housing_dti_ratio', targetValue: 0.4, targetDate: dtiMilestoneDate },
      { targetMetric: 'ltv', targetValue: Math.min(outputs.ltv, 0.8), targetDate: ltvMilestoneDate },
      { targetMetric: 'qualifies_today', targetValue: 1, targetDate: finalMilestoneDate },
    ];
  }

  private addMonths(date: Date, months: number): string {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result.toISOString().slice(0, 10);
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd backend && npx jest plan-generator.service.spec.ts`
Expected: PASS (2 tests)

- [ ] **Step 6: Wire the endpoints**

Add to `backend/src/underwriting/underwriting.controller.ts` (inject `PlanGeneratorService` in the constructor alongside `UnderwritingService`; add `Param` to the existing `@nestjs/common` import):

```typescript
@Post('plans')
createPlan(@Req() request: AuthenticatedRequest, @Body() dto: CreatePlanDto) {
  return this.planGeneratorService.generateFromSimulation(request.user.userId, dto.simulationId);
}

@Get('plans/:id')
getPlan(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
  return this.planGeneratorService.getPlanWithMilestones(request.user.userId, id);
}
```

- [ ] **Step 7: Register the provider in `underwriting.module.ts`**

Add `PlanGeneratorService` to the `providers` array and export it.

- [ ] **Step 8: Commit**

```bash
git add backend/src/underwriting
git commit -m "feat: generate deterministic plan milestones from a chosen simulation"
```

---

## Task 16: Agent — context builder and anti-hallucination template resolver

**Files:**
- Create: `backend/src/agent/interfaces/agent-context.interface.ts`
- Create: `backend/src/agent/agent-context-builder.service.ts`
- Create: `backend/src/agent/template-resolver.service.ts`
- Test: `backend/src/agent/template-resolver.service.spec.ts`
- Test: `backend/src/agent/agent-context-builder.service.spec.ts`

**Interfaces:**
- Consumes: `SimulationResponse` shape (Task 13), `Milestone[]` (Task 15).
- Produces: `TemplateResolverService.resolve(template: string, context: Record<string, string | number>): ResolvedTemplate`, `AgentContextBuilderService.buildFromSimulation(...)`, both consumed by Task 17 (LLM client + endpoints).

- [ ] **Step 1: Define the agent context interface**

`backend/src/agent/interfaces/agent-context.interface.ts`:

```typescript
export interface AgentContext {
  score: number;
  housingDtiRatioPercent: string;
  ltvPercent: string;
  monthlyPayment: string;
  approvalPercentage: string;
  approvalCategory: string;
  qualifiesToday: string;
}
```

- [ ] **Step 2: Write the failing test for the template resolver**

`backend/src/agent/template-resolver.service.spec.ts`:

```typescript
import { TemplateResolverService } from './template-resolver.service';

describe('TemplateResolverService', () => {
  const service = new TemplateResolverService();

  it('substitutes every known placeholder with its context value', () => {
    const result = service.resolve('Tu score es {{score}} y tu DTI es {{housingDtiRatioPercent}}.', {
      score: 640,
      housingDtiRatioPercent: '46%',
    });

    expect(result.text).toBe('Tu score es 640 y tu DTI es 46%.');
    expect(result.isValid).toBe(true);
  });

  it('marks the result invalid and strips the placeholder when a key is unknown', () => {
    const result = service.resolve('Tu meta es {{unknownField}}.', { score: 640 });

    expect(result.isValid).toBe(false);
    expect(result.text).not.toContain('{{unknownField}}');
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd backend && npx jest template-resolver.service.spec.ts`
Expected: FAIL with "Cannot find module './template-resolver.service'"

- [ ] **Step 4: Implement the resolver**

`backend/src/agent/template-resolver.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';

export interface ResolvedTemplate {
  text: string;
  isValid: boolean;
  rejectedKeys: string[];
}

const PLACEHOLDER_PATTERN = /{{\s*([a-zA-Z0-9_]+)\s*}}/g;

@Injectable()
export class TemplateResolverService {
  resolve(template: string, context: Record<string, string | number>): ResolvedTemplate {
    const rejectedKeys: string[] = [];

    const text = template.replace(PLACEHOLDER_PATTERN, (fullMatch, key: string) => {
      const value = context[key];
      if (value === undefined) {
        rejectedKeys.push(key);
        return '[dato no disponible]';
      }
      return String(value);
    });

    return { text, isValid: rejectedKeys.length === 0, rejectedKeys };
  }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd backend && npx jest template-resolver.service.spec.ts`
Expected: PASS (2 tests)

- [ ] **Step 6: Write the failing test for the context builder**

`backend/src/agent/agent-context-builder.service.spec.ts`:

```typescript
import { AgentContextBuilderService } from './agent-context-builder.service';
import { ApprovalCategory } from '../rules-engine/calculators/approval-probability.scorer';
import { ScoreBand } from '../rules-engine/calculators/score-band.classifier';

describe('AgentContextBuilderService', () => {
  const service = new AgentContextBuilderService();

  it('formats ratios as whole-number percentages and booleans as spanish words', () => {
    const context = service.buildFromSimulation({
      id: 'sim-1',
      scoreBand: ScoreBand.HIGH_RISK,
      housingDtiRatio: 0.4583,
      totalDtiRatio: 0.5,
      ltv: 0.9,
      monthlyPayment: 550.4,
      approvalPercentage: 30,
      approvalCategory: ApprovalCategory.LOW,
      qualifiesToday: false,
      createdAt: new Date(),
    }, 640);

    expect(context.housingDtiRatioPercent).toBe('46%');
    expect(context.qualifiesToday).toBe('no');
    expect(context.score).toBe(640);
  });
});
```

- [ ] **Step 7: Run the test to verify it fails**

Run: `cd backend && npx jest agent-context-builder.service.spec.ts`
Expected: FAIL with "Cannot find module './agent-context-builder.service'"

- [ ] **Step 8: Implement the context builder**

`backend/src/agent/agent-context-builder.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { SimulationResponse } from '../underwriting/interfaces/simulation-response.interface';
import { AgentContext } from './interfaces/agent-context.interface';

@Injectable()
export class AgentContextBuilderService {
  buildFromSimulation(simulation: SimulationResponse, score: number): AgentContext {
    return {
      score,
      housingDtiRatioPercent: this.toPercent(simulation.housingDtiRatio),
      ltvPercent: this.toPercent(simulation.ltv),
      monthlyPayment: simulation.monthlyPayment.toFixed(2),
      approvalPercentage: `${simulation.approvalPercentage}%`,
      approvalCategory: simulation.approvalCategory,
      qualifiesToday: simulation.qualifiesToday ? 'sí' : 'no',
    };
  }

  private toPercent(ratio: number): string {
    return `${Math.round(ratio * 100)}%`;
  }
}
```

- [ ] **Step 9: Run the test to verify it passes**

Run: `cd backend && npx jest agent-context-builder.service.spec.ts`
Expected: PASS (1 test)

- [ ] **Step 10: Commit**

```bash
git add backend/src/agent
git commit -m "feat: add agent context builder and anti-hallucination template resolver"
```

---

## Task 17: Agent — LLM client, endpoints, and rate limiting

**Files:**
- Create: `backend/src/agent/llm-client.service.ts`
- Create: `backend/src/agent/dto/ask-agent.dto.ts`
- Create: `backend/src/agent/agent.service.ts`
- Create: `backend/src/agent/agent.controller.ts`
- Create: `backend/src/agent/agent.module.ts`
- Test: `backend/src/agent/agent.service.spec.ts`

**Interfaces:**
- Consumes: `TemplateResolverService` (Task 16), `AgentContextBuilderService` (Task 16), `UnderwritingService` (Task 13), `AgentLog` entity (Task 5).
- Produces: `POST /agent/explain` — the endpoint the frontend's agent panel calls to narrate a simulation. `/agent/ask` and `/agent/plan` (milestone/checklist wording) follow the exact same `AgentService` pattern (context builder → LLM template → resolver → log) and are deliberately left as a follow-up once `/agent/explain` is proven end-to-end — see "Limitaciones conocidas" in Task 18's README.

- [ ] **Step 1: Install the Anthropic SDK and throttler**

Run: `cd backend && npm install @anthropic-ai/sdk @nestjs/throttler`

- [ ] **Step 2: Implement the LLM client wrapper**

`backend/src/agent/llm-client.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

@Injectable()
export class LlmClientService {
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(private readonly configService: ConfigService) {
    this.client = new Anthropic({ apiKey: this.configService.getOrThrow<string>('ANTHROPIC_API_KEY') });
    this.model = this.configService.getOrThrow<string>('AGENT_MODEL');
  }

  async generateTemplate(systemPrompt: string, userPrompt: string): Promise<string> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const firstBlock = response.content[0];
    return firstBlock.type === 'text' ? firstBlock.text : '';
  }
}
```

- [ ] **Step 3: Write the ask-agent DTO**

`backend/src/agent/dto/ask-agent.dto.ts`:

```typescript
import { IsString, IsUUID, MaxLength } from 'class-validator';

export class AskAgentDto {
  @IsUUID()
  simulationId!: string;

  @IsString()
  @MaxLength(500)
  question!: string;
}
```

- [ ] **Step 4: Write the failing test for `AgentService`**

`backend/src/agent/agent.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AgentService } from './agent.service';
import { LlmClientService } from './llm-client.service';
import { TemplateResolverService } from './template-resolver.service';
import { AgentContextBuilderService } from './agent-context-builder.service';
import { UnderwritingService } from '../underwriting/underwriting.service';
import { AgentLog } from './entities/agent-log.entity';
import { ApprovalCategory } from '../rules-engine/calculators/approval-probability.scorer';
import { ScoreBand } from '../rules-engine/calculators/score-band.classifier';

describe('AgentService', () => {
  let service: AgentService;
  const saveLogMock = jest.fn().mockImplementation(async (entity) => entity);
  const generateTemplateMock = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgentService,
        TemplateResolverService,
        AgentContextBuilderService,
        { provide: LlmClientService, useValue: { generateTemplate: generateTemplateMock } },
        {
          provide: UnderwritingService,
          useValue: {
            getSimulationById: jest.fn().mockResolvedValue({
              id: 'sim-1',
              scoreBand: ScoreBand.HIGH_RISK,
              housingDtiRatio: 0.46,
              totalDtiRatio: 0.5,
              ltv: 0.9,
              monthlyPayment: 550,
              approvalPercentage: 30,
              approvalCategory: ApprovalCategory.LOW,
              qualifiesToday: false,
              createdAt: new Date(),
            }),
            getProfile: jest.fn().mockResolvedValue({ score: 640 }),
          },
        },
        { provide: getRepositoryToken(AgentLog), useValue: { save: saveLogMock, create: (v: unknown) => v } },
      ],
    }).compile();

    service = module.get(AgentService);
    generateTemplateMock.mockReset();
    saveLogMock.mockClear();
  });

  it('resolves the LLM template against real simulation numbers and logs the interaction', async () => {
    generateTemplateMock.mockResolvedValue(
      'Hoy tu score es {{score}} y tu probabilidad de aprobación es {{approvalPercentage}}.',
    );

    const result = await service.explainSimulation('user-1', 'sim-1');

    expect(result.text).toContain('640');
    expect(result.text).toContain('30%');
    expect(saveLogMock).toHaveBeenCalled();
  });
});
```

- [ ] **Step 5: Run the test to verify it fails**

Run: `cd backend && npx jest agent.service.spec.ts`
Expected: FAIL with "Cannot find module './agent.service'"

- [ ] **Step 6: Add `getSimulationById` to `UnderwritingService`**

Add this method to `backend/src/underwriting/underwriting.service.ts` (it needs `@InjectRepository(Simulation)`, already present):

```typescript
async getSimulationById(userId: string, simulationId: string): Promise<SimulationResponse> {
  const simulation = await this.simulationRepository.findOne({
    where: { id: simulationId, userId },
  });
  if (!simulation) {
    throw new NotFoundException('No existe esa simulación para este usuario.');
  }
  const outputs = simulation.outputs as Record<string, unknown>;
  return {
    id: simulation.id,
    scoreBand: outputs.scoreBand as SimulationResponse['scoreBand'],
    housingDtiRatio: outputs.housingDtiRatio as number,
    totalDtiRatio: outputs.totalDtiRatio as number,
    ltv: outputs.ltv as number,
    monthlyPayment: outputs.monthlyPayment as number,
    approvalPercentage: outputs.approvalPercentage as number,
    approvalCategory: outputs.approvalCategory as SimulationResponse['approvalCategory'],
    qualifiesToday: outputs.qualifiesToday as boolean,
    createdAt: simulation.createdAt,
  };
}
```

- [ ] **Step 7: Implement `AgentService`**

`backend/src/agent/agent.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LlmClientService } from './llm-client.service';
import { TemplateResolverService } from './template-resolver.service';
import { AgentContextBuilderService } from './agent-context-builder.service';
import { UnderwritingService } from '../underwriting/underwriting.service';
import { AgentLog } from './entities/agent-log.entity';

export interface AgentReply {
  text: string;
}

const EXPLAIN_SYSTEM_PROMPT =
  'Eres un asesor financiero que solo explica resultados ya calculados. ' +
  'Nunca inventes cifras: usa exclusivamente placeholders {{clave}} para cualquier número. ' +
  'Responde en español, en un tono claro y empático, en máximo 4 frases.';

@Injectable()
export class AgentService {
  constructor(
    private readonly llmClientService: LlmClientService,
    private readonly templateResolverService: TemplateResolverService,
    private readonly agentContextBuilderService: AgentContextBuilderService,
    private readonly underwritingService: UnderwritingService,
    @InjectRepository(AgentLog)
    private readonly agentLogRepository: Repository<AgentLog>,
  ) {}

  async explainSimulation(userId: string, simulationId: string): Promise<AgentReply> {
    const simulation = await this.underwritingService.getSimulationById(userId, simulationId);
    const profile = await this.underwritingService.getProfile(userId);
    const context = this.agentContextBuilderService.buildFromSimulation(simulation, profile.score);

    const rawTemplate = await this.llmClientService.generateTemplate(
      EXPLAIN_SYSTEM_PROMPT,
      `Explica este resultado de simulación hipotecaria: ${JSON.stringify(context)}`,
    );

    const resolved = this.templateResolverService.resolve(rawTemplate, context as unknown as Record<string, string | number>);

    await this.agentLogRepository.save(
      this.agentLogRepository.create({
        userId,
        endpoint: 'explain',
        contextSent: context,
        rawResponse: rawTemplate,
        resolvedResponse: resolved.text,
        validationPassed: resolved.isValid,
      }),
    );

    return { text: resolved.text };
  }
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `cd backend && npx jest agent.service.spec.ts`
Expected: PASS (1 test)

- [ ] **Step 9: Implement the controller with rate limiting**

`backend/src/agent/agent.controller.ts`:

```typescript
import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { AgentService } from './agent.service';
import { AskAgentDto } from './dto/ask-agent.dto';

interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

@UseGuards(JwtAuthGuard, ThrottlerGuard)
@Throttle({ default: { limit: 20, ttl: 60000 } })
@Controller('agent')
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Post('explain')
  explain(@Req() request: AuthenticatedRequest, @Body() dto: AskAgentDto) {
    return this.agentService.explainSimulation(request.user.userId, dto.simulationId);
  }
}
```

- [ ] **Step 10: Implement the module**

`backend/src/agent/agent.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { AgentLog } from './entities/agent-log.entity';
import { UnderwritingModule } from '../underwriting/underwriting.module';
import { AuthModule } from '../auth/auth.module';
import { LlmClientService } from './llm-client.service';
import { TemplateResolverService } from './template-resolver.service';
import { AgentContextBuilderService } from './agent-context-builder.service';
import { AgentService } from './agent.service';
import { AgentController } from './agent.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([AgentLog]),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 20 }]),
    UnderwritingModule,
    AuthModule,
  ],
  providers: [LlmClientService, TemplateResolverService, AgentContextBuilderService, AgentService],
  controllers: [AgentController],
})
export class AgentModule {}
```

- [ ] **Step 11: Register `AgentModule` in `app.module.ts`**

- [ ] **Step 12: Verify with curl (requires a real `ANTHROPIC_API_KEY` in `backend/.env`)**

Run: `curl -X POST http://localhost:3001/agent/explain -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d "{\"simulationId\":\"<a real simulation id from Task 13>\"}"`
Expected: envelope with a natural-language explanation in `data.text`, containing real numbers.

- [ ] **Step 13: Commit**

```bash
git add backend/src/agent backend/src/underwriting/underwriting.service.ts backend/src/app.module.ts backend/package.json backend/package-lock.json
git commit -m "feat: add agent explain endpoint backed by the anti-hallucination resolver"
```

---

## Task 18: Backend README and AI_USAGE.md skeleton

**Files:**
- Create: `backend/README.md`
- Create: `AI_USAGE.md` (repo root)

**Interfaces:**
- None — documentation only.

- [ ] **Step 1: Write `backend/README.md`**

Include, at minimum: prerequisites (Node version, Docker), setup steps (`cp .env.example .env`, `npm install`, `npm run migration:run`, `npm run seed`, `npm run start:dev`), how to run tests (`npm test`), the demo login credentials (`ana.demo@decisiondata.test` / `demo1234`), a one-paragraph explanation that the approval-probability model and score bands are illustrative and not the real Decision Data model (cross-reference `docs/superpowers/specs/2026-09-16-decision-data-ruta-design.md` section 4.1), and a "Limitaciones conocidas" section noting that `/agent/ask` and `/agent/plan` are not yet implemented (only `/agent/explain`), following the same context-builder/resolver pattern documented in Task 17.

- [ ] **Step 2: Create the `AI_USAGE.md` skeleton at the repo root**

Create sections (to be filled in as work progresses through both plans): Herramientas de IA utilizadas y etapas, Prompts/interacciones que influyeron en decisiones importantes, Código/diseño/documentación generados o asistidos por IA, Errores detectados en respuestas de IA, Correcciones y refactorizaciones realizadas por el candidato, Pruebas y controles utilizados, Decisiones tomadas directamente por el candidato. Fill in what's true so far for this backend plan (e.g., the rules engine parameters were researched with AI-assisted web search, but every threshold was manually reviewed against the cited source before being committed to the seed data).

- [ ] **Step 3: Commit**

```bash
git add backend/README.md AI_USAGE.md
git commit -m "docs: add backend readme and ai usage log skeleton"
```

---

## Task 19: Full backend test suite run

**Files:** none (verification task)

- [ ] **Step 1: Run the entire backend test suite**

Run: `cd backend && npm test`
Expected: all suites pass (rules engine calculators, orchestrator, auth, underwriting, plan generator, agent).

- [ ] **Step 2: Run a full manual smoke test**

With Postgres up and the backend running: log in → get profile/goal → create a simulation with Ana's real numbers (confirm `qualifiesToday: false`) → create a simulation with improved numbers (confirm `qualifiesToday: true`) → generate a plan from the qualifying simulation → call `/agent/explain` on both simulations and confirm the text contains real numbers matching the simulation output.

- [ ] **Step 3: Fix any failures found, then commit**

```bash
git add -A
git commit -m "test: verify full backend flow end to end"
```
