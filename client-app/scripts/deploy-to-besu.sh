#!/usr/bin/env bash

set -Eeuo pipefail
umask 077

readonly expected_deploy_dir="/home/besu/auditchain/auditchain-dashboard-client"
readonly deploy_dir="${DASHBOARD_PROJECT_DIR:?DASHBOARD_PROJECT_DIR is required}"
readonly dashboard_bind_address="${BESU_TAILSCALE_IP:?BESU_TAILSCALE_IP is required}"
readonly dashboard_port="${BESU_CLIENT_PORT:?BESU_CLIENT_PORT is required}"
readonly dashboard_url="${BESU_CLIENT_URL:?BESU_CLIENT_URL is required}"
readonly api_upstream="${BESU_GATEWAY_API_URL:?BESU_GATEWAY_API_URL is required}"
readonly admin_portal_url="${BESU_ADMIN_PORTAL_URL:?BESU_ADMIN_PORTAL_URL is required}"
readonly client_container_port="${CLIENT_CONTAINER_PORT:?CLIENT_CONTAINER_PORT is required}"
readonly container_registry="${CONTAINER_REGISTRY:?CONTAINER_REGISTRY is required}"
readonly image_name="${CLIENT_IMAGE_NAME:?CLIENT_IMAGE_NAME is required}"
readonly image_sha="${CLIENT_IMAGE_SHA:?CLIENT_IMAGE_SHA is required}"
readonly image_digest="${CLIENT_IMAGE_DIGEST:?CLIENT_IMAGE_DIGEST is required}"
readonly image_ref="${CLIENT_IMAGE_REF:?CLIENT_IMAGE_REF is required}"
readonly registry_username="${REGISTRY_USERNAME:?REGISTRY_USERNAME is required}"

