import { supabaseAdmin } from '../_shared/supabaseAdminClient.ts'
import {
  createDefaultAlpacaClient,
  type AlpacaRestClient,
  type AlpacaBar,
} from '../_shared/alpaca/client.ts'

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

const CACHE_PREFIX = 'intraday'
const CACHE_TTL_MS = 45 * 1000

interface CachePayload {
  data: IntradayPoint[]
  source: string
  interval: string
  symbol: string
  range: string
  cachedAt: string
}

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

const STOCK_FEED = (Deno.env.get('ALPACA_STOCK_FEED') ?? 'iex').toLowerCase() === 'sip' ? 'sip' : 'iex'
const PAGE_LIMIT = 10_000
const MAX_TOTAL_BARS = 50_000

const INTERVAL_MINUTES = new Map<string, number>([
  ['1m', 1],
  ['5m', 5],
  ['10m', 10],
  ['15m', 15],
  ['30m', 30],
  ['1h', 60],
  ['4h', 240],
  ['1d', 1_440],
])

type FetchPlan = {
  timeframe: `${number}${'Min' | 'Hour' | 'Day'}`;
  resultInterval: string;
  requiresAggregation: boolean;
};

const FETCH_TIMEFRAME = new Map<string, FetchPlan>([
  ['1m', { timeframe: '1Min', resultInterval: '1m', requiresAggregation: false }],
  ['5m', { timeframe: '5Min', resultInterval: '5m', requiresAggregation: false }],
  ['10m', { timeframe: '5Min', resultInterval: '10m', requiresAggregation: true }],
  ['15m', { timeframe: '15Min', resultInterval: '15m', requiresAggregation: false }],
  ['30m', { timeframe: '30Min', resultInterval: '30m', requiresAggregation: false }],
  ['1h', { timeframe: '1Hour', resultInterval: '1h', requiresAggregation: false }],
  ['4h', { timeframe: '1Hour', resultInterval: '4h', requiresAggregation: true }],
  ['1d', { timeframe: '1Day', resultInterval: '1d', requiresAggregation: false }],
])

const getFetchPlan = (interval: string): FetchPlan => {
  const normalized = (interval ?? '').toLowerCase()
  const plan = FETCH_TIMEFRAME.get(normalized)
  if (!plan) {
    throw new Error(`Unsupported interval: ${interval}`)
  }
  return plan
}

type NormalizedBar = {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const toNormalizedBar = (bar: AlpacaBar): NormalizedBar => ({
  timestamp: Date.parse(bar.t),
  open: bar.o,
  high: bar.h,
  low: bar.l,
  close: bar.c,
  volume: bar.v,
})

const aggregateNormalizedBars = (bars: NormalizedBar[], intervalMinutes: number): NormalizedBar[] => {
  if (bars.length === 0) {
    return []
  }
  const bucketMs = intervalMinutes * 60_000
  const aggregated = new Map<number, NormalizedBar>()
  for (const bar of bars) {
    const bucketStart = Math.floor(bar.timestamp / bucketMs) * bucketMs
    const existing = aggregated.get(bucketStart)
    if (!existing) {
      aggregated.set(bucketStart, { ...bar, timestamp: bucketStart })
    } else {
      existing.high = Math.max(existing.high, bar.high)
      existing.low = Math.min(existing.low, bar.low)
      existing.close = bar.close
      existing.volume += bar.volume
    }
  }
  return Array.from(aggregated.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, value]) => value)
}

const shiftDays = (date: Date, days: number) => {
  const result = new Date(date)
  result.setDate(result.getDate() - days)
  return result
}

const computeRangeStart = (range: string, endDate: Date): Date => {
  switch (range) {
    case '1d':
      return shiftDays(endDate, 1)
    case '5d':
      return shiftDays(endDate, 7)
    case '1w':
      return shiftDays(endDate, 8)
    case '1mo': {
      const copy = new Date(endDate)
      copy.setMonth(copy.getMonth() - 1)
      return copy
    }
    case '3mo': {
      const copy = new Date(endDate)
      copy.setMonth(copy.getMonth() - 3)
      return copy
    }
    case '6mo': {
      const copy = new Date(endDate)
      copy.setMonth(copy.getMonth() - 6)
      return copy
    }
    case '1y': {
      const copy = new Date(endDate)
      copy.setFullYear(copy.getFullYear() - 1)
      return copy
    }
    case '2y': {
      const copy = new Date(endDate)
      copy.setFullYear(copy.getFullYear() - 2)
      return copy
    }
    default: {
      const copy = new Date(endDate)
      copy.setMonth(copy.getMonth() - 1)
      return copy
    }
  }
}

