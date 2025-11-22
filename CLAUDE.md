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

# Database
bun run db:push             # Push schema changes to database
bun run db:studio           # Open Drizzle Studio UI
bun run db:generate         # Generate migration files
bun run db:migrate          # Run migrations
bun run db:start            # Start Docker PostgreSQL
bun run db:stop             # Stop Docker PostgreSQL

# Code Quality (Ultracite/Biome)
bun run check               # Run Biome format & lint
bun run fix                 # Auto-fix issues
bun run fix:unsafe          # Fix with unsafe rules
bun run typecheck           # Check TypeScript types
bun run test                # Run tests

# Build
bun run build               # Build all apps for production
```

## Architecture

### Monorepo Structure
- **apps/web**: Next.js frontend application
- **apps/server**: Hono API server with ORPC endpoints
- **packages/api**: ORPC routers and business logic layer
- **packages/auth**: Better Auth configuration and utilities
- **packages/db**: Drizzle schema, migrations, and database client
- **packages/wardrobe**: Wardrobe domain logic
- **packages/ai**: AI provider integrations
- **packages/queue**: BullMQ job processing
- **packages/storage**: MinIO/S3 storage client
- **packages/redis**: Redis client wrapper
- **packages/logger**: Pino logger configuration
- **packages/shared**: Shared constants, types, utilities

### Key Architectural Patterns

1. **Type-Safe API Layer**: ORPC provides end-to-end type safety between frontend and backend. Routers are defined in `packages/api/src/routers/` and consumed via TanStack Query in the frontend.

2. **Dependency Injection**: The server uses a factory pattern where all dependencies (db, logger, auth, storage, queue, ai) are created at startup in `apps/server/src/index.ts` and passed through context.

3. **Context-Based Authentication**: Authentication state flows through ORPC context. Protected procedures use `protectedProcedure` which validates session existence.

4. **Background Processing**: Image processing and other async tasks use BullMQ workers (`apps/server/src/workers/`). Jobs are added to queues and processed separately from API requests.

5. **Multi-Environment Support**: Service URLs and configurations adapt based on `APP_ENV` (development/staging/production) defined in `packages/shared/services.ts`.

## Database Schema Organization

Schemas are organized by domain in `packages/db/src/schema/`:
- **auth/**: Better Auth tables (users, sessions, accounts)
- **wardrobe/**: Clothing items, outfits, categories

Each domain exports its tables and relations. Use Drizzle's schema helpers for type-safe queries.

## Testing Strategy

- Unit tests use Bun's built-in test runner
- Test utilities in `packages/test-utils`
- Tests run with: `bun test --preload ./test/test.setup.ts`
- Use in-memory PGlite for database tests

## Code Quality Standards

This project uses **Ultracite**, a zero-config Biome preset enforcing strict standards:

- TypeScript with explicit types for clarity
- Modern JS features (arrow functions, optional chaining, template literals)
- Async/await over promise chains
- Function components and hooks for React
- Semantic HTML and accessibility
- Early returns to reduce nesting
- No console.log in production

Run `bun run fix` before committing to auto-fix most issues.

## Environment Setup

1. Copy `.env.example` to `.env` in root and configure:
   - `DATABASE_URL`: PostgreSQL connection string
   - `BETTER_AUTH_SECRET`: Auth secret key
   - MinIO credentials for storage
   - AI provider API keys

2. Start services:
   ```bash
   bun install
   bun run db:start  # Start PostgreSQL in Docker
   bun run db:push   # Apply schema
   bun run dev       # Start development servers
   ```

## API Development Flow

1. Define ORPC router in `packages/api/src/routers/`
2. Use `publicProcedure` or `protectedProcedure` base
3. Router automatically exposed at `/rpc/*` endpoints
4. Frontend consumes via `@orpc/tanstack-query` hooks
5. OpenAPI docs available at `/api-reference/*`

## Frontend Patterns

- Server Components for initial data fetching
- Client Components with TanStack Query for dynamic data
- shadcn/ui components in `apps/web/src/components/ui/`
- Form handling with TanStack Form
- Theme switching via next-themes
- PWA support with offline capabilities