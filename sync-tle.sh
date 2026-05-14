#!/usr/bin/env bash
set -e

cd "$(dirname "$0")"

echo "🛰  Synchronisation TLE — $(date '+%Y-%m-%d %H:%M:%S')"
docker compose exec php php -d memory_limit=256M bin/console orbitview:fetch-tle --env=prod
echo "✅ Sync terminée."
