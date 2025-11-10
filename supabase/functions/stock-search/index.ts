/// <reference lib="deno.ns" />
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
}

interface YahooSearchResponse {
  quotes: Array<{
    symbol: string;
    shortname?: string;
    longname?: string;
    quoteType?: string;
    exchange?: string;
  }>;
}

interface PolygonSearchResponse {
  results?: Array<{
    ticker: string;
    name: string;
    type?: string;
    primary_exchange?: string;
  }>;
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
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Searching for: ${query}`)

    // Try Yahoo Finance search first
    try {
      const yahooResponse = await fetch(
        `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0`
      )
      
      if (yahooResponse.ok) {
        const yahooData = (await yahooResponse.json()) as YahooSearchResponse
        const results = (yahooData.quotes ?? []).map((quote) => ({
          symbol: quote.symbol,
          name: quote.shortname || quote.longname || quote.symbol,
          type: quote.quoteType,
          exchange: quote.exchange,
        }))

        console.log(`Found ${results.length} results from Yahoo Finance`)
        return new Response(
          JSON.stringify({ results, source: 'yahoo' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } catch (yahooError) {
      console.log('Yahoo Finance search failed, trying Polygon.io...', yahooError)
    }

    // Fallback to Polygon.io ticker search
    const polygonApiKey = Deno.env.get('POLYGON_API_KEY')
    if (!polygonApiKey) {
      throw new Error('POLYGON_API_KEY not configured')
    }

    const polygonResponse = await fetch(
      `https://api.polygon.io/v3/reference/tickers?search=${encodeURIComponent(query)}&active=true&limit=10&apiKey=${polygonApiKey}`
    )

    if (!polygonResponse.ok) {
      throw new Error(`Polygon API error: ${polygonResponse.statusText}`)
    }

    const polygonData = (await polygonResponse.json()) as PolygonSearchResponse

    const results = (polygonData.results ?? []).map((ticker) => ({
      symbol: ticker.ticker,
      name: ticker.name,
      type: ticker.type,
      exchange: ticker.primary_exchange,
    }))

    console.log(`Found ${results.length} results from Polygon.io`)
    return new Response(
      JSON.stringify({ results, source: 'polygon' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error searching stocks:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
