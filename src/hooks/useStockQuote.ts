import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  source: string;
}

export const useStockQuote = (symbol: string) => {
  return useQuery({
    queryKey: ['stock-quote', symbol],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('stock-quote', {
        body: { symbol },
      });

      if (error) throw error;
      return data as StockQuote;
    },
    enabled: !!symbol,
    refetchInterval: 60000, // Refetch every minute
  });
};
