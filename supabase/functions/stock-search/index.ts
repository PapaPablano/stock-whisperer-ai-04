import Alpaca from '@alpacahq/alpaca-trade-api'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
}

interface YahooSearchResponse {
  quotes: Array<{
    symbol: string
    shortname?: string
    longname?: string
    quoteType?: string
    exchange?: string
  }>
}

const alpacaFetch = async (endpoint: string, params: Record<string, string>) => {
  const url = new URL(`https://api.alpaca.markets${endpoint}`)
  Object.entries(params).forEach(([key, value]) => url.searchParams.append(key, value))

  const options = {
    method: 'GET',
    headers: {
      'APCA-API-KEY-ID': Deno.env.get('ALPACA_KEY_ID')!,
      'APCA-API-SECRET-KEY': Deno.env.get('ALPACA_SECRET_KEY')!,
    },
  }

  const response = await fetch(url.toString(), options)
  if (!response.ok) {
    const errorText = await response.text()
    console.error(`Alpaca API Error for ${url}: ${errorText}`)
    throw new Error(`Failed to fetch from Alpaca: ${response.status} ${response.statusText}`)
  }
  return response.json()
}

interface AlpacaAsset {
  symbol: string
  name: string
  asset_class: string
  exchange: string
}

const searchAlpacaAssets = async (query: string): Promise<AlpacaAsset[]> => {
  const assets: AlpacaAsset[] = await alpacaFetch('/v2/assets', { status: 'active', asset_class: 'us_equity' })
  const lowerCaseQuery = query.toLowerCase()

  return assets
    .filter(
      (asset) =>
        asset.symbol.toLowerCase().includes(lowerCaseQuery) ||
        asset.name.toLowerCase().includes(lowerCaseQuery),
    )
    .slice(0, 10)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = (await req.json()) as { query?: string } | null
    const query = body?.query

    if (!query) {
      return new Response(
        JSON.stringify({ error: 'Query is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    console.log(`Searching for: ${query}`)

    try {
      const alpacaAssets = await searchAlpacaAssets(query)

      const alpacaResults = alpacaAssets.map((asset) => ({
        symbol: asset.symbol,
        name: asset.name,
        type: asset.asset_class,
        exchange: asset.exchange,
      }))

      if (alpacaResults.length) {
        console.log(`Found ${alpacaResults.length} results from Alpaca`)
        return new Response(
          JSON.stringify({ results: alpacaResults, source: 'alpaca' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }
    } catch (alpacaError) {
      console.warn('Alpaca ticker search failed, falling back to Yahoo Finance', alpacaError)
    }

    try {
      const yahooResponse = await fetch(
        `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0`,
      )

      if (yahooResponse.ok) {
        const yahooData = (await yahooResponse.json()) as YahooSearchResponse
        const fallbackResults = (yahooData.quotes ?? []).map((quote) => ({
          symbol: quote.symbol,
          name: quote.shortname || quote.longname || quote.symbol,
          type: quote.quoteType,
          exchange: quote.exchange,
        }))

        if (fallbackResults.length) {
          console.log(`Found ${fallbackResults.length} results from Yahoo Finance`)
          return new Response(
            JSON.stringify({ results: fallbackResults, source: 'yahoo' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          )
        }
      }
    } catch (yahooError) {
      console.warn('Yahoo Finance search fallback failed', yahooError)
    }

    console.log('No Alpaca or Yahoo results available')
    return new Response(
      JSON.stringify({ results: [], source: 'none' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error('Error searching stocks:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
