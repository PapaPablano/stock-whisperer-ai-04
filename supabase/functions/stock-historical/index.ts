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

const CACHE_PREFIX = 'historical'

const getCacheKey = (symbol: string, range: string) => `${CACHE_PREFIX}:${symbol.toUpperCase()}:${range}`

const getDateRange = (range: string) => {
  const endDate = new Date()
  const startDate = new Date()

  switch(range) {
    case '1d':
      startDate.setDate(endDate.getDate() - 1)
      break
    case '5d':
      startDate.setDate(endDate.getDate() - 5)
      break
    case '1mo':
      startDate.setMonth(endDate.getMonth() - 1)
      break
    case '3mo':
      startDate.setMonth(endDate.getMonth() - 3)
      break
    case '6mo':
      startDate.setMonth(endDate.getMonth() - 6)
      break
    case '1y':
      startDate.setFullYear(endDate.getFullYear() - 1)
      break
    case '5y':
      startDate.setFullYear(endDate.getFullYear() - 5)
      break
    default:
      startDate.setMonth(endDate.getMonth() - 1)
  }

  return {
    fromDate: startDate.toISOString().split('T')[0],
    toDate: endDate.toISOString().split('T')[0],
  }
}

type HistoricalPoint = {
  date: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
};

interface CachePayload {
  data?: HistoricalPoint[];
  source?: string;
  cachedAt?: string;
  lastUpdated?: string;
  cacheHit?: boolean;
}

const getCachedPayload = async (cacheKey: string): Promise<CachePayload | null> => {
  try {
    const { data, error } = await supabaseAdmin
      .from('stock_cache')
      .select('data, last_updated')
      .eq('cache_key', cacheKey)
      .maybeSingle()

    if (error || !data?.data) {
      return null
    }

    return {
      ...data.data,
      lastUpdated: data.last_updated,
    }
  } catch (error) {
    console.error('Cache read error (historical):', error)
    return null
  }
}

const setCachedPayload = async (cacheKey: string, payload: CachePayload) => {
  try {
    await supabaseAdmin
      .from('stock_cache')
      .upsert({
        cache_key: cacheKey,
        data: payload,
        last_updated: new Date().toISOString(),
      }, { onConflict: 'cache_key' })
  } catch (error) {
    console.error('Cache write error (historical):', error)
  }
}

const STOCK_FEED = (Deno.env.get('ALPACA_STOCK_FEED') ?? 'iex').toLowerCase() === 'sip' ? 'sip' : 'iex'
const DAILY_PAGE_LIMIT = 1_000
const MAX_DAILY_BARS = 10_000
const INTRADAY_CACHE_PREFIX = 'intraday'

const fetchAlpacaDailyBars = async (params: {
  client: AlpacaRestClient
  symbol: string
  startIso: string
  endIso: string
}): Promise<AlpacaBar[]> => {
  const { client, symbol, startIso, endIso } = params
  const collected: AlpacaBar[] = []
  let pageToken: string | undefined

  while (true) {
    const response = await client.getBars({
      symbol,
      timeframe: '1Day',
      start: startIso,
      end: endIso,
      limit: DAILY_PAGE_LIMIT,
      sort: 'asc',
      adjustment: 'split',
      feed: STOCK_FEED,
      pageToken,
    })

    collected.push(...response.bars)

    if (!response.next_page_token || collected.length >= MAX_DAILY_BARS) {
      break
    }
    pageToken = response.next_page_token
  }

  return collected
}

const barsToHistoricalPoints = (bars: AlpacaBar[]): HistoricalPoint[] =>
  bars.map<HistoricalPoint>((bar) => ({
    date: bar.t.split('T')[0] ?? '',
    open: bar.o ?? null,
    high: bar.h ?? null,
    low: bar.l ?? null,
    close: bar.c ?? null,
    volume: bar.v ?? null,
  }))

type IntradayCachePayload = {
  data?: Array<{
    datetime?: string
    date?: string
    open?: number | null
    high?: number | null
    low?: number | null
    close?: number | null
    volume?: number | null
  }>
}

