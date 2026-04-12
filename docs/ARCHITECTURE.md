# ReinPlaner – Architecture

> **Last updated:** 2026-04-12

---

## 1. Overview

ReinPlaner is a Next.js 15 full-stack application for cleaning-company management. It provides order scheduling, employee shift planning, time tracking, customer management, and financial reporting — all backed by Supabase (PostgreSQL + Auth + Row Level Security).

### Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15.3 (App Router) |
| UI | React 19 + TypeScript 5 |
| Styling | Tailwind CSS + shadcn/ui + Radix UI |
| Backend | Supabase (PostgreSQL, Auth, Storage) |
| Server State | TanStack Query v5 |
| Monitoring | Sentry (edge + server error tracking) |
| Package Manager | pnpm |

---

## 2. Directory Structure

```
ReinPlaner/
├── src/
│   ├── app/                          # Next.js App Router pages
│   │   ├── (auth)/                  # Auth group: login
│   │   ├── dashboard/               # Main authenticated area
│   │   │   ├── orders/              # Order CRUD pages
│   │   │   ├── employees/           # Employee pages
│   │   │   ├── customers/           # Customer pages
│   │   │   ├── objects/             # Object/location pages
│   │   │   ├── planning/            # Shift planning calendar
│   │   │   ├── time-tracking/       # Time entry pages
│   │   │   ├── finances/           # Financial reports
│   │   │   ├── actions.ts          # Dashboard-level server actions
│   │   │   └── layout.tsx          # Dashboard shell (sidebar, nav)
│   │   ├── employee/                # Employee self-service portal
│   │   ├── portal/                  # Customer portal
│   │   └── api/                    # API routes (admin sync, cron, etc.)
│   │
│   ├── components/                  # Shared UI components
│   │   ├── ui/                     # shadcn/ui base components
│   │   │   ├── form.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── select.tsx
│   │   │   └── ...
│   │   │   └── hooks/              # UI-level hooks (use-before-unload)
│   │   │
│   │   ├── order-form/             # Order form (refactored 2026-04-12)
│   │   │   ├── index.ts
│   │   │   ├── order-basic-info-section.tsx
│   │   │   ├── order-schedule-section.tsx
│   │   │   ├── order-assignments-section.tsx
│   │   │   └── order-financials-section.tsx
│   │   │
│   │   ├── shifts/                 # Shift dialog components (refactored)
│   │   ├── schedule/               # Shared schedule components
│   │   ├── time-tracking/          # Time tracking components
│   │   └── [entity]-dialog.tsx     # Create/Edit dialogs per entity
│   │   └── [entity]-form.tsx       # Form components per entity
│   │
│   ├── hooks/                      # Custom React hooks
│   │   ├── use-orders.ts           # Order data fetching
│   │   ├── use-planning-data.ts    # Shift planning data
│   │   ├── use-time-tracker.ts     # Active time tracking
│   │   ├── use-form-data.ts        # Generic form data handling
│   │   └── use-mobile-optimizations.ts
│   │
│   ├── lib/                        # Core libraries
│   │   ├── actions/                # Server Actions
│   │   │   ├── shift-planning.ts   # Shift planning CRUD (PRIMARY)
│   │   │   ├── finances.ts         # Financial calculations
│   │   │   ├── impersonation.ts    # Admin impersonation
│   │   │   └── notifications.ts    # Push notifications
│   │   │
│   │   ├── supabase/               # Supabase clients
│   │   │   ├── client.ts           # Browser client (@supabase/ssr)
│   │   │   ├── server.ts           # Server component client
│   │   │   └── middleware.ts        # Auth middleware
│   │   │
│   │   ├── services/               # Business logic services
│   │   │   ├── document-service.ts
│   │   │   ├── pdf-service.ts
│   │   │   ├── settings-service.ts
│   │   │   └── settings-cache.ts
│   │   │
│   │   ├── utils/                  # Utility functions
│   │   │   ├── date-utils.ts
│   │   │   ├── employee-utils.ts
│   │   │   ├── form-utils.ts
│   │   │   └── time-tracking-utils.ts
│   │   │
│   │   ├── audit-log.ts
│   │   ├── absence-type-config.ts
│   │   ├── time-account-config.ts
│   │   └── performance-cache.ts
│   │
│   └── middleware.ts               # Next.js middleware (auth, impersonation)
│
├── public/                         # Static assets
├── supabase/                      # SQL migrations & seed data
├── instrumentation.ts             # Sentry instrumentation
└── next.config.ts                 # Next.js config
```

---

## 3. Component Architecture

### 3.1 Order Form (Refactored)

