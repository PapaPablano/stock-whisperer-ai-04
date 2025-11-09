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
    const { symbol, interval = '1min', range = '1d' } = await req.json()
    
    if (!symbol) {
      return new Response(
        JSON.stringify({ error: 'Symbol is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Fetching intraday data for ${symbol} with interval ${interval} and range ${range}`)

    // Marketstack intraday data (requires paid plan)
    const marketstackApiKey = Deno.env.get('MARKETSTACK_API_KEY')
    if (marketstackApiKey) {
      try {
        // Calculate date range for intraday data
        const endDate = new Date()
        const startDate = new Date()
        
        switch(range) {
          case '1d':
            startDate.setDate(endDate.getDate() - 1)
            break
          case '5d':
            startDate.setDate(endDate.getDate() - 5)
            break
          case '1w':
            startDate.setDate(endDate.getDate() - 7)
            break
          default:
            startDate.setDate(endDate.getDate() - 1)
        }

        const fromDate = startDate.toISOString().split('T')[0]
        const toDate = endDate.toISOString().split('T')[0]

        // Map interval to Marketstack format
        let marketstackInterval = '1min'
        switch(interval) {
          case '1min':
            marketstackInterval = '1min'
            break
          case '5min':
            marketstackInterval = '5min'
            break
          case '15min':
            marketstackInterval = '15min'
            break
          case '30min':
            marketstackInterval = '30min'
            break
          case '1hour':
            marketstackInterval = '1hour'
            break
          default:
            marketstackInterval = '1min'
        }

        const marketstackResponse = await fetch(
          `http://api.marketstack.com/v2/intraday?access_key=${marketstackApiKey}&symbols=${symbol}&interval=${marketstackInterval}&date_from=${fromDate}&date_to=${toDate}&limit=1000`
        )
        
        if (marketstackResponse.ok) {
          const marketstackData = await marketstackResponse.json()
          
          if (marketstackData.data && marketstackData.data.length > 0) {
            const intradayData = marketstackData.data
              .map((item: any) => ({
                datetime: item.date, // Full datetime string
                date: item.date.split('T')[0], // Date only
                time: item.date.split('T')[1]?.split('+')[0] || '', // Time only
                open: item.open,
                high: item.high,
                low: item.low,
                close: item.close,
                volume: item.volume,
              }))
              .sort((a: any, b: any) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime()) // Sort chronologically

            console.log(`Successfully fetched ${intradayData.length} intraday records from Marketstack`)
            return new Response(
              JSON.stringify({ 
                data: intradayData, 
                source: 'marketstack',
                interval: marketstackInterval,
                symbol: symbol 
              }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
        } else {
          // Handle specific Marketstack errors
          const errorData = await marketstackResponse.json().catch(() => null)
          if (errorData?.error?.code === 'function_access_restricted') {
            throw new Error('Intraday data requires Marketstack paid plan')
          }
          throw new Error(`Marketstack API error: ${marketstackResponse.statusText}`)
        }
      } catch (marketstackError) {
        console.log(`Marketstack intraday failed for ${symbol}:`, marketstackError)
        
        // Return specific error for paid feature
        if (marketstackError.message?.includes('paid plan')) {
          return new Response(
            JSON.stringify({ 
              error: 'Intraday data requires Marketstack paid plan. Falling back to end-of-day data.',
              suggestion: 'Use stock-historical endpoint for daily data instead.'
            }),
            { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }
    } else {
      console.log('MARKETSTACK_API_KEY not configured for intraday data')
    }

    // Fallback: Return error since intraday requires paid APIs
    return new Response(
      JSON.stringify({ 
        error: 'Intraday data unavailable',
        message: 'Real-time intraday data requires Marketstack paid plan or other premium API access.',
        suggestion: 'Use stock-historical endpoint for daily data instead.'
      }),
      { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error fetching intraday data:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})