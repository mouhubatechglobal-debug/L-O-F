#!/bin/sh
set -eu
if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL manquant" >&2
  exit 1
fi
mkdir -p backups
stamp=$(date -u +%Y%m%dT%H%M%SZ)
out="backups/lof-${stamp}.dump"
pg_dump "$DATABASE_URL" --format=custom --no-owner --file "$out"
echo "$out"
