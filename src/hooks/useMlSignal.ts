import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface MlSignal {
  symbol: string;
  signal: 'Buy' | 'Sell' | 'Hold';
  rsi: number;
  timestamp: string;
  source: string;
}

export const useMlSignal = (symbol: string) => {
  return useQuery({
    queryKey: ['ml-signal', symbol],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('ml-signals', {
        body: { symbol },
      });

      if (error) {
        console.error('[useMlSignal] Error:', error);
        throw error;
      }
      
      console.log(`[useMlSignal] Received signal for ${symbol}: ${data.signal}`);
      return data as MlSignal;
    },
    enabled: !!symbol,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });
};