const readIntradaySnapshot = async (symbol: string): Promise<HistoricalPoint | null> => {
  const intradayKey = `${INTRADAY_CACHE_PREFIX}:${symbol}:1m:1d`
  try {
    const { data, error } = await supabaseAdmin
      .from('stock_cache')
      .select('data, last_updated')
      .eq('cache_key', intradayKey)
      .maybeSingle()

    if (error || !data?.data) {
      return null
    }

    const payload = data.data as IntradayCachePayload
    const points = payload.data ?? []
    if (!points.length) {
      return null
    }

    const sorted = points
      .filter((point) => typeof point.datetime === 'string')
      .sort((a, b) => {
        const at = Date.parse(a.datetime ?? '')
        const bt = Date.parse(b.datetime ?? '')
        return at - bt
      })

    if (!sorted.length) {
      return null
    }

    const first = sorted.find((p) => typeof p.open === 'number')
    const last = [...sorted].reverse().find((p) => typeof p.close === 'number')
    const highs = sorted.map((p) => (typeof p.high === 'number' ? p.high : null)).filter((v): v is number => v !== null)
    const lows = sorted.map((p) => (typeof p.low === 'number' ? p.low : null)).filter((v): v is number => v !== null)
    const volumes = sorted.map((p) => (typeof p.volume === 'number' ? p.volume : 0))

    const iso = sorted[0]?.datetime ?? new Date().toISOString()
    const date = sorted[0]?.date ?? iso.split('T')[0]

    return {
      date,
      open: first?.open ?? null,
      high: highs.length ? Math.max(...highs) : null,
      low: lows.length ? Math.min(...lows) : null,
      close: last?.close ?? first?.open ?? null,
      volume: volumes.reduce((sum, value) => sum + value, 0),
    }
  } catch (error) {
    console.error('Intraday overlay fetch failed', error)
    return null
  }
}

const mergeHistoricalWithSnapshot = (historical: HistoricalPoint[], snapshot: HistoricalPoint | null): HistoricalPoint[] => {
  if (!snapshot) {
    return historical
  }
  const filtered = historical.filter((item) => item.date !== snapshot.date)
  return [...filtered, snapshot].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
}

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
    const body = (await req.json()) as { symbol?: string; range?: string } | null
    const symbolInput = body?.symbol
    const range = body?.range ?? '1mo'

    if (!symbolInput) {
      return new Response(
        JSON.stringify({ error: 'Symbol is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const symbol = String(symbolInput).toUpperCase()
    const cacheKey = getCacheKey(symbol, range)

    console.log(`Fetching Alpaca historical data for ${symbol} (${range})`)

    const cachedPayload = await getCachedPayload(cacheKey)
    if (cachedPayload?.data) {
      console.log(`Historical cache hit for ${symbol} (${range})`)
      return new Response(
        JSON.stringify({ ...cachedPayload, cacheHit: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const { fromDate, toDate } = getDateRange(range)
    const startIso = `${fromDate}T00:00:00Z`
    const endIso = `${toDate}T23:59:59Z`

    const client = getAlpacaClient()
    const dailyBars = await fetchAlpacaDailyBars({
      client,
      symbol,
      startIso,
      endIso,
    })

    if (!dailyBars.length) {
      return new Response(
        JSON.stringify({ error: 'No historical data available' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    let historicalData = barsToHistoricalPoints(dailyBars)
    const intradaySnapshot = await readIntradaySnapshot(symbol)
    if (intradaySnapshot) {
      historicalData = mergeHistoricalWithSnapshot(historicalData, intradaySnapshot)
    }

    const source = intradaySnapshot ? 'alpaca+intraday' : 'alpaca'

    await setCachedPayload(cacheKey, {
      data: historicalData,
      source,
      cachedAt: new Date().toISOString(),
    })

    return new Response(
      JSON.stringify({ data: historicalData, source }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error('Alpaca historical fetch failed', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
