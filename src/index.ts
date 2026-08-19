#!/usr/bin/env node
/**
 * MCP server for The Gold Barometer (thegoldbarometer.com).
 * Read-only tools over the public JSON data. No key, no auth.
 * Data licence: CC BY 4.0, credit "The Gold Barometer, thegoldbarometer.com".
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const SITE = "https://thegoldbarometer.com";
const ARCHIVE_RAW = "https://raw.githubusercontent.com/thegoldbarometer/data/main";
const IDENTITY = "It measures conditions. It is not advice, and it does not predict the price.";

async function getJson(url: string): Promise<any> {
  const res = await fetch(url, { headers: { "user-agent": "thegoldbarometer-mcp/1.0" } });
  if (!res.ok) throw new Error(`${url} answered ${res.status}`);
  return res.json();
}

async function getText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "user-agent": "thegoldbarometer-mcp/1.0" } });
  if (!res.ok) throw new Error(`${url} answered ${res.status}`);
  return res.text();
}

const asText = (value: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(value, null, 2) }],
});

const server = new McpServer({ name: "thegoldbarometer", version: "1.0.0" });

server.tool(
  "get_current_reading",
  "Today's Gold Barometer reading: the 0-100 gold buying-conditions score, its zone, " +
    "and the state of each measured part. Updated daily after the US market closes. " +
    IDENTITY,
  {},
  async () => {
    const d = await getJson(`${SITE}/data/latest.json`);
    const parts: Record<string, unknown> = {};
    for (const [key, p] of Object.entries<any>(d.pillars ?? {})) {
      parts[key] = {
        available: p.available,
        subscore: p.subscore ?? null,
        weight_effective_pct: p.weight_effective ?? 0,
        newest_figure_date: p.latest_date ?? null,
        source: p.source ?? null,
      };
    }
    return asText({
      date: d.date,
      score: d.score,
      zone: d.zone,
      zone_bands: "0-19 Historically very unfavorable, 20-39 Unfavorable, 40-59 Mixed, 60-79 Favorable, 80-100 Historically very favorable",
      parts_used: `${d.pillars_used} of ${d.pillars_total}`,
      parts,
      methodology: `${SITE}/methodology/`,
      note: IDENTITY,
      credit: "Source: The Gold Barometer, thegoldbarometer.com (CC BY 4.0)",
    });
  },
);

server.tool(
  "get_reading_history",
  "Past Gold Barometer readings, oldest first. Daily published readings by default; " +
    "set include_reconstructed to true to add month-end context rows rebuilt back to 2019. " +
    "The monthly record back to 1971 lives in the public archive.",
  {
    include_reconstructed: z
      .boolean()
      .default(false)
      .describe("Also return month-end reconstructions (rows marked backfilled)."),
    limit: z
      .number()
      .int()
      .min(1)
      .max(1000)
      .default(90)
      .describe("Newest rows to return."),
  },
  async ({ include_reconstructed, limit }) => {
    const rows: any[] = await getJson(`${SITE}/data/history.json`);
    const kept = include_reconstructed ? rows : rows.filter((r) => !r.backfilled);
    return asText({
      rows: kept.slice(-limit),
      full_monthly_record_since_1971: `${ARCHIVE_RAW}/backtest/monthly_scores.csv`,
      credit: "Source: The Gold Barometer, thegoldbarometer.com (CC BY 4.0)",
    });
  },
);

server.tool(
  "get_zone_record",
  "What followed months that read like a given zone, across the reconstructed record " +
    "since 1971: median gold move 1 and 5 years later, before and after inflation, " +
    "with the month count behind each figure. " + IDENTITY,
  {
    zone: z
      .enum([
        "Historically very unfavorable",
        "Unfavorable",
        "Mixed",
        "Favorable",
        "Historically very favorable",
      ])
      .optional()
      .describe("A zone name. Omit to get every zone."),
  },
  async ({ zone }) => {
    const csv = await getText(`${ARCHIVE_RAW}/backtest/band_stats.csv`);
    const lines = csv.trim().split(/\r?\n/);
    const header = lines[0].split(",");
    const col = (name: string) => header.indexOf(name);
    const out = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(",");
      if (zone && parts[0] !== zone) continue;
      const num = (name: string) => {
        const v = parts[col(name)];
        return v === "" || v == null ? null : Number(v);
      };
      out.push({
        zone: parts[0],
        band: parts[1],
        months_on_record: Number(parts[2]) || 0,
        median_1y_pct: num("median_fwd_1y_pct"),
        median_5y_pct: num("median_fwd_5y_pct"),
        median_1y_after_inflation_pct: num("median_fwd_1y_real_pct"),
        median_5y_after_inflation_pct: num("median_fwd_5y_real_pct"),
      });
    }
    return asText({
      zones: out,
      caution: "At one year, no zone separates from the others. Medians describe the past record, not the future.",
      methodology: `${SITE}/methodology/`,
      uncertainty_ranges: `${SITE}/history/`,
      credit: "Source: The Gold Barometer, thegoldbarometer.com (CC BY 4.0)",
    });
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
