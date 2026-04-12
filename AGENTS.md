
## ⚠️ VOR JEDEM COMMIT - QA CHECKLISTE

### Vor dem Commit immer ausführen:
1. `npm run build` → **MUSS erfolgreich sein**
2. `npm run test:run` → **MUSS bestehen**

### Erst wenn BEIDE erfolgreich:
- Commit erstellen
- Pushen

### Commit Message Format:
```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types: feat, fix, docs, style, refactor, test, perf, ci, chore

### Dev-QA Rolle:
Der **dev-qa** Agent ist verantwortlich für:
- Build verification vor jedem Commit
- Test execution und reporting
- Merge/Pull-Request Reviews
- Code-Quality Checks

### Bei fehlgeschlagenem Build oder Tests:
- NICHT commiten!
- Fehler beheben
- Erneut testen
- Erst dann committen
