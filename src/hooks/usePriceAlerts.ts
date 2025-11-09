import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  createPriceAlert, 
  getActivePriceAlerts, 
  deactivatePriceAlert 
} from '@/lib/supabaseHelpers';
import { Tables } from '@/integrations/supabase/types';

export type PriceAlert = Tables<'price_alerts'>;

/**
 * Hook to fetch all active price alerts for the user
 */
export function usePriceAlerts() {
  return useQuery({
    queryKey: ['price-alerts'],
    queryFn: getActivePriceAlerts,
  });
}

/**
 * Hook to create a new price alert
 */
export function useCreatePriceAlert() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      symbol, 
      priceTarget, 
      alertType 
    }: { 
      symbol: string; 
      priceTarget: number; 
      alertType: 'above' | 'below' 
    }) => createPriceAlert(symbol, priceTarget, alertType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-alerts'] });
    },
  });
}

/**
 * Hook to deactivate a price alert
 */
export function useDeactivatePriceAlert() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (alertId: string) => deactivatePriceAlert(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-alerts'] });
    },
  });
}
