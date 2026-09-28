# AuditChain Client Dashboard

Read-only client monitoring dashboard built with React, TypeScript, Vite, Tailwind CSS, shadcn-style UI primitives, TanStack Query, Recharts, and React Router.

## Run locally

```bash
pnpm install
pnpm dev
```

Dummy account: `morbis1` / `password`.

All dashboard data is deterministic and returned by asynchronous mock services in `src/services`. The UI and query hooks depend on service contracts so the mock implementations can later be replaced by Go REST API adapters.
