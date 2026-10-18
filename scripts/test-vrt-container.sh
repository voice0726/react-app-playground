#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
case "${1:-}" in
  '') vrt_command='test:vrt' ;;
  --update-snapshots) vrt_command='test:vrt:update' ;;
  *) echo 'Usage: scripts/test-vrt-container.sh [--update-snapshots]' >&2; exit 2 ;;
esac
if (( $# > 1 )); then
  echo 'Usage: scripts/test-vrt-container.sh [--update-snapshots]' >&2
  exit 2
fi

stage=$(mktemp -d)
stage=$(cd "$stage" && pwd -P)
trap 'rm -rf "$stage"' EXIT
node --input-type=module - "$stage" <<'NODE'
import { cpSync, mkdirSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
const stage = process.argv[2]
const entries = [
  'apps/web/src', 'apps/web/public', 'apps/web/index.html',
  'apps/web/package.json', 'apps/web/vite.config.ts', 'apps/web/tsconfig.json',
  'packages/lint-config', 'package.json', 'pnpm-lock.yaml',
  'pnpm-workspace.yaml', 'tests',
]
for (const entry of entries) {
  const destination = join(stage, entry)
  mkdirSync(dirname(destination), { recursive: true })
  cpSync(entry, destination, {
    recursive: true,
    filter: (source) => !['node_modules', 'fixtures'].includes(basename(source)),
  })
}
NODE

version=$(node -p 'require("./apps/web/package.json").devDependencies["@playwright/test"]')
status=0
podman run --rm --pull=always --shm-size=1g \
  -e CI=true -v "$stage:/work" -w /work \
  "mcr.microsoft.com/playwright:v${version}-noble" \
  sh -c 'corepack enable && pnpm install --frozen-lockfile && pnpm "$1"' sh "$vrt_command" || status=$?

for report in playwright-report test-results; do
  if [[ -d "$stage/$report" ]]; then
    mkdir -p "$report"
    cp -R "$stage/$report/." "$report/"
  fi
done
if [[ "$status" == 0 && "$vrt_command" == 'test:vrt:update' ]]; then
  mkdir -p tests/screenshots/linux
  cp -R "$stage/tests/screenshots/linux/." tests/screenshots/linux/
fi
exit "$status"
