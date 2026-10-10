# AuditChain Client Dashboard

Read-only client monitoring dashboard built with React, TypeScript, Vite, Tailwind CSS, shadcn-style UI primitives, TanStack Query, Recharts, and React Router.

## Run locally

```bash
pnpm install
pnpm dev
```

For a live session, set `VITE_API_BASE_URL` to the Gateway API base and `VITE_GATEWAY_PORTAL_URL` to the Besu admin portal URL in your local environment file. Production uses same-origin `/api` requests, with NGINX forwarding them to the API upstream supplied by Compose.

For UI-only work, set `VITE_USE_MOCK_AUTH=true` and `VITE_USE_MOCK_DASHBOARD=true`. The mock service supports `client-demo` / `password` and the legacy `morbis1` / `password` fixture. In live mode, integrity trends and table-level attention insights are derived from Gateway data. Recovery and the latest scan schedule still use mock data; the live dashboard does not yet include recovery endpoint adapters.

The login flow calls `POST /auth/login`, validates the returned token with `GET /auth/me`, and only allows users linked to a client workspace. The token is kept in browser storage for session restoration and is removed on logout or when the backend rejects it. The Monitor overview uses `GET /dashboard/stats`; Integrity Trend requests `GET /dashboard/stats?trend_range=8H|24H|7D|30D` and receives tenant-scoped aggregate buckets only. The Client Portal does not call `GET /dashboard/logs` or render raw audit rows; that endpoint remains available to the legacy Gateway Dashboard. The live Table Watchlist joins `/dashboard/inventory` with the per-table verification summary from `/dashboard/stats`. Server-side range verification is exposed as a background run: the client portal reads `GET /dashboard/verification-runs/latest`, polls for new runs every few seconds, and refreshes affected statistics when a run reaches a terminal state. It renders progress and summary only. It does not trigger a synchronous verification request or render individual verification rows. The gateway dashboard or a scheduler can enqueue a run through `POST /dashboard/verification-runs`; the backend processes it in idempotent batches and updates the client statistics.

## Production container

`Dockerfile` builds the Vite app into static files and serves them with unprivileged NGINX. The image listener is configured by `CLIENT_CONTAINER_PORT`; set that variable to the port used by the image, Compose mapping, and deployment scripts. Production builds use `/api` as `VITE_API_BASE_URL`, so browser requests stay on the dashboard's origin. Compose supplies the Gateway API upstream at container startup. The `/healthz` endpoint checks that the dashboard server responds.

## Deploy the client portal to the Mini PC

The GitHub Actions workflow `../.github/workflows/deploy-client.yml` deploys automatically whenever a commit is pushed or merged into `main`. It first runs client CI, validates the `development` environment configuration, publishes a commit-tagged image, and deploys the exact published image digest to the Mini PC over Tailscale SSH. There is no manual **Run workflow** step. The workflow uses the commit that entered `main`; a failed CI check or missing required variable prevents deployment.

The workflow reads the client address and Gateway API upstream from GitHub Actions Variables in the `development` environment. It builds `VITE_GATEWAY_PORTAL_URL` from `BESU_ADMIN_PORTAL_URL`, which keeps the admin link on Besu. The workflow and Mini PC deployment script do not target either Besu portal. The Besu client Compose file and manual deployment script remain a separate backup path.

Before changing containers, the deployment script validates the configuration and Gateway API, inspects every running container publishing the configured client port, and checks its Compose project, service, container name, image, config file, and exact address/port binding. Unknown or ambiguous containers cause a fail-closed stop. For the recognized legacy client container, the script pulls and validates the new image first, then stops the old container. If startup or health checks fail, it removes the new release and restarts the previous container. After success, the old container remains stopped and available for rollback.

Create a GitHub Environment named `development`, then define the following Actions Variables. The workflow and build validate required values before remote access or container changes. For unattended automatic releases, environment rules must not require manual approval or a wait timer.

| Variable | Purpose |
| --- | --- |
| `MINIPC_TAILSCALE_IP` | Mini PC Tailscale IPv4 address used by Tailscale, SSH, and the client bind address. |
| `MINIPC_CLIENT_PORT` | Host port for the client portal. |
| `MINIPC_CLIENT_URL` | Client URL. It must match `http://${MINIPC_TAILSCALE_IP}:${MINIPC_CLIENT_PORT}`. |
| `MINIPC_GATEWAY_API_URL` | Mini PC Gateway API origin, without a path. |
| `MINIPC_LEGACY_COMPOSE_DIR` | Exact `com.docker.compose.project.working_dir` label from `docker inspect` for the currently running legacy portal container. |
| `BESU_ADMIN_PORTAL_URL` | Besu admin portal URL embedded as the client portal link. |
| `CLIENT_CONTAINER_PORT` | NGINX listener port used by the client image and Compose mapping. |
| `CONTAINER_REGISTRY` | Container registry hostname, with an optional port; use the registry supported by the GitHub Actions token. |
| `MINIPC_SSH_USERNAME` | SSH account for the Mini PC deployment. |
| `MINIPC_SSH_PORT` | SSH port for the Mini PC deployment. |

Set `MINIPC_LEGACY_COMPOSE_DIR` to the exact absolute Compose working-directory label reported for the legacy container. The script compares it along with the container name, image, Compose service, project, config file, and port binding before it can replace that container. Keep these values in GitHub Actions Variables rather than repository files. The publishing job uses its short-lived `GITHUB_TOKEN` with `packages: write`, and the deploy job uses its short-lived token with `packages: read`; no registry password or personal access token is required. The image is linked to this repository using the dynamic OCI source label. If your organization disables inherited package access, grant this repository read access under the package's **Manage Actions access** settings. The Mini PC needs Docker Engine and Docker Compose v1.29.2 available as the `docker-compose` command. To avoid the v1.29.2 `ContainerConfig` recreate error, the deployment script removes and verifies the Mini PC Compose project containers before starting a new release or restored release. It checks `/healthz` after startup and rollback. The workflow does not copy application credentials to GitHub or replace the Gateway's environment file.

The Tailscale key, SSH password, and pinned SSH server fingerprint must be GitHub Environment Secrets:

| Secret | Purpose |
| --- | --- |
| `TS_AUTHKEY` | Reusable, ephemeral, preauthorized Tailscale key for the GitHub runner. |
| `MINIPC_SSH_PASSWORD` | SSH login password for the Mini PC deploy account. |
| `MINIPC_SSH_HOST_FINGERPRINT` | Pinned Mini PC SSH server key fingerprint. |

For a separately invoked Besu backup deployment, configure `BESU_TAILSCALE_IP`, `BESU_CLIENT_PORT`, `BESU_CLIENT_URL`, and `BESU_GATEWAY_API_URL` in that deployment's environment. That manual path also reads `BESU_ADMIN_PORTAL_URL`, `CLIENT_CONTAINER_PORT`, and `CONTAINER_REGISTRY`. The Mini PC workflow does not read those Besu client target variables.
