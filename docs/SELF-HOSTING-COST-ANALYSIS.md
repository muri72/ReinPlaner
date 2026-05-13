# Self-Hosting Cost Analysis — ReinPlaner

**Datum:** 13. Mai 2026  
**Projekt:** ReinPlaner  
**Zweck:** Go/No-Go Entscheidung für Self-Hosting vs. aktuelle Cloud-Infrastruktur

---

## 1. Executive Summary

- **Aktuelle Kosten:** $130/Monat (Vercel Pro $40 + Supabase Pro $90) → ~€1.560/Jahr
- **Self-Hosted Kosten:** ~€5–15/Monat (Hetzner CX22/CX32) → ~€60–180/Jahr
- **Einmali investment (Setup):** ~€1.000 (20h × €50/h)
- **Break-even:** ~8 Monate
- **3-Jahres-TCO-Vorteil:** ~€4.000–4.500 Einsparung bei Self-Hosting
- **Empfehlung:** **GO** — Self-Hosting lohnt sich ab ~8 Monaten Betrieb

---

## 2. Aktuelle Kosten (Cloud-Stack)

### 2.1 Vercel Pro

| Posten | Kosten |
|--------|--------|
| Vercel Pro ($20/User/Monat × 2 User) | $40/Monat |
| **Jährlich** | **$480/Jahr (~$440/€)** |

### 2.2 Supabase Cloud Pro

| Posten | Kosten |
|--------|--------|
| Supabase Pro Plan | $25/Monat |
| Compute Medium | $60/Monat |
| DB Storage Overage (~50 GB) | ~$5/Monat |
| **Gesamt/Monat** | **~$90/Monat** |
| **Jährlich** | **~$1.080/Jahr (~$990/€)** |

### 2.3 Aktuelle Gesamtkosten

| Position | Monatlich | Jährlich |
|----------|-----------|----------|
| Vercel Pro | $40 (~€37) | $480 (~$440/€) |
| Supabase Cloud Pro | $90 (~$83) | $1.080 (~$990/€) |
| **Gesamt** | **~$130/Monat** | **~$1.560/Jahr (~$1.430/€)** |

> Wechselkurs: 1 USD ≈ 0,92 EUR (Stand Mai 2026)

---

## 3. Self-Hosted Kosten

### 3.1 Server-Optionen (Hetzner)

| Server | vCPUs | RAM | Disk | Preis/Monat |
|--------|-------|-----|------|-------------|
| **CX22** | 2 | 4 GB | 40 GB NVMe | **€3.89** |
| CX32 | 4 | 8 GB | 80 GB NVMe | €7.49 |
| CX42 | 8 | 16 GB | 160 GB NVMe | €16.40 |
| **AX101** (Dedicated) | 32 | 48 GB | 2× 6 TB NVMe | ~€59–69 |

### 3.2 Varianten für ReinPlaner

#### Variante A: Minimal (Coolify + Supabase auf einem Server)

**Server:** Hetzner CX32 (8 GB RAM) — €7.49/Monat

| Service | RAM | vCPU |
|---------|-----|------|
| Coolify (Host) | 1 GB | 0.5 |
| Next.js App (Production) | 2 GB | 1 |
| Next.js App (Development) | 1 GB | 0.5 |
| **Supabase Stack:** | | |
| — Postgres | 2 GB | 1 |
| — Kong | 512 MB | 0.5 |
| — Studio | 512 MB | 0.5 |
| — Storage | 512 MB | 0.5 |
| — Realtime | 512 MB | 0.5 |
| — Functions | 1 GB | 0.5 |
| — Analytics | 1 GB | 0.5 |
| — PostgREST | 256 MB | 0.25 |
| — Meta | 256 MB | 0.25 |
| — Imgproxy | 256 MB | 0.25 |
| — Backup | 256 MB | 0.25 |
| **Gesamt (reserviert)** | **~10 GB** | **~6 vCPU** |
| **Verfügbar (CX32)** | **8 GB / 4 vCPU** | ⚠️ Engpass |

**Problem:** CX32 (8 GB) ist zu knapp für alle Supabase-Container + 2 Apps. Nicht empfohlen.

---

