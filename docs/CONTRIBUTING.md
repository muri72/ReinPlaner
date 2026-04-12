# Contributing to ARIS Management Platform

> **Last updated:** 2026-04-12

---

## Development Setup

### Prerequisites

- **Node.js** 18+ (check with `node --version`)
- **pnpm** 8+ (`npm install -g pnpm`)
- **Supabase CLI** (optional, for local DB) — `npm install -g supabase`
- **Git**

### Initial Setup

```bash
# 1. Clone the repository
git clone <your-fork-url>
cd aris-dashboard

# 2. Install dependencies
pnpm install

# 3. Copy environment template
cp .env.local.template .env.local

# 4. Fill in .env.local with your Supabase credentials
#    (get them from your Supabase project dashboard → Settings → API)
#
# Required:
#   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
#   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
#
# Optional (for error tracking):
#   NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
#   SENTRY_DSN=your-sentry-dsn

# 5. Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The app connects to your Supabase project.

---

## Branching Strategy

```
main                  ← production-ready, always deployable
dev                   ← integration branch for completed features
  ├── feat/...         ← feature branches
  ├── fix/...          ← bug fix branches
  ├── refactor/...     ← refactoring branches
  ├── docs/...         ← documentation branches
  └── chore/...        ← tooling/dependency updates
```

### Branch Naming

| Type | Example |
|------|---------|
| Feature | `feat/order-schedule-editor` |
| Bug fix | `fix/shift-conflict-detection` |
| Refactor | `refactor/order-form-sections` |
| Docs | `docs/api-reference-update` |
| Chore | `chore/upgrade-tanstack-query-v5` |

**Rules:**
- Branch off `dev` for all work
- PRs target `dev` (not `main`)
- `main` is only updated via release PRs from `dev`
- Delete your branch after merge

---

## Working on a Feature

```bash
# 1. Make sure dev is up to date
git checkout dev
git pull origin dev

# 2. Create your feature branch
git checkout -b feat/my-new-feature

# 3. Make your changes
#    - Write code following the style guide below
#    - Add/update tests as needed
#    - Run linting and type checks

# 4. Commit (see commit message format below)
git add .
git commit -m "feat: add new feature"

# 5. Push to your fork
git push origin feat/my-new-feature

# 6. Open a Pull Request against dev
#    Use the PR template (see below)
```

---

## Commit Message Format

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type | When to use |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `docs` | Documentation only |
| `style` | Formatting, missing semicolons, etc. (no logic change) |
| `test` | Adding or updating tests |
| `chore` | Build process, tooling, dependency updates |
| `perf` | Performance improvement |

### Examples

```
feat(planning): add drag-and-drop shift reassignment

fix(orders): prevent duplicate employee assignment on same shift

refactor(order-form): split into sections per domain

docs(api): add shift-planning actions to API reference

chore: upgrade TanStack Query to v5.3
```

---

## Pull Request Process

### PR Template

```markdown
## Summary
<!-- What does this PR do? -->

## Type of Change
- [ ] Feature
- [ ] Bug fix
- [ ] Refactoring
- [ ] Documentation
- [ ] Chore

## Testing
<!-- How was this tested? -->

## Checklist
- [ ] Code follows project style guide
- [ ] TypeScript compiles without errors (`pnpm type-check`)
- [ ] ESLint passes (`pnpm lint`)
- [ ] New components have been placed in `src/components/`
- [ ] New Server Actions have been documented in `docs/API_REFERENCE.md`
```

### Review Process

1. **Self-review first** — run `pnpm lint` and `pnpm type-check` before requesting review
2. **Small PRs preferred** — split large changes into logical smaller PRs
3. **One concern per commit** — don't mix refactoring with feature work
4. **At least one approval** required before merge to `dev`
5. **All checks must pass** (lint, type-check, CI)

### What makes a good PR?

- **Focused:** One feature or fix per PR
- **Tested:** Includes relevant test updates
- **Documented:** Updates docs if behavior changed
- **Atomic commits:** Each commit does one thing
- **Clear description:** Reviewers should understand the "why" and "what" without asking

---

## Code Style Guide

### TypeScript

- **Always use explicit types** for function parameters and return values
- **Prefer `interface`** over `type` for object shapes
- **Never use `any`** — use `unknown` and narrow it
- **Export types from the same file** as the functions that use them (or from `types/` for cross-module use)

```typescript
// ✅ Good
export async function getShiftPlanningData(
  startDate: Date,
  endDate: Date,
  filters: { query?: string }
): Promise<{ success: boolean; data: ShiftPlanningData | null; message: string }>