validate_port() {
  local value="$1"
  [[ "$value" =~ ^[0-9]{1,5}$ ]] || return 1
  local number=$((10#$value))
  (( number >= 1 && number <= 65535 ))
}

compose_cmd=(docker compose)
if ! "${compose_cmd[@]}" version >/dev/null 2>&1; then
  if ! command -v docker-compose >/dev/null 2>&1; then
    printf '%s\n' "Docker Compose v2 is required (docker compose plugin or docker-compose standalone)." >&2
    exit 1
  fi

  if ! compose_version="$(docker-compose version 2>&1)"; then
    printf 'Could not run docker-compose: %s\n' "$compose_version" >&2
    exit 1
  fi
  if [[ ! "$compose_version" =~ (^|[[:space:]])v?2\.[0-9]+ ]]; then
    printf 'Docker Compose v2 is required; docker-compose reported: %s\n' "$compose_version" >&2
    exit 1
  fi

  compose_cmd=(docker-compose)
fi
printf 'Using Docker Compose command: %s\n' "${compose_cmd[*]}"

if [[ "$deploy_dir" != "$expected_deploy_dir" ]]; then
  printf 'Refusing unexpected deployment directory: %s\n' "$deploy_dir" >&2
  exit 1
fi

if [[ "$image_name" != "$container_registry/"* || ! "$image_name" =~ ^[A-Za-z0-9.-]+(:[0-9]{1,5})?/[a-z0-9._/-]+$ || \
  ! "$image_sha" =~ ^[0-9a-f]{40}$ || \
  ! "$image_digest" =~ ^sha256:[0-9a-f]{64}$ || "$image_ref" != "$image_name@$image_digest" ]]; then
  printf '%s\n' "The requested image name, commit SHA, or published image digest is invalid." >&2
  exit 1
fi

if ! validate_port "$dashboard_port" || ! validate_port "$client_container_port" || \
  (( 10#$client_container_port < 1024 )); then
  printf '%s\n' "The dashboard port is invalid." >&2
  exit 1
fi

if [[ ! "$dashboard_bind_address" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ || \
  "$dashboard_url" != "http://${dashboard_bind_address}:${dashboard_port}" || \
  ! "$api_upstream" =~ ^https?://[A-Za-z0-9.-]+(:[0-9]{1,5})?$ || \
  ! "$admin_portal_url" =~ ^https?://[A-Za-z0-9.-]+(:[0-9]{1,5})?(/[^[:space:]]*)?$ ]]; then
  printf '%s\n' "The Besu client URL, Gateway API URL, or admin portal URL is invalid or inconsistent." >&2
  exit 1
fi

if [[ ! "$container_registry" =~ ^[A-Za-z0-9.-]+(:[0-9]{1,5})?$ || \
  ! "$registry_username" =~ ^[A-Za-z0-9._-]+$ ]]; then
  printf '%s\n' "The configured image registry or registry username is invalid." >&2
  exit 1
fi

if [[ ! -d "${DEPLOY_PACKAGE_DIR:-}" || ! -f "${DEPLOY_PACKAGE_DIR:-}/compose.yaml" ]]; then
  printf '%s\n' "The deployment package is incomplete." >&2
  exit 1
fi

: "${REGISTRY_READ_TOKEN:?REGISTRY_READ_TOKEN is required}"
: "${GITHUB_RUN_ID:?GITHUB_RUN_ID is required}"

mkdir -p -- "$deploy_dir"
cd "$deploy_dir"

readonly compose_file="$deploy_dir/compose.yaml"
readonly env_file="$deploy_dir/.env"
readonly project_name="auditchain-client"
readonly compose_options=(--project-name "$project_name" --project-directory "$deploy_dir" --file "$compose_file")

new_env_file="$(mktemp "$deploy_dir/.env.next.XXXXXX")"
rollback_env_file="$(mktemp "$deploy_dir/.env.previous.XXXXXX")"
rollback_compose_file="$(mktemp "$deploy_dir/.compose.previous.XXXXXX")"
new_compose_file="$(mktemp "$deploy_dir/.compose.next.XXXXXX")"
docker_config_dir="$(mktemp -d "/tmp/auditchain-docker-auth-${GITHUB_RUN_ID}.XXXXXX")"
export DOCKER_CONFIG="$docker_config_dir"
have_previous_env=false
have_previous_compose=false

cleanup() {
  local status=$?
  set +e
  docker --config "$docker_config_dir" logout "$container_registry" >/dev/null 2>&1
  rm -rf -- "$docker_config_dir"
  rm -f -- "$new_env_file" "$new_compose_file" "$rollback_env_file" "$rollback_compose_file"
  exit "$status"
}

restore_previous_release() {
  printf '%s\n' "The dashboard release did not pass health checks; restoring its previous release."
  if [[ "$have_previous_env" == true && "$have_previous_compose" == true ]]; then
    cp -- "$rollback_env_file" "$env_file"
    cp -- "$rollback_compose_file" "$compose_file"
    if ! "${compose_cmd[@]}" "${compose_options[@]}" --env-file "$env_file" up --detach --wait --wait-timeout 90 dashboard; then
      printf '%s\n' "Automatic restoration failed. The previous image and configuration remain in the deployment directory." >&2
    fi
  else
    "${compose_cmd[@]}" "${compose_options[@]}" --env-file "$env_file" down --remove-orphans || true
    rm -f -- "$env_file"
    rm -f -- "$compose_file"
  fi
}

trap cleanup EXIT

gateway_status="$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' --max-time 10 \
  "${api_upstream%/}/api/auth/me" || true)"
if [[ "$gateway_status" != "200" && "$gateway_status" != "401" ]]; then
  printf 'The Gateway API preflight returned HTTP %s.\n' "$gateway_status" >&2
  exit 1
fi

if [[ -f "$env_file" && -f "$compose_file" ]]; then
  cp -- "$env_file" "$rollback_env_file"
  cp -- "$compose_file" "$rollback_compose_file"
  have_previous_env=true
  have_previous_compose=true
elif [[ -e "$env_file" || -e "$compose_file" ]]; then
  printf '%s\n' "An incomplete existing dashboard release was found; refusing to replace it." >&2
  exit 1
fi

cp -- "$DEPLOY_PACKAGE_DIR/compose.yaml" "$new_compose_file"
printf 'CLIENT_IMAGE=%s\nBESU_TAILSCALE_IP=%s\nBESU_CLIENT_PORT=%s\nBESU_CLIENT_URL=%s\nBESU_GATEWAY_API_URL=%s\nBESU_ADMIN_PORTAL_URL=%s\nCLIENT_CONTAINER_PORT=%s\nCONTAINER_REGISTRY=%s\n' \
  "$image_ref" "$dashboard_bind_address" "$dashboard_port" "$dashboard_url" "$api_upstream" \
  "$admin_portal_url" "$client_container_port" "$container_registry" > "$new_env_file"

readonly staged_compose_options=(--project-name "$project_name" --project-directory "$deploy_dir" --file "$new_compose_file" --env-file "$new_env_file")

if ! "${compose_cmd[@]}" "${staged_compose_options[@]}" config --quiet; then
  printf '%s\n' "The dashboard Compose configuration is invalid." >&2
  exit 1
fi

printf '%s' "$REGISTRY_READ_TOKEN" | docker login "$container_registry" --username "$registry_username" --password-stdin
unset REGISTRY_READ_TOKEN

pull_attempt=1
max_pull_attempts=3
until "${compose_cmd[@]}" "${staged_compose_options[@]}" pull dashboard; do
  if (( pull_attempt >= max_pull_attempts )); then
    printf 'Image pull failed after %s attempts; the running dashboard was not changed.\n' \
      "$max_pull_attempts" >&2
    exit 1
  fi

  retry_delay=$((pull_attempt * 10))
  printf 'Image pull attempt %s/%s failed; retrying in %s seconds.\n' \
    "$pull_attempt" "$max_pull_attempts" "$retry_delay" >&2
  sleep "$retry_delay"
  pull_attempt=$((pull_attempt + 1))
done
mv -f -- "$new_compose_file" "$compose_file"
mv -f -- "$new_env_file" "$env_file"

if ! "${compose_cmd[@]}" "${compose_options[@]}" --env-file "$env_file" up --detach --wait --wait-timeout 90 --force-recreate dashboard; then
  restore_previous_release
  exit 1
fi

if ! curl --fail --silent --show-error --retry 5 --retry-delay 2 --max-time 10 \
  "$dashboard_url/healthz" >/dev/null; then
  restore_previous_release
  exit 1
fi

api_status="$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' --max-time 10 \
  "$dashboard_url/api/auth/me" || true)"
if [[ "$api_status" != "200" && "$api_status" != "401" ]]; then
  printf 'The dashboard API proxy check returned HTTP %s.\n' "$api_status" >&2
  restore_previous_release
  exit 1
fi

printf 'Dashboard deployment healthy at %s (image %s, source %s).\n' "$dashboard_url" "$image_ref" "$image_sha"
