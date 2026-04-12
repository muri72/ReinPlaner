# E2E Tests with Playwright

## Setup

```bash
# Install dependencies
pnpm install

# Install Playwright browsers
pnpm exec playwright install
```

## Running Tests

```bash
# Run all tests in headless mode
pnpm test:e2e

# Run with UI (headed mode)
pnpm test:e2e:ui

# Run specific test file
pnpm exec playwright test e2e/login.spec.ts

# Run with debug mode
pnpm test:e2e:debug
```

## Test Structure

```
e2e/
├── login.spec.ts         # Login page tests
├── dashboard.spec.ts      # Dashboard navigation tests
├── employee-form.spec.ts  # Employee CRUD tests
├── orders.spec.ts         # Order management tests
├── planning.spec.ts       # Planning/shift management tests
└── README.md              # This file
```

## Writing New Tests

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('should do something', async ({ page }) => {
    await page.goto('/path/to/page');
    // ...
  });
});
```

## CI/CD Integration

Tests run automatically on Vercel Preview deployments. Add to your CI workflow:

```yaml
- name: Run E2E Tests
  run: pnpm test:e2e
  env:
    BASE_URL: ${{ env.DEPLOYMENT_URL }}
```

## Authentication in Tests

For authenticated tests, use one of:

1. **API Key Auth** - Set `SUPABASE_SERVICE_ROLE_KEY` and use service client
2. **Cookie Auth** - Pre-authenticate and set cookies
3. **Test Users** - Create test users in Supabase before running tests

## Debugging

```bash
# Show trace viewer
pnpm exec playwright show-trace trace.zip

# Run with screenshot on failure
pnpm exec playwright test --screenshots

# Update snapshots
pnpm exec playwright test --update-snapshots
```
