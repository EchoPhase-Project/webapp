#!/usr/bin/env bash
# Fails if dist/ (a build without VITE_DEV_TOOLS=true) has a developer aid in
# it: the /dev playground or the TanStack Query devtools. Run after the build
# (`mise run check` does). A marker of each: the playground's index title and
# a page path, the devtools' export and their CSS class prefix.
set -euo pipefail
cd "$(dirname "$0")/.."

[ -d dist ] || { echo "no dist/: run npm run build first" >&2; exit 1; }

markers='Dev playground|/dev/buttons|SolidQueryDevtools|tsqd-'
found=$(grep -rlE --exclude='*.gz' "$markers" dist || true)
if [ -n "$found" ]; then
    echo "dist/ has the dev tools in it (was it built with VITE_DEV_TOOLS=true?):" >&2
    echo "$found" >&2
    exit 1
fi
echo "dist/: no dev tools"
