# mcp-aviation-weather

Aviation Weather MCP — METAR, TAF, PIREPs, AIRMET/SIGMET, station info

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1160+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `metar` | METAR observations. ids = comma-sep ICAO codes (KSFO,EGLL,LFPG). |
| `taf` | Terminal Aerodrome Forecast (TAF) for one or more ICAO airport codes (e.g. KSFO,EGLL); returns forecast periods covering wind, visibility, and cloud ceilings for the next 24–30 h. |
| `pirep` | Pilot reports (PIREPs). Call with no args for recent US-wide reports (default CONUS box), or pass a station `id` for reports within `distance_nm` of it, or a custom `bbox`. |
| `sigmet` | Fetch all currently active SIGMETs (significant en-route weather hazards: convection, turbulence, icing, volcanic ash) from the US Aviation Weather Center; no inputs required. |
| `airmet` | Fetch all currently active AIRMETs (moderate turbulence, icing, IFR/mountain-obscuration advisories for general aviation) from the US Aviation Weather Center; no inputs required. |
| `gairmet` | Fetch Graphical AIRMETs from the US Aviation Weather Center; optionally filter by type (turb, ice, sfc_winds, lifr, ifr); returns GeoJSON-style hazard polygons. |
| `windsaloft` | Winds and temperatures aloft forecast from the US Aviation Weather Center; specify US region (us/bos/mia/chi/dfw/slc/sfo/alaska) and level (low/high); returns an ASCII table or JSON. |
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

Or connect to the full Pipeworx gateway for access to all 1160+ data sources:

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
