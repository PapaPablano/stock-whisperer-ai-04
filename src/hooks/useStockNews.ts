import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface NewsArticle {
  id: number;
  headline: string;
  summary: string;
  author: string;
  created_at: string;
  updated_at: string;
  url: string;
  images?: {
    size: string;
    url: string;
  }[];
  symbols: string[];
  source: string;
}

export interface NewsResponse {
  articles: NewsArticle[];
  symbol?: string;
  limit: number;
  next_page_token?: string;
  cacheHit?: boolean;
  cachedAt?: string;
}

export interface UseStockNewsOptions {
  symbol?: string;
  symbols?: string[];
  start?: string;
  end?: string;
  limit?: number;
  sort?: 'asc' | 'desc';
  includeContent?: boolean;
  excludeContentless?: boolean;
  enabled?: boolean;
  refetchInterval?: number;
}

/**
 * Hook to fetch stock market news from Alpaca
 * 
 * @param options - Configuration options for the news query
 * @returns Query result with news articles
 * 
 * @example
 * // Get latest news for a specific stock
 * const { data, isLoading } = useStockNews({ symbol: 'AAPL', limit: 10 });
 * 
 * @example
 * // Get news for multiple stocks
 * const { data } = useStockNews({ symbols: ['AAPL', 'GOOGL', 'MSFT'] });
 * 
 * @example
 * // Get all market news
 * const { data } = useStockNews({ limit: 20 });
 */
export const useStockNews = (options?: UseStockNewsOptions) => {
  const {
    symbol,
    symbols,
    start,
    end,
    limit = 10,
    sort = 'desc',
    includeContent = false,
    excludeContentless = false,
    enabled = true,
    refetchInterval = 5 * 60 * 1000, // Refetch every 5 minutes by default
  } = options || {};

  // Create a stable query key
  const queryKey = [
    'stock-news',
    symbol,
    symbols?.join(','),
    start,
    end,
    limit,
    sort,
    includeContent,
    excludeContentless,
  ];

  return useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('stock-news', {
        body: {
          symbol,
          symbols,
          start,
          end,
          limit,
          sort,
          includeContent,
          excludeContentless,
        },
      });

      if (error) throw error;
      return data as NewsResponse;
    },
    enabled: enabled,
    staleTime: 4 * 60 * 1000, // Consider data stale after 4 minutes
    refetchInterval: refetchInterval,
  });
};

/**
 * Hook to fetch news for a specific symbol
 * Convenience wrapper around useStockNews
 * 
 * @param symbol - Stock symbol (e.g., 'AAPL')
 * @param limit - Maximum number of articles to fetch (default: 10)
 * @returns Query result with news articles
 */
export const useSymbolNews = (symbol: string, limit: number = 10) => {
  return useStockNews({
    symbol,
    limit,
    excludeContentless: true, // Filter out articles without content
  });
};

/**
 * Hook to fetch general market news (all symbols)
 * 
 * @param limit - Maximum number of articles to fetch (default: 20)
 * @returns Query result with news articles
 */
export const useMarketNews = (limit: number = 20) => {
  return useStockNews({
    limit,
    excludeContentless: true,
  });
};
