import { supabase } from '@/integrations/supabase/client';

// Types
export interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  source: string;
  lastUpdated?: string;
}

export interface HistoricalDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IntradayDataPoint {
  datetime: string;
  date: string;
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StockNews {
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  summary?: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
}

export interface FundamentalMetrics {
  symbol: string;
  marketCap: string;
  peRatio: string;
  dividendYield: string;
  eps: string;
  fiftyTwoWeekHigh: string;
  fiftyTwoWeekLow: string;
  avgVolume: string;
  beta: string;
}

/**
 * Fetch current stock quote with real-time pricing
 * Uses Marketstack → Yahoo Finance → Polygon.io fallback.
 * Server-side caching is handled within the Edge Function using the service key.
 */
export async function fetchStockQuote(symbol: string): Promise<StockQuote> {
  const { data, error } = await supabase.functions.invoke('stock-quote', {
    body: { symbol },
  });

  if (error) {
    throw new Error(error.message);
  }

  const lastUpdated = data?.lastUpdated ?? data?.cachedAt ?? new Date().toISOString();

  return {
    symbol: data.symbol,
    name: data.name,
    price: data.price,
    change: data.change,
    changePercent: data.changePercent,
    volume: data.volume,
    high: data.high,
    low: data.low,
    open: data.open,
    previousClose: data.previousClose,
    source: data.source,
    lastUpdated,
  };
}

/**
 * Fetch historical OHLC data. Caching is handled in the Edge Function so we
 * simply invoke the function and return its payload.
 */
export async function fetchHistoricalData(
  symbol: string,
  dateRange: '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '5y' = '1mo'
): Promise<HistoricalDataPoint[]> {
  const { data, error } = await supabase.functions.invoke('stock-historical', {
    body: { symbol, range: dateRange },
  });

  if (error) {
    throw new Error(error.message);
  }

  return data.data as HistoricalDataPoint[];
}

/**
 * Fetch minute-level intraday data. The edge function encapsulates caching
 * and third-party API fallbacks.
 */
export async function fetchIntradayData(
  symbol: string,
  interval: '1min' | '5min' | '15min' | '30min' | '1hour' = '1min',
  range: '1d' | '5d' | '1w' = '1d'
): Promise<IntradayDataPoint[]> {
  const { data, error } = await supabase.functions.invoke('stock-intraday', {
    body: { symbol, interval, range },
  });

  if (error) {
    if (error.message?.includes('unavailable') || error.message?.includes('paid plan')) {
      console.warn('Intraday data requires paid plan, falling back to daily data');
      return [];
    }
    throw new Error(error.message);
  }

  return data.data as IntradayDataPoint[];
}

/**
 * Fetch latest news for a stock symbol. Currently returns mock data until a
 * provider is wired up.
 */
export async function fetchStockNews(symbol: string, limit: number = 10): Promise<StockNews[]> {
  const mockNews: StockNews[] = [
    {
      title: `${symbol} Stock Analysis: Market Update`,
      url: '#',
      source: 'Financial Times',
      publishedAt: new Date().toISOString(),
      summary: 'Latest market developments and analysis',
      sentiment: 'neutral',
    },
  ];

  return mockNews.slice(0, limit);
}

/**
 * Fetch fundamental metrics (P/E ratio, market cap, etc.). Currently returns
 * placeholder data until we integrate a fundamentals API.
 */
export async function fetchFundamentalMetrics(symbol: string): Promise<FundamentalMetrics> {
  return {
    symbol,
    marketCap: '$2.75T',
    peRatio: '28.45',
    dividendYield: '0.52%',
    eps: '$6.27',
    fiftyTwoWeekHigh: '$198.23',
    fiftyTwoWeekLow: '$142.56',
    avgVolume: '52.3M',
    beta: '1.24',
  };
}

/**
 * Check if market is currently open (US market hours)
 * 9:30 AM - 4:00 PM ET, Monday-Friday
 */
export function isMarketOpen(): boolean {
  const now = new Date();
  const day = now.getDay();
  const hour = now.getUTCHours() - 5; // ET timezone
  const minute = now.getUTCMinutes();

  // Weekend
  if (day === 0 || day === 6) return false;

  // Convert to minutes since midnight
  const currentTime = hour * 60 + minute;
  const marketOpen = 9 * 60 + 30;  // 9:30 AM
  const marketClose = 16 * 60;      // 4:00 PM

  return currentTime >= marketOpen && currentTime < marketClose;
}

/**
 * Batch fetch quotes for multiple symbols
 * Useful for watchlists
 */
export async function fetchMultipleQuotes(symbols: string[]): Promise<Map<string, StockQuote>> {
  const results = new Map<string, StockQuote>();
  
  // Fetch in parallel
  const promises = symbols.map(symbol => 
    fetchStockQuote(symbol)
      .then(quote => results.set(symbol, quote))
      .catch(err => console.error(`Error fetching ${symbol}:`, err))
  );

  await Promise.all(promises);
  
  return results;
}
