# ReinPlaner — Free Tier Limits: Vercel Hobby + Supabase Free

**Status:** Research Complete  
**Date:** May 2026  
**Stack:** Next.js (Vercel Hobby) + Supabase (Postgres + Auth + Realtime)

---

## 1. Vercel Hobby Limits

### 1.1 Cron Jobs — THE CRITICAL CONSTRAINT

| Limit Type | Hobby Value |
|---|---|
| Max cron jobs per project | 100 |
| Minimum interval | **Once per day** (hard limit) |
| Timing precision | Hourly ±59 min window |
| Cron expressions like `*/30 * * * *` or `0 * * * *` | **Fail at deploy time** with error |

**Key facts:**
- Hobby cron jobs are **strictly 1× per day maximum**. This is enforced at deployment, not at runtime.
- You can define 100 different cron entries in `vercel.json`, but only ONE will fire per day.
- Timing is imprecise: a cron at `0 1 * * *` fires somewhere between 1:00–1:59 AM.

**For ReinPlaner:** You have 3 jobs (dunning, recurring-invoices, mark-overdue-shifts). Vercel Hobby's daily-only limit means you MUST combine them.

### 1.2 Serverless Functions

| Resource | Hobby Limit |
|---|---|
| Function timeout (default) | 10 seconds |
| Function timeout (max, via config) | **60 seconds** (increased March 2024) |
| Function invocations | 1,000,000/month |
| Function duration (total) | 100 GB-Hours/month |
| Active CPU | 4 CPU-Hours/month |
| Provisioned Memory | 360 GB-Hours/month |

**Practical implication:** 60 seconds is enough for all three ReinPlaner cron jobs combined — as long as each job finishes within that window.

### 1.3 Bandwidth & Build

| Resource | Hobby Limit |
|---|---|
| Bandwidth (Fast Data Transfer) | **100 GB/month** |
| Build Execution Minutes | 6,000 minutes/month |
| Build vCPUs / Memory | 4 vCPU, 8 GB |
| Build Disk Size | 23 GB |
| Deployments per Day | 100 |
| Projects | 200 |
| Edge Config Reads | 100,000/month |
| ISR Reads | 1,000,000/month |
| ISR Writes | 200,000/month |
| Edge Requests | 1,000,000/month |

**Note on bandwidth:** Vercel's fair use policy mentions 100GB/month on Hobby. Sources suggest overage behavior is "best effort" rather than hard cut-off for hobby users, but reliability degrades.

---

## 2. Supabase Free Tier Limits

### 2.1 Database

| Resource | Free Limit |
|---|---|
| Database Storage | **500 MB** (raw Postgres data, indexes, tables) |
| RAM (shared compute) | 500 MB |
| Direct DB connections | 60 max |
| Pooler connections | 200 max |
| Backups | **None** (no automatic backups) |
| pg_cron | Available (no specific limits, just resource-based) |

### 2.2 Auth

| Resource | Free Limit |
|---|---|
| Monthly Active Users (MAU) | **50,000** |
| Stored users | Unlimited |
| Social OAuth | ✓ Included |
| Anonymous sign-ins | ✓ Included |
| Custom SMTP | ✓ Included |
| MFA | ✓ Basic |
| SAML/SSO | ✗ Not included |
| Leaked password protection | ✗ Not included |

**MAU counting:** Only authenticated sessions in the current calendar month count toward the 50K limit. 200K registered users with 30K monthly logins = within free tier.

### 2.3 Bandwidth / Egress

| Resource | Free Limit |
|---|---|
| Total egress (combined) | **5 GB/month** |
| Database egress (subset) | ~2 GB/month (often cited as tighter limit in older docs) |
| API Rate Limits | Not explicitly rate-limited; no per-minute cap documented |

**Note:** 5 GB/month is shared between database egress, storage egress, and realtime traffic. For a ReinPlaner with typical cleaning company usage (~50 shifts/month per tenant), this is likely sufficient early on, but will be a pressure point with many active tenants.

### 2.4 Realtime

| Resource | Free Limit |
|---|---|
| Peak concurrent connections | **200** |
| Messages per month | 2,000,000 |
| Max message size | 256 KB |

### 2.5 Edge Functions

| Resource | Free Limit |
|---|---|
| Invocations | 500,000/month |
| Max duration per invocation | Not explicitly documented; uses standard Edge Function limits |

### 2.6 Project Pausing — THE SILENT KILLER

> **Free projects pause after 7 days of database inactivity.**  
> "Inactivity" = zero database connections. Dashboard visits do NOT count. Cold start on resume ≈ 30 seconds.

This is a production risk. Mitigation: set up a keep-alive ping (GitHub Actions, cron-job.org, or Supabase Edge Function) that hits the database every 2–3 days.

---

## 3. Cron Job Workarounds for ReinPlaner

### 3.1 Vercel Hobby — Combine All 3 Jobs Into 1 Daily Cron

