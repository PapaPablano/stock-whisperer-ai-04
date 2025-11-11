import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface TradeUpdate {
  symbol: string;
  price: number;
  size: number;
  timestamp: string;
  conditions?: string[];
  exchange?: string;
}

export interface QuoteUpdate {
  symbol: string;
  bidPrice: number;
  bidSize: number;
  askPrice: number;
  askSize: number;
  timestamp: string;
  conditions?: string[];
}

export interface BarUpdate {
  symbol: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: string;
  tradeCount?: number;
  vwap?: number;
}

export type StreamStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface UseStockStreamOptions {
  symbols: string[];
  subscribeTrades?: boolean;
  subscribeQuotes?: boolean;
  subscribeBars?: boolean;
  enabled?: boolean;
  onTrade?: (trade: TradeUpdate) => void;
  onQuote?: (quote: QuoteUpdate) => void;
  onBar?: (bar: BarUpdate) => void;
}

export interface UseStockStreamResult {
  status: StreamStatus;
  lastTrade: TradeUpdate | null;
  lastQuote: QuoteUpdate | null;
  lastBar: BarUpdate | null;
  error: string | null;
  reconnect: () => void;
  disconnect: () => void;
}

/**
 * Hook to subscribe to real-time stock market data via Alpaca WebSocket
 * 
 * @param options - Configuration options for the stream
 * @returns Stream state and control functions
 * 
 * @example
 * // Subscribe to trades for multiple symbols
 * const { status, lastTrade } = useStockStream({
 *   symbols: ['AAPL', 'GOOGL', 'MSFT'],
 *   subscribeTrades: true,
 *   onTrade: (trade) => {
 *     console.log(`${trade.symbol}: $${trade.price}`);
 *   }
 * });
 * 
 * @example
 * // Subscribe to quotes
 * const { lastQuote } = useStockStream({
 *   symbols: ['AAPL'],
 *   subscribeQuotes: true,
 * });
 */
export const useStockStream = (options: UseStockStreamOptions): UseStockStreamResult => {
  const {
    symbols,
    subscribeTrades = true,
    subscribeQuotes = false,
    subscribeBars = false,
    enabled = true,
    onTrade,
    onQuote,
    onBar,
  } = options;

  const [status, setStatus] = useState<StreamStatus>('disconnected');
  const [lastTrade, setLastTrade] = useState<TradeUpdate | null>(null);
  const [lastQuote, setLastQuote] = useState<QuoteUpdate | null>(null);
  const [lastBar, setLastBar] = useState<BarUpdate | null>(null);
  const [error, setError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    setStatus('disconnected');
  }, []);

  const connect = useCallback(() => {
    if (!enabled || symbols.length === 0) {
      return;
    }

    // Close existing connection
    disconnect();

    setStatus('connecting');
    setError(null);

    try {
      // Get Supabase URL
      const supabaseUrl = supabase.supabaseUrl;
      
      // Build the stream URL
      const streamUrl = new URL(`${supabaseUrl}/functions/v1/stock-stream`);
      streamUrl.searchParams.set('symbols', symbols.join(','));
      streamUrl.searchParams.set('trades', String(subscribeTrades));
      streamUrl.searchParams.set('quotes', String(subscribeQuotes));
      streamUrl.searchParams.set('bars', String(subscribeBars));

      // Get the anon key for authorization
      const anonKey = supabase.supabaseKey;
      
      const eventSource = new EventSource(streamUrl.toString(), {
        withCredentials: false,
      });

      // Add authorization header (note: EventSource doesn't support custom headers directly)
      // We'll need to pass it via query params or use a different approach
      
      eventSource.addEventListener('connected', (event) => {
        console.log('Stream connected:', event.data);
        setStatus('connected');
        setError(null);
        reconnectAttemptsRef.current = 0;
      });

      eventSource.addEventListener('trade', (event) => {
        try {
          const trade = JSON.parse(event.data) as TradeUpdate;
          setLastTrade(trade);
          if (onTrade) onTrade(trade);
        } catch (err) {
          console.error('Error parsing trade event:', err);
        }
      });

      eventSource.addEventListener('quote', (event) => {
        try {
          const quote = JSON.parse(event.data) as QuoteUpdate;
          setLastQuote(quote);
          if (onQuote) onQuote(quote);
        } catch (err) {
          console.error('Error parsing quote event:', err);
        }
      });

      eventSource.addEventListener('bar', (event) => {
        try {
          const bar = JSON.parse(event.data) as BarUpdate;
          setLastBar(bar);
          if (onBar) onBar(bar);
        } catch (err) {
          console.error('Error parsing bar event:', err);
        }
      });

      eventSource.addEventListener('error', (event) => {
        console.error('Stream error event:', event);
        try {
          const data = (event as MessageEvent).data;
          const errorMsg = data ? JSON.parse(data).message : 'Stream error';
          setError(errorMsg);
        } catch {
          setError('Stream error');
        }
        setStatus('error');
      });

      eventSource.addEventListener('closed', (event) => {
        console.log('Stream closed:', event.data);
        setStatus('disconnected');
      });

      eventSource.onerror = (event) => {
        console.error('EventSource error:', event);
        setStatus('error');
        setError('Connection error');
        
        // Implement exponential backoff for reconnection
        if (reconnectAttemptsRef.current < 5) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          console.log(`Reconnecting in ${delay}ms...`);
          reconnectTimeoutRef.current = window.setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        }
      };

      eventSourceRef.current = eventSource;
    } catch (err) {
      console.error('Error setting up stream:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect');
      setStatus('error');
    }
  }, [symbols, subscribeTrades, subscribeQuotes, subscribeBars, enabled, onTrade, onQuote, onBar, disconnect]);

  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    connect();
  }, [connect]);

  // Connect on mount and when dependencies change
  useEffect(() => {
    if (enabled && symbols.length > 0) {
      connect();
    }

    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, symbols.join(','), subscribeTrades, subscribeQuotes, subscribeBars]);

  return {
    status,
    lastTrade,
    lastQuote,
    lastBar,
    error,
    reconnect,
    disconnect,
  };
};

/**
 * Hook to subscribe to real-time trades for a single symbol
 * Convenience wrapper around useStockStream
 * 
 * @param symbol - Stock symbol
 * @param enabled - Whether to enable the stream
 * @returns Stream state with last trade
 */
export const useStockTrades = (symbol: string, enabled: boolean = true) => {
  return useStockStream({
    symbols: [symbol],
    subscribeTrades: true,
    subscribeQuotes: false,
    subscribeBars: false,
    enabled,
  });
};
