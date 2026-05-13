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
    description: 'Terminal Aerodrome Forecasts.',
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
    description: 'Pilot reports. Optional id (station), age (hours), distance (NM), level (flight level).',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Center station for proximity filter' },
        age: { type: 'number', description: 'Lookback hours, default 1.5' },
        distance_nm: { type: 'number', description: 'Distance from id in nautical miles, default 200' },
        level: { type: 'number', description: 'Flight level filter (FL310 = 310)' },
        format: { type: 'string', description: 'json (default) | raw' },
      },
    },
  },
  {
    name: 'sigmet',
    description: 'Currently active SIGMETs.',
    inputSchema: {
      type: 'object',
      properties: { format: { type: 'string', description: 'json (default) | raw' } },
    },
  },
  {
    name: 'airmet',
    description: 'Currently active AIRMETs.',
    inputSchema: {
      type: 'object',
      properties: { format: { type: 'string' } },
    },
  },
  {
    name: 'gairmet',
    description: 'Graphical AIRMETs.',
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
    description: 'Winds aloft forecast.',
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
      const params: Record<string, string> = { format: String(args.format ?? 'json') };
      if (args.id) params.id = String(args.id);
      if (args.age !== undefined) params.age = String(args.age);
      if (args.distance_nm !== undefined) params.distance = String(args.distance_nm);
      if (args.level !== undefined) params.level = String(args.level);
      return fetchAW('/pirep', params);
    }
    case 'sigmet':
      return fetchAW('/airsigmet', { hazard: 'sigmet', format: String(args.format ?? 'json') });
    case 'airmet':
      return fetchAW('/airsigmet', { hazard: 'airmet', format: String(args.format ?? 'json') });
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
    try {
      return await res.json();
    } catch {
      const text = await res.text();
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
