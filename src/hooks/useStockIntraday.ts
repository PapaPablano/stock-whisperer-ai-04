import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Interval } from '@/lib/aggregateBars';

export interface IntradayData {
  datetime: string;
  date: string;
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IntradayResponse {
  data: IntradayData[];
  source: string;
  interval: string;
  symbol: string;
}

interface UseStockIntradayOptions {
  enabled?: boolean;
}

export const useStockIntraday = (
  symbol: string,
  interval: Interval = '1m',
  range: '1d' | '5d' | '1w' | '1mo' | '3mo' | '6mo' | '1y' | '2y' = '1d',
  options?: UseStockIntradayOptions,
) => {
  return useQuery({
    queryKey: ['stock-intraday', symbol, interval, range],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('stock-intraday', {
        body: { symbol, interval, range },
      });

      if (error) throw error;
      return data as IntradayResponse;
    },
    enabled: !!symbol && (options?.enabled ?? true),
    staleTime: 45 * 1000,
    refetchInterval: 60 * 1000,
  });
};