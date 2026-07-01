interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * Aviation Weather MCP — METAR, TAF, PIREPs, AIRMET/SIGMET, station info
 *
 * Source: aviationweather.gov (US NWS Aviation Weather Center).
 * Auth: none.
 *
 * Most endpoints accept format=json; some only return raw text — we still
 * return them wrapped as { format, body }.
 */


const BASE = 'https://aviationweather.gov/api/data';

const tools: McpToolExport['tools'] = [
  {
    name: 'metar',
    description: 'METAR observations. ids = comma-sep ICAO codes (KSFO,EGLL,LFPG).',
    inputSchema: {
      type: 'object',
      properties: {
        ids: { type: 'string', description: 'Comma-separated ICAO airport codes' },
        hours_before: { type: 'number', description: 'How far back to look, 1-24 (default 1)' },
        format: { type: 'string', description: 'json (default) | raw | xml | html' },
      },
      required: ['ids'],
    },
  },
  {
    name: 'taf',
    description: 'Terminal Aerodrome Forecast (TAF) for one or more ICAO airport codes (e.g. KSFO,EGLL); returns forecast periods covering wind, visibility, and cloud ceilings for the next 24–30 h.',
    inputSchema: {
      type: 'object',
      properties: {
        ids: { type: 'string', description: 'Comma-separated ICAO codes' },
        hours_before: { type: 'number', description: '1-24 (default 12)' },
        format: { type: 'string', description: 'json (default) | raw' },
      },
      required: ['ids'],
    },
  },
  {
    name: 'pirep',
    description: 'Pilot reports (PIREPs). Call with no args for recent US-wide reports (default CONUS box), or pass a station `id` for reports within `distance_nm` of it, or a custom `bbox`.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Center station for a proximity filter (e.g. "KORD"); reports within distance_nm of it.' },
        distance_nm: { type: 'number', description: 'Radius from `id` in nautical miles (default 200). Only used with `id`.' },
        bbox: { type: 'string', description: 'Bounding box "minLat,minLon,maxLat,maxLon" (default CONUS "20,-130,55,-60" when no id).' },
        age: { type: 'number', description: 'Lookback hours, default 1.5' },
        level: { type: 'number', description: 'Flight level filter (FL310 = 310)' },
        format: { type: 'string', description: 'json (default) | raw' },
      },
    },
  },
  {
    name: 'sigmet',
    description: 'Fetch all currently active SIGMETs (significant en-route weather hazards: convection, turbulence, icing, volcanic ash) from the US Aviation Weather Center; no inputs required.',
    inputSchema: {
      type: 'object',
      properties: { format: { type: 'string', description: 'json (default) | raw' } },
    },
  },
  {
    name: 'airmet',
    description: 'Fetch all currently active AIRMETs (moderate turbulence, icing, IFR/mountain-obscuration advisories for general aviation) from the US Aviation Weather Center; no inputs required.',
    inputSchema: {
      type: 'object',
      properties: { format: { type: 'string' } },
    },
  },
  {
    name: 'gairmet',
    description: 'Fetch Graphical AIRMETs from the US Aviation Weather Center; optionally filter by type (turb, ice, sfc_winds, lifr, ifr); returns GeoJSON-style hazard polygons.',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', description: 'turb | ice | sfc_winds | lifr | ifr (default any)' },
        format: { type: 'string' },
      },
    },
  },
  {
    name: 'windsaloft',
    description: 'Winds and temperatures aloft forecast from the US Aviation Weather Center; specify US region (us/bos/mia/chi/dfw/slc/sfo/alaska) and level (low/high); returns an ASCII table or JSON.',
    inputSchema: {
      type: 'object',
      properties: {
        region: { type: 'string', description: 'us | bos | mia | chi | dfw | slc | sfo | alaska' },
        level: { type: 'string', description: 'low | high (default low)' },
      },
    },
  },
  {
    name: 'stationinfo',
    description: 'Aerodrome metadata — lat/lon, elevation, country.',
    inputSchema: {
      type: 'object',
      properties: { ids: { type: 'string', description: 'Comma-separated ICAO codes' } },
      required: ['ids'],
    },
  },
];

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'metar':
      return fetchAW('/metar', {
        ids: reqStr(args, 'ids', '"KSFO"'),
        hours: String((args.hours_before as number) ?? 1),
        format: String(args.format ?? 'json'),
      });
    case 'taf':
      return fetchAW('/taf', {
        ids: reqStr(args, 'ids', '"KSFO"'),
        hours: String((args.hours_before as number) ?? 12),
        format: String(args.format ?? 'json'),
      });
    case 'pirep': {
      // The API REQUIRES either a station id + radial distance OR a bounding
      // box — a bare /pirep 400s ("Must specify bounding box or stations ID and
      // radial distance"). So: with `id`, always send a distance (default 200);
      // without `id`, default to a CONUS bbox so a bare pirep() returns US-wide
      // reports instead of an error.
      const params: Record<string, string> = { format: String(args.format ?? 'json') };
      if (args.age !== undefined) params.age = String(args.age);
      if (args.level !== undefined) params.level = String(args.level);
      if (args.id) {
        params.id = String(args.id);
        params.distance = String(args.distance_nm ?? 200);
      } else {
        params.bbox = typeof args.bbox === 'string' && args.bbox.trim() ? String(args.bbox) : '20,-130,55,-60';
      }
      return fetchAW('/pirep', params);
    }
    // The API's `hazard` param no longer accepts sigmet/airmet ("Invalid value
    // for hazard" 400 — it means conv/turb/ice now), and server-side `type`
    // filtering is unreliable. Fetch all air/sigmets and filter client-side on
    // the airSigmetType field.
    case 'sigmet': {
      const all = await fetchAW('/airsigmet', { format: 'json' });
      return Array.isArray(all) ? all.filter((x: Record<string, unknown>) => String(x.airSigmetType).toUpperCase() === 'SIGMET') : all;
    }
    case 'airmet': {
      const all = await fetchAW('/airsigmet', { format: 'json' });
      return Array.isArray(all) ? all.filter((x: Record<string, unknown>) => String(x.airSigmetType).toUpperCase() === 'AIRMET') : all;
    }
    case 'gairmet': {
      const params: Record<string, string> = { format: String(args.format ?? 'json') };
      if (args.type) params.type = String(args.type);
      return fetchAW('/gairmet', params);
    }
    case 'windsaloft': {
      const params: Record<string, string> = {
        region: String(args.region ?? 'us'),
        level: String(args.level ?? 'low'),
      };
      return fetchAW('/windtemp', params);
    }
    case 'stationinfo':
      return fetchAW('/stationinfo', {
        ids: reqStr(args, 'ids', '"KSFO"'),
        format: 'json',
      });
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

async function fetchAW(path: string, paramsObj: Record<string, string>) {
  const params = new URLSearchParams(paramsObj);
  const url = `${BASE}${path}?${params}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'pipeworx-mcp-aviation-weather/1.0 (+https://pipeworx.io)' },
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Aviation Weather error: ${res.status} ${t.slice(0, 200)}`);
  }
  const format = paramsObj.format ?? 'json';
  if (format === 'json') {
    // Read once as text, then attempt JSON parse on the string. The earlier
    // version called res.json() then fell through to res.text() on parse
    // failure — but res.json() consumes the body, so the fallback hit
    // "Body has already been used". Reading text first avoids that and
    // also lets us return the raw payload when the upstream returns plain
    // text (e.g. /windtemp ignores ?format=json and ships an ASCII table).
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      return { format: 'raw', body: text };
    }
  }
  const text = await res.text();
  return { format, body: text };
}

function reqStr(args: Record<string, unknown>, key: string, example: string): string {
  const v = args[key];
  if (typeof v !== 'string' || !v.trim()) {
    throw new Error(`Required argument "${key}" is missing. Pass a string like ${example}.`);
  }
  return v;
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