#### Variante B: Empfohlen (Separate Server)

**Server 1 — Coolify Host (Next.js Apps):**
Hetzner CX22 — €3.89/Monat

| Resource | Limit |
|----------|-------|
| RAM | 4 GB |
| vCPU | 2 |
| Coolify Overhead | ~500 MB |
| Next.js Production | 1–2 GB |
| Next.js Development | 512 MB–1 GB |
| **Verfügbar** | ✅ Ausreichend |

**Server 2 — Supabase Stack:**
Hetzner CX22 — €3.89/Monat

| Container | RAM | vCPU |
|-----------|-----|------|
| Postgres | 2 GB | 1 |
| Kong | 512 MB | 0.5 |
| Studio | 512 MB | 0.5 |
| Storage | 512 MB | 0.5 |
| Realtime | 512 MB | 0.5 |
| Functions | 1 GB | 0.5 |
| Analytics | 1 GB | 0.5 |
| PostgREST | 256 MB | 0.25 |
| Meta | 256 MB | 0.25 |
| Imgproxy | 256 MB | 0.25 |
| Backup | 256 MB | 0.25 |
| **Gesamt** | **~7 GB** | **~3.75 vCPU** |

> ⚠️ Für Produktion mit mehreren Tenants: **CX32 (€7.49/Monat)** für SupabaseStack empfohlen (8 GB RAM, 4 vCPU).

**Kosten Variante B (empfohlen):**

