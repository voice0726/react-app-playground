#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
backend_repo="${REACT_APP_PLAYGROUND_BACKEND_DIR:-$HOME/ghq/github.com/voice0726/react-app-playground-backend}"
gateway_repo="${AUTH_GATEWAY_DIR:-$HOME/ghq/github.com/voice0726/auth-gateway}"
gateway_token="${AUTH_GATEWAY_INTERNAL_TOKEN:-replace-with-react-internal-token}"
mode="${1:-dev}"

if [[ "$mode" != dev && "$mode" != e2e ]]; then
  printf 'Usage: bash scripts/local-dev-env.sh [dev|e2e]\n' >&2
  exit 2
fi

for required_path in "$backend_repo/docker-compose.yml" "$gateway_repo/docker-compose.yaml"; do
  if [[ ! -f "$required_path" ]]; then
    printf 'Required repository file not found: %s\n' "$required_path" >&2
    exit 1
  fi
done

for required_command in podman go curl; do
  if ! command -v "$required_command" >/dev/null 2>&1; then
    printf 'Required command not found: %s\n' "$required_command" >&2
    exit 1
  fi
done
if ! podman compose version >/dev/null 2>&1; then
  printf 'podman compose is not available. Install a Podman Compose provider.\n' >&2
  exit 1
fi
if [[ "$mode" == dev ]] && ! command -v pnpm >/dev/null 2>&1; then
  printf 'Required command not found: pnpm\n' >&2
  exit 1
fi

export SERVER_ADDR=:18080
export DATABASE_URL="${DATABASE_URL:-postgres://playground:playground@localhost:5432/playground?sslmode=disable}"
export DB_CONNECT_TIMEOUT="${DB_CONNECT_TIMEOUT:-180s}"
export AUTH_GATEWAY_URL=http://localhost:8800
export AUTH_GATEWAY_INTERNAL_TOKEN="$gateway_token"
export PUBLIC_ORIGIN=http://react.localtest.me:5174
export AUTH_GATEWAY_TIMEOUT="${AUTH_GATEWAY_TIMEOUT:-2s}"
export SHUTDOWN_TIMEOUT="${SHUTDOWN_TIMEOUT:-5s}"
export LOG_LEVEL="${LOG_LEVEL:-info}"
export LOG_FORMAT="${LOG_FORMAT:-text}"
export VITE_USE_MSW=false
export VITE_DISABLE_DEVTOOLS=true
export VITE_BACKEND_URL=http://localhost:18080
export VITE_AUTH_GATEWAY_URL=http://localhost:8800

printf 'Starting auth-gateway PostgreSQL and ZITADEL...\n'
(cd "$gateway_repo" && podman compose up -d --wait db zitadel)
printf 'Applying auth-gateway migrations...\n'
(cd "$gateway_repo" && podman compose --profile tools run --build --rm migrate)
printf 'Starting auth-gateway...\n'
(cd "$gateway_repo" && podman compose up -d --build --wait gateway login)

printf 'Starting backend PostgreSQL...\n'
(cd "$backend_repo" && podman compose up -d --wait db)
printf 'Applying backend migrations...\n'
(cd "$backend_repo" && go run ./cmd/migrate up)

children=()
cleanup() {
  local child
  for child in "${children[@]}"; do
    kill "$child" 2>/dev/null || true
  done
  wait 2>/dev/null || true
}
trap cleanup EXIT INT TERM

(cd "$backend_repo" && go run ./cmd/api) &
children+=("$!")
until curl --fail --silent http://localhost:18080/healthz >/dev/null; do
  if ! kill -0 "${children[0]}" 2>/dev/null; then
    printf 'Backend exited before becoming healthy.\n' >&2
    exit 1
  fi
  sleep 1
done

if [[ "$mode" == dev ]]; then
  printf 'Starting frontend at http://react.localtest.me:5174 ...\n'
  (cd "$repo_root" && pnpm --filter @playground/web dev) &
  children+=("$!")
else
  printf 'E2E services are ready; start pnpm test:e2e in another terminal.\n'
fi
wait
