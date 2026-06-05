#!/usr/bin/env bash
# Apply RLS + Realtime SQL policies. Requires DATABASE_URL or first argument.
set -euo pipefail

DATABASE_URL="${1:-${DATABASE_URL:-}}"
if [ -z "$DATABASE_URL" ]; then
  echo "Usage: DATABASE_URL=... $0" >&2
  echo "   or: $0 'postgresql://...'" >&2
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "Applying RLS policies..."
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$ROOT_DIR/scripts/enable-rls.sql"

echo "Applying Realtime publication..."
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$ROOT_DIR/scripts/enable-realtime.sql"

echo "Database policies applied successfully."
