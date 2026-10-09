#!/usr/bin/env bash

set -Eeuo pipefail
umask 077

readonly expected_deploy_dir="${HOME:?HOME is required}/auditchain/client-portal"
readonly deploy_dir="${DASHBOARD_PROJECT_DIR:?DASHBOARD_PROJECT_DIR is required}"
readonly dashboard_bind_address="${MINIPC_TAILSCALE_IP:?MINIPC_TAILSCALE_IP is required}"
readonly dashboard_port="${MINIPC_CLIENT_PORT:?MINIPC_CLIENT_PORT is required}"
readonly dashboard_url="${MINIPC_CLIENT_URL:?MINIPC_CLIENT_URL is required}"
readonly api_upstream="${MINIPC_GATEWAY_API_URL:?MINIPC_GATEWAY_API_URL is required}"
readonly legacy_compose_dir="${MINIPC_LEGACY_COMPOSE_DIR:?MINIPC_LEGACY_COMPOSE_DIR is required}"
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

if [[ ! "$dashboard_bind_address" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]]; then
  printf '%s\n' "MINIPC_TAILSCALE_IP must be an IPv4 address." >&2
  exit 1
fi
IFS=. read -r -a address_octets <<< "$dashboard_bind_address"
for address_octet in "${address_octets[@]}"; do
  if (( 10#$address_octet > 255 )); then
    printf '%s\n' "MINIPC_TAILSCALE_IP contains an invalid IPv4 octet." >&2
    exit 1
  fi
done

if ! validate_port "$dashboard_port" || ! validate_port "$client_container_port" || \
  (( 10#$client_container_port < 1024 )); then
  printf '%s\n' "The client or container port is invalid." >&2
  exit 1
fi

gateway_authority="${api_upstream#*://}"
gateway_host="${gateway_authority%%:*}"
if [[ "$dashboard_url" != "http://${dashboard_bind_address}:${dashboard_port}" || \
  ! "$api_upstream" =~ ^https?://[A-Za-z0-9.-]+(:[0-9]{1,5})?$ || \
  "$gateway_host" != "$dashboard_bind_address" || \
  ! "$admin_portal_url" =~ ^https?://[^/[:space:]]+(/[[:graph:]]*)?$ ]]; then
  printf '%s\n' "The client URL, Gateway API URL, or Besu admin portal URL is invalid or inconsistent." >&2
  exit 1
fi

if [[ "$legacy_compose_dir" != /* || "$legacy_compose_dir" == *$'\n'* || "$legacy_compose_dir" == *$'\r'* ]]; then
  printf '%s\n' "MINIPC_LEGACY_COMPOSE_DIR must be the absolute Compose working directory from the legacy container inspect labels." >&2
  exit 1
fi

if [[ ! "$container_registry" =~ ^[A-Za-z0-9.-]+(:[0-9]{1,5})?$ || \
  ! "$registry_username" =~ ^[A-Za-z0-9._-]+$ ]]; then
  printf '%s\n' "The configured image registry or registry username is invalid." >&2
  exit 1
fi

if [[ ! -d "${DEPLOY_PACKAGE_DIR:-}" || ! -f "${DEPLOY_PACKAGE_DIR:-}/compose-minipc.yaml" ]]; then
  printf '%s\n' "The Mini PC deployment package is incomplete." >&2
  exit 1
fi

: "${REGISTRY_READ_TOKEN:?REGISTRY_READ_TOKEN is required}"
: "${GITHUB_RUN_ID:?GITHUB_RUN_ID is required}"

if ! command -v docker-compose >/dev/null 2>&1; then
  printf '%s\n' "Docker Compose v1 is required as the docker-compose command." >&2
  exit 1
fi

if ! compose_version="$(docker-compose version 2>&1)"; then
  printf 'Could not run docker-compose: %s\n' "$compose_version" >&2
  exit 1
fi
if [[ ! "$compose_version" =~ (^|[[:space:]])v?1\.29\.2([[:space:],]|$) ]]; then
  printf 'Docker Compose v1.29.2 is required; docker-compose reported: %s\n' "$compose_version" >&2
  exit 1
fi

compose_cmd=(docker-compose)
printf 'Using Docker Compose command: %s\n' "${compose_cmd[*]}"

if [[ "$deploy_dir" != "$expected_deploy_dir" ]]; then
  printf 'Refusing unexpected Mini PC deployment directory: %s\n' "$deploy_dir" >&2
  exit 1
fi

if [[ "$image_name" != "$container_registry/"* || ! "$image_name" =~ ^[A-Za-z0-9.-]+(:[0-9]{1,5})?/[a-z0-9._/-]+$ || \
  ! "$image_sha" =~ ^[0-9a-f]{40}$ || \
  ! "$image_digest" =~ ^sha256:[0-9a-f]{64}$ || "$image_ref" != "$image_name@$image_digest" ]]; then
  printf '%s\n' "The requested image name, commit SHA, or published image digest is invalid." >&2
  exit 1
fi

if [[ ! "$GITHUB_RUN_ID" =~ ^[0-9]+$ ]]; then
  printf '%s\n' "The workflow run ID is invalid." >&2
  exit 1
fi

readonly compose_file="$deploy_dir/compose.yaml"
readonly env_file="$deploy_dir/.env"
readonly project_name="auditchain-client-minipc"
readonly compose_options=(--project-name "$project_name" --project-directory "$deploy_dir" --file "$compose_file")
readonly port_filter="publish=$dashboard_port"
readonly health_url="${dashboard_url%/}/healthz"

wait_for_dashboard_health() {
  local attempt
  for attempt in {1..30}; do
    if curl --connect-timeout 2 --fail --silent --output /dev/null --max-time 5 "$health_url"; then
      return 0
    fi
    sleep 2
  done

  printf 'Dashboard health endpoint did not become ready: %s\n' "$health_url" >&2
  return 1
}

existing_container_id=""
existing_project_label=""
legacy_container_id=""
legacy_project_label=""

inspect_existing_portal() {
  local container_ids_output container_id container_name container_image container_status
  local project_label service_label config_files_label working_dir_label port_bindings
  local container_port host_ip host_port exact_binding unexpected_binding binding_count matching_containers=0
  local -a container_ids=()

  if ! container_ids_output="$(docker ps --quiet --filter "$port_filter")"; then
    printf '%s\n' "Could not inspect running containers on the Mini PC." >&2
    return 1
  fi
  mapfile -t container_ids <<< "$container_ids_output"

  for container_id in "${container_ids[@]}"; do
    [[ -n "$container_id" ]] || continue
    container_name="$(docker inspect --format '{{.Name}}' "$container_id")"
    container_name="${container_name#/}"
    container_image="$(docker inspect --format '{{.Config.Image}}' "$container_id")"
    container_status="$(docker inspect --format '{{.State.Status}}' "$container_id")"
    project_label="$(docker inspect --format '{{with index .Config.Labels "com.docker.compose.project"}}{{.}}{{end}}' "$container_id")"
    service_label="$(docker inspect --format '{{with index .Config.Labels "com.docker.compose.service"}}{{.}}{{end}}' "$container_id")"
    config_files_label="$(docker inspect --format '{{with index .Config.Labels "com.docker.compose.project.config_files"}}{{.}}{{end}}' "$container_id")"
    working_dir_label="$(docker inspect --format '{{with index .Config.Labels "com.docker.compose.project.working_dir"}}{{.}}{{end}}' "$container_id")"
    port_bindings="$(docker inspect --format '{{range $port, $bindings := .NetworkSettings.Ports}}{{range $bindings}}{{printf "%s|%s|%s\n" $port .HostIp .HostPort}}{{end}}{{end}}' "$container_id")"

    exact_binding=false
    unexpected_binding=false
    binding_count=0
    while IFS='|' read -r container_port host_ip host_port; do
      [[ -n "$container_port" ]] || continue
      binding_count=$((binding_count + 1))
      if [[ "$container_port" == "${client_container_port}/tcp" && "$host_ip" == "$dashboard_bind_address" && "$host_port" == "$dashboard_port" ]]; then
        exact_binding=true
      else
        unexpected_binding=true
      fi
    done <<< "$port_bindings"

    if [[ "$exact_binding" != true || "$unexpected_binding" == true || "$binding_count" -ne 1 ]]; then
      printf 'Container %s (%s) does not have only the expected %s:%s to %s binding; refusing to continue.\n' \
        "$container_id" "$container_name" "$dashboard_bind_address" "$dashboard_port" "$client_container_port" >&2
      return 1
    fi

    matching_containers=$((matching_containers + 1))
    if (( matching_containers > 1 )); then
      printf 'More than one running container publishes the Mini PC client portal port %s; refusing to choose one.\n' \
        "$dashboard_port" >&2
      return 1
    fi

    if [[ "$container_status" != "running" || "$service_label" != "dashboard" || -z "$project_label" || \
      -z "$config_files_label" || -z "$working_dir_label" ]]; then
      printf 'Container %s does not have the expected running Compose project/service identity; refusing to replace it.\n' \
        "$container_id" >&2
      return 1
    fi

    if [[ "$container_name" == "auditchain-client-portal-minipc" && \
      "$project_label" == "$project_name" && "$container_image" == "$image_name@sha256:"* && \
      "$working_dir_label" == "$deploy_dir" && "$config_files_label" == *"$compose_file"* ]]; then
      existing_container_id="$container_id"
      existing_project_label="$project_label"
      printf 'Verified managed portal: container=%s project=%s service=%s image=%s.\n' \
        "$container_name" "$project_label" "$service_label" "$container_image"
    elif [[ "$container_name" == "auditchain-client-portal-compose" && \
      "$container_image" == "auditchain-client-portal:sha-"* && "$project_label" != "$project_name" && \
      "$working_dir_label" == "$legacy_compose_dir" && "$config_files_label" == *"compose-minipc.yaml"* ]]; then
      legacy_container_id="$container_id"
      legacy_project_label="$project_label"
      printf 'Verified existing portal: container=%s project=%s service=%s image=%s config=%s.\n' \
        "$container_name" "$project_label" "$service_label" "$container_image" "$config_files_label"
    else
      printf 'Container %s (name=%s project=%s service=%s image=%s config=%s) is not the recognized Mini PC client portal; refusing to replace it.\n' \
        "$container_id" "$container_name" "$project_label" "$service_label" "$container_image" "$config_files_label" >&2
      return 1
    fi
  done
}

inspect_existing_portal
if [[ -n "$existing_container_id" && ( ! -f "$compose_file" || ! -f "$env_file" ) ]]; then
  printf '%s\n' "The managed portal container is running but its Compose release files are missing; refusing to replace it." >&2
  exit 1
fi
if [[ -e "$compose_file" && ! -f "$env_file" || ! -e "$env_file" && -f "$compose_file" ]]; then
  printf '%s\n' "An incomplete existing Mini PC dashboard release was found; refusing to replace it." >&2
  exit 1
fi

mkdir -p -- "$deploy_dir"
cd "$deploy_dir"

new_env_file="$(mktemp "$deploy_dir/.env.next.XXXXXX")"
rollback_env_file="$(mktemp "$deploy_dir/.env.previous.XXXXXX")"
rollback_compose_file="$(mktemp "$deploy_dir/.compose.previous.XXXXXX")"
new_compose_file="$(mktemp "$deploy_dir/.compose.next.XXXXXX")"
docker_config_dir="$(mktemp -d "/tmp/auditchain-docker-auth-${GITHUB_RUN_ID}.XXXXXX")"
export DOCKER_CONFIG="$docker_config_dir"
readonly staged_compose_options=(--project-name "$project_name" --project-directory "$deploy_dir" --file "$new_compose_file" --env-file "$new_env_file")

have_previous_env=false
have_previous_compose=false
legacy_stopped=false
deployment_complete=false
deployment_mutation_started=false
rollback_attempted=false

remove_managed_project_containers() {
  local remaining_container_ids

  if ! "${compose_cmd[@]}" "${staged_compose_options[@]}" down --remove-orphans >/dev/null; then
    printf '%s\n' "Could not remove the existing Mini PC Compose project before starting a container." >&2
    return 1
  fi

  if ! remaining_container_ids="$(docker ps --all --quiet --filter "label=com.docker.compose.project=$project_name")"; then
    printf '%s\n' "Could not verify that the Mini PC Compose project containers were removed." >&2
    return 1
  fi
  if [[ -n "$remaining_container_ids" ]]; then
    printf 'Containers remain in Mini PC Compose project %s after cleanup; refusing to recreate them.\n' \
      "$project_name" >&2
    return 1
  fi

  return 0
}

restore_legacy_portal() {
  local legacy_status files_restored=true

  printf 'Restoring the previously running portal container %s from Compose project %s.\n' \
    "$legacy_container_id" "$legacy_project_label" >&2
  if ! remove_managed_project_containers; then
    printf '%s\n' "Could not remove the failed Mini PC release; the previous portal remains stopped to avoid a port conflict. Manual recovery is required." >&2
    return 1
  fi

  if [[ "$have_previous_env" == true && "$have_previous_compose" == true ]]; then
    if ! cp -- "$rollback_env_file" "$env_file" || ! cp -- "$rollback_compose_file" "$compose_file"; then
      printf '%s\n' "Could not restore the prior Mini PC release files; the previous portal will still be restarted if possible." >&2
      files_restored=false
    fi
  else
    if ! rm -f -- "$compose_file" "$env_file"; then
      printf '%s\n' "Could not remove the failed Mini PC release files; the previous portal will still be restarted if possible." >&2
      files_restored=false
    fi
  fi

  if ! legacy_status="$(docker inspect --format '{{.State.Status}}' "$legacy_container_id")"; then
    printf 'Could not inspect previous portal container %s; manual recovery is required.\n' "$legacy_container_id" >&2
    return 1
  fi
  if [[ "$legacy_status" != "running" ]] && ! docker start "$legacy_container_id" >/dev/null; then
    printf 'Could not restart previous portal container %s; manual recovery is required.\n' "$legacy_container_id" >&2
    return 1
  fi

  legacy_stopped=false
  if ! wait_for_dashboard_health; then
    printf 'Previous portal container %s did not pass its /healthz check; manual recovery is required.\n' \
      "$legacy_container_id" >&2
    return 1
  fi

  [[ "$files_restored" == true ]]
}

cleanup() {
  local status=$?
  set +e
  if [[ "$deployment_mutation_started" == true && "$deployment_complete" != true && "$rollback_attempted" != true ]]; then
    printf '%s\n' "Deployment ended before completion; attempting rollback." >&2
    if ! restore_previous_release; then
      status=1
    fi
  fi
  docker --config "$docker_config_dir" logout "$container_registry" >/dev/null 2>&1
  rm -rf -- "$docker_config_dir"
  rm -f -- "$new_env_file" "$new_compose_file" "$rollback_env_file" "$rollback_compose_file"
  exit "$status"
}

restore_previous_release() {
  rollback_attempted=true

  if [[ -n "$legacy_container_id" ]]; then
    restore_legacy_portal
    return
  fi

  printf '%s\n' "The Mini PC dashboard release did not pass health checks; restoring its previous release."
  if [[ "$have_previous_env" == true && "$have_previous_compose" == true ]]; then
    if ! remove_managed_project_containers; then
      printf '%s\n' "Could not clean the failed Mini PC containers; previous release files and snapshots remain available for manual recovery." >&2
      return 1
    fi
    if ! cp -- "$rollback_env_file" "$env_file" || ! cp -- "$rollback_compose_file" "$compose_file"; then
      printf '%s\n' "Could not restore the previous Mini PC release files; the rollback snapshots remain available for manual recovery." >&2
      return 1
    fi
    if ! "${compose_cmd[@]}" "${compose_options[@]}" --env-file "$env_file" up --detach dashboard; then
      printf '%s\n' "Automatic restoration failed. The previous image and configuration remain in the Mini PC deployment directory." >&2
      return 1
    elif ! wait_for_dashboard_health; then
      printf '%s\n' "The previous release was restarted but did not pass its /healthz check; manual recovery is required." >&2
      return 1
    fi
  else
    if ! remove_managed_project_containers; then
      printf '%s\n' "Could not remove the failed first release; its Compose files are retained for manual recovery." >&2
      return 1
    fi
    if ! rm -f -- "$env_file" "$compose_file"; then
      printf '%s\n' "The failed first release was stopped, but its Compose files could not be removed." >&2
      return 1
    fi
  fi

  return 0
}

trap cleanup EXIT
trap 'exit 129' HUP
trap 'exit 130' INT
trap 'exit 143' TERM

gateway_status="$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' --max-time 10 \
  "${api_upstream%/}/api/auth/me" || true)"
if [[ "$gateway_status" != "200" && "$gateway_status" != "401" ]]; then
  printf 'The Mini PC Gateway API preflight returned HTTP %s.\n' "$gateway_status" >&2
  exit 1
fi

if [[ -f "$env_file" && -f "$compose_file" ]]; then
  cp -- "$env_file" "$rollback_env_file"
  cp -- "$compose_file" "$rollback_compose_file"
  have_previous_env=true
  have_previous_compose=true
fi

cp -- "$DEPLOY_PACKAGE_DIR/compose-minipc.yaml" "$new_compose_file"
printf 'CLIENT_IMAGE=%s\nMINIPC_TAILSCALE_IP=%s\nMINIPC_CLIENT_PORT=%s\nMINIPC_CLIENT_URL=%s\nMINIPC_GATEWAY_API_URL=%s\nBESU_ADMIN_PORTAL_URL=%s\nCLIENT_CONTAINER_PORT=%s\nCONTAINER_REGISTRY=%s\n' \
  "$image_ref" "$dashboard_bind_address" "$dashboard_port" "$dashboard_url" "$api_upstream" \
  "$admin_portal_url" "$client_container_port" "$container_registry" > "$new_env_file"

if ! "${compose_cmd[@]}" "${staged_compose_options[@]}" config --quiet; then
  printf '%s\n' "The Mini PC dashboard Compose configuration is invalid." >&2
  exit 1
fi

printf '%s' "$REGISTRY_READ_TOKEN" | docker login "$container_registry" --username "$registry_username" --password-stdin
unset REGISTRY_READ_TOKEN

pull_attempt=1
max_pull_attempts=3
until "${compose_cmd[@]}" "${staged_compose_options[@]}" pull dashboard; do
  if (( pull_attempt >= max_pull_attempts )); then
    printf 'Image pull failed after %s attempts; the running Mini PC dashboard was not changed.\n' \
      "$max_pull_attempts" >&2
    exit 1
  fi

  retry_delay=$((pull_attempt * 10))
  printf 'Image pull attempt %s/%s failed; retrying in %s seconds.\n' \
    "$pull_attempt" "$max_pull_attempts" "$retry_delay" >&2
  sleep "$retry_delay"
  pull_attempt=$((pull_attempt + 1))
done

if [[ -n "$legacy_container_id" ]]; then
  deployment_mutation_started=true
  legacy_stopped=true
  if ! docker stop --time 30 "$legacy_container_id" >/dev/null; then
    printf 'Could not stop the verified legacy portal container %s; the running portal was not replaced.\n' \
      "$legacy_container_id" >&2
    exit 1
  fi
else
  deployment_mutation_started=true
fi

cp -- "$new_compose_file" "$compose_file"
cp -- "$new_env_file" "$env_file"

# Compose v1.29.2 can raise KeyError: 'ContainerConfig' while recreating an existing container.
# Remove this project first so both the new release and rollback use a fresh-container path.
if ! remove_managed_project_containers; then
  restore_previous_release || true
  exit 1
fi

if ! "${compose_cmd[@]}" "${compose_options[@]}" --env-file "$env_file" up --detach dashboard; then
  restore_previous_release || true
  exit 1
fi

if ! wait_for_dashboard_health; then
  restore_previous_release || true
  exit 1
fi

api_status="$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' --max-time 10 \
  "$dashboard_url/api/auth/me" || true)"
if [[ "$api_status" != "200" && "$api_status" != "401" ]]; then
  printf 'The Mini PC dashboard API proxy check returned HTTP %s.\n' "$api_status" >&2
  restore_previous_release || true
  exit 1
fi

deployment_complete=true
if [[ -n "$legacy_container_id" ]]; then
  printf 'Previous portal container %s from Compose project %s is stopped and retained for rollback.\n' \
    "$legacy_container_id" "$legacy_project_label"
fi
printf 'Mini PC dashboard deployment healthy at %s (image %s, source %s).\n' "$dashboard_url" "$image_ref" "$image_sha"
