# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Stilist is a full-stack TypeScript monorepo for fashion/wardrobe management built with:
- **Frontend**: Next.js 16 (App Router), React 19, TanStack Query, Tailwind CSS v4, shadcn/ui
- **Backend**: Hono server with ORPC for type-safe APIs, Better Auth for authentication
- **Database**: PostgreSQL with Drizzle ORM
- **Infrastructure**: Redis (queuing), MinIO (S3-compatible storage), BullMQ (job processing)
- **AI Integration**: Multi-provider support (Gemini, Anthropic, Groq, XAI)
- **Runtime**: Bun

## Common Development Commands

```bash
# Development
bun run dev                 # Start all apps (web on :3001, server on :3000)
bun run dev:web             # Start only frontend
bun run dev:server          # Start only backend
bun run dev:native          # Start only native app

# Database
bun run db:start            # Start Docker PostgreSQL
bun run db:watch            # Start Docker with docker-compose up (watch mode)
bun run db:stop             # Stop Docker PostgreSQL
bun run db:down             # Stop and remove containers/volumes
bun run db:push             # Push schema changes to database
bun run db:generate         # Generate migration files
bun run db:migrate          # Run migrations
bun run db:studio           # Open Drizzle Studio UI

# Code Quality (Ultracite/Biome)
bun run check               # Run Biome format & lint
bun run fix                 # Auto-fix issues
bun run fix:unsafe          # Fix with unsafe rules
bun run typecheck           # Check TypeScript types
bun run test                # Run tests

# Build
bun run build               # Build all apps for production

# CI
bun run ci:local            # Full CI pipeline locally (lint, typecheck, test, build)
bun run ci:quick            # Quick check on changed files since last commit
bun run ci:full             # Full install + CI pipeline
```

## Architecture

### Monorepo Structure
- **apps/web**: Next.js frontend application
- **apps/server**: Hono API server with ORPC endpoints
- **packages/api**: ORPC routers and business logic layer
- **packages/auth**: Better Auth configuration and utilities
- **packages/db**: Drizzle schema, migrations, and database client
- **packages/wardrobe**: Wardrobe domain logic and AI clothing analysis
- **packages/ai**: AI provider integrations (multi-provider support)
- **packages/queue**: BullMQ job processing and queue client
- **packages/storage**: MinIO/S3 storage client
- **packages/redis**: Redis client wrapper with consistent config
- **packages/logger**: Pino logger configuration and HTTP middleware
- **packages/shared**: Shared constants, types, utilities
- **packages/test-utils**: Testing mocks and utilities (PGlite, Redis, S3, AI)

### Package Exports & Usage

Key packages expose specific exports for controlled imports:

**@ai-stilist/db**:
- `import { db } from "@ai-stilist/db"` - Main database client
- `import { ... } from "@ai-stilist/db/schema/auth"` - Auth schema tables
- `import { ... } from "@ai-stilist/db/schema/wardrobe"` - Wardrobe schema tables

**@ai-stilist/redis**:
- `import { createRedisClient } from "@ai-stilist/redis"` - Redis client factory

**@ai-stilist/queue**:
- `import { createQueue } from "@ai-stilist/queue"` - Queue client factory
- `import type { ProcessImageJob } from "@ai-stilist/queue"` - Job types

**@ai-stilist/wardrobe**:
- `import { ClothingAnalyzer } from "@ai-stilist/wardrobe"` - AI clothing analyzer
- `import { ... } from "@ai-stilist/wardrobe/metadata"` - Metadata schemas

**@ai-stilist/storage**:
- `import { createStorageClient } from "@ai-stilist/storage"` - S3 storage client

**@ai-stilist/shared**:
- `import { services } from "@ai-stilist/shared/services"` - Service URLs by environment

### Key Architectural Patterns

1. **Type-Safe API Layer**: ORPC provides end-to-end type safety between frontend and backend. Routers are defined in `packages/api/src/routers/` and consumed via TanStack Query in the frontend.

2. **Dependency Injection**: The server uses a factory pattern where all dependencies (db, logger, auth, storage, queue, ai) are created at startup in `apps/server/src/index.ts` and passed through ORPC context. This allows for easy testing and swapping implementations.

   Example: Redis uses `createRedisClient()` wrapper from `@ai-stilist/redis` instead of raw ioredis, providing consistent configuration and error handling.

3. **Context-Based Authentication**: Authentication state flows through ORPC context. Protected procedures use `protectedProcedure` which validates session existence. Better Auth handles `/api/auth/*` endpoints automatically.

4. **Background Processing**: Image processing and other async tasks use BullMQ workers (`apps/server/src/workers/`). Jobs are added to queues via the queue client and processed separately from API requests by dedicated worker processes.

   Workers include:
   - `image-processor.worker.ts` - Processes uploaded clothing images with AI analysis

5. **Multi-Environment Support**: Service URLs and configurations adapt based on `APP_ENV` (development/staging/production) defined in `packages/shared/services.ts`.

6. **Shared Catalog Pattern**: The root `package.json` defines a workspace catalog for shared dependency versions, ensuring consistency across all packages.

## Database Schema Organization

