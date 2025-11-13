import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface HistoricalData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export const useStockHistorical = (symbol: string, range: string = '1mo') => {
  return useQuery({
    queryKey: ['stock-historical-v3', symbol, range],
    queryFn: async () => {
      console.log(`[useStockHistorical] Fetching ${symbol} with range: ${range}`);
      const { data, error } = await supabase.functions.invoke('stock-historical-v3', {
        body: { symbol, range },
      });

      if (error) {
        console.error('[useStockHistorical] Error:', error);
        throw error;
      }
      
      console.log(`[useStockHistorical] Received ${data?.data?.length || 0} data points from ${data?.source}`);
      return data.data as HistoricalData[];
    },
    enabled: !!symbol,
    staleTime: 0, // Always refetch when query key changes
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });
};
