import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4'
import Alpaca from 'https://esm.sh/@alpacahq/alpaca-trade-api@3.1.2'
import { type Bar } from 'https://esm.sh/@alpacahq/alpaca-trade-api@3.1.2/dist/resources/datav2/entityv2.js'

const supabaseAdmin = createClient(
  Deno.env.get('PROJECT_SUPABASE_URL') ?? '',
  Deno.env.get('PROJECT_SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

const createDefaultAlpacaClient = () => {
  const keyId = Deno.env.get('APCA_API_KEY_ID')
  const secretKey = Deno.env.get('APCA_API_SECRET_KEY')

  if (!keyId || !secretKey) {
    throw new Error('Missing Alpaca credentials in environment variables')
  }

  return new Alpaca({
    keyId,
    secretKey,
    paper: (Deno.env.get('ALPACA_PAPER_TRADING') ?? 'true').toLowerCase() === 'true',
  })
}

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
const DAILY_PAGE_LIMIT = 10_000
const MAX_DAILY_BARS = 10_000

let sharedAlpacaClient: Alpaca | null = null

const getAlpacaClient = (): Alpaca => {
  if (!sharedAlpacaClient) {
    sharedAlpacaClient = createDefaultAlpacaClient()
  }
  return sharedAlpacaClient
}

const fetchAlpacaDailyBars = async (params: {
  symbol: string
  startDate: Date
  endDate: Date
}): Promise<Bar[]> => {
  const { symbol, startDate, endDate } = params
  const client = getAlpacaClient()

  const barsGen = client.getBars({
    symbol,
    timeframe: '1Day',
    start: startDate.toISOString(),
    end: endDate.toISOString(),
    limit: MAX_DAILY_BARS,
    feed: STOCK_FEED,
    sort: 'asc',
  })

  const bars: Bar[] = []
  for await (const bar of barsGen) {
    bars.push(bar as unknown as Bar)
  }
  return bars
}

const barsToHistoricalPoints = (bars: Bar[]): HistoricalPoint[] =>
  bars.map<HistoricalPoint>((bar) => ({
    date: new Date(bar.Timestamp).toISOString().split('T')[0],
    open: bar.OpenPrice ?? null,
    high: bar.HighPrice ?? null,
    low: bar.LowPrice ?? null,
    close: bar.ClosePrice ?? null,
    volume: bar.Volume ?? null,
  }))



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
    const startDate = new Date(`${fromDate}T00:00:00Z`)
    const endDate = new Date(`${toDate}T23:59:59Z`)

    const dailyBars = await fetchAlpacaDailyBars({
      symbol,
      startDate,
      endDate,
    })

    if (!dailyBars.length) {
      return new Response(
        JSON.stringify({ error: 'No historical data available' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const historicalData = barsToHistoricalPoints(dailyBars)
    const source = 'alpaca'

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