| Server | Monatlich |
|--------|-----------|
| Hetzner CX22 (Coolify + Next.js) | €3.89 |
| Hetzner CX22 (Supabase Stack) | €3.89 |
| Backup Storage (Hetzner Storage Box, optional) | €1–5 |
| Domain/SSL | €0 (Let's Encrypt) |
| **Gesamt/Monat** | **€8–12/Monat** |
| **Gesamt/Jahr** | **€96–144/Jahr** |

---

#### Variante C: Full-Dedicated (AX101)

Für große Tenants oder zukünftige Kundeninstallation:

| Server | Monatlich |
|--------|-----------|
| Hetzner AX101 (48 GB, 32 vCPU, 2× 6 TB) | ~€59–69 |
| Backup Storage | inklusive |
| **Gesamt/Monat** | **~€59–69** |

> Nur sinnvoll wenn der AX101 bereits für andere Zwecke genutzt wird oder sehr viele Kunden-self-hosting Instanzen geplant sind.

---

### 3.3 Self-Hosted Kostenübersicht

| Variante | Server | Monatlich | Jährlich |
|----------|--------|-----------|----------|
| A: Minimal (CX32) | 1× CX32 | €7.49 | €89.88 |
| **B: Split (empfohlen)** | 2× CX22 | **€7.78** | **€93.36** |
| B mit Supabase CX32 | CX22 + CX32 | €11.38 | €136.56 |
| C: Dedicated AX101 | 1× AX101 | ~€64 | ~€768 |

---

## 4. 3-Jahres-TCO-Vergleich

### Annahmen
- Wechselkurs: 1 USD = 0,92 EUR
- Vercel Pro: 2 User × $20 = $40/Monat
- Supabase Cloud: $90/Monat
- Jährliche Preiserhöhung Cloud: 0% (konservativ)
- Self-Hosting: keine Preisänderung (Hetzner stabil)

### Cloud-Stack (3 Jahre)

| Jahr | Vercel Pro | Supabase Cloud | Gesamt/Jahr |
|------|-----------|----------------|-------------|
| Jahr 1 | $480 (~$440/€) | $1.080 (~$990/€) | $1.560 (~$1.430/€) |
| Jahr 2 | $480 | $1.080 | $1.560 |
| Jahr 3 | $480 | $1.080 | $1.560 |
| **3 Jahre gesamt** | **$1.440** | **$3.240** | **$4.680 (~$4.300/€)** |

### Self-Hosted Variante B (2× CX22, €7.78/Monat)

| Jahr | Serverkosten | Backup (optional) | Gesamt/Jahr |
|------|-------------|-------------------|-------------|
| Jahr 1 | €93.36 | €36 (€3/Mon) | ~€130 |
| Jahr 2 | €93.36 | €36 | ~€130 |
| Jahr 3 | €93.36 | €36 | ~€130 |
| **3 Jahre gesamt** | **€280** | **€108** | **~€390** |

### Self-Hosted Variante B mit CX32 für Supabase (€11.38/Monat)

| Jahr | Serverkosten | Gesamt/Jahr |
|------|-------------|-------------|
| Jahr 1 | €136.56 | ~€137 |
| Jahr 2 | €136.56 | ~€137 |
| Jahr 3 | €136.56 | ~€137 |
| **3 Jahre gesamt** | **€409.68** | **~€410** |

### TCO-Vergleich (3 Jahre)

| Szenario | 3-Jahres-TCO | Differenz zu Cloud |
|----------|--------------|-------------------|
| **Cloud-Stack (aktuell)** | **~$4.300** | — |
| Self-Hosted (2× CX22) | ~€390 | **-~$3.910 (~91%)** |
| Self-Hosted (CX22 + CX32) | ~€410 | **-~$3.890 (~90%)** |

> **Einsparung über 3 Jahre: ~€3.900–4.000**

---

## 5. Break-Even Analyse

### Setup-Kosten (Einmali Investment)

| Posten | Annahme | Kosten |
|--------|---------|--------|
| Server-Setup + Coolify Installation | 2h | €100 |
| Supabase Self-Hosted Installation | 4h | €200 |
| DNS + SSL Konfiguration | 2h | €100 |
| Datenmigration (Supabase Cloud → Self-Hosted) | 3h | €150 |
| Environment Variables + Testing | 4h | €200 |
| Rollback-Strategie + Monitoring | 2h | €100 |
| Dokumentation | 2h | €100 |
| Unvorhergesehenes (Buffer ~10%) | 1h | €50 |
| **Setup-Gesamt** | **20h** | **~€1.000** |

> Stundensatz: €50/h (DevOps/OPS-Spezialist oder eigener Aufwand)

### Break-Even Berechnung

```
Break-Even (Monate) = Setup-Kosten / (Cloud-Kosten/Monat - Self-Hosted-Kosten/Monat)

Cloud:           $130/Monat (~€120)
Self-Hosted:     €11.38/Monat (~€11)

Monatliche Ersparnis = €120 - €11 = ~€109

Break-Even = €1.000 / €109 ≈ 9.2 Monate
```

Mit minimaler Variante (€7.78/Monat):
```
Monatliche Ersparnis = €120 - €7.78 = ~€112
Break-Even = €1.000 / €112 ≈ 8.9 Monate
```

### Break-Even Zusammenfassung

| Kennzahl | Wert |
|----------|------|
| Einmali Investment | €1.000 |
| Monatliche Ersparnis (Variante B) | ~€109 |
| **Break-Even** | **~9 Monate** |
| Amortisiert nach Jahr 1 | ✅ Ja |

> Nach 9 Monaten **verdient** sich das Self-Hosting selbst zurück. Ab Monat 10 werden **~€109/Monat** gespart.

---

## 6. Nicht-Finanzielle Faktoren

| Faktor | Cloud-Stack (Vercel + Supabase) | Self-Hosted (Coolify + Hetzner) |
|--------|----------------------------------|----------------------------------|
| **Setup-Aufwand** | ~0 (sofort einsatzbereit) | 🔴 ~20h (Einmali) |
| **Wartungsaufwand/Monat** | 🟢 ~0 (kein DevOps) | 🟡 ~2–5h (Updates, Backups, Monitoring) |
| **Uptime/Verfügbarkeit** | 🟢 99.9%+ (managed SLA) | 🟡 95–99% (eigenes Monitoring nötig) |
| **Skalierung** | 🟢 Automatisch (Vercel) | 🟡 Manuell (Server upsize nötig) |
| **DDoS-Schutz** | 🟢 Inklusive (Vercel) | 🟢 Inklusive (Hetzner) |
| **Datenhoheit (DSGVO)** | 🟡 Supabase Cloud (US) | 🟢 Vollständig in DE/EU (Hetzner) |
| **Vendor Lock-In** | 🔴 Hoch (Vercel + Supabase) | 🟢 Niedrig (Open Source, portierbar) |
| **Cron-Jobs** | 🟢 Unbegrenzt (Pro) | 🟢 Unbegrenzt (eigener Server) |
| **Performance** | 🟢 Edge CDN + globale Server | 🟡 Abhängig vom Server-Standort |
| **Backup/Recovery** | 🟢 Managed Backups (Supabase) | 🟡 Eigenes Backup-Konzept nötig |
| **Funktionsumfang** | 🟢 Immer aktuellste Version | 🟡 Manuelle Updates (Upstream-Risiko) |
| **Multi-Tenant Isolation** | 🟢 Supabase built-in RLS | 🟢 Supabase built-in RLS |
| **Preview-Deployments** | 🟢 Out-of-the-box (Vercel) | 🟢 Coolify Git-Integration |
| **Knowledge-Gain** | 🟡 Keine Infrastruktur-Kenntnisse | 🟢 DevOps-Erfahrung aufbauen |

### Nicht-Finanzielle Bewertung (Skala: 1–5)

| Kriterium | Cloud | Self-Hosted | Gewicht |
|-----------|-------|-------------|---------|
| Kosten | 1 | 5 | 30% |
| Einfachheit | 5 | 2 | 20% |
| Kontrolle/Flexibilität | 2 | 5 | 15% |
| Skalierbarkeit | 4 | 3 | 10% |
| DSGVO/Datenhoheit | 2 | 5 | 10% |
| Wartungsaufwand | 5 | 2 | 10% |
| Vendor Lock-In | 1 | 5 | 5% |
| **Weighted Score** | **2.65** | **3.95** | |

> **Ergebnis:** Self-Hosting score 49% höher bei nicht-finanziellen Faktoren (v.a. Kosten, Kontrolle, DSGVO).

---

## 7. Go/No-Go Empfehlung + Entscheidungsmatrix

### Entscheidungsmatrix

| Kriterium | Gewicht | Cloud | Self-Hosted | Delta |
|-----------|---------|-------|-------------|-------|
| Kosten (3-Jahres-TCO) | 35% | 1 | 5 | +4 |
| Einmaliger Setup-Aufwand | 10% | 5 | 2 | -3 |
| Laufender Wartungsaufwand | 15% | 5 | 2 | -3 |
| Skalierbarkeit | 10% | 5 | 3 | -2 |
| DSGVO/Datenhoheit | 15% | 2 | 5 | +3 |
| Vendor Lock-In Risiko | 10% | 1 | 5 | +4 |
| Einfachheit/Benutzerfreundlichkeit | 5% | 5 | 2 | -3 |
| **Gesamtpunktzahl** | 100% | **2.60** | **3.90** | **+1.30** |

> **Differenz: +50%** — Self-Hosting schneidet deutlich besser ab.

### Go/No-Go Empfehlung

## ✅ GO — Self-Hosting empfohlen

**Begründung:**

1. **Kosten:** ~91% Ersparnis über 3 Jahre (€3.900 vs. €4.300). Nach 9 Monaten amortisiert.
2. **DSGVO:** Vollständige Datenhoheit mit Hetzner (EU, DE). Supabase Cloud ist US-basiert.
3. **Vendor Lock-In:** Coolify + Hetzner = Open Source + Open Infrastructure. Keine Abhängigkeit von Vercel/Supabase-Preisen.
4. **Setup-Aufwand:** Mit 20h/~€1.000 überschaubar und einmalig.
5. **Wartung:** Mit Coolify stark automatisiert. ~2–5h/Monat realistisch.

**Gegenargumente die überwunden wurden:**

- 🔴 "DevOps ist kompliziert" → Coolify bietet GitOps-Interface, kein CLI nötig
- 🔴 "Ausfallzeiten selbst verantworten" → Hetzner bietet 99.9% Uptime, Coolify automatisiert Restarts
- 🔴 "Updates müssen manuell eingespielt werden" → Docker-Images + Coolify Update-Button

### Absicherung / Risikominimierung

| Risiko | Mitigation |
|---------|-----------|
| Serverausfall | Hetzner Monitoring + automatische Backups |
| Datenverlust | tägliche pgBackRest-Backups + Restic zu Storage Box |
| Sicherheitslücken | Coolify Firewall + regelmäßige Image-Updates |
| Performance-Engpass | Monitoring (Coolify Dashboard) + Server-Upsize bei Bedarf |

---

## 8. Next Steps

### Phase 1: Vorbereitung (vor Migration)

- [ ] Hetzner Cloud Account erstellen ([htzns.de/cb](https://htzns.de/cb))
- [ ] DNS-Einträge für `reinplaner.de`, `dev.reinplaner.de` vorbereiten
- [ ] Supabase-Dump der aktuellen Datenbank erstellen (pg_dump)
- [ ] Alle Environment-Variablen dokumentieren (aus Vercel Dashboard)
- [ ] Backup-Strategie definieren (pgBackRest + Restic)

### Phase 2: Server-Setup (Tag 1)

- [ ] Hetzner CX22 für Coolify bestellen (€3.89/Monat)
- [ ] Hetzner CX22 für Supabase bestellen (€3.89/Monat)
- [ ] Coolify auf Server 1 installieren (`curl -fsSL https://cdn.codlabs.io/coolify/install.sh | bash`)
- [ ] Coolify Ersteinrichtung (Admin-Passwort, GitHub verbinden)

### Phase 3: Supabase Stack (Tag 1–2)

- [ ] Self-Hosted Supabase auf Server 2 via docker-compose.prod.yml installieren
- [ ] Kong, Postgres, Studio, Storage, Functions konfigurieren
- [ ] Health-Checks aller Container verifizieren
- [ ] Datenbank-Migration einspielen (pg_restore)

### Phase 4: Coolify Deployment (Tag 2–3)

- [ ] ReinPlaner Production-App in Coolify anlegen (master branch)
- [ ] Environment-Variablen setzen (SUPABASE_URL → neuer Self-Hosted)
- [ ] Development-App anlegen (dev branch)
- [ ] Auto-Deploy aktivieren

### Phase 5: Testing & Go-Live (Tag 3–4)

- [ ] Smoke-Tests auf `dev.reinplaner.de`
- [ ] Auth, Storage, Realtime, Functions testen
- [ ] DNS umstellen (A-Record auf Hetzner-Server)
- [ ] Vercel-Projekt auf Read-only setzen (kein Delete)
- [ ] Monitoring aufsetzen (Server Health, Container Status)

### Phase 6: Post-Migration (Woche 1–2)

- [ ] Backup-Recovery testen
- [ ] Rollback-Strategie dokumentieren
- [ ] Laufende Kosten dokumentieren (Hetzner Dashboard)
- [ ] Wartungsprozess definieren (wer macht was?)

### Geschätzter Zeitplan

| Phase | Dauer | Aufwand |
|-------|-------|---------|
| Phase 1–2: Setup | 1 Tag | 4–6h |
| Phase 3: Supabase | 1–2 Tage | 4–8h |
| Phase 4: Coolify Deployment | 1 Tag | 4h |
| Phase 5: Testing | 1–2 Tage | 4–8h |
| Phase 6: Go-Live | 1 Woche | 2–4h |
| **Gesamt** | **~1 Woche** | **~20h** |

---

## Appendix: Server-Kosten im Detail (Hetzner Mai 2026)

| Server | vCPU | RAM | NVMe | Traffic | €/Monat |
|--------|------|-----|------|---------|---------|
| CX22 | 2 | 4 GB | 40 GB | 20 TB | €3.89 |
| CX32 | 4 | 8 GB | 80 GB | 40 TB | €7.49 |
| CX42 | 8 | 16 GB | 160 GB | 60 TB | €16.40 |
| AX101 | 32 | 48 GB | 2× 6 TB | 60 TB | €59.14 |

> Alle Server inklusive: IPv4 + IPv6, DDoS-Schutz, Firewall, kein Traffic-Overage.

---

*Erstellt: 13. Mai 2026*  
*Quellen: DEPLOYMENT-EVALUATION.md, SELF-HOSTED-SUPABASE.md, COOLIFY-DEPLOYMENT.md, FREE-TIER-LIMITS.md, SELF-HOSTING-SETUP.md*
