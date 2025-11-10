import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
  interval: '1min' | '5min' | '15min' | '30min' | '1hour' = '1min',
  range: '1d' | '5d' | '1w' = '1d',
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
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds (real-time data)
    refetchInterval: 60 * 1000, // Refetch every minute for real-time updates
  });
};