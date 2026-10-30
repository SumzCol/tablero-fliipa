# Estructura del front (`src/`)

```
src/
  app/                 # Entrada React (main, App, SessionGate)
  features/
    auth/              # Firebase Auth, login, errores
    admin/             # Panel allowlist / miembros
    kanban/            # Tablero Kanban (UI principal; migración TS gradual)
  integrations/        # Plane, Kaneo (APIs externas)
  shared/
    components/        # UI reutilizable (LoadingScreen, …)
    lib/               # storage, uiMode, memberMaps, boardMembers, …
```

Alias de import: `@/` → `src/` (ver `vite.config.ts` y `tsconfig.json`).

Backend Node sin bundler: `api/`, `server/`, `scripts/`.
