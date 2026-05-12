# Architektur-Empfehlung ReinPlaner — Mai 2026

**Datum:** 12. Mai 2026  
**Für:** Muri  
**Stack:** Next.js 16 (App Router, React 19) + Supabase + TypeScript + Vercel

---

## 1. Executive Summary

ReinPlaners aktueller Stack (Next.js + Supabase + Vercel) ist **produktionsreif und soll beibehalten werden**. Die RLS-basierte Multi-Tenant-Architektur ist professionell implementiert, die Supabase-Kosten sind für 100+ Tenants vertretbar (~$130/Monat). Der kritischste Punkt ist das **Vercel Cron-Limit**: Mit 3 verschiedenen Cron-Jobs (Dunning, Overdue-Shifts, Recurring-Invoices) wird Vercel Hobby dem Projekt nicht gerecht — ein Upgrade auf Vercel Pro ($20/User) ist **sofort nötig**. Mittelfristig (6–12 Monate) lohnt sich die Migration zu Coolify + Hetzner (~€15–20/Monat, 80% Ersparnis). Supabase bleibt als Backend bestehen, mit Self-Hosting als Exit-Strategie bei 500+ Tenants.

---

## 2. Supabase: Beibehalten mit Vorbereitungen

### 2.1 Entscheidung: SUPA-BASE BEIBEHALTEN

Die Supabase-Integration funktioniert. RLS, Auth, Realtime und die Multi-Tenant-Isolation über Subdomains sind produktionsreif. Ein Wechsel (tRPC, Hasura, reines PostgreSQL) würde massiven Rewrite-Aufwand bedeuten, ohne messbaren Vorteil.

### 2.2 Massnahmen zur Lock-In-Reduktion

| Massnahme | Aufwand | Priorität |
|---|---|---|
| **Repository-Pattern einführen** — alle `supabase-js`-Calls hinter ein Interface kapseln | 2–3 Tage | 🔴 Sofort |
| **Auth-Abstraktion vorbereiten** — Auth.js als Wrapper um Supabase Auth (ermöglicht später SAML ohne Rewrite) | 1–2 Tage | 🟡 Mittelfristig |
| **Metrics & Alerting** — MAU-Zähler, Connection-Count, Query-Latenz ins Monitoring aufnehmen | 1 Tag | 🟡 Mittelfristig |

### 2.3 SSO-Strategie klären

| Option | Kosten | Geeignet für |
|---|---|---|
| Supabase Team Plan | $599/Monat | Enterprise-Kunden mit SSO-Pflicht |
| Auth.js als Layer vor Supabase Auth | $0 + Entwicklungsaufwand | B2B-Kunden, die keinen Team Plan rechtfertigen |

**Empfehlung:** Auth.js als Wrapper implementieren —flexibler, portabel, kein Lock-In bei SAML-Anforderungen.

---

## 3. Deployment: Was ändern?

### 3.1 Jetzt: Vercel Pro buchen (sofort!)

**Problem:** Vercel Hobby erlaubt nur 1 Cron pro Tag. ReinPlaner hat 3 Crons:

```
/api/cron/dunning         → 0 8 * * *  (täglich 08:00 Uhr)
/api/cron/mark-overdue    → 0 9 * * *  (täglich 09:00 Uhr)
/api/cron/recurring-inv   → 0 7 1 * *   (monatlich am 1., 07:00 Uhr)
```

**Lösung:** Vercel Pro ($20/User/Monat) — damit sind unbegrenzte Cron-Jobs möglich.

### 3.2 6–12 Monate: Coolify + Hetzner

| Komponente | Jetzt | 6–12 Monate | Langfristig |
|---|---|---|---|
| **Frontend** | Vercel Pro ($40/Monat) | Coolify + Hetzner CX22 (€3.89) | Coolify + Hetzner |
| **Supabase** | Cloud Pro ($90/Monat) | Self-hosted auf Hetzner CX32 (€7.49) | Self-hosted |
| **Cron-Jobs** | Vercel Pro (inbegriffen) | Coolify (inbegriffen) | Coolify |
| **Gesamt** | **~$130/Monat** | **€12–20/Monat** | **€12–20/Monat** |

**Kostenersparnis:** ~$110/Monat = 80% Reduktion.

