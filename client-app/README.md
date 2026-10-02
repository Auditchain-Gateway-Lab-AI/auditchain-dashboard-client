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

The login flow calls `POST /auth/login`, validates the returned token with `GET /auth/me`, and only allows users linked to a client workspace. The token is kept in browser storage for session restoration and is removed on logout or when the backend rejects it. The Monitor overview and recent audit activity use the authenticated gateway API through `GET /dashboard/stats` and `GET /dashboard/logs`. The live Table Watchlist joins `/dashboard/inventory` with the per-table verification summary from `/dashboard/stats`; unavailable values show as `N/A`. Server-side range verification is exposed as a background run: the client portal reads `GET /dashboard/verification-runs/latest`, polls for new runs every few seconds, and refreshes affected statistics when a run reaches a terminal state. It renders progress and summary only. It does not trigger a synchronous verification request or render individual verification rows. The gateway dashboard or a scheduler can enqueue a run through `POST /dashboard/verification-runs`; the backend processes it in idempotent batches and updates the client statistics.

For UI-only work, set `VITE_USE_MOCK_AUTH=true` and `VITE_USE_MOCK_DASHBOARD=true`. The mock service supports `client-demo` / `password` and the legacy `morbis1` / `password` fixture. In live mode, integrity trends and table-level attention insights are derived from Gateway data. Recovery and the latest scan schedule still use mock data; the live dashboard does not yet include recovery endpoint adapters.

## Production container

`Dockerfile` builds the Vite app into static files and serves them with unprivileged NGINX on container port `8080`. It defaults to same-origin API requests through `/api/`; NGINX forwards those requests to `AUDITCHAIN_API_UPSTREAM` at container startup. When the client container shares a Docker network with the Gateway, set that variable to the Gateway service address, for example `http://api-gateway:8080`. The `/healthz` endpoint checks that the dashboard server responds.

Build and run the image locally against a Gateway listening on port `8080`:

```bash
docker build -t auditchain-client:local ./client-app
docker run --rm -p 8081:8080 \
  --add-host host.docker.internal:host-gateway \
  -e AUDITCHAIN_API_UPSTREAM=http://host.docker.internal:8080 \
  auditchain-client:local
```

Open `http://localhost:8081`. The client API base URL is embedded at build time; production builds should use `/api` so browser requests stay on the dashboard's origin.

## Deploy to the Besu development server

The manual GitHub Actions workflow `../.github/workflows/deploy-client.yml` publishes a commit-tagged GHCR image and deploys the exact published image digest over Tailscale SSH. Merge the changes into `main`, then open **Actions → Deploy AuditChain Client to Besu DEV → Run workflow** on `main`. Confirm the Development target and enter a short reason. Leave `image_sha` blank for the current `main` commit, or enter a full commit SHA from `main` to rebuild and deploy that version.

The deployment creates the dedicated directory `/home/besu/auditchain/auditchain-dashboard-client` and serves the portal at `http://100.125.142.44:3002`. Docker binds port 3002 to the server's Tailscale address. The **Gateway Admin Portal** link points to the existing dashboard at `http://100.125.142.44:3001`. NGINX forwards same-origin `/api/` requests to the existing Gateway at `http://host.docker.internal:8080`; the deploy script checks that `/api/auth/me` responds with either `200` or the expected unauthenticated `401`, and rolls back if the dashboard health or API proxy check fails. The existing dashboard on port 3001, Gateway service, and Gateway `.env` are not part of this release.

Create a GitHub Environment named `development`, then add these environment secrets and variables before running the workflow:

| Name | Type | Purpose |
| --- | --- | --- |
| `TS_AUTHKEY` | Secret | Reusable, ephemeral, preauthorized Tailscale auth key for the GitHub runner. |
| `BESU_SSH_PRIVATE_KEY` | Secret | SSH private key authorized for the `besu` account. |
| `BESU_SSH_KEY_PASSPHRASE` | Secret, optional | Passphrase if the SSH private key is encrypted. |
| `BESU_SSH_HOST_FINGERPRINT` | Secret | Pinned SSH server key fingerprint in `SHA256:...` format. |
| `BESU_GHCR_READ_TOKEN` | Secret | GitHub personal access token (classic) with `read:packages` for pulling the private image; authorize it for organization SSO if required. |
| `BESU_GHCR_USERNAME` | Variable | GitHub username that owns the read token. |
| `BESU_SSH_USERNAME` | Variable | Optional; defaults to `besu`. |
| `BESU_SSH_PORT` | Variable | Optional; defaults to `22`. |

The publishing job uses its short-lived `GITHUB_TOKEN` with `packages: write`. The DEV server needs Docker Engine with the Compose v2 plugin and access to `100.125.142.44:8080` from its Docker bridge via `host.docker.internal`. The release workflow does not copy application credentials to GitHub or replace the Gateway's environment file.
