import { Alpaca } from 'https://esm.sh/@alpacahq/alpaca-trade-api@3.1.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
}

const resolveAlpacaCredentials = () => {
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

/**
 * WebSocket proxy for real-time Alpaca market data streaming
 * 
 * This Edge function establishes a WebSocket connection to Alpaca's real-time data feed
 * and proxies the data to the frontend via Server-Sent Events (SSE).
 * 
 * Query Parameters:
 * - symbols: Comma-separated list of stock symbols (e.g., "AAPL,GOOGL,MSFT")
 * - trades: Whether to subscribe to trades (default: true)
 * - quotes: Whether to subscribe to quotes (default: false)
 * - bars: Whether to subscribe to bars (default: false)
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const symbolsParam = url.searchParams.get('symbols')
    const subscribeTrades = url.searchParams.get('trades') !== 'false'
    const subscribeQuotes = url.searchParams.get('quotes') === 'true'
    const subscribeBars = url.searchParams.get('bars') === 'true'

    if (!symbolsParam) {
      return new Response(
        JSON.stringify({ error: 'symbols parameter is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const symbols = symbolsParam.split(',').map(s => s.trim().toUpperCase())

    if (symbols.length === 0) {
      return new Response(
        JSON.stringify({ error: 'At least one symbol is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Create a readable stream for SSE
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder()

        // Helper to send SSE message
        const sendEvent = (event: string, data: unknown) => {
          const message = `event: ${event}
data: ${JSON.stringify(data)}

`
          controller.enqueue(encoder.encode(message))
        }

        try {
          // Prepare subscription based on user preferences
          const subscription: {
            trades?: string[]
            quotes?: string[]
            bars?: string[]
          } = {}

          if (subscribeTrades) subscription.trades = symbols
          if (subscribeQuotes) subscription.quotes = symbols
          if (subscribeBars) subscription.bars = symbols

          console.log('Connecting to Alpaca stream with symbols:', symbols)

          const alpaca = resolveAlpacaCredentials()
          // Connect to Alpaca WebSocket
          const socket = alpaca.data_stream_v2
          
          socket.onConnect(() => {
            console.log('Connected to Alpaca stream')
            sendEvent('connected', { 
              message: 'Connected to real-time data stream',
              symbols,
              subscriptions: {
                trades: subscribeTrades,
                quotes: subscribeQuotes,
                bars: subscribeBars,
              }
            })
            socket.subscribe(subscription)
          })

          socket.onStateChange((state) => {
            console.log(`Alpaca stream state changed: ${state}`)
          })

          socket.onDisconnect(() => {
            console.log('Disconnected from Alpaca stream')
          })

          socket.onError((err) => {
            console.error('Alpaca stream error:', err)
            sendEvent('error', { 
              message: 'Stream error occurred',
              error: err.message
            })
          })

          socket.onStockTrade((trade) => {
            sendEvent('trade', trade)
          })

          socket.onStockQuote((quote) => {
            sendEvent('quote', quote)
          })

          socket.onStockBar((bar) => {
            sendEvent('bar', bar)
          })

          socket.onSubscription((sub) => {
            sendEvent('status', sub)
          })

          socket.connect()


          // Handle client disconnect
          req.signal.addEventListener('abort', () => {
            console.log('Client disconnected, closing Alpaca stream')
            socket.disconnect()
            controller.close()
          })

        } catch (error) {
          console.error('Error setting up stream:', error)
          sendEvent('error', { 
            message: 'Failed to connect to stream',
            error: error instanceof Error ? error.message : 'Unknown error'
          })
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Error in stock-stream endpoint:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      },
    )
  }
})
