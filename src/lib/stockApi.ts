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

// Cache utilities
const CACHE_DURATION = 60 * 1000; // 1 minute in milliseconds

async function getCachedData<T>(key: string, maxAge: number = CACHE_DURATION): Promise<T | null> {
  try {
    const { data, error } = await supabase
      .from('stock_cache')
      .select('data, last_updated')
      .eq('cache_key', key)
      .single();

    if (error || !data) return null;

    const cacheAge = Date.now() - new Date(data.last_updated).getTime();
    if (cacheAge > maxAge) return null;

    return data.data as T;
  } catch {
    return null;
  }
}

async function setCachedData(key: string, data: any): Promise<void> {
  try {
    await supabase
      .from('stock_cache')
      .upsert({
        cache_key: key,
        data: data,
        last_updated: new Date().toISOString()
      }, {
        onConflict: 'cache_key'
      });
  } catch (error) {
    console.error('Cache write error:', error);
  }
}

/**
 * Fetch current stock quote with real-time pricing
 * Uses Marketstack → Yahoo Finance → Polygon.io fallback
 */
export async function fetchStockQuote(symbol: string): Promise<StockQuote> {
  const cacheKey = `quote:${symbol}`;
  
  // Check cache first
  const cached = await getCachedData<StockQuote>(cacheKey, CACHE_DURATION);
  if (cached) {
    return { ...cached, lastUpdated: 'cached' };
  }

  // Fetch from API
  const { data, error } = await supabase.functions.invoke('stock-quote', {
    body: { symbol },
  });

  if (error) throw new Error(error.message);
  
  const quote: StockQuote = {
    ...data,
    lastUpdated: new Date().toISOString()
  };

  // Cache the result
  await setCachedData(cacheKey, quote);

  return quote;
}

/**
 * Fetch historical OHLC data
 * Historical data doesn't expire (market data is immutable)
 */
export async function fetchHistoricalData(
  symbol: string, 
  dateRange: '1d' | '5d' | '1mo' | '3mo' | '6mo' | '1y' | '5y' = '1mo'
): Promise<HistoricalDataPoint[]> {
  const cacheKey = `historical:${symbol}:${dateRange}`;
  
  // Historical data can be cached indefinitely (it doesn't change)
  const cached = await getCachedData<HistoricalDataPoint[]>(cacheKey, Infinity);
  if (cached) return cached;

  const { data, error } = await supabase.functions.invoke('stock-historical', {
    body: { symbol, range: dateRange },
  });

  if (error) throw new Error(error.message);
  
  const historicalData = data.data as HistoricalDataPoint[];

  // Cache indefinitely
  await setCachedData(cacheKey, historicalData);

  return historicalData;
}

/**
 * Fetch minute-level intraday data
 * Note: Requires Marketstack paid plan for real-time intraday data
 */
export async function fetchIntradayData(
  symbol: string,
  interval: '1min' | '5min' | '15min' | '30min' | '1hour' = '1min',
  range: '1d' | '5d' | '1w' = '1d'
): Promise<IntradayDataPoint[]> {
  const cacheKey = `intraday:${symbol}:${interval}:${range}`;
  
  // Intraday data cached for 1 minute
  const cached = await getCachedData<IntradayDataPoint[]>(cacheKey, CACHE_DURATION);
  if (cached) return cached;

  const { data, error } = await supabase.functions.invoke('stock-intraday', {
    body: { symbol, interval, range },
  });

  if (error) {
    // If intraday data unavailable (free tier), return empty array
    if (error.message?.includes('unavailable') || error.message?.includes('paid plan')) {
      console.warn('Intraday data requires paid plan, falling back to daily data');
      return [];
    }
    throw new Error(error.message);
  }
  
  const intradayData = data.data as IntradayDataPoint[];

  await setCachedData(cacheKey, intradayData);

  return intradayData;
}

/**
 * Fetch latest news for a stock symbol
 * Uses News API or similar service for sentiment analysis
 */
export async function fetchStockNews(symbol: string, limit: number = 10): Promise<StockNews[]> {
  const cacheKey = `news:${symbol}`;
  
  // News cached for 5 minutes
  const cached = await getCachedData<StockNews[]>(cacheKey, 5 * 60 * 1000);
  if (cached) return cached;

  // TODO: Implement news API integration (NewsAPI, Alpha Vantage, or similar)
  // For now, return mock data
  const mockNews: StockNews[] = [
    {
      title: `${symbol} Stock Analysis: Market Update`,
      url: '#',
      source: 'Financial Times',
      publishedAt: new Date().toISOString(),
      summary: 'Latest market developments and analysis',
      sentiment: 'neutral'
    }
  ];

  await setCachedData(cacheKey, mockNews);

  return mockNews;
}

/**
 * Fetch fundamental metrics (P/E ratio, market cap, etc.)
 * These change infrequently, cache for 1 hour
 */
export async function fetchFundamentalMetrics(symbol: string): Promise<FundamentalMetrics> {
  const cacheKey = `fundamentals:${symbol}`;
  
  // Fundamentals cached for 1 hour
  const cached = await getCachedData<FundamentalMetrics>(cacheKey, 60 * 60 * 1000);
  if (cached) return cached;

  // TODO: Implement fundamentals API (Financial Modeling Prep, Alpha Vantage, or Yahoo Finance)
  // For now, return mock data
  const mockFundamentals: FundamentalMetrics = {
    symbol,
    marketCap: '$2.75T',
    peRatio: '28.45',
    dividendYield: '0.52%',
    eps: '$6.27',
    fiftyTwoWeekHigh: '$198.23',
    fiftyTwoWeekLow: '$142.56',
    avgVolume: '52.3M',
    beta: '1.24'
  };

  await setCachedData(cacheKey, mockFundamentals);

  return mockFundamentals;
}

/**
 * Clear cache for a specific symbol or all data
 */
export async function clearCache(symbol?: string): Promise<void> {
  try {
    if (symbol) {
      // Clear all cache entries for this symbol
      const patterns = [
        `quote:${symbol}`,
        `historical:${symbol}%`,
        `intraday:${symbol}%`,
        `news:${symbol}`,
        `fundamentals:${symbol}`
      ];

      for (const pattern of patterns) {
        await supabase
          .from('stock_cache')
          .delete()
          .like('cache_key', pattern);
      }
    } else {
      // Clear all cache
      await supabase.from('stock_cache').delete().neq('cache_key', '');
    }
  } catch (error) {
    console.error('Cache clear error:', error);
  }
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
