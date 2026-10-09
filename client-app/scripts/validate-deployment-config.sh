#!/usr/bin/env bash

set -Eeuo pipefail

fail() {
  printf '%s\n' "$1" >&2
  exit 1
}

require_variables() {
  local name
  for name in "$@"; do
    if [[ -z "${!name:-}" ]]; then
      fail "Missing required development environment variable: $name"
    fi
  done
}

validate_port() {
  local name="$1"
  local value="${!name}"
  local number

  [[ "$value" =~ ^[0-9]{1,5}$ ]] || fail "$name must be a numeric port."
  number=$((10#$value))
  (( number >= 1 && number <= 65535 )) || fail "$name is outside the valid port range."
}

validate_container_port() {
  validate_port CLIENT_CONTAINER_PORT
  (( 10#$CLIENT_CONTAINER_PORT >= 1024 )) || fail "CLIENT_CONTAINER_PORT must allow an unprivileged NGINX listener."
}

validate_http_url() {
  local name="$1"
  local value="${!name}"

  [[ "$value" =~ ^https?://[^/[:space:]]+(/[[:graph:]]*)?$ ]] || \
    fail "$name must be an absolute HTTP or HTTPS URL."
}

validate_ipv4() {
  local name="$1"
  local value="${!name}"
  local octet
  local -a octets=()

  [[ "$value" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]] || fail "$name must be an IPv4 address."
  IFS=. read -r -a octets <<< "$value"
  for octet in "${octets[@]}"; do
    (( 10#$octet <= 255 )) || fail "$name contains an invalid IPv4 octet."
  done
}

mode="${1:-deploy}"
case "$mode" in
  build)
    require_variables BESU_ADMIN_PORTAL_URL CLIENT_CONTAINER_PORT
    validate_http_url BESU_ADMIN_PORTAL_URL
    validate_container_port
    ;;
  deploy)
    require_variables \
      MINIPC_TAILSCALE_IP \
      MINIPC_CLIENT_PORT \
      MINIPC_CLIENT_URL \
      MINIPC_GATEWAY_API_URL \
      MINIPC_LEGACY_COMPOSE_DIR \
      BESU_ADMIN_PORTAL_URL \
      CONTAINER_REGISTRY \
      CLIENT_CONTAINER_PORT \
      MINIPC_SSH_USERNAME \
      MINIPC_SSH_PORT

    validate_ipv4 MINIPC_TAILSCALE_IP
    validate_port MINIPC_CLIENT_PORT
    validate_container_port
    validate_port MINIPC_SSH_PORT
    validate_http_url BESU_ADMIN_PORTAL_URL
    validate_http_url MINIPC_GATEWAY_API_URL

    [[ "$MINIPC_LEGACY_COMPOSE_DIR" == /* && "$MINIPC_LEGACY_COMPOSE_DIR" != *$'\n'* && \
      "$MINIPC_LEGACY_COMPOSE_DIR" != *$'\r'* ]] || \
      fail "MINIPC_LEGACY_COMPOSE_DIR must be the absolute Compose working directory from the legacy container inspect labels."

    [[ "$MINIPC_GATEWAY_API_URL" =~ ^https?://[A-Za-z0-9.-]+(:[0-9]{1,5})?$ ]] || \
      fail "MINIPC_GATEWAY_API_URL must be an HTTP or HTTPS origin without a path."

    gateway_authority="${MINIPC_GATEWAY_API_URL#*://}"
    gateway_host="${gateway_authority%%:*}"
    [[ "$gateway_host" == "$MINIPC_TAILSCALE_IP" ]] || \
      fail "MINIPC_GATEWAY_API_URL must use the Mini PC Tailscale address."

    expected_client_url="http://${MINIPC_TAILSCALE_IP}:${MINIPC_CLIENT_PORT}"
    [[ "$MINIPC_CLIENT_URL" == "$expected_client_url" ]] || \
      fail "MINIPC_CLIENT_URL must match MINIPC_TAILSCALE_IP and MINIPC_CLIENT_PORT."

    [[ "$CONTAINER_REGISTRY" =~ ^[A-Za-z0-9.-]+(:[0-9]{1,5})?$ ]] || \
      fail "CONTAINER_REGISTRY must be a registry hostname with an optional port."
    [[ "$MINIPC_SSH_USERNAME" =~ ^[A-Za-z0-9._-]+$ ]] || \
      fail "MINIPC_SSH_USERNAME contains unsupported characters."
    ;;
  *)
    fail "Usage: validate-deployment-config.sh [build|deploy]"
    ;;
esac

printf 'Development deployment configuration passed (%s mode).\n' "$mode"
