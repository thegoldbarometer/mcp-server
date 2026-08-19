# The Gold Barometer MCP server

Gives AI assistants direct access to [The Gold Barometer](https://thegoldbarometer.com/):
a daily 0-100 score of gold buying conditions, compared with every trading day since 1971.

It measures conditions. It is not advice, and it does not predict the price.

## Tools

| Tool | What it answers |
|---|---|
| `get_current_reading` | Today's score, its zone, and the state of each measured part |
| `get_reading_history` | Past readings, with or without the reconstructed month-end rows |
| `get_zone_record` | What followed months in a given zone across the record since 1971 |

## Install

Runs on Node 18 or newer. Add to your MCP client configuration:

```json
{
  "mcpServers": {
    "thegoldbarometer": {
      "command": "npx",
      "args": ["-y", "thegoldbarometer-mcp"]
    }
  }
}
```

No key, no signup. The server only reads public endpoints.

## Data and credit

All figures come from the public API at [thegoldbarometer.com/data](https://thegoldbarometer.com/data/)
and the archive at [github.com/thegoldbarometer/data](https://github.com/thegoldbarometer/data).
Data licence: CC BY 4.0, credit "Source: The Gold Barometer, thegoldbarometer.com".
Method, evidence and limits: [thegoldbarometer.com/methodology](https://thegoldbarometer.com/methodology/).

Code licence: MIT.
