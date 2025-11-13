import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Interval } from '@/lib/aggregateBars';

export type InstrumentType = 'equity' | 'future';

export interface IntradayData {
  datetime: string;
  date: string;
  time: string;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
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