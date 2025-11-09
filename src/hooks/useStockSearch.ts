import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SearchResult {
  symbol: string;
  name: string;
  type: string;
  exchange: string;
}

export const useStockSearch = (query: string) => {
  return useQuery({
    queryKey: ['stock-search', query],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('stock-search', {
        body: { query },
      });

      if (error) throw error;
      return data.results as SearchResult[];
    },
    enabled: query.length > 0,
    staleTime: 5 * 60 * 1000,
  });
};