// ❌ Bad
export async function getShiftPlanningData(startDate, endDate, filters) {
  // ...
}
```

### Server Actions

- Server Actions live in `src/lib/actions/` (shared) or `src/app/dashboard/*/actions.ts` (page-specific)
- Always return `{ success: boolean; message: string; ... }`
- Always call `revalidatePath()` after successful mutations
- Use `createAdminClient()` for write operations, `createClient()` for reads within the action
- Always handle errors and return a descriptive message

```typescript
"use server";

export async function myAction(data: MyData): Promise<{ success: boolean; message: string }> {
  const supabase = await createClient();
  
  try {
    // ... do work
    revalidatePath("/dashboard/my-page");
    return { success: true, message: "Operation successful." };
  } catch (error: any) {
    console.error("[MY_ACTION] Error:", error);
    return { success: false, message: `Fehler: ${error.message}` };
  }
}
```

### Components

- **One component per file** — file name matches component name
- **Small components preferred** — if a component is > 400 lines, consider splitting it
- **Colocate related sub-components** in a folder with an `index.ts` re-export:

```
src/components/order-form/
├── index.ts                              # Re-exports
├── order-basic-info-section.tsx          # Section component
├── order-schedule-section.tsx             # Section component
└── ...
```

- **Always import from `ui/` components** (`components/ui/`), not directly from Radix
- **Use `cn()` (clsx + tailwind-merge)** for composing classNames

### Hooks

- Custom hooks live in `src/hooks/`
- Name files descriptively: `use-shift-planning.ts`, not `use-hooks.ts`
- Keep hooks focused — one concern per hook

### Database / Supabase

- **Always use explicit column lists** in `select()` — never `select("*")` in production queries
- **Always handle errors** from Supabase calls
- **Use `Promise.all()`** for parallel independent queries
- **Use Maps/Sets** for O(1) lookups instead of nested `find()` loops
- **RLS policies must be configured** for every new table

---

## Testing

### Running Tests

```bash
pnpm type-check   # TypeScript compiler check
pnpm lint         # ESLint
pnpm test         # Jest (unit tests)
pnpm test:e2e     # Playwright (end-to-end)
```

### What to Test

| Type | Location | Minimum Coverage Target |
|------|----------|------------------------|
| Utility functions | `src/lib/**/*.test.ts` | 80% |
| Server Actions | Inline or `__tests__/` | Core paths |
| UI components | Manual review | Visual regression |

### Writing Server Action Tests

Test the success path and all error paths:

```typescript
import { describe, it, expect, vi } from "vitest";
import { deleteShift } from "@/lib/actions/shift-planning";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}));

describe("deleteShift", () => {
  it("returns error when user is not authenticated", async () => {
    // Mock unauthenticated supabase client
    const result = await deleteShift("shift-123", "2026-01-01");
    expect(result.success).toBe(false);
    expect(result.message).toContain("authentifiziert");
  });
});
```

---

## Directory Conventions

```
src/
├── app/                    # Route pages & layouts
│   ├── dashboard/         # Authenticated area
│   │   └── [entity]/       # Entity pages (orders/, employees/, etc.)
│   └── api/               # API routes (cron, admin sync)
│
├── components/             # Shared UI components
│   ├── ui/                # shadcn/ui base components
│   ├── order-form/        # Order form (composed of sections)
│   └── [entity]-dialog.tsx # Create/Edit dialogs
│
├── hooks/                 # Custom React hooks
│   └── use-*.ts            # One hook per file
│
└── lib/                   # Core libraries
    ├── actions/           # Server Actions (PRIMARY)
    │   └── *.ts
    ├── supabase/          # Supabase client setup
    ├── services/          # Business logic services
    └── utils/             # Pure utility functions
```

**Rules:**
- Server Actions → `src/lib/actions/` (preferred) or `src/app/dashboard/*/actions.ts`
- UI components → `src/components/`
- Utilities (pure functions) → `src/lib/utils/`
- Types → co-located with the code that uses them, or `src/types/`

---

## Refactoring Guidelines (2026-04-12)

The codebase is in an active refactoring phase. Key principles:

### Component Refactoring

- **Monolithic components** (> 500 lines) should be split into focused sub-components
- **Shared UI patterns** (time range inputs, schedule grids, searchable selects) should be extracted to `src/components/ui/` or `src/components/schedule/`
- **Shared types** (`WeekScheduleInput`, `DayName`, `DailyScheduleInput`) should live in `src/lib/utils/`, not in component files

### When Splitting a Component

1. Identify **natural boundaries** (form sections, dialog sub-panels, separate concerns)
2. Move each section to its own file in a new sub-folder
3. Create an `index.ts` that re-exports all sections
4. Update the parent to compose the sections
5. Update `ARCHITECTURE.md` to reflect the new structure

### Stable vs. Changing Code

- **Server Actions** (`src/lib/actions/`) are the **stable API contract** — don't change signatures without coordination
- **Components** can be freely refactored as long as they continue to call the same actions
- **Shared hooks/types** in `src/lib/utils/` are stable — changes require updating all consumers

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anonymous (public) key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role key (server-only) |
| `RESEND_API_KEY` | ✅ | For email sending |
| `NEXT_PUBLIC_SENTRY_DSN` | ❌ | Client-side Sentry |
| `SENTRY_DSN` | ❌ | Server-side Sentry |

**Never commit `.env.local`** — it is in `.gitignore`. Use `.env.local.template` as a guide.

---

## Getting Help

- **Internal docs:** `docs/ARCHITECTURE.md`, `docs/API_REFERENCE.md`
- **Refactoring plan:** `REFACTORING_PLAN.md`
- **Legacy docs:** `docs/` folder (in progress)
- **Tech stack:** Next.js 15, Supabase, TanStack Query v5, TypeScript 5, Tailwind CSS, shadcn/ui

For questions, ask in the project channel or open an issue.
