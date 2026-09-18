#!/usr/bin/env bash
# JSON-RPC over HTTP against BASE (default: local wrangler dev).
set -euo pipefail
BASE="${1:-http://127.0.0.1:8787}"
H=(-H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" -H "MCP-Protocol-Version: 2025-06-18")
post() { curl -s -m 30 "${H[@]}" -X POST "$BASE/mcp" -d "$1"; }
code() { curl -s -o /dev/null -w "%{http_code}" -m 30 "$@"; }

[ "$(code "$BASE/health")" = 200 ] && curl -s "$BASE/health" | grep -q '"tools":3' && echo "health OK"
[ "$(code "$BASE/")" = 200 ] && echo "root OK"
[ "$(code -X GET "${H[@]}" "$BASE/mcp")" = 405 ] && echo "GET /mcp 405 OK"
[ "$(code -X DELETE "${H[@]}" "$BASE/mcp")" = 405 ] && echo "DELETE /mcp 405 OK"
[ "$(code "$BASE/nothing")" = 404 ] && echo "404 OK"

post '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"smoke","version":"0"}}}' | grep -q '"serverInfo"' && echo "initialize OK"
post '{"jsonrpc":"2.0","id":2,"method":"tools/list"}' > /tmp/smoke_http_tools.json
grep -q '"get_zone_record"' /tmp/smoke_http_tools.json && echo "tools/list OK"
[ "$(python3 -c 'import json; print(len(json.load(open("/tmp/smoke_http_tools.json"))["result"]["tools"]))')" = 3 ] && echo "3 tools OK"
post '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"get_current_reading","arguments":{}}}' | grep -q 'score' && echo "get_current_reading OK"
post '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"get_reading_history","arguments":{"limit":3}}}' | grep -q 'rows' && echo "get_reading_history OK"
post '{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"get_zone_record","arguments":{"zone":"Mixed"}}}' | grep -q 'months_on_record' && echo "get_zone_record OK"
post 'not json' | grep -qiE 'error|parse' && echo "bad json -> error OK"
echo "smoke http: OK"
