# Testing Guide

This project uses a comprehensive testing infrastructure with in-memory databases and mocked services for fast, isolated tests.

## Quick Start

Run all tests:
```bash
bun run test
```

Run tests for a specific app:
```bash
cd apps/server
bun test
```

## Testing Infrastructure

### Test Utilities (`@ai-stilist/test-utils`)

The `packages/test-utils` package provides utilities for testing:

- **PGlite**: In-memory PostgreSQL database for fast tests
- **S3 Mock**: Local S3 server using s3rver
- **Redis Mock**: In-memory Redis server
- **PG Gateway**: PostgreSQL wire protocol server for PGlite

### Test Setup

Each app has a `test/test.setup.ts` file that creates a complete test environment:

```typescript
import { createTestSetup } from "./test/test.setup.ts";

describe("My Feature", () => {
  let testEnv: TestSetup;

  beforeAll(async () => {
    testEnv = await createTestSetup();
  });

  afterAll(async () => {
    await testEnv.close();
  });

  test("should work", async () => {
    // Use testEnv.deps.db, testEnv.users, etc.
  });
});
```

### What's Included

The test setup provides:

- **Database**: In-memory PGlite with migrations applied
- **Auth**: Better-auth instance configured with test users
- **S3**: Mock S3 server with MinIO client
- **Redis**: (Optional) In-memory Redis server
- **Test Users**: Pre-created users with authentication tokens

## Writing Tests

### Basic Test Example

```typescript
import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { createTestSetup, type TestSetup } from "./test/test.setup.ts";

describe("User API", () => {
  let testEnv: TestSetup;

  beforeAll(async () => {
    testEnv = await createTestSetup();
  });

  afterAll(async () => {
    await testEnv.close();
  });

  test("should get current user", async () => {
    const response = await fetch("http://localhost:8000/api/me", {
      headers: {
        cookie: `better-auth.session_token=${testEnv.users.user1.token}`,
      },
    });

    expect(response.ok).toBe(true);
    const user = await response.json();
    expect(user.email).toBe("user1@test.com");
  });
});
```

### Database Testing

```typescript
test("should query the database", async () => {
  const users = await testEnv.deps.db.query.user.findMany();
  expect(users).toHaveLength(2);
});
```

### S3 Testing

```typescript
import { uploadTestFile, getTestFile } from "./test/test-helpers.ts";

test("should upload and download files", async () => {
  await uploadTestFile(testEnv.deps, "test.txt", "Hello World");
  const content = await getTestFile(testEnv.deps, "test.txt");
  expect(content.toString()).toBe("Hello World");
});
```

### Authenticated Requests

```typescript
import { createAuthHeaders } from "./test/test-helpers.ts";

test("should make authenticated request", async () => {
  const headers = createAuthHeaders(testEnv.users.user1);
  // Use headers in your requests
});
```

## Test Patterns

### Cleanup Between Tests

```typescript
describe("My Feature", () => {
  let testEnv: TestSetup;

  beforeAll(async () => {
    testEnv = await createTestSetup();
  });

  afterEach(async () => {
    // Clean up data between tests
    await testEnv.cleanup();
  });

  afterAll(async () => {
    await testEnv.close();
  });
});
```

### Testing with Multiple Users

```typescript
test("should handle multiple users", async () => {
  const user1Headers = createAuthHeaders(testEnv.users.user1);
  const user2Headers = createAuthHeaders(testEnv.users.user2);

  // Make requests as different users
});
```

## CI/CD

Tests run automatically on every PR and push to main/develop via GitHub Actions.

See `.github/workflows/ci.yml` for the full CI pipeline.

## Troubleshooting

### Tests Running Slowly

- Ensure you're using PGlite (in-memory) not real Postgres
- Check that S3 mock is using a random port
- Verify cleanup is running between tests

### Database Errors

- Make sure migrations are up to date
- Check that test.setup.ts creates all required tables
- Verify schema matches better-auth requirements

### S3 Errors

- Ensure s3rver is starting correctly
- Check that buckets are being created
- Verify MinIO client configuration

## Best Practices

1. **Fast Tests**: Use in-memory databases, not real services
2. **Isolated Tests**: Each test should be independent
3. **Cleanup**: Always clean up test data
4. **Descriptive Names**: Use clear test descriptions
5. **Arrange-Act-Assert**: Follow the AAA pattern
6. **Mock External APIs**: Don't call real external services

## Additional Resources

- [Bun Test Runner](https://bun.sh/docs/cli/test)
- [PGlite Documentation](https://github.com/electric-sql/pglite)
- [Better Auth Testing](https://www.better-auth.com/docs/testing)
