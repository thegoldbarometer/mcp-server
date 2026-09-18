#!/usr/bin/env bash
# Talks JSON-RPC to the built stdio server and checks the three tools answer.
set -euo pipefail
cd "$(dirname "$0")/.."
node dist/index.js <<'EOF' > /tmp/smoke_stdio.out 2>/tmp/smoke_stdio.err
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}}}
{"jsonrpc":"2.0","method":"notifications/initialized"}
{"jsonrpc":"2.0","id":2,"method":"tools/list"}
{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"get_current_reading","arguments":{}}}
{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"get_reading_history","arguments":{"limit":3}}}
{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"get_zone_record","arguments":{"zone":"Unfavorable"}}}
EOF
[ "$(grep -c '"id":2' /tmp/smoke_stdio.out)" = 1 ]
grep -q '"get_current_reading"' /tmp/smoke_stdio.out
grep -q '"get_reading_history"' /tmp/smoke_stdio.out
grep -q '"get_zone_record"' /tmp/smoke_stdio.out
grep -q 'score' /tmp/smoke_stdio.out
grep -q 'rows' /tmp/smoke_stdio.out
grep -q 'months_on_record' /tmp/smoke_stdio.out
echo "smoke stdio: OK"
