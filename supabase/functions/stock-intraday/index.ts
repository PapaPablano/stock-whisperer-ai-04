/// <reference lib="deno.ns" />
import { supabaseAdmin } from '../_shared/supabaseAdminClient.ts'
import { FinnhubClient } from '../../../services/finnhub.ts'
import { BarsFallback, fetchNormalizedFinnhubBars } from '../../../services/polygonFallback.ts'
import type { Bar as FallbackBar } from '../../../services/polygonFallback.ts'
import type { PolygonClient } from '../../../services/polygon.ts'

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

class PolygonApiError extends Error {
  status?: number

  constructor(status: number | undefined, message: string) {
    super(message)
    this.status = status
    this.name = 'PolygonApiError'
  }
}

const CACHE_PREFIX = 'intraday'
const CACHE_TTL_MS = 45 * 1000
const MIN_FETCH_INTERVAL_MS = 250
const MAX_RETRIES = 5
const BASE_BACKOFF_MS = 400
const MAX_BACKOFF_MS = 12_000
const JITTER_MS = 250
const MAX_POLYGON_CALLS_PER_SECOND = 4
const MAX_POLYGON_CALLS_PER_MINUTE = 5
const RATE_LIMIT_KEY = `${CACHE_PREFIX}:polygon:budget`

const FINNHUB_API_KEY = Deno.env.get('FINNHUB_API_KEY') ?? ''
const FINNHUB_CACHE_TTL_MS = Number(Deno.env.get('FINNHUB_CACHE_TTL_MS') ?? '60000')
const FINNHUB_REQUEST_DEDUP = (Deno.env.get('FINNHUB_REQUEST_DEDUP') ?? 'true').toLowerCase() !== 'false'

const sharedFinnhubClient = FINNHUB_API_KEY
  ? new FinnhubClient({
      apiKey: FINNHUB_API_KEY,
      cacheTtlMs: FINNHUB_CACHE_TTL_MS,
      requestDedup: FINNHUB_REQUEST_DEDUP,
    })
  : null

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

const getCurrentSecondStartIso = () => {
  const now = new Date()
  const truncated = new Date(Math.floor(now.getTime() / 1_000) * 1_000)
  return truncated.toISOString()
}

