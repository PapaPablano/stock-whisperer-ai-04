/// <reference lib="deno.ns" />
import { supabaseAdmin } from '../_shared/supabaseAdminClient.ts'

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

interface MarketstackResponse {
  data?: Array<{
    date: string;
    open: number | null;
    high: number | null;
    low: number | null;
    close: number | null;
    volume: number | null;
  }>;
}

interface YahooChartResponse {
  chart: {
    result: Array<{
      timestamp: number[];
      indicators: {
        quote: Array<{
          open: Array<number | null>;
          high: Array<number | null>;
          low: Array<number | null>;
          close: Array<number | null>;
          volume: Array<number | null>;
        }>;
      };
    }>;
  };
}

interface PolygonAggResponse {
  results?: Array<{
    t: number;
    o: number | null;
    h: number | null;
    l: number | null;
    c: number | null;
    v: number | null;
  }>;
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = (await req.json()) as { symbol?: string; range?: string } | null
    const symbol = body?.symbol
    const range = body?.range ?? '1mo'
    
    if (!symbol) {
      return new Response(
        JSON.stringify({ error: 'Symbol is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const normalizedSymbol = String(symbol).toUpperCase()
    const cacheKey = getCacheKey(normalizedSymbol, range)

    console.log(`Fetching historical data for ${normalizedSymbol} with range ${range}`)

    // Attempt cache read first (service role bypasses RLS for writes, reads allowed for verification)
    const cachedPayload = await getCachedPayload(cacheKey)
    if (cachedPayload?.data) {
      console.log(`Cache hit for ${normalizedSymbol} (${range})`)
      return new Response(
        JSON.stringify({ ...cachedPayload, cacheHit: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Try Marketstack first (primary source)
    const marketstackApiKey = Deno.env.get('MARKETSTACK_API_KEY')
    if (marketstackApiKey) {
      try {
        // Calculate date range for Marketstack
        const { fromDate, toDate } = getDateRange(range)

        const marketstackResponse = await fetch(
          `http://api.marketstack.com/v2/eod?access_key=${marketstackApiKey}&symbols=${normalizedSymbol}&date_from=${fromDate}&date_to=${toDate}&limit=1000`
        )
        
        if (marketstackResponse.ok) {
          const marketstackData = (await marketstackResponse.json()) as MarketstackResponse

          if (marketstackData.data && marketstackData.data.length > 0) {
            const historicalData = marketstackData.data
              .map<HistoricalPoint>((item) => ({
                date: item.date.split('T')[0], // Convert to YYYY-MM-DD format
                open: item.open,
                high: item.high,
                low: item.low,
                close: item.close,
                volume: item.volume,
              }))
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) // Sort chronologically

            console.log(`Successfully fetched ${historicalData.length} historical records from Marketstack`)

            await setCachedPayload(cacheKey, {
              data: historicalData,
              source: 'marketstack',
              cachedAt: new Date().toISOString(),
            })

            return new Response(
              JSON.stringify({ data: historicalData, source: 'marketstack' }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
        }
      } catch (marketstackError) {
        console.log(`Marketstack failed for ${symbol}, trying Yahoo Finance...`, marketstackError)
      }
    } else {
      console.log('MARKETSTACK_API_KEY not configured, skipping to Yahoo Finance...')
    }

    // Try Yahoo Finance second
    try {
      const yahooResponse = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${normalizedSymbol}?interval=1d&range=${range}`
      )
      
      if (yahooResponse.ok) {
        const yahooData = (await yahooResponse.json()) as YahooChartResponse
        const result = yahooData.chart.result?.[0]
        const timestamps = result?.timestamp ?? []
        const quote = result?.indicators.quote?.[0]

        const historicalData = timestamps
          .map<HistoricalPoint>((timestamp, index) => ({
            date: new Date(timestamp * 1000).toISOString().split('T')[0],
            open: quote?.open?.[index] ?? null,
            high: quote?.high?.[index] ?? null,
            low: quote?.low?.[index] ?? null,
            close: quote?.close?.[index] ?? null,
            volume: quote?.volume?.[index] ?? null,
          }))
          .filter((item) => item.close !== null)

        console.log(`Successfully fetched ${historicalData.length} historical records from Yahoo Finance`)

        await setCachedPayload(cacheKey, {
          data: historicalData,
          source: 'yahoo',
          cachedAt: new Date().toISOString(),
        })

        return new Response(
          JSON.stringify({ data: historicalData, source: 'yahoo' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } catch (yahooError) {
      console.log(`Yahoo Finance failed for ${symbol}, trying Polygon.io...`, yahooError)
    }

    // Fallback to Polygon.io
    const polygonApiKey = Deno.env.get('POLYGON_API_KEY')
    if (!polygonApiKey) {
      throw new Error('POLYGON_API_KEY not configured')
    }

    // Calculate date range for Polygon
    const { fromDate, toDate } = getDateRange(range)

    const polygonResponse = await fetch(
      `https://api.polygon.io/v2/aggs/ticker/${normalizedSymbol}/range/1/day/${fromDate}/${toDate}?adjusted=true&sort=asc&apiKey=${polygonApiKey}`
    )

    if (!polygonResponse.ok) {
      throw new Error(`Polygon API error: ${polygonResponse.statusText}`)
    }

  const polygonData = (await polygonResponse.json()) as PolygonAggResponse
    
    if (!polygonData.results || polygonData.results.length === 0) {
      throw new Error('No historical data available for this symbol')
    }

    const historicalData = polygonData.results.map<HistoricalPoint>((item) => ({
      date: new Date(item.t).toISOString().split('T')[0],
      open: item.o,
      high: item.h,
      low: item.l,
      close: item.c,
      volume: item.v,
    }))

    console.log(`Successfully fetched ${historicalData.length} historical records from Polygon.io`)

    await setCachedPayload(cacheKey, {
      data: historicalData,
      source: 'polygon',
      cachedAt: new Date().toISOString(),
    })

    return new Response(
      JSON.stringify({ data: historicalData, source: 'polygon' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error fetching historical data:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