The `order-form.tsx` monolithic component was split into focused sub-components (2026-04-12):

```
components/order-form/
├── index.ts                              # Re-exports all sections
├── order-basic-info-section.tsx          # Customer, object, service, priority
├── order-schedule-section.tsx            # Multi-week schedule editor
├── order-assignments-section.tsx         # Employee assignments with schedules
└── order-financials-section.tsx         # Hourly rates, fixed prices, margins
```

**Design principles applied:**
- **Single Responsibility:** Each section handles one domain (info, schedule, assignment, finances)
- **Composability:** Parent `order-form.tsx` composes sections; no cross-section state leakage
- **Shared types:** `WeekScheduleInput`, `DayName`, `DailyScheduleInput` in `lib/` utils
- **Shared hooks:** `useScheduleCalculations` for hour computations (to be extracted)

### 3.2 Shift Dialog Components

`create-shift-dialog.tsx` and `shift-edit-dialog.tsx` are split into:

```
components/shifts/
├── create-shift-dialog.tsx        # Dialog shell + routing (single/recurring)
├── single-shift-form.tsx         # One-time shift form
├── recurring-shift-form.tsx      # Recurring shift form
├── shift-edit-dialog.tsx         # Edit shell + header
├── shift-edit-actions.tsx         # Edit / Copy / Delete action routing
├── shift-edit-form.tsx            # Time/hours editing
├── shift-copy-form.tsx            # Copy to another employee/date
├── shift-delete-form.tsx          # Delete with single/future/all mode
├── shift-status-selector.tsx      # Status badge + button group
└── shift-employee-select.tsx     # Employee combobox with experience filter
```

### 3.3 Shared Schedule Components

```
components/schedule/
├── schedule-grid.tsx              # Reusable day/hour grid (single + multi-week)
├── employee-schedule-card.tsx     # Per-employee schedule block with interval/offset
```

Shared UI primitives extracted from duplicated code:

```
components/ui/
├── label-required.tsx             # Label with required asterisk
├── time-range-inputs.tsx          # Start/end time + travel/break + auto-duration
├── hours-calculator.tsx          # Total hours display with rate/markup
├── entity-search-select.tsx       # Generic searchable combobox (object/order/employee)
└── [existing shadcn components]
```

---

## 4. Data Flow

### 4.1 Server Actions (Primary Data Mutations)

Server Actions in `src/lib/actions/` are the **primary mutation layer**. All form submissions, dialog confirmations, and planning changes go through these.

```
User Action (component)
    │
    ▼
Server Action (src/lib/actions/*.ts)
    │  - Runs on server with admin/client Supabase access
    │  - Performs DB writes via Supabase Admin client
    │  - Calls revalidatePath() to invalidate Next.js cache
    │  - Optionally sends notifications via sendNotification()
    ▼
Supabase (PostgreSQL + RLS)
    │
    ▼
Cache Invalidation (revalidatePath)
    │
    ▼
TanStack Query Cache Update → React re-render
```

### 4.2 Key Data Fetching Patterns

