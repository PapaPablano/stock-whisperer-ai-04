const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
}

type IntradayPoint = {
  datetime: string;
  date: string;
  time: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
};

interface PolygonAggsResult {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

interface PolygonAggsResponse {
  results?: PolygonAggsResult[];
  next_url?: string;
  status?: string;
  error?: string;
  message?: string;
}

const INTERVAL_MAP = new Map<string, { multiplier: number; timeframe: 'minute' | 'hour' }>([
  ['1m', { multiplier: 1, timeframe: 'minute' }],
  ['5m', { multiplier: 5, timeframe: 'minute' }],
  ['10m', { multiplier: 10, timeframe: 'minute' }],
  ['15m', { multiplier: 15, timeframe: 'minute' }],
  ['30m', { multiplier: 30, timeframe: 'minute' }],
  ['1h', { multiplier: 1, timeframe: 'hour' }],
  ['4h', { multiplier: 4, timeframe: 'hour' }],
]);

const computeRangeCutoff = (range: string | undefined, endDate: Date): number | null => {
  if (!range) return null;
  const cutoff = new Date(endDate);
  switch (range) {
    case '1d':
      cutoff.setDate(cutoff.getDate() - 1);
      break;
    case '5d':
      cutoff.setDate(cutoff.getDate() - 5);
      break;
    case '1w':
      cutoff.setDate(cutoff.getDate() - 7);
      break;
    case '1mo':
      cutoff.setMonth(cutoff.getMonth() - 1);
      break;
    case '3mo':
      cutoff.setMonth(cutoff.getMonth() - 3);
      break;
    case '6mo':
      cutoff.setMonth(cutoff.getMonth() - 6);
      break;
    case '1y':
      cutoff.setFullYear(cutoff.getFullYear() - 1);
      break;
    case '2y':
      cutoff.setFullYear(cutoff.getFullYear() - 2);
      break;
    default:
      return null;
  }
  return cutoff.getTime();
};

const buildPolygonUrl = (
  symbol: string,
  multiplier: number,
  timeframe: 'minute' | 'hour',
  from: string,
  to: string,
  apiKey: string,
  cursor?: string | null,
) => {
  const base = new URL(
    `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(symbol)}/range/${multiplier}/${timeframe}/${from}/${to}`,
  );
  base.searchParams.set('adjusted', 'true');
  base.searchParams.set('sort', 'asc');
  base.searchParams.set('limit', '50000');
  if (cursor) {
    base.searchParams.set('cursor', cursor);
  }
  base.searchParams.set('apiKey', apiKey);
  return base.toString();
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = (await req.json()) as { symbol?: string; interval?: string; range?: string } | null
    const symbol = body?.symbol
  const interval = body?.interval ?? '1m'
    const range = body?.range ?? '1d'
    
    if (!symbol) {
      return new Response(
        JSON.stringify({ error: 'Symbol is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Fetching intraday data for ${symbol} with interval ${interval} and range ${range}`)

    const polygonApiKey = Deno.env.get('POLYGON_API_KEY')
    if (!polygonApiKey) {
      console.error('POLYGON_API_KEY is not configured')
      return new Response(
        JSON.stringify({ error: 'Intraday data unavailable', message: 'POLYGON_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const intervalConfig = INTERVAL_MAP.get(interval ?? '')
    if (!intervalConfig) {
      return new Response(
        JSON.stringify({ error: `Unsupported interval: ${interval}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const endDate = new Date()
    const startDate = new Date()
    startDate.setFullYear(endDate.getFullYear() - 2)

    const fromDate = startDate.toISOString().split('T')[0]
    const toDate = endDate.toISOString().split('T')[0]
    const cutoffTimestamp = computeRangeCutoff(range, endDate)

    const polygonSymbol = symbol.toUpperCase()
    const results: PolygonAggsResult[] = []

    let cursor: string | null = null
    let url = buildPolygonUrl(
      polygonSymbol,
      intervalConfig.multiplier,
      intervalConfig.timeframe,
      fromDate,
      toDate,
      polygonApiKey,
      cursor,
    )

    while (url) {
      const polygonResponse = await fetch(url)
      if (!polygonResponse.ok) {
        const errorBody = await polygonResponse.text()
        throw new Error(`Polygon API error (${polygonResponse.status}): ${errorBody}`)
      }

      const polygonData = (await polygonResponse.json()) as PolygonAggsResponse
      if (polygonData.error || polygonData.message) {
        throw new Error(`Polygon API error: ${polygonData.error ?? polygonData.message}`)
      }

      if (polygonData.results && polygonData.results.length > 0) {
        results.push(...polygonData.results)
      }

      if (polygonData.next_url) {
        const nextUrl = new URL(polygonData.next_url)
        cursor = nextUrl.searchParams.get('cursor')
        url = cursor
          ? buildPolygonUrl(
              polygonSymbol,
              intervalConfig.multiplier,
              intervalConfig.timeframe,
              fromDate,
              toDate,
              polygonApiKey,
              cursor,
            )
          : null
      } else {
        url = null
      }
    }

    if (results.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No intraday data available from Polygon' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const filteredResults = cutoffTimestamp
      ? results.filter((item) => item.t >= cutoffTimestamp)
      : results

    const intradayData = filteredResults.map<IntradayPoint>((item) => {
      const date = new Date(item.t)
      const iso = date.toISOString()
      return {
        datetime: iso,
        date: iso.split('T')[0],
        time: iso.split('T')[1]?.replace('Z', '') ?? '',
        open: item.o ?? null,
        high: item.h ?? null,
        low: item.l ?? null,
        close: item.c ?? null,
        volume: item.v ?? null,
      }
    })

    console.log(`Polygon returned ${intradayData.length} intraday points for ${symbol}`)

    return new Response(
      JSON.stringify({
        data: intradayData,
        source: 'polygon',
        interval,
        symbol: polygonSymbol,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error fetching intraday data:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})