**Problem:** Vercel Hobby allows only 1 cron execution per day, but ReinPlaner needs:
- `dunning` — daily (overdue invoice reminders)
- `mark-overdue-shifts` — daily (close shifts past due date)
- `recurring-invoices` — monthly (generate recurring invoice drafts)

**Solution: Single Combined Cron Handler**

Create one API route `/api/cron/daily-tasks` and configure ONE Vercel cron entry:

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/daily-tasks",
      "schedule": "0 2 * * *"
    }
  ]
}
```

Inside the handler, use date logic to determine which jobs run:

```typescript
// app/api/cron/daily-tasks/route.ts

export async function GET() {
  const now = new Date();
  const dayOfMonth = now.getDate();
  const dayOfWeek = now.getDay();

  const results: string[] = [];

  // Dunning — runs every day
  const dunningResult = await processDunning();
  results.push(`dunning: ${dunningResult}`);

  // Mark overdue shifts — runs every day
  const overdueResult = await markOverdueShifts();
  results.push(`overdue-shifts: ${overdueResult}`);

  // Recurring invoices — runs on the 1st of every month (or any configured day)
  // Check if today is the configured day (default: day 1)
  const recurringInvoiceDay = 1; // Configure as needed
  if (dayOfMonth === recurringInvoiceDay) {
    const recurringResult = await generateRecurringInvoices();
    results.push(`recurring-invoices: ${recurringResult}`);
  }

  return Response.json({
    timestamp: now.toISOString(),
    executed: results
  });
}
```

**Timing precision:** `0 2 * * *` means "sometime between 2:00–2:59 AM." The monthly job fires on the 1st, daily jobs fire every day. Acceptable for ReinPlaner's use cases (dunning, shift closing, invoice generation are all tolerant of ±1 hour).

### 3.2 Supabase pg_cron as Alternative / Supplement

pg_cron **is available on Supabase Free tier** with no specific run-count limits. However:

| Concern | Detail |
|---|---|
| Precision | Minutes at best; 1-minute minimum intervals |
| pg_cron keeps a job log table | Grows huge over time; requires periodic cleanup (`VACUUM cron.job`) |
| No HTTP webhook built-in | Must use `SELECT` to call a database function directly |
| Free tier reliability | Reports of inconsistent execution on free shared tier |

**pg_cron vs Vercel cron for this stack:** Vercel cron is preferred because it invokes an HTTP endpoint (Next.js API route), keeping logic in your application code rather than raw SQL. pg_cron can be a fallback for database-internal tasks (e.g., auto-deleting old sessions).

### 3.3 External Cron Services (Free Tier)

| Service | Free Tier | Min Interval | ReinPlaner Use Case |
|---|---|---|---|
| **cron-job.org** | Free | 1 minute | Alternative to Vercel cron |
| **GitHub Actions** | Free (2000 min/month) | 1 minute | Call Vercel API endpoint via `curl` |
| **FastCron** | Free | 5 minutes (free) | Alternative; paid for 1-min |

**GitHub Actions approach:**

```yaml
# .github/workflows/daily-cron.yml
name: Daily Cron Tasks
on:
  schedule:
    - cron: '0 2 * * *'  # 2 AM UTC daily
  workflow_dispatch:       # Manual trigger also available
jobs:
  trigger-vercel:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger ReinPlaner cron
        run: curl -X GET https://your-app.vercel.app/api/cron/daily-tasks
