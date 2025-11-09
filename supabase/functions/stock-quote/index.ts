import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { symbol } = await req.json()
    
    if (!symbol) {
      return new Response(
        JSON.stringify({ error: 'Symbol is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Fetching quote for ${symbol}`)

    // Try Marketstack first (primary source)
    const marketstackApiKey = Deno.env.get('MARKETSTACK_API_KEY')
    
    if (marketstackApiKey) {
      try {
        const marketstackResponse = await fetch(
          `http://api.marketstack.com/v2/eod/latest?access_key=${marketstackApiKey}&symbols=${symbol}`
        )
        
        if (marketstackResponse.ok) {
          const marketstackData = await marketstackResponse.json()
          
          if (marketstackData.data && marketstackData.data.length > 0) {
            const result = marketstackData.data[0]
            
            const data = {
              symbol: result.symbol,
              name: result.name || result.symbol, // v2 API provides company name
              price: result.close,
              change: result.close - result.open,
              changePercent: ((result.close - result.open) / result.open) * 100,
              volume: result.volume,
              high: result.high,
              low: result.low,
              open: result.open,
              previousClose: result.close, // Using close as previous close for EOD data
              source: 'marketstack'
            }

            console.log(`Successfully fetched from Marketstack: ${symbol}`)
            return new Response(
              JSON.stringify(data),
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

    // Try Yahoo Finance second (no API key needed)
    try {
      const yahooResponse = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`
      )
      
      if (yahooResponse.ok) {
        const yahooData = await yahooResponse.json()
        const result = yahooData.chart.result[0]
        const meta = result.meta
        
        const data = {
          symbol: meta.symbol,
          name: meta.shortName || meta.symbol,
          price: meta.regularMarketPrice,
          change: meta.regularMarketPrice - meta.previousClose,
          changePercent: ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100,
          volume: meta.regularMarketVolume,
          high: meta.regularMarketDayHigh,
          low: meta.regularMarketDayLow,
          open: meta.regularMarketOpen,
          previousClose: meta.previousClose,
          source: 'yahoo'
        }

        console.log(`Successfully fetched from Yahoo Finance: ${symbol}`)
        return new Response(
          JSON.stringify(data),
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

    const polygonResponse = await fetch(
      `https://api.polygon.io/v2/aggs/ticker/${symbol}/prev?adjusted=true&apiKey=${polygonApiKey}`
    )

    if (!polygonResponse.ok) {
      throw new Error(`Polygon API error: ${polygonResponse.statusText}`)
    }

    const polygonData = await polygonResponse.json()
    
    if (!polygonData.results || polygonData.results.length === 0) {
      throw new Error('No data available for this symbol')
    }

    const result = polygonData.results[0]
    
    const data = {
      symbol: polygonData.ticker,
      name: polygonData.ticker,
      price: result.c,
      change: result.c - result.o,
      changePercent: ((result.c - result.o) / result.o) * 100,
      volume: result.v,
      high: result.h,
      low: result.l,
      open: result.o,
      previousClose: result.o,
      source: 'polygon'
    }

    console.log(`Successfully fetched from Polygon.io: ${symbol}`)
    return new Response(
      JSON.stringify(data),
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
