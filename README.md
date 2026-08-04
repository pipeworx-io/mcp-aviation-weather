# @pipeworx/aviation-weather

aviationweather.gov MCP — METAR, TAF, PIREPs, AIRMET/SIGMET, NOTAMs from the US NWS Aviation Weather Center. Global coverage for many products. No auth.

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

## Tools

- `metar(ids, hours_before?, format?)` — current/recent METAR observations
- `taf(ids, hours_before?, format?)` — terminal aerodrome forecasts
- `pirep(id?, age?, distance_nm?, level?)` — pilot reports
- `sigmet(format?)` — SIGMETs (significant met advisories)
- `airmet(format?)` — AIRMETs
- `windsaloft(region?, level?)` — winds aloft forecast
- `gairmet(format?, type?)` — graphical AIRMETs
- `stationinfo(ids)` — aerodrome lat/lon, elevation, country

## Data source

`https://aviationweather.gov/api/data/` — `format=json` for structured output.

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

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

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

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