Schemas are organized by domain in `packages/db/src/schema/`:
- **auth/**: Better Auth tables (users, sessions, accounts)
- **wardrobe/**: Clothing items, outfits, categories

Each domain exports its tables and relations. Use Drizzle's schema helpers for type-safe queries.

### Database Workflow

**Development workflow**:
1. Modify schema files in `packages/db/src/schema/`
2. Run `bun run db:push` to apply changes directly to dev database (fast, no migrations)
3. Use `bun run db:studio` to inspect database with Drizzle Studio UI

**Production workflow**:
1. Modify schema files
2. Run `bun run db:generate` to create migration SQL files
3. Review generated migrations in `packages/db/drizzle/` directory
4. Run `bun run db:migrate` to apply migrations to database

**When to use each command**:
- `db:push` - Development only, pushes schema changes directly (overwrites)
- `db:generate` - Creates migration files for version control
- `db:migrate` - Runs pending migrations (production-safe)

## Testing Strategy

- **Test Runner**: Bun's built-in test runner (fast, native TypeScript support)
- **Test Utilities**: `packages/test-utils` provides mocks for external services:
  - PG Gateway server for database testing
  - Redis memory server for cache testing
  - S3rver for MinIO/S3 storage mocking
  - AI client mocks for AI provider testing
- **Database Testing**: In-memory PGlite for fast, isolated database tests
- **Test Setup**: Tests run with: `bun test --preload ./test/test.setup.ts`
- **Test Organization**: Co-locate tests with source files (e.g., `foo.ts` → `foo.test.ts`)

## Build & Tooling

**Monorepo Management**:
- **Turborepo** orchestrates builds, tests, and tasks across all packages
- **Workspace Catalog** in root `package.json` ensures consistent dependency versions
- Use `workspace:*` in package.json to reference local packages

**Build Tools**:
- **tsdown** for TypeScript compilation and bundling
- **Bun** for fast JavaScript runtime and package management
- Configuration in `turbo.json` defines task dependencies and caching

**Turbo Commands**:
- `turbo -F <package>` filters tasks to specific packages
- Example: `turbo -F @ai-stilist/db db:push`
- Tasks are cached for faster subsequent runs

## Code Quality Standards

This project uses **Ultracite**, a zero-config Biome preset enforcing strict standards:

- TypeScript with explicit types for clarity
- Modern JS features (arrow functions, optional chaining, template literals)
- Async/await over promise chains
- Function components and hooks for React
- Semantic HTML and accessibility
- Early returns to reduce nesting
- No console.log in production (use logger instead)

Run `bun run fix` before committing to auto-fix most issues.

## Environment Setup

1. Copy `apps/server/.env.example` to `apps/server/.env` and configure:
   - `DATABASE_URL`: PostgreSQL connection string (default: `postgresql://postgres:postgres@localhost:54321/ai-stilist`)
   - `BETTER_AUTH_SECRET`: Auth secret key (generate with `openssl rand -base64 32`)
   - `BETTER_AUTH_URL`: Auth URL (development: `http://localhost:3000`)
   - `CORS_ORIGIN`: CORS origin (development: `http://localhost:3001`)
   - `GOOGLE_GEMINI_API_KEY`: Gemini AI API key (or other AI provider keys)

2. Start infrastructure services:
   ```bash
   bun install
   bun run db:start  # Start PostgreSQL, Redis, MinIO in Docker
   ```

3. Initialize database:
   ```bash
   bun run db:push   # Apply schema to database
   ```

4. Start development servers:
   ```bash
   bun run dev       # Start both web (:3001) and server (:3000)
   ```

**Docker Services** (configured in `infra/docker-compose.yml`):
- PostgreSQL on port 54321
- Redis on port 63791
- MinIO on ports 9000 (API) / 9001 (console)

## API Development Flow

### Creating New API Routes

1. **Define ORPC router** in `packages/api/src/routers/`:
   ```typescript
   import { protectedProcedure, router } from "../context"
   import { z } from "zod"

   export const myRouter = router({
     getItems: protectedProcedure
       .input(z.object({ category: z.string() }))
       .query(async ({ input, ctx }) => {
         // Access dependencies from ctx: ctx.db, ctx.logger, etc.
         return await ctx.db.query.items.findMany({
           where: eq(items.category, input.category)
         })
       }),
   })
   ```

2. **Export router** in `packages/api/src/routers/index.ts`:
   ```typescript
   export { myRouter } from "./my.router"
   ```

3. **Add to main router** in `packages/api/src/index.ts`

4. **Routes automatically available** at `/rpc/{routerName}.{procedureName}`

5. **Frontend consumption** via `@orpc/tanstack-query`:
   ```typescript
   const { data } = client.myRouter.getItems.useQuery({ category: "shirts" })
   ```

6. **OpenAPI docs** auto-generated at `/api-reference/*`

### Adding Background Jobs

1. **Define job type** in `packages/queue/src/jobs/`:
   ```typescript
   export interface MyJob {
     type: "my-job"
     data: { itemId: string }
   }
   ```

2. **Create worker** in `apps/server/src/workers/my.worker.ts`:
   ```typescript
   import { Worker } from "bullmq"

   export const createMyWorker = (deps: Dependencies) => {
     return new Worker("my-queue", async (job) => {
       // Process job with access to deps
     }, { connection: deps.redis })
   }
   ```

3. **Enqueue jobs** from API routes:
   ```typescript
   await ctx.queue.add("my-job", { itemId: "123" })
   ```

## Frontend Patterns

- **Server Components** for initial data fetching and static content
- **Client Components** with TanStack Query for dynamic data and real-time updates
- **shadcn/ui** components in `apps/web/src/components/ui/` (Radix UI primitives with Tailwind v4)
- **Form handling** with TanStack Form for type-safe form state management
- **Theme switching** via next-themes (light/dark mode support)
- **Animations** using Motion library for smooth transitions
- **Toast notifications** with Sonner for user feedback
- **React Compiler** enabled (babel-plugin-react-compiler) for automatic optimization
- **PWA support** with offline capabilities and service workers

**UI Component Structure**:
- Use shadcn/ui CLI to add new components: `bunx shadcn@latest add <component>`
- Components are copied into your codebase for full customization
- Tailwind v4 provides utility-first styling