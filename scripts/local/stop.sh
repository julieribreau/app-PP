#!/usr/bin/env bash
# Arrête ce que scripts/local/test-ios.sh a lancé (API, site, Metro, infra docker).
cd "$(dirname "$0")/../.."
for f in .local-test/backend.pid .local-test/web.pid; do
  [ -f "$f" ] && kill "$(cat "$f")" 2>/dev/null; rm -f "$f"
done
pkill -f "nest start" 2>/dev/null
pkill -f "next dev" 2>/dev/null
pkill -f "expo start" 2>/dev/null
docker compose stop
