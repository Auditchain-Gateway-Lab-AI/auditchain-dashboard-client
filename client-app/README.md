# AuditChain Client Dashboard

Read-only client monitoring dashboard built with React, TypeScript, Vite, Tailwind CSS, shadcn-style UI primitives, TanStack Query, Recharts, and React Router.

## Run locally

```bash
pnpm install
pnpm dev
```

Demo account: `client-demo` / `password`.

The mock auth service supports multiple accounts. Each successful login returns its own workspace metadata, and the client portal header uses that authenticated workspace instead of hard-coding one organization. The original `morbis1` / `password` fixture is still available for compatibility with existing local demos.

All dashboard data is deterministic and returned by asynchronous mock services in `src/services`. The UI and query hooks depend on service contracts so the mock implementations can later be replaced by Go REST API adapters.
