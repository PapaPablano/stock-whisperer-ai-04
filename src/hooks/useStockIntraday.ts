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
  // Map frontend interval to backend-supported interval
  const getBackendInterval = (frontendInterval: Interval): string => {
    const mapping: { [key in Interval]: string } = {
      '1m': '1Min',
      '5m': '5Min',
      '10m': '10Min',
      '15m': '15Min',
      '30m': '30Min',
      '1h': '1Hour',
      '4h': '1Hour', // Backend will aggregate from 1Hour for 4h view
      '1d': '1Day',
    };
    return mapping[frontendInterval] || '1Min'; // Default to 1Min if not found
  };

  const backendInterval = getBackendInterval(interval);

  return useQuery({
    queryKey: ['stock-intraday', symbol, interval, range], // Use original interval for unique key
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('stock-intraday', {
        body: { symbol, interval: backendInterval, range }, // Use backendInterval for API call
      });

      if (error) throw error;
      return data as IntradayResponse;
    },
    enabled: !!symbol && (options?.enabled ?? true),
    staleTime: 45 * 1000,
    refetchInterval: 60 * 1000,
  });
};