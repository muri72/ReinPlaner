# ReinPlaner Development Workflow

## Branching Strategy

```
dev (Entwicklung) ──► PR ──► main (Production)
     │
     └── Alle Features/Bugs hier
```

### Regeln:
1. **NIEMALS** direkt auf `main` pushen
2. **Alle** Änderungen auf `dev` entwickeln
3. **Merge** nur via Pull Request (Review erforderlich)
4. **Vercel** deployt `main` automatisch zu Production

---

## Workflow

### 1. Entwickeln (auf dev)
```bash
git checkout dev
git pull origin dev
# Änderungen machen...
git add .
git commit -m "fix: Beschreibung"
git push origin dev
```

### 2. Review & Merge
```bash
# Pull Request erstellen: dev → main
# Review durch Product Owner (mk)
# Mergen nach Approval
```

### 3. Production Deployment
- Nach Merge auf `main` → Vercel deployed automatisch
- URL: https://reinplaner.vercel.app

### 4. Preview Deployments (optional)
- Für `dev` Branch Preview: Vercel Dashboard → Branch Deployments
- URL: https://reinplaner-git-dev-xxxxx.vercel.app

---

## Vercel Configuration (Dashboard)

### Production Branch: main
1. Project Settings → Git → Production Branch
2. Auswählen: `main`

### Preview Branch: dev (optional)
1. Project Settings → Git → Preview Branch
2. Auswählen: `dev`

---

## Environment Variables

### Production (.env.production)
Bereits in `.env.production.template` definiert.

In Vercel Dashboard setzen:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- etc.

---

## Commit Message Format

```
<type>(<scope>): <description>

Types:
- feat: Neue Feature
- fix: Bug Fix
- docs: Dokumentation
- refactor: Code Refactoring
- test: Tests
- perf: Performance
- ci: CI/CD

Beispiel:
feat(orders): Add order status filtering
```

---

## Status Today

| Item | Status |
|------|--------|
| Projekt Name | ReinPlaner ✅ |
| GitHub Repo | https://github.com/muri72/ReinPlaner ✅ |
| Production URL | https://reinplaner.vercel.app ✅ |
| Supabase (neu) | ignrqqicnhlaysqxuejz ✅ |
| Multi-Tenant Phase 1 | ✅ |
| Dev/Prod Trennung | ⚠️ Vercel Dashboard |
