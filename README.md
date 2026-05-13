# mcp-aviation-weather

Aviation Weather MCP — METAR, TAF, PIREPs, AIRMET/SIGMET, station info

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 250+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `metar` | METAR observations. ids = comma-sep ICAO codes (KSFO,EGLL,LFPG). |
| `taf` | Terminal Aerodrome Forecasts. |
| `pirep` | Pilot reports. Optional id (station), age (hours), distance (NM), level (flight level). |
| `sigmet` | Currently active SIGMETs. |
| `airmet` | Currently active AIRMETs. |
| `gairmet` | Graphical AIRMETs. |
| `windsaloft` | Winds aloft forecast. |
| `stationinfo` | Aerodrome metadata — lat/lon, elevation, country. |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "aviation-weather": {
      "url": "https://gateway.pipeworx.io/aviation-weather/mcp"
    }
  }
}
```

Or connect to the full Pipeworx gateway for access to all 250+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Aviation Weather data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [All tools and guides](https://github.com/pipeworx-io/examples)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
