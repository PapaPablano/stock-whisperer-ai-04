import {
  createDefaultAlpacaClient,
  type AlpacaRestClient,
} from '../../../services/alpaca/client.ts'

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
      const alpacaClient = getAlpacaClient()
      const alpacaResponse = await alpacaClient.searchTickers({
        search: query,
        active: true,
        limit: 10,
      })

      const alpacaResults = (alpacaResponse.tickers ?? []).map((ticker) => ({
        symbol: ticker.symbol,
        name: ticker.name ?? ticker.symbol,
        type: ticker.asset_class,
        exchange: ticker.exchange,
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
