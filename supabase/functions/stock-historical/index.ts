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
    const { symbol, range = '1mo' } = await req.json()
    
    if (!symbol) {
      return new Response(
        JSON.stringify({ error: 'Symbol is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Fetching historical data for ${symbol} with range ${range}`)

    // Try Marketstack first (primary source)
    const marketstackApiKey = Deno.env.get('MARKETSTACK_API_KEY')
    if (marketstackApiKey) {
      try {
        // Calculate date range for Marketstack
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

        const fromDate = startDate.toISOString().split('T')[0]
        const toDate = endDate.toISOString().split('T')[0]

        const marketstackResponse = await fetch(
          `http://api.marketstack.com/v2/eod?access_key=${marketstackApiKey}&symbols=${symbol}&date_from=${fromDate}&date_to=${toDate}&limit=1000`
        )
        
        if (marketstackResponse.ok) {
          const marketstackData = await marketstackResponse.json()
          
          if (marketstackData.data && marketstackData.data.length > 0) {
            const historicalData = marketstackData.data
              .map((item: any) => ({
                date: item.date.split('T')[0], // Convert to YYYY-MM-DD format
                open: item.open,
                high: item.high,
                low: item.low,
                close: item.close,
                volume: item.volume,
              }))
              .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()) // Sort chronologically

            console.log(`Successfully fetched ${historicalData.length} historical records from Marketstack`)
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
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=${range}`
      )
      
      if (yahooResponse.ok) {
        const yahooData = await yahooResponse.json()
        const result = yahooData.chart.result[0]
        const timestamps = result.timestamp
        const quote = result.indicators.quote[0]
        
        const historicalData = timestamps.map((timestamp: number, index: number) => ({
          date: new Date(timestamp * 1000).toISOString().split('T')[0],
          open: quote.open[index],
          high: quote.high[index],
          low: quote.low[index],
          close: quote.close[index],
          volume: quote.volume[index],
        })).filter((item: any) => item.close !== null)

        console.log(`Successfully fetched ${historicalData.length} historical records from Yahoo Finance`)
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

    const fromDate = startDate.toISOString().split('T')[0]
    const toDate = endDate.toISOString().split('T')[0]

    const polygonResponse = await fetch(
      `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/1/day/${fromDate}/${toDate}?adjusted=true&sort=asc&apiKey=${polygonApiKey}`
    )

    if (!polygonResponse.ok) {
      throw new Error(`Polygon API error: ${polygonResponse.statusText}`)
    }

    const polygonData = await polygonResponse.json()
    
    if (!polygonData.results || polygonData.results.length === 0) {
      throw new Error('No historical data available for this symbol')
    }

    const historicalData = polygonData.results.map((item: any) => ({
      date: new Date(item.t).toISOString().split('T')[0],
      open: item.o,
      high: item.h,
      low: item.l,
      close: item.c,
      volume: item.v,
    }))

    console.log(`Successfully fetched ${historicalData.length} historical records from Polygon.io`)
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