**Migration Coolify:**
```
1. Hetzner CX22 bestellen (€3.89/Monat)
2. Coolify installieren: curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
3. GitHub Repo verbinden
4. Next.js App deployen (Docker)
5. Environment Variables umziehen
```
**Zeitschätzung:** 2–4 Stunden.

---

## 4. Kostenübersicht

| Phase | Infrastruktur | Monatliche Kosten |
|---|---|---|
| **Jetzt (MVP)** | Vercel Pro (2 User) + Supabase Cloud Pro | ~$130 |
| **6–12 Monate** | Coolify + Hetzner CX22 + Self-hosted Supabase (CX32) | ~€15–20 |
| **Langfristig** | Coolify + Hetzner + Self-hosted Supabase | ~€15–20 |

Bei 100k Nutzern: Supabase Cloud ~$300–500/Monat → Self-hosted Supabase bleibt €7.49/Monat.

---

## 5. Top 5 Sofort-Massnahmen

1. **Vercel Pro buchen** — Cron-Limit ist aktuell ein Betriebsrisiko. Ohne Pro funktioniert Dunning/Overdue-Shifts nicht täglich.

2. **Repository-Pattern einführen** — Alle `supabase-js`-Calls hinter Interface kapseln. Wechsel zu tRPC/NestJS wird erheblich einfacher. Beispiel:
   ```typescript
   interface TenantRepository {
     findBySlug(slug: string): Promise<Tenant | null>
     findById(id: string): Promise<Tenant | null>
   }
   ```

3. **Auth.js als Auth-Wrapper** — Bereits bei der nächsten Auth-Änderung einplanen. Ermöglicht SAML/SSO ohne Supabase Team Plan ($599/Monat).

4. **MAU-Monitoring einrichten** — Supabase Dashboard + eigene Metriken. Bei 100k MAU wird Supabase Cloud teuer ($0.00325/Nutzer).

5. **RLS-Performance testen** — Bei 100+ Tenants mit 50k+ Zeilen: `EXPLAIN ANALYZE` auf kritische Queries. Index auf `tenant_id` ist bereits vorhanden (Migration `20260413221000_add_performance_indexes.sql`).

---

## 6. Was NICHT ändern (Bestätigung)

| Komponente | Status | Empfehlung |
|---|---|---|
| **Next.js App Router** | ✅ Produktiv | Beibehalten |
| **React 19** | ✅ Stabil | Beibehalten |
| **TypeScript** | ✅ Standard | Beibehalten |
| **Supabase (volles BaaS)** | ✅ Funktioniert | Beibehalten, Self-hosted als Backup |
| **Multi-Tenant via Subdomain + RLS** | ✅ Production-Ready | Beibehalten |
| **Kein ORM** | ✅ Richtig entschieden | Beibehalten |
| **PostgreSQL (via Supabase)** | ✅ Volle Features | Beibehalten |

**Nicht empfohlen:**
- Jetzt zu tRPC/Hasura migrieren — zu hoher Aufwand, kein messbarer Vorteil
- Supabase kündigen — funktioniert, kein Grund
- Railway/Render als Alternative — teurer als Coolify+Hetzner
- Jetzt komplett self-hosted — erhöht Komplexität ohne Nutzen für MVP

---

## 7. Drei-Phasen-Plan

```
Phase 1 (jetzt):        Vercel Pro + Supabase Cloud Pro
                        → $130/Monat
                        → Cron-Limit gelöst
                        → Keine DevOps-Belastung

Phase 2 (6–12 Monate):  Coolify + Hetzner (Frontend)
                        + Self-hosted Supabase (Hetzner CX32)
                        → €15–20/Monat
                        → 80% Kostenreduktion
                        → docker-compose.yml existiert bereits

Phase 3 (langfristig):  Docker Compose Template für Kunden
                        → Self-Hosting Angebot
                        → Support-Verträge als Revenue-Stream
                        → DSGVO, Datenhoheit für B2B-Kunden
```

---

## 8. Fazit

Der ReinPlaner-Stack ist gut gewählt. Die Architektur ist durchdacht, die RLS-Implementierung professionell. Kritischer Handlungsbedarf besteht nur bei Vercel (sofort Pro buchen) und bei der Auth-Abstraktion (mittelfristig). Die Kosten sind für ein SaaS mit 100+ Tenants vertretbar — und durch Coolify+Hetzner+Self-hosted Supabase langfristig auf ~€15–20/Monat reduzierbar.
