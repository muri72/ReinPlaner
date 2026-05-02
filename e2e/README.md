# E2E Testing for ReinPlaner

This directory contains end-to-end tests using Playwright to verify that all features work correctly.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   npx playwright install
   ```

2. **Configure environment:**
   ```bash
   cp .env.local.template .env.local
   # Edit .env.local with your Supabase credentials
   ```

3. **Seed test data:**
   ```bash
   npx tsx e2e/seed-test-data.ts
   ```

## Running Tests

### Quick Start (uses defaults)
```bash
./e2e/run-tests.sh
```

### With visible browser
```bash
./e2e/run-tests.sh --headed
```

### Open Playwright UI
```bash
./e2e/run-tests.sh --ui
```

### Skip seeding (if data already exists)
```bash
./e2e/run-tests.sh --skip-seed
```

### Run specific browser
```bash
./e2e/run-tests.sh --project=chromium
```

### Manual test run
```bash
npm run dev &
npx playwright test
```

## Test Files

| File | Description |
|------|-------------|
| `complete.spec.ts` | **Main test suite** - All major features |
| `login.spec.ts` | Authentication tests |
| `dashboard.spec.ts` | Dashboard navigation |
| `customers.spec.ts` | Customer management |
| `orders.spec.ts` | Order management |
| `invoices.spec.ts` | Invoice management |
| `planning.spec.ts` | Shift planning |
| `employee-form.spec.ts` | Employee form |

## Features Tested

### ✅ Authentication
- Login page displays correctly
- Invalid credentials show error
- Unauthenticated users redirect to login
- Authenticated sessions persist

### ✅ Dashboard
- Page loads without errors
- Sidebar navigation visible
- All main sections accessible

### ✅ Customers
- Customer list displays
- Search functionality works
- New customer form opens
- Customer details accessible

### ✅ Employees
- Employee list displays
- Add employee button exists
- Employee form has required fields
- Form validation works

### ✅ Orders
- Order list displays with status
- Filter by status works
- Create new order form opens
- Required field validation

### ✅ Invoices
- Invoice list displays
- Search functionality works
- Filter by status works
- Invoice details accessible
- New invoice form works

### ✅ Planning
- Calendar view displays
- Week navigation works
- Employee shifts visible

### ✅ Objects
- Objects list displays
- Address information shown
- Object details accessible

### ✅ Time Tracking
- Time tracking page loads
- Time entries list displays
- Create time entry option exists

### ✅ Finances
- Financial overview loads
- Summary data displays

### ✅ Performance
- All pages load within 5 seconds
- No console errors
- Network errors handled gracefully

### ✅ Mobile Responsive
- Mobile viewport works
- Navigation accessible on mobile

## Test Data

The seed script creates:
- 1 Test Tenant (reinplaner)
- 3 Test Users (admin, manager, employee)
- 2 Test Customers
- 3 Cleaning Objects
- 2 Test Orders
- 2 Test Invoices

## Test Credentials

```
Admin: admin@reinplaner.de / TestPassword123!
Manager: manager@reinplaner.de / TestPassword123!
Employee: employee@reinplaner.de / TestPassword123!
```

## CI/CD

In CI environments, tests run with:
- 2 retries
- Screenshots on failure
- Trace on first retry

```bash
CI=true npx playwright test
```

## Debugging

To debug failed tests:

1. Run with headed mode:
   ```bash
   ./e2e/run-tests.sh --headed
   ```

2. Open Playwright UI:
   ```bash
   ./e2e/run-tests.sh --ui
   ```

3. Check test traces:
   ```bash
   npx playwright show-trace test-results/
   ```

## Known Issues

- Some tests may fail if Supabase is not accessible
- Tests require seeded data to be meaningful
- Mobile tests need proper viewport configuration