#!/usr/bin/env node
/**
 * MCP server for The Gold Barometer (thegoldbarometer.com), stdio transport
 * for the npm package. The tools live in tools.ts, shared with the hosted
 * endpoint at https://mcp.thegoldbarometer.com/mcp.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTools, SERVER_INFO } from "./tools.js";

const server = new McpServer(SERVER_INFO);
registerTools(server);
const transport = new StdioServerTransport();
await server.connect(transport);
