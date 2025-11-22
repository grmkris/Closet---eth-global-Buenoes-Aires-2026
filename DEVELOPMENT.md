# Development Guide

## Prerequisites

- [Bun](https://bun.sh/) v1.3.0 or later
- [Docker](https://www.docker.com/) for local infrastructure
- [Git](https://git-scm.com/)

## Getting Started

1. **Clone the repository**
```bash
git clone <repository-url>
cd ai-stilist
```

2. **Install dependencies**
```bash
bun install
```

3. **Set up environment variables**
```bash
cp .env.example apps/server/.env
# Edit apps/server/.env with your values
```

4. **Start infrastructure**
```bash
cd infra
docker compose up -d
```

5. **Run database migrations**
```bash
bun run db:push
```

6. **Start development servers**
```bash
bun run dev
```

## Project Structure

```
ai-stilist/
├── apps/
│   ├── server/          # Hono API server
│   │   ├── src/
│   │   └── test/        # Server tests
│   └── web/             # Web frontend
├── packages/
│   ├── api/             # API definitions
│   ├── auth/            # Authentication logic
│   ├── db/              # Database schemas
│   └── test-utils/      # Testing utilities
├── infra/               # Docker infrastructure
└── .github/             # CI/CD workflows
```

## Available Scripts

### Root Scripts

```bash
# Code quality
bun run lint              # Lint all packages
bun run fix               # Fix linting issues
bun run fix:unsafe        # Fix with unsafe changes
bun run typecheck         # Type check all packages
bun run format            # Format code

# Testing
bun run test              # Run all tests
bun run ci:local          # Run full CI locally
bun run ci:quick          # Quick CI check

# Development
bun run dev               # Start all dev servers
bun run dev:server        # Start server only
bun run dev:web           # Start web only
bun run build             # Build all packages

# Database
bun run db:start          # Start database
bun run db:stop           # Stop database
bun run db:push           # Push schema changes
bun run db:studio         # Open Drizzle Studio
bun run db:generate       # Generate migrations
```

### Package Scripts

Each package supports:
- `build` - Build the package
- `typecheck` - Type check
- `lint` - Lint code
- `fix` - Fix linting issues
- `format` - Format code

## Development Workflow

### 1. Code Changes

Make your changes in the appropriate package or app.

### 2. Type Safety

Run type checking:
```bash
bun run typecheck
```

### 3. Code Quality

Lint and format your code:
```bash
bun run fix
```

### 4. Testing

Write tests for your changes and run them:
```bash
bun run test
```

### 5. Pre-commit Check

Before committing, run the full local CI:
```bash
bun run ci:local
```

## Infrastructure

### Database (PostgreSQL)

- **Port**: 54321
- **User**: postgres
- **Password**: postgres
- **Database**: postgres

```bash
# Start
bun run db:start

# View schema
bun run db:studio

# Push schema changes
bun run db:push
```

### Redis

- **Port**: 63791
- **Connection**: `redis://localhost:63791`

```bash
# Connect via CLI
redis-cli -p 63791
```

### MinIO (S3)

- **API Port**: 9000
- **Console Port**: 9001
- **Console**: http://localhost:9001
- **User**: minioadmin
- **Password**: minioadmin

## Testing

See [TESTING.md](./TESTING.md) for detailed testing guide.

Quick test commands:
```bash
# Run all tests
bun run test

# Run server tests only
cd apps/server && bun test

# Run specific test file
bun test apps/server/test/example.test.ts
```

## Code Style

This project uses **Ultracite** (Biome preset) for code formatting and linting.

### Ultracite Commands

```bash
# Check code
bun ultracite check

# Fix issues
bun ultracite fix

# Fix with unsafe changes
bun ultracite fix --unsafe

# Diagnose setup
bun ultracite doctor
```

### Key Principles

- Use explicit types for clarity
- Prefer `unknown` over `any`
- Use const assertions for immutable values
- Write accessible, semantic HTML
- Follow React best practices
- Handle errors meaningfully

See [CLAUDE.md](./.claude/CLAUDE.md) for detailed code standards.

## Troubleshooting

### Port Conflicts

If ports 54321, 63791, 9000, or 9001 are in use:
```bash
# Stop all containers
cd infra && docker compose down

# Or change ports in infra/docker-compose.yml
```

### Database Issues

```bash
# Reset database
cd infra
docker compose down -v
docker compose up -d
bun run db:push
```

### Dependency Issues

```bash
# Clear cache and reinstall
rm -rf node_modules
rm bun.lockb
bun install
```

### Type Errors

```bash
# Rebuild all packages
bun run build

# Check types
bun run typecheck
```

## CI/CD

Every PR runs:
1. Lint
2. Type check
3. Tests
4. Build

See `.github/workflows/ci.yml` for the full pipeline.

## Contributing

1. Create a feature branch
2. Make your changes
3. Write tests
4. Run `bun run ci:local`
5. Create a PR
6. Wait for CI to pass
7. Request review

## Additional Resources

- [Bun Documentation](https://bun.sh/docs)
- [Hono Documentation](https://hono.dev/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Better Auth](https://www.better-auth.com/)
- [Ultracite](https://github.com/fuma-nama/ultracite)
