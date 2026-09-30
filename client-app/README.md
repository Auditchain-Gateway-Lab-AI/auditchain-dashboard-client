# AuditChain Client Dashboard

Read-only client monitoring dashboard built with React, TypeScript, Vite, Tailwind CSS, shadcn-style UI primitives, TanStack Query, Recharts, and React Router.

## Run locally

```bash
pnpm install
pnpm dev
```

Copy `.env.example` to `.env.local`, then point `VITE_API_BASE_URL` at the running gateway backend. Authentication uses the gateway API by default:

```dotenv
VITE_API_BASE_URL=http://localhost:8080/api
VITE_GATEWAY_PORTAL_URL=http://localhost:3001
VITE_USE_MOCK_AUTH=false
VITE_USE_MOCK_DASHBOARD=false
```

The login flow calls `POST /auth/login`, validates the returned token with `GET /auth/me`, and only allows users linked to a client workspace. The token is kept in browser storage for session restoration and is removed on logout or when the backend rejects it. The Monitor overview and recent audit activity use the authenticated gateway API through `GET /dashboard/stats` and `GET /dashboard/logs`. The live Table Watchlist joins `/dashboard/inventory` with the per-table verification summary from `/dashboard/stats`; unavailable values show as `N/A`. The Verification Summary uses recorded verification counters and the last verified timestamp, without implying a scan schedule. The live Monitor also supports date-scoped all-log verification through `GET /dashboard/verify-range/estimate` and `GET /dashboard/verify-range/client`; the backend keeps the operation idempotent per `log_id`, while the client renders only the returned summary statistics.

For UI-only work, set `VITE_USE_MOCK_AUTH=true` and `VITE_USE_MOCK_DASHBOARD=true`. The mock service supports `client-demo` / `password` and the legacy `morbis1` / `password` fixture. Trend, insight, issue, scan schedule, and recovery data remain mock-backed until their endpoint adapters are implemented; they are not shown in the default live dashboard mode.
