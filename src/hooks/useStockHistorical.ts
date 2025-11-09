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
    queryKey: ['stock-historical', symbol, range],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('stock-historical', {
        body: { symbol, range },
      });

      if (error) throw error;
      return data.data as HistoricalData[];
    },
    enabled: !!symbol,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
  });
};
