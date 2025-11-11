import { supabaseAdmin } from '../_shared/supabaseAdminClient.ts'
import {
  createDefaultAlpacaClient,
  type AlpacaRestClient,
} from '../../../services/alpaca/client.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
}

const CACHE_PREFIX = 'quote'
const QUOTE_TTL_MS = 60 * 1000

const getCacheKey = (symbol: string) => `${CACHE_PREFIX}:${symbol.toUpperCase()}`

const isFresh = (lastUpdated: string | null, ttlMs: number) => {
  if (!lastUpdated) return false
  const age = Date.now() - new Date(lastUpdated).getTime()
  return age <= ttlMs
}

const getCachedQuote = async (cacheKey: string) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('stock_cache')
      .select('data, last_updated')
      .eq('cache_key', cacheKey)
      .maybeSingle()

    if (error || !data?.data) {
      return null
    }

    if (!isFresh(data.last_updated, QUOTE_TTL_MS)) {
      return null
    }

    return {
      ...data.data,
      cacheHit: true,
      lastUpdated: data.last_updated,
    }
  } catch (error) {
    console.error('Cache read error (quote):', error)
    return null
  }
}

const setCachedQuote = async (cacheKey: string, payload: Record<string, unknown>) => {
  try {
    await supabaseAdmin
      .from('stock_cache')
      .upsert({
        cache_key: cacheKey,
        data: payload,
        last_updated: new Date().toISOString(),
      }, { onConflict: 'cache_key' })
  } catch (error) {
    console.error('Cache write error (quote):', error)
  }
}

type QuotePayload = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number | null;
  high: number | null;
  low: number | null;
  open: number | null;
  previousClose: number | null;
  source: string;
  cachedAt: string;
  bid?: number | null;
  ask?: number | null;
  tradeTimestamp?: string;
  cacheHit?: boolean;
};

const STOCK_FEED = (Deno.env.get('ALPACA_STOCK_FEED') ?? 'iex').toLowerCase() === 'sip' ? 'sip' : 'iex'

let sharedAlpacaClient: AlpacaRestClient | null = null

const getAlpacaClient = (): AlpacaRestClient => {
  if (!sharedAlpacaClient) {
    sharedAlpacaClient = createDefaultAlpacaClient()
  }
  return sharedAlpacaClient
}

const fetchQuoteFromAlpaca = async (symbol: string): Promise<QuotePayload> => {
  const normalized = symbol.toUpperCase()

  const client = getAlpacaClient()
  const [tradeResp, quoteResp] = await Promise.all([
    client.getLatestTrade(normalized, STOCK_FEED),
    client.getLatestQuote(normalized, STOCK_FEED),
  ])

  const latestBarResponse = await client.getBars({
    symbol: normalized,
    timeframe: '1Day',
    limit: 2,
    sort: 'desc',
    adjustment: 'split',
    feed: STOCK_FEED,
  })

  const latestBar = latestBarResponse.bars.at(0) ?? null
  const previousBar = latestBarResponse.bars.at(1) ?? null

  let metadataName = normalized
  try {
    const metadata = await client.getTickerDetails(normalized)
    metadataName = metadata.ticker?.name ?? normalized
  } catch (error) {
    console.warn(`Alpaca ticker metadata fetch failed for ${normalized}`, error)
  }

  const lastPrice = tradeResp.trade?.p ?? latestBar?.c ?? 0
  const referencePrice = previousBar?.c ?? latestBar?.o ?? lastPrice
  const change = lastPrice - (referencePrice ?? lastPrice)
  const changePercent = referencePrice ? (change / referencePrice) * 100 : 0

  return {
    symbol: normalized,
    name: metadataName,
    price: lastPrice,
    change,
    changePercent,
    volume: latestBar?.v ?? null,
    high: latestBar?.h ?? null,
    low: latestBar?.l ?? null,
    open: latestBar?.o ?? null,
    previousClose: previousBar?.c ?? latestBar?.o ?? null,
    source: 'alpaca',
    cachedAt: new Date().toISOString(),
    bid: quoteResp.quote?.bp ?? null,
    ask: quoteResp.quote?.ap ?? null,
    tradeTimestamp: tradeResp.trade?.t ?? null,
    cacheHit: false,
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = (await req.json()) as { symbol?: string } | null
    const symbol = body?.symbol
    
    if (!symbol) {
      return new Response(
        JSON.stringify({ error: 'Symbol is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const normalizedSymbol = String(symbol).toUpperCase()
    const cacheKey = getCacheKey(normalizedSymbol)

    console.log(`Fetching quote for ${normalizedSymbol}`)

    const cachedQuote = await getCachedQuote(cacheKey)
    if (cachedQuote) {
      console.log(`Cache hit for ${normalizedSymbol}`)
      return new Response(
        JSON.stringify(cachedQuote),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
  const alpacaQuote = await fetchQuoteFromAlpaca(normalizedSymbol)

    await setCachedQuote(cacheKey, alpacaQuote)

    console.log(`Successfully fetched from Alpaca: ${normalizedSymbol}`)
    return new Response(
      JSON.stringify(alpacaQuote),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error fetching stock quote:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