| Pattern | When to use |
|---------|-------------|
| **Server Actions + TanStack Query** | CRUD operations (orders, employees, shifts). Server action performs DB op, returns result, TanStack Query cache is invalidated via `revalidatePath`. |
| **Direct Supabase Query (hooks)** | Real-time dashboards (planning calendar, today's orders). `useQuery` with `refetchInterval` for polling. |
| **RSC `fetch` with cache** | Static reference data (services list, object list). Long `next: { revalidate: 3600 }`. |

### 4.3 TanStack Query Configuration

Query keys follow a consistent naming pattern:

```typescript
// Base keys
queryClient.getQueryKey(['orders', { page, limit, status }])
queryClient.getQueryKey(['planning', { startDate, endDate, filters }])
queryClient.getQueryKey(['employees', { search }])
queryClient.getQueryKey(['shifts', shiftId])
```

Default stale times:
- **Planning data:** 30 seconds (frequently changing)
- **Lists:** 1 minute
- **Reference data (services, objects):** 1 hour

---

## 5. State Management

### 5.1 Server State (TanStack Query)

All data that lives in Supabase is server state managed by TanStack Query v5. This includes:
- Orders, customers, employees, objects
- Shift planning data
- Time entries
- Absence requests
- Financial records

### 5.2 Client State (React `useState` / `useReducer`)

Client-only state (UI state not persisted to DB):
- Dialog open/close state
- Form input values (before submission)
- Calendar view mode (day/week/month)
- Sidebar collapsed state
- Mobile navigation state

### 5.3 Impersonation State (Context)

Admin impersonation is managed via `ImpersonationContext`:

```
ImpersonationContext
  ├── originalUser: User | null
  ├── impersonatedUser: User | null
  ├── isImpersonating: boolean
  └── startImpersonation(userId) / stopImpersonation()
```

Middleware sets `x-impersonated-user` header when active.

---

## 6. Authentication & Authorization

### 6.1 Auth Flow

1. User visits app → `middleware.ts` checks for Supabase session cookie
2. No session → redirect to `/login`
3. Session exists → `createClient()` uses cookie-based session
4. Logout → `supabase.auth.signOut()` clears cookie, redirects to `/login`

### 6.2 Row Level Security (RLS)

All Supabase tables have RLS enabled. Key policies:
- Users can only read/write their own data (via `auth.uid()`)
- Admins can read/write all data (via service role check in policies)
- Employees can read orders assigned to them
- Customers can read their own orders

### 6.3 Role Hierarchy

```
Admin           → Full access to all data + impersonation
Manager         → All data except user management + impersonation
Employee        → Own profile, assigned orders, own time entries
Customer Portal → Own orders only
```

---

## 7. Key Database Tables

| Table | Purpose |
|-------|---------|
| `orders` | Cleaning orders (title, status, priority, object, service) |
| `customers` | Customer companies |
| `objects` | Cleaning locations per customer |
| `employees` | Staff records with schedules |
| `order_employee_assignments` | Employee-order assignments with schedule definitions |
| `shifts` | Generated shift instances from assignments |
| `shift_employees` | Many-to-many: shift ↔ employee assignments |
| `shift_overrides` | Per-date exceptions (deleted, time-changed) |
| `time_entries` | Actual tracked time against shifts |
| `absence_requests` | Vacation/sick leave requests |
| `services` | Service catalog (Büro, Unterhaltsreinigung, etc.) |
| `profiles` | User profiles (avatar, display name) |

---

## 8. Performance Architecture

### 8.1 Bundle Optimization

- **Dynamic imports** for heavy dialogs (shift-edit, order-create)
- **Tree-shaking** of unused shadcn/ui components via `components.json`
- **Bundle splitting** per route via Next.js automatic code splitting

### 8.2 Database Query Optimization

- **Parallel queries** in `getShiftPlanningData` (5 queries in `Promise.all`)
- **O(1) lookup maps** instead of O(n) nested loops for shift processing
- **Selective field fetching** (`select` with explicit column lists)
- **RLS at database level** reduces application-layer authorization queries

### 8.3 Caching Strategy

| Resource | Cache Duration |
|----------|---------------|
| Static assets | 1 year (`Cache-Control: public, max-age=31536000, immutable`) |
| Reference data (services, objects) | 1 hour |
| Dashboard lists | 1 minute |
| Planning data | 30 seconds (via `revalidatePath`) |
| User session | Session cookie |

---

## 9. Error Handling

```
Error Boundary (src/components/error-boundary.tsx)
    │
    ├── UI Layer errors → Caught, show fallback UI, log to Sentry
    │
    ▼
Sentry (instrumentation.ts + instrumentation-client.ts)
    │
    ├── Server errors → @sentry/nextjs (edge + server)
    ├── Client errors → @sentry/browser
    └── Performance → Automatic tracing
```

---

## 10. Refactoring Notes (2026-04-12)

### What changed

The following monolithic components were refactored into focused sub-components:

| File | Before | After |
|------|--------|-------|
| `order-form.tsx` | 1,599 lines | Split into 4 sections in `components/order-form/` |
| `create-shift-dialog.tsx` | 1,227 lines | Split into `shifts/` sub-components |
| `shift-edit-dialog.tsx` | 1,030 lines | Split into `shifts/` sub-components |
| `employee-form.tsx` | 788 lines | Schedule editor extracted to `schedule-grid.tsx` |

### Shared extractions

New reusable components created:
- `components/ui/label-required.tsx`
- `components/ui/time-range-inputs.tsx`
- `components/ui/entity-search-select.tsx`
- `components/ui/hours-calculator.tsx`
- `components/schedule/schedule-grid.tsx`
- `components/schedule/employee-schedule-card.tsx`

New hooks to be extracted:
- `hooks/use-schedule-calculations.ts`
- `hooks/use-employee-schedule-assignment.ts`

### Migration path

- All new components follow the **single-responsibility principle**
- Shared types (`WeekScheduleInput`, `DayName`, `DailyScheduleInput`) live in `lib/utils/`
- Server actions in `lib/actions/` are unchanged; they are the stable API contract
- Components can be independently tested and replaced without changing the action layer
