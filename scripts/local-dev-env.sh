#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
backend_repo="${REACT_APP_PLAYGROUND_BACKEND_DIR:-$HOME/ghq/github.com/voice0726/react-app-playground-backend}"
gateway_repo="${AUTH_GATEWAY_DIR:-$HOME/ghq/github.com/voice0726/auth-gateway}"
gateway_token="${AUTH_GATEWAY_INTERNAL_TOKEN:-replace-with-react-internal-token}"
mode="${1:-dev}"
container_engine="${CONTAINER_ENGINE:-docker}"

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

for required_command in "$container_engine" go curl; do
  if ! command -v "$required_command" >/dev/null 2>&1; then
    printf 'Required command not found: %s\n' "$required_command" >&2
    exit 1
  fi
done
if ! "$container_engine" compose version >/dev/null 2>&1; then
  printf '%s compose is not available. Install a Compose provider, or set CONTAINER_ENGINE.\n' "$container_engine" >&2
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
(cd "$gateway_repo" && "$container_engine" compose up -d --wait db zitadel)
printf 'Applying auth-gateway migrations...\n'
(cd "$gateway_repo" && "$container_engine" compose --profile tools run --build --rm migrate)
printf 'Starting auth-gateway...\n'
(cd "$gateway_repo" && "$container_engine" compose up -d --build --wait gateway login)

printf 'Starting backend PostgreSQL...\n'
(cd "$backend_repo" && "$container_engine" compose up -d --wait db)

# e2e モードは通常開発の DB を汚さないよう、使い捨ての database を作り直して使い、終了時に破棄する
e2e_database=""
if [[ "$mode" == e2e ]]; then
  e2e_database="${E2E_DATABASE_NAME:-playground_e2e}"
  if [[ ! "$e2e_database" =~ ^[a-z_][a-z0-9_]*$ ]]; then
    printf 'E2E_DATABASE_NAME must match [a-z_][a-z0-9_]*: %s\n' "$e2e_database" >&2
    exit 2
  fi
  # 起動時と終了時に強制削除するため、通常開発用とシステムの database は指定させない
  case "$e2e_database" in
    playground | postgres | template0 | template1)
      printf 'E2E_DATABASE_NAME must not be a reserved database: %s\n' "$e2e_database" >&2
      exit 2
      ;;
  esac
  export DATABASE_URL="postgres://playground:playground@localhost:5432/${e2e_database}?sslmode=disable"
fi
drop_e2e_database() {
  (cd "$backend_repo" && "$container_engine" compose exec -T db \
    psql -v ON_ERROR_STOP=1 -U playground -d postgres \
    -c "DROP DATABASE IF EXISTS ${e2e_database} WITH (FORCE)") >/dev/null
}

children=()
cleanup() {
  trap - EXIT INT TERM
  local child
  for child in ${children[@]+"${children[@]}"}; do
    kill -TERM -- "-$child" 2>/dev/null || true
  done
  wait 2>/dev/null || true
  if [[ -n "$e2e_database" ]]; then
    drop_e2e_database || printf 'Failed to drop database %s; it will be recreated on the next e2e start.\n' "$e2e_database" >&2
  fi
}
# database を作る前に登録し、migration の失敗や中断でも破棄する
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

if [[ -n "$e2e_database" ]]; then
  printf 'Recreating disposable database %s...\n' "$e2e_database"
  drop_e2e_database
  (cd "$backend_repo" && "$container_engine" compose exec -T db \
    psql -v ON_ERROR_STOP=1 -U playground -d postgres -c "CREATE DATABASE ${e2e_database}") >/dev/null
fi

printf 'Applying backend migrations...\n'
(cd "$backend_repo" && go run ./cmd/migrate up)

# 各サービスを独自のプロセスグループで起動し、終了時にグループごと止める。
# go run と pnpm は孫プロセスにサーバーを起動するため、サブシェルの PID だけでは止まらない。
set -m

health_timeout="${HEALTH_TIMEOUT_SECONDS:-120}"

(cd "$backend_repo" && exec go run ./cmd/api) &
children+=("$!")
deadline=$((SECONDS + health_timeout))
until curl --fail --silent --max-time 2 http://localhost:18080/healthz >/dev/null; do
  if ! kill -0 "${children[0]}" 2>/dev/null; then
    printf 'Backend exited before becoming healthy.\n' >&2
    exit 1
  fi
  if ((SECONDS >= deadline)); then
    printf 'Backend did not become healthy within %ss.\n' "$health_timeout" >&2
    exit 1
  fi
  sleep 1
done

if [[ "$mode" == dev ]]; then
  printf 'Starting frontend at http://react.localtest.me:5174 ...\n'
  (cd "$repo_root" && exec pnpm --filter @playground/web dev) &
  children+=("$!")
else
  printf 'E2E services are ready; start pnpm test:e2e in another terminal.\n'
fi

# いずれかの子プロセスが終了したら、残りを止めて非ゼロで終える
while true; do
  for child in "${children[@]}"; do
    if ! kill -0 "$child" 2>/dev/null; then
      printf 'A service (pid %s) exited; stopping the others.\n' "$child" >&2
      exit 1
    fi
  done
  sleep 1
done