```

**Note on timing:** GitHub Actions cron also has ±5 minute jitter. Still acceptable for ReinPlaner's background tasks.

### 3.4 Summary: Recommended Cron Architecture

| Job | Frequency Needed | Runs On | Trigger |
|---|---|---|---|
| `processDunning()` | Daily | Vercel cron (daily) or GitHub Actions | Combined in `/api/cron/daily-tasks` |
| `markOverdueShifts()` | Daily | Same as above | Same handler |
| `generateRecurringInvoices()` | Monthly | Same as above | Day-of-month check inside handler |

**No external cron service is strictly required** if Vercel Hobby's 1× daily limit is acceptable. The combined approach handles all 3 jobs within that constraint.

---

## 4. Realistic Assessment: When Does Free Stack Break?

### 4.1 Per-Tenant Resource Estimates

Assuming a typical cleaning company tenant with ~50 shifts/month, 10 invoices/month, minimal files:

| Resource | Per Tenant Estimate |
|---|---|
| Database storage | 5–20 MB (shifts, invoices, customers, RLS policies add overhead) |
| Bandwidth (DB egress) | 20–100 MB/month (API calls, realtime, auth) |
| Auth MAU | 2–5 users per tenant company |
| Storage (files) | 0–50 MB (receipts, photos) |

### 4.2 Break-Even Points

| Limit | Free Tier | Break-Even Tenant Count |
|---|---|---|
| **Database (500 MB)** | 500 MB ÷ ~15 MB/tenant | **~30–35 tenants** (if each uses ~15 MB) |
| **Bandwidth (5 GB)** | 5 GB ÷ ~50 MB/month/tenant | **~100 tenants** |
| **Auth MAU (50,000)** | 50,000 ÷ ~5 MAU/tenant | **~10,000 tenants** (not the bottleneck early) |
| **Realtime (200 concurrent)** | 200 connections; typically 1–2 per active user | **~100–200 concurrent users** |
| **Project Pausing** | 7-day inactivity = pause | **Any single-tenant app with < 7-day usage gaps** |

**Primary bottleneck: Database storage at ~30–35 tenants.**  
Secondary bottleneck: Project pausing if usage is intermittent.

### 4.3 Cron Job Load

With the combined daily cron approach, Vercel Hobby's 1× daily limit is **not a bottleneck for ReinPlaner's current needs**. The 60-second function timeout is more than enough for all 3 jobs combined. If the combined job ever approaches 60 seconds, consider splitting into two separate Vercel cron entries (if timing permits) or optimizing the queries.

### 4.4 Scaling Triggers — When to Upgrade

| Trigger | Upgrade Path |
|---|---|
| Database storage > 400 MB (80% of 500 MB) | Supabase Pro ($25/month) or migrate to managed Postgres |
| Bandwidth consistently > 4 GB/month | Supabase Pro or add Cloudflare CDN |
| Project pauses due to inactivity | Automated keep-alive ping (free) or Supabase Pro |
| Need cron jobs more than 1× daily | Vercel Pro ($20/user/month) |
| Need precise cron timing (±minutes) | Vercel Pro or external service (cron-job.org) |
| > 10,000 registered users with > 50K MAU | Supabase Pro |

---

## 5. Maximale Ausnutzung: Free Stack Overview

### 5.1 What You Can Run on Free Tier

| Capability | Free Limit | ReinPlaner Use |
|---|---|---|
| Next.js app hosting | 100 GB bandwidth, 6K build min | ✓ Full app |
| Serverless functions | 1M invocations, 60s timeout | ✓ API routes + cron handler |
| Cron jobs | 100 defined, 1× daily | ✓ Combined daily handler |
| PostgreSQL database | 500 MB | ✓ With RLS + multi-tenancy |
| Auth | 50K MAU | ✓ Cleaning company staff + clients |
| Realtime subscriptions | 200 concurrent | ✓ Live shift updates |
| Edge Functions | 500K/month | ✓ Webhooks, helpers |
| File storage | 1 GB | ✓ Receipts, photos |

### 5.2 The Combined Cron Plan (Dreifach-Plan)

```
Vercel Cron Entry (vercel.json):
  └─ /api/cron/daily-tasks  →  fires 1× daily (2 AM ±59 min)

daily-tasks handler logic:
  ├─ ALWAYS:   processDunning()
  ├─ ALWAYS:   markOverdueShifts()
  └─ IF 1st OF MONTH: generateRecurringInvoices()
```

**Timing:** Acceptable ±59 min jitter for all three job types:
- Dunning: Sending reminders ±1 hour is fine
- Mark-overdue: ±1 hour on daily threshold is acceptable
- Recurring invoices: Generational on 1st of month, ±1 hour is fine

**Timeout check:** 3 jobs × estimated 1–5 seconds each ≈ 3–15 seconds total. Well under the 60-second Hobby limit.

---

## 6. Key Risks & Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Database hits 500 MB | High | Monitor with Supabase dashboard; prune old logs; export + archive |
| Project auto-pauses after 7 days | Medium | Keep-alive GitHub Action or cron-job.org ping every 3 days |
| Auth MAU exceeds 50K | Low (for MVP) | Upgrade to Supabase Pro |
| All 3 cron jobs timeout at 60s | Low | Add logging; if approaching limit, split recurring invoice to separate trigger |
| Vercel bandwidth throttling | Low–Medium | Stay under 80 GB/month; use CDN for static assets |
| pg_cron unreliability on free tier | Low | Use Vercel cron as primary; pg_cron only for DB-internal maintenance |

---

## 7. Conclusion

**ReinPlaner can run on Vercel Hobby + Supabase Free for a significant number of tenants.**

The free stack comfortably handles:
- **~30–35 tenants** before hitting the 500 MB database limit
- **All 3 cron jobs** via 1 combined daily Vercel cron (no external service needed)
- **Multi-tenant RLS** architecture within the single Supabase database
- **Auth, realtime, storage** needs well into the MAU limits

**Primary upgrade triggers:**
1. Database storage approaching 400 MB → Supabase Pro
2. Need cron precision < ±1 hour or frequency > 1× daily → Vercel Pro
3. Project pausing is unacceptable → Supabase Pro or keep-alive automation

**The free stack is viable for ReinPlaner's MVP and early growth — estimated 20–30 paying tenants before any upgrade is needed.**