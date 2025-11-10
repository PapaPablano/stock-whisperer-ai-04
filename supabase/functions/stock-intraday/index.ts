import { supabaseAdmin } from '../_shared/supabaseAdminClient.ts'

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

const CACHE_PREFIX = 'intraday'
const CACHE_TTL_MS = 45 * 1000
const MIN_FETCH_INTERVAL_MS = 250
const MAX_RETRIES = 5
const BASE_BACKOFF_MS = 400
const MAX_BACKOFF_MS = 12_000
const JITTER_MS = 250
const MAX_POLYGON_CALLS_PER_MINUTE = 5
const RATE_LIMIT_KEY = `${CACHE_PREFIX}:polygon:budget`

const INTERVAL_MAP = new Map<string, { multiplier: number; timeframe: 'minute' | 'hour' }>([
  ['1m', { multiplier: 1, timeframe: 'minute' }],
  ['5m', { multiplier: 5, timeframe: 'minute' }],
  ['10m', { multiplier: 10, timeframe: 'minute' }],
  ['15m', { multiplier: 15, timeframe: 'minute' }],
  ['30m', { multiplier: 30, timeframe: 'minute' }],
  ['1h', { multiplier: 1, timeframe: 'hour' }],
  ['4h', { multiplier: 4, timeframe: 'hour' }],
]);

interface CachePayload {
  data: IntradayPoint[]
  source: string
  interval: string
  symbol: string
  range: string
  cachedAt: string
}

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

const cacheKeyFor = (symbol: string, interval: string, range: string) =>
  `${CACHE_PREFIX}:${symbol.toUpperCase()}:${interval}:${range}`

const readCache = async (key: string): Promise<CachePayload | null> => {
  try {
    const { data, error } = await supabaseAdmin
      .from('stock_cache')
      .select('data, last_updated')
      .eq('cache_key', key)
      .maybeSingle()

    if (error || !data?.data) {
      return null
    }

    const lastUpdated = data.last_updated ? new Date(data.last_updated).getTime() : 0
    if (!lastUpdated) {
      return null
    }

    if (Date.now() - lastUpdated > CACHE_TTL_MS) {
      return null
    }

    return data.data as CachePayload
  } catch (error) {
    console.error('intraday cache read failed', error)
    return null
  }
}

const writeCache = async (key: string, payload: CachePayload) => {
  try {
    await supabaseAdmin
      .from('stock_cache')
      .upsert(
        {
          cache_key: key,
          data: payload,
          last_updated: new Date().toISOString(),
        },
        { onConflict: 'cache_key' },
      )
  } catch (error) {
    console.error('intraday cache write failed', error)
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

const getCurrentWindowStartIso = () => {
  const now = new Date()
  const truncated = new Date(Math.floor(now.getTime() / 60_000) * 60_000)
  return truncated.toISOString()
}

const ensurePolygonRateLimitBudget = async (): Promise<boolean> => {
  try {
    const windowStartIso = getCurrentWindowStartIso()
    const { data, error } = await supabaseAdmin
      .from('stock_cache')
      .select('data')
      .eq('cache_key', RATE_LIMIT_KEY)
      .maybeSingle()

    const currentCount = data?.data?.windowStart === windowStartIso ? data.data.count ?? 0 : 0

    if (currentCount >= MAX_POLYGON_CALLS_PER_MINUTE) {
      return false
    }

    await supabaseAdmin
      .from('stock_cache')
      .upsert(
        {
          cache_key: RATE_LIMIT_KEY,
          data: {
            windowStart: windowStartIso,
            count: currentCount + 1,
          },
          last_updated: new Date().toISOString(),
        },
        { onConflict: 'cache_key' },
      )

    return true
  } catch (error) {
    console.error('Unable to persist Polygon rate-limit state', error)
    return true
  }
}

const createRateLimitedFetcher = () => {
  let lastRequestTimestamp = 0

  const waitForSlot = async () => {
    const now = Date.now()
    const earliest = lastRequestTimestamp + MIN_FETCH_INTERVAL_MS
    const wait = Math.max(0, earliest - now)
    if (wait > 0) {
      await sleep(wait)
    }
    lastRequestTimestamp = Date.now()
  }

  const fetchWithRetry = async (url: string, attempt = 0): Promise<Response> => {
    await waitForSlot()

    const hasBudget = await ensurePolygonRateLimitBudget()
    if (!hasBudget) {
      return new Response('Polygon call budget exceeded', { status: 429 })
    }

    const response = await fetch(url)
    if (response.status === 429) {
      if (attempt >= MAX_RETRIES - 1) {
        return response
      }
      const retryAfterHeader = response.headers.get('retry-after')
      const retryAfterSeconds = retryAfterHeader ? Number.parseFloat(retryAfterHeader) : undefined
      const backoff = retryAfterSeconds && !Number.isNaN(retryAfterSeconds)
        ? retryAfterSeconds * 1000
        : Math.min(BASE_BACKOFF_MS * 2 ** attempt, MAX_BACKOFF_MS)
      await sleep(backoff + Math.random() * JITTER_MS)
      return fetchWithRetry(url, attempt + 1)
    }

    if (!response.ok && response.status >= 500 && attempt < MAX_RETRIES - 1) {
      const backoff = Math.min(BASE_BACKOFF_MS * 2 ** attempt, MAX_BACKOFF_MS)
      await sleep(backoff + Math.random() * JITTER_MS)
      return fetchWithRetry(url, attempt + 1)
    }

    return response
  }

  return fetchWithRetry
}

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
  const defaultStart = new Date(endDate)
  defaultStart.setFullYear(endDate.getFullYear() - 2)

  const cutoffTimestamp = computeRangeCutoff(range, endDate)
  const startDate = cutoffTimestamp ? new Date(cutoffTimestamp) : defaultStart
  const fromDate = startDate.toISOString().split('T')[0]
  const toDate = endDate.toISOString().split('T')[0]

    const polygonSymbol = symbol.toUpperCase()
    const cacheKey = cacheKeyFor(polygonSymbol, interval, range)

    const cached = await readCache(cacheKey)
    if (cached) {
      console.log(`Serving intraday cache hit for ${polygonSymbol} ${interval} ${range}`)
      return new Response(
        JSON.stringify({
          data: cached.data,
          source: cached.source,
          interval: cached.interval,
          symbol: cached.symbol,
          cacheHit: true,
          cachedAt: cached.cachedAt,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=30' } }
      )
    }

    const fetchPolygon = createRateLimitedFetcher()
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
      const polygonResponse = await fetchPolygon(url)
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

    await writeCache(cacheKey, {
      data: intradayData,
      source: 'polygon',
      interval,
      symbol: polygonSymbol,
      range,
      cachedAt: new Date().toISOString(),
    })

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