const fetchAlpacaBars = async (params: {
  client: AlpacaRestClient
  symbol: string
  interval: string
  range: string
}): Promise<{ bars: NormalizedBar[]; baseInterval: string }> => {
  const { client, symbol, interval, range } = params
  const plan = getFetchPlan(interval)
  const end = new Date()
  const start = computeRangeStart(range, end)
  const startIso = start.toISOString()
  const endIso = end.toISOString()
  const collected: NormalizedBar[] = []
  let pageToken: string | undefined

  while (true) {
    const response = await client.getBars({
      symbol,
      timeframe: plan.timeframe,
      start: startIso,
      end: endIso,
      limit: PAGE_LIMIT,
      sort: 'asc',
      adjustment: 'split',
      feed: STOCK_FEED,
      pageToken,
    })

    for (const bar of response.bars) {
      const normalized = toNormalizedBar(bar)
      if (Number.isNaN(normalized.timestamp)) continue
      if (normalized.timestamp < start.getTime()) continue
      collected.push(normalized)
      if (collected.length >= MAX_TOTAL_BARS) break
    }

    if (!response.next_page_token || collected.length >= MAX_TOTAL_BARS) {
      break
    }
    pageToken = response.next_page_token
  }

  const minutes = INTERVAL_MINUTES.get(plan.resultInterval) ?? 1
  const bars = plan.requiresAggregation
    ? aggregateNormalizedBars(collected, minutes)
    : collected

  return { bars, baseInterval: plan.resultInterval }
}

const mapBarsToIntradayPoints = (bars: NormalizedBar[]): IntradayPoint[] =>
  bars.map((bar) => {
    const iso = new Date(bar.timestamp).toISOString()
    return {
      datetime: iso,
      date: iso.split('T')[0],
      time: iso.split('T')[1]?.replace('Z', '') ?? '',
      open: Number.isFinite(bar.open) ? bar.open : null,
      high: Number.isFinite(bar.high) ? bar.high : null,
      low: Number.isFinite(bar.low) ? bar.low : null,
      close: Number.isFinite(bar.close) ? bar.close : null,
      volume: Number.isFinite(bar.volume) ? bar.volume : null,
    }
  })

let sharedAlpacaClient: AlpacaRestClient | null = null

const getAlpacaClient = (): AlpacaRestClient => {
  if (!sharedAlpacaClient) {
    sharedAlpacaClient = createDefaultAlpacaClient()
  }
  return sharedAlpacaClient
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = (await req.json()) as { symbol?: string; interval?: string; range?: string } | null
    const symbolInput = body?.symbol
    const intervalInput = body?.interval ?? '1m'
    const range = body?.range ?? '1d'

    if (!symbolInput) {
      return new Response(
        JSON.stringify({ error: 'Symbol is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    let plan: FetchPlan
    try {
      plan = getFetchPlan(intervalInput)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unsupported interval'
      return new Response(
        JSON.stringify({ error: message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const symbol = symbolInput.toUpperCase()
    const cacheKey = cacheKeyFor(symbol, plan.resultInterval, range)

    const cached = await readCache(cacheKey)
    if (cached) {
      console.log(`Serving Alpaca intraday cache hit for ${symbol} ${plan.resultInterval} ${range}`)
      return new Response(
        JSON.stringify({
          data: cached.data,
          source: cached.source,
          interval: cached.interval,
          symbol: cached.symbol,
          cacheHit: true,
          cachedAt: cached.cachedAt,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=30' } },
      )
    }

    const client = getAlpacaClient()
    const { bars, baseInterval } = await fetchAlpacaBars({
      client,
      symbol,
      interval: intervalInput,
      range,
    })

    if (!bars.length) {
      return new Response(
        JSON.stringify({ error: 'No intraday data available' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const intradayData = mapBarsToIntradayPoints(bars)
    console.log(`Alpaca returned ${intradayData.length} intraday points for ${symbol}`)

    const payload: CachePayload = {
      data: intradayData,
      source: `alpaca:${baseInterval}`,
      interval: baseInterval,
      symbol,
      range,
      cachedAt: new Date().toISOString(),
    }

    await writeCache(cacheKey, payload)

    return new Response(
      JSON.stringify({
        data: intradayData,
        source: payload.source,
        interval: payload.interval,
        symbol,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error('Error fetching Alpaca intraday data:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})