/**
 * Hosted MCP endpoint for The Gold Barometer: https://mcp.thegoldbarometer.com/mcp
 * Cloudflare Worker, stateless Streamable HTTP, JSON responses, no key.
 * Same three tools as the npm package (tools.ts). Per-IP rate limit.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { registerTools, SERVER_INFO } from "./tools.js";

interface Env {
  RL?: { limit(opts: { key: string }): Promise<{ success: boolean }> };
}

const ROOT_TEXT =
  `The Gold Barometer MCP endpoint.\n` +
  `POST JSON-RPC (Model Context Protocol, Streamable HTTP) to /mcp. No key.\n` +
  `Tools: get_current_reading, get_reading_history, get_zone_record.\n` +
  `Local alternative: npx thegoldbarometer-mcp (npm). Data and method: https://thegoldbarometer.com/data/\n` +
  `Data licence CC BY 4.0, credit "The Gold Barometer, thegoldbarometer.com". A measurement, not advice.\n`;

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/" && request.method === "GET") {
      return new Response(ROOT_TEXT, { headers: { "content-type": "text/plain; charset=utf-8" } });
    }
    if (url.pathname === "/health" && request.method === "GET") {
      return json({ ok: true, tools: 3, version: SERVER_INFO.version });
    }
    if (url.pathname !== "/mcp") return new Response("not found", { status: 404 });
    if (request.method !== "POST") {
      return new Response("method not allowed: this endpoint is stateless, POST JSON-RPC to /mcp", {
        status: 405,
        headers: { allow: "POST" },
      });
    }
    if (env.RL) {
      const ip = request.headers.get("cf-connecting-ip") || "unknown";
      const { success } = await env.RL.limit({ key: ip });
      if (!success) {
        return json(
          { jsonrpc: "2.0", id: null, error: { code: -32000, message: "rate limited: 60 requests per minute per IP" } },
          429,
          { "retry-after": "60" },
        );
      }
    }
    const server = new McpServer(SERVER_INFO);
    registerTools(server);
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    await server.connect(transport);
    try {
      return await transport.handleRequest(request);
    } finally {
      await transport.close().catch(() => {});
    }
  },
};
