import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Interval } from '@/lib/aggregateBars';

export type InstrumentType = 'equity' | 'future';

/**
 * Represents a single intraday data point for a stock or future.
 * 
 * **BREAKING CHANGE**: As of commit 17cf177, all numeric fields (open, high, low, close, volume)
 * are now nullable to handle cases where data may be incomplete or unavailable from the API.
 * 
 * Consumers of this interface should handle null values appropriately:
 * - Check for null before performing calculations
 * - Use optional chaining or nullish coalescing operators
 * - Consider filtering out null values before charting
 * 
 * @example
 * ```typescript
 * const data: IntradayData = {
 *   datetime: '2024-01-01T09:30:00Z',
 *   date: '2024-01-01',
 *   time: '09:30:00',
 *   open: 100.5,
 *   high: 101.2,
 *   low: 100.1,
 *   close: 101.0,
 *   volume: 1000000
 * };
 * 
 * // Handle potential null values
 * const safeClose = data.close ?? 0;
 * if (data.close !== null) {
 *   // Perform calculations
 * }
 * ```
 */
export interface IntradayData {
  /** ISO 8601 datetime string (e.g., '2024-01-01T09:30:00Z') */
  datetime: string;
  /** Date in YYYY-MM-DD format */
  date: string;
  /** Time in HH:MM:SS format */
  time: string;
  /** Opening price. May be null if data is incomplete or unavailable. */
  open: number | null;
  /** Highest price during the interval. May be null if data is incomplete or unavailable. */
  high: number | null;
  /** Lowest price during the interval. May be null if data is incomplete or unavailable. */
  low: number | null;
  /** Closing price. May be null if data is incomplete or unavailable. */
  close: number | null;
  /** Trading volume. May be null if data is incomplete or unavailable. */
  volume: number | null;
}

export interface IntradayResponse {
  data: IntradayData[];
  source: string;
  interval: string;
  symbol: string;
  instrumentType: InstrumentType;
  cacheHit?: boolean;
}

interface UseStockIntradayOptions {
  enabled?: boolean;
  instrumentType?: InstrumentType;
}

export const useStockIntraday = (
  symbol: string,
  interval: Interval = '1m',
  range: '1d' | '5d' | '1w' | '1mo' | '3mo' | '6mo' | '1y' | '2y' = '1d',
  options?: UseStockIntradayOptions,
) => {
  const instrumentType = options?.instrumentType ?? 'equity';

  return useQuery({
    queryKey: ['stock-intraday', symbol, interval, range, instrumentType],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('stock-intraday', {
        body: { symbol, interval, range, instrumentType },
      });

      if (error) throw error;
      return data as IntradayResponse;
    },
    enabled: !!symbol && (options?.enabled ?? true),
    staleTime: 45 * 1000,
    refetchInterval: 60 * 1000,
  });
};