const ensurePolygonRateLimitBudget = async (): Promise<{ allowed: boolean; retryAfterMs: number }> => {
  try {
    const windowStartIso = getCurrentWindowStartIso()
    const secondStartIso = getCurrentSecondStartIso()
    const { data, error } = await supabaseAdmin
      .from('stock_cache')
      .select('data')
      .eq('cache_key', RATE_LIMIT_KEY)
      .maybeSingle()

    const minuteBucketActive = data?.data?.windowStart === windowStartIso
    const secondBucketActive = data?.data?.secondStart === secondStartIso
    const currentMinuteCount = minuteBucketActive ? data.data.minuteCount ?? 0 : 0
    const currentSecondCount = secondBucketActive ? data.data.secondCount ?? 0 : 0

    if (currentMinuteCount >= MAX_POLYGON_CALLS_PER_MINUTE) {
      const now = Date.now()
      const nextWindow = new Date(windowStartIso).getTime() + 60_000
      return { allowed: false, retryAfterMs: Math.max(0, nextWindow - now) }
    }

    if (currentSecondCount >= MAX_POLYGON_CALLS_PER_SECOND) {
      const now = Date.now()
      const nextSecond = new Date(secondStartIso).getTime() + 1_000
      return { allowed: false, retryAfterMs: Math.max(0, nextSecond - now) }
    }

    await supabaseAdmin
      .from('stock_cache')
      .upsert(
        {
          cache_key: RATE_LIMIT_KEY,
          data: {
            windowStart: windowStartIso,
            minuteCount: currentMinuteCount + 1,
            secondStart: secondStartIso,
            secondCount: currentSecondCount + 1,
          },
          last_updated: new Date().toISOString(),
        },
        { onConflict: 'cache_key' },
      )

    return { allowed: true, retryAfterMs: 0 }
  } catch (error) {
    console.error('Unable to persist Polygon rate-limit state', error)
    return { allowed: true, retryAfterMs: 0 }
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

    const budget = await ensurePolygonRateLimitBudget()
    if (!budget.allowed) {
      const waitTime = budget.retryAfterMs || BASE_BACKOFF_MS
      if (attempt >= MAX_RETRIES - 1) {
        return new Response('Polygon call budget exceeded', {
          status: 429,
          headers: { 'Retry-After': String(Math.ceil(waitTime / 1000)) },
        })
      }
      await sleep(waitTime + Math.random() * JITTER_MS)
      return fetchWithRetry(url, attempt + 1)
    }

    const requestTimestamp = new Date().toISOString()
    console.debug('Polygon request dispatch', { url, attempt, timestamp: requestTimestamp })

    const response = await fetch(url)
    const retryAfterHeader = response.headers.get('retry-after')
    const requestId =
      response.headers.get('x-request-id') ??
      response.headers.get('x-requestid') ??
      response.headers.get('request_id') ??
      undefined

    if (response.status === 429) {
      console.warn('Polygon rate limited response', {
        url,
        attempt,
        timestamp: requestTimestamp,
        retryAfter: retryAfterHeader,
        requestId,
      })
      if (attempt >= MAX_RETRIES - 1) {
        return response
      }
      const retryAfterSeconds = retryAfterHeader ? Number.parseFloat(retryAfterHeader) : undefined
      const backoff = retryAfterSeconds && !Number.isNaN(retryAfterSeconds)
        ? retryAfterSeconds * 1000
        : Math.min(BASE_BACKOFF_MS * 2 ** attempt, MAX_BACKOFF_MS)
      await sleep(backoff + Math.random() * JITTER_MS)
      return fetchWithRetry(url, attempt + 1)
    }

    if (!response.ok && response.status >= 500 && attempt < MAX_RETRIES - 1) {
      console.error('Polygon server error response', {
        url,
        attempt,
        timestamp: requestTimestamp,
        status: response.status,
        requestId,
      })
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

const normalizeIntervalKey = (value: string): string => {
  if (!value) return '1m'
  const normalized = value.toLowerCase()
  switch (normalized) {
    case '1':
    case '1m':
      return '1m'
    case '5':
    case '5m':
      return '5m'
    case '10':
    case '10m':
      return '10m'
    case '15':
    case '15m':
      return '15m'
    case '30':
    case '30m':
      return '30m'
    case '60':
    case '60m':
    case '1h':
      return '1h'
    case '4h':
    case '240':
    case '240m':
      return '4h'
    default:
      return normalized
  }
}

const fetchPolygonAggs = async (
  symbol: string,
  intervalKey: string,
  config: { multiplier: number; timeframe: 'minute' | 'hour' },
  from: string,
  to: string,
  apiKey: string,
): Promise<PolygonAggsResult[]> => {
  const fetchPolygon = createRateLimitedFetcher()
  const results: PolygonAggsResult[] = []
  const ticker = symbol.toUpperCase()

  let cursor: string | null = null
  let url = buildPolygonUrl(ticker, config.multiplier, config.timeframe, from, to, apiKey, cursor)

  while (url) {
    let polygonResponse: Response
    try {
      polygonResponse = await fetchPolygon(url)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      throw new PolygonApiError(undefined, message)
    }

    if (!polygonResponse.ok) {
      const body = await polygonResponse.text()
      throw new PolygonApiError(polygonResponse.status, body || 'Polygon request failed')
    }

    const polygonData = (await polygonResponse.json()) as PolygonAggsResponse
    if (polygonData.error || polygonData.message) {
      throw new PolygonApiError(polygonResponse.status, polygonData.error ?? polygonData.message ?? 'Polygon error')
    }

    if (polygonData.results?.length) {
      results.push(...polygonData.results)
    }

    if (polygonData.next_url) {
      const nextUrl = new URL(polygonData.next_url)
      cursor = nextUrl.searchParams.get('cursor')
      url = cursor
        ? buildPolygonUrl(ticker, config.multiplier, config.timeframe, from, to, apiKey, cursor)
        : null
    } else {
      url = null
    }
  }

  return results
}

const polygonAggsToBars = (agg: PolygonAggsResult[]): FallbackBar[] =>
  agg.map((item) => ({
    t: item.t,
    o: item.o,
    h: item.h,
    l: item.l,
    c: item.c,
    v: item.v,
  }))

const mapBarsToIntradayPoints = (bars: FallbackBar[], cutoffTimestamp: number | null): IntradayPoint[] => {
  const filtered = cutoffTimestamp ? bars.filter((bar) => bar.t >= cutoffTimestamp) : bars

  return filtered.map((bar) => {
    const date = new Date(bar.t)
    const iso = date.toISOString()
    return {
      datetime: iso,
      date: iso.split('T')[0],
      time: iso.split('T')[1]?.replace('Z', '') ?? '',
      open: Number.isFinite(bar.o) ? bar.o : null,
      high: Number.isFinite(bar.h) ? bar.h : null,
      low: Number.isFinite(bar.l) ? bar.l : null,
      close: Number.isFinite(bar.c) ? bar.c : null,
      volume: Number.isFinite(bar.v ?? NaN) ? bar.v ?? null : null,
    }
  })
}

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

    const polygonClient: PolygonClient = {
      async getAggs(sym, resolution, from, to) {
        const intervalKey = normalizeIntervalKey(resolution)
        const cfg = INTERVAL_MAP.get(intervalKey)
        if (!cfg) {
          throw new PolygonApiError(400, `Unsupported interval: ${resolution}`)
        }
        return fetchPolygonAggs(sym, intervalKey, cfg, from, to, polygonApiKey)
      },
    }

    let bars: FallbackBar[] = []
    let providerLabel = 'polygon'

    if (sharedFinnhubClient) {
      const finnhubStartDate = new Date(endDate)
      finnhubStartDate.setFullYear(finnhubStartDate.getFullYear() - 1)
      const finnhubFromDate = finnhubStartDate.toISOString().split('T')[0]

      let finnhubBars: FallbackBar[] = []
      try {
        finnhubBars = await fetchNormalizedFinnhubBars({
          finnhubClient: sharedFinnhubClient,
          symbol: polygonSymbol,
          from: finnhubFromDate,
          to: toDate,
          resolution: interval,
        })
      } catch (error) {
        console.error(`[Edge] Finnhub primary fetch failed for ${polygonSymbol}`, error)
      }

      if (finnhubBars.length === 0) {
        console.warn(`[Edge] Finnhub returned no intraday bars for ${polygonSymbol}, attempting Polygon fallback`)
        const fallback = new BarsFallback({
          polygonClient,
          finnhubClient: sharedFinnhubClient,
          maxRetries: 3,
          backoffMsInitial: 750,
        })
        const fallbackResult = await fallback.getBars(polygonSymbol, fromDate, toDate, interval)
        bars = fallbackResult.bars
        providerLabel = fallbackResult.provider
      } else {
        providerLabel = 'finnhub'
        bars = finnhubBars

        if (startDate < finnhubStartDate) {
          const polygonSegmentFrom = startDate.toISOString().split('T')[0]
          const polygonSegmentTo = finnhubStartDate.toISOString().split('T')[0]
          try {
            const polygonSegmentAggs = await polygonClient.getAggs(
              polygonSymbol,
              interval,
              polygonSegmentFrom,
              polygonSegmentTo,
            )
            const polygonSegmentBars = polygonAggsToBars(polygonSegmentAggs).filter(
              (bar) => bar.t < finnhubStartDate.getTime(),
            )
            if (polygonSegmentBars.length) {
              const merged = new Map<number, FallbackBar>()
              for (const bar of polygonSegmentBars) {
                merged.set(bar.t, bar)
              }
              for (const bar of finnhubBars) {
                merged.set(bar.t, bar)
              }
              bars = Array.from(merged.values()).sort((a, b) => a.t - b.t)
              providerLabel = 'finnhub+polygon'
            }
          } catch (error) {
            console.warn(`[Edge] Polygon extended history fetch failed for ${polygonSymbol}`, error)
          }
        }
      }
    } else {
      const polygonAggs = await polygonClient.getAggs(polygonSymbol, interval, fromDate, toDate)
      bars = polygonAggsToBars(polygonAggs)
      providerLabel = 'polygon'
    }

    if (!bars.length) {
      return new Response(
        JSON.stringify({ error: 'No intraday data available' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const intradayData = mapBarsToIntradayPoints(bars, cutoffTimestamp)

    console.log(`[Edge] ${providerLabel} returned ${intradayData.length} intraday points for ${symbol}`)

    await writeCache(cacheKey, {
      data: intradayData,
      source: providerLabel,
      interval,
      symbol: polygonSymbol,
      range,
      cachedAt: new Date().toISOString(),
    })

    return new Response(
      JSON.stringify({
        data: intradayData,
        source: providerLabel,
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