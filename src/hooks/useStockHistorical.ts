import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { InstrumentType } from './useStockIntraday';

export interface HistoricalData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface UseStockHistoricalOptions {
  instrumentType?: InstrumentType;
}

export const useStockHistorical = (
  symbol: string,
  range: string = '1mo',
  options?: UseStockHistoricalOptions,
) => {
  const instrumentType = options?.instrumentType ?? 'equity';
  return useQuery({
    queryKey: ['stock-historical-v3', symbol, range, instrumentType],
    queryFn: async () => {
      console.log(`[useStockHistorical] Fetching ${instrumentType} ${symbol} with range: ${range}`);
      const { data, error } = await supabase.functions.invoke('stock-historical-v3', {
        body: { symbol, range, instrumentType },
      });

      if (error) {
        console.error('[useStockHistorical] Error:', error);
        throw error;
      }
      
      console.log(
        `[useStockHistorical] Received ${data?.data?.length || 0} data points from ${data?.source} (${data?.instrumentType})`,
      );
      return data.data as HistoricalData[];
    },
    enabled: !!symbol,
    staleTime: 0, // Always refetch when query key changes
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });
};
