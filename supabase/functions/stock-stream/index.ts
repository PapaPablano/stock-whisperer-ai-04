import { connectEquitiesStream } from '../_shared/alpaca/stream.ts'
import { resolveAlpacaCredentials } from '../_shared/alpaca/client.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-application-name',
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
        const sendEvent = (event: string, data: any) => {
          const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
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

          // Connect to Alpaca WebSocket
          const socket = await connectEquitiesStream({
            credentials: resolveAlpacaCredentials(),
            symbols: subscription,
            onOpen: () => {
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
            },
            onMessage: (data: any) => {
              // Forward Alpaca messages to client
              // Alpaca sends arrays of messages
              if (Array.isArray(data)) {
                for (const item of data) {
                  if (item.T === 't') {
                    // Trade update
                    sendEvent('trade', {
                      symbol: item.S,
                      price: item.p,
                      size: item.s,
                      timestamp: item.t,
                      conditions: item.c,
                      exchange: item.x,
                    })
                  } else if (item.T === 'q') {
                    // Quote update
                    sendEvent('quote', {
                      symbol: item.S,
                      bidPrice: item.bp,
                      bidSize: item.bs,
                      askPrice: item.ap,
                      askSize: item.as,
                      timestamp: item.t,
                      conditions: item.c,
                    })
                  } else if (item.T === 'b') {
                    // Bar update
                    sendEvent('bar', {
                      symbol: item.S,
                      open: item.o,
                      high: item.h,
                      low: item.l,
                      close: item.c,
                      volume: item.v,
                      timestamp: item.t,
                      tradeCount: item.n,
                      vwap: item.vw,
                    })
                  } else if (item.T === 'success' || item.T === 'subscription') {
                    // Status messages
                    sendEvent('status', item)
                  }
                }
              } else {
                // Single message
                sendEvent('message', data)
              }
            },
            onError: (event) => {
              console.error('Alpaca stream error:', event)
              sendEvent('error', { 
                message: 'Stream error occurred',
                error: event instanceof ErrorEvent ? event.message : 'Unknown error'
              })
            },
            onClose: (event) => {
              console.log('Alpaca stream closed:', event.code, event.reason)
              sendEvent('closed', { 
                message: 'Stream closed',
                code: event.code,
                reason: event.reason
              })
              controller.close()
            },
          })

          // Handle client disconnect
          req.signal.addEventListener('abort', () => {
            console.log('Client disconnected, closing Alpaca stream')
            socket.close()
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
