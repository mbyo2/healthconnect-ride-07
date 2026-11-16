#!/bin/bash
# Private copy of ~/.qa-work/docsql.sh: uses a unique temp file per call.
# The shared /tmp/_q.json races when 6 swarm groups run docsql.sh at once
# (stale/empty query file -> "Invalid input" or re-executed old statements).
# usage: docsql-provider.sh <file.sql>
TOKEN=$(cat ~/.supabase-relay/token)
Q=$(mktemp /tmp/_q_provider_XXXXXX.json)
python3 - "$1" <<'PYEOF' > "$Q"
import json,sys
print(json.dumps({"query": open(sys.argv[1]).read()}))
PYEOF
curl -sS --max-time 120 -X POST "https://api.supabase.com/v1/projects/tthzcijscedgxjfnfnky/database/query" -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d @"$Q"
echo
rm -f "$Q"
