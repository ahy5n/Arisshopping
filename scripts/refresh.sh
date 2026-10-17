#!/bin/bash
# Twice-weekly catalogue refresh (Tue + Fri, via launchd): crawl every shop from
# this Mac's home connection, then upload to Supabase for the live site.
# Run by hand any time:  ./scripts/refresh.sh
cd "$(dirname "$0")/.." || exit 1
export PATH="$PWD/tools/node/bin:/usr/bin:/bin"
mkdir -p logs
{
  echo "=== $(date '+%a %d %b %Y %H:%M') ==="
  # keep the Mac awake until it's finished
  caffeinate -i npm run -s nightly
  echo "=== finished $(date '+%H:%M'), exit $? ==="
} >> logs/refresh.log 2>&1
