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

type ProviderInterval = '1min' | '5min' | '15min' | '30min' | '1hour';
type SupportedInterval = Interval | ProviderInterval;

const toProviderInterval = (interval: SupportedInterval): ProviderInterval => {
  switch (interval) {
    case '1m':
    case '1min':
      return '1min';
    case '5m':
    case '5min':
      return '5min';
    case '10m':
      return '5min';
    case '15m':
    case '15min':
      return '15min';
    case '30m':
    case '30min':
      return '30min';
    case '1h':
    case '1hour':
      return '1hour';
    case '4h':
      return '1hour';
    case '1d':
      return '1hour';
    default:
      return '1min';
  }
};

export const useStockIntraday = (
  symbol: string,
  interval: SupportedInterval = '1m',
  range: '1d' | '5d' | '1w' = '1d',
  options?: UseStockIntradayOptions,
) => {
  const providerInterval = toProviderInterval(interval);

  return useQuery({
    queryKey: ['stock-intraday', symbol, providerInterval, range],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('stock-intraday', {
        body: { symbol, interval: providerInterval, range },
      });

      if (error) throw error;
      return data as IntradayResponse;
    },
    enabled: !!symbol && (options?.enabled ?? true),
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds (real-time data)
    refetchInterval: 60 * 1000, // Refetch every minute for real-time updates
  });
};