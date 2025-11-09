import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getUserWatchlists, 
  createWatchlist, 
  updateWatchlist,
  deleteWatchlist,
  getWatchlistItems, 
  addToWatchlist, 
  removeFromWatchlist 
} from '@/lib/supabaseHelpers';
import { Tables } from '@/integrations/supabase/types';

export type Watchlist = Tables<'watchlists'>;
export type WatchlistItem = Tables<'watchlist_items'>;

/**
 * Hook to fetch all user watchlists
 */
export function useWatchlists() {
  return useQuery({
    queryKey: ['watchlists'],
    queryFn: getUserWatchlists,
  });
}

/**
 * Hook to fetch items in a specific watchlist
 */
export function useWatchlistItems(watchlistId: string | undefined) {
  return useQuery({
    queryKey: ['watchlist-items', watchlistId],
    queryFn: () => getWatchlistItems(watchlistId!),
    enabled: !!watchlistId,
  });
}

/**
 * Hook to create a new watchlist
 */
export function useCreateWatchlist() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ name, description }: { name: string; description?: string }) =>
      createWatchlist(name, description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlists'] });
    },
  });
}

/**
 * Hook to update a watchlist
 */
export function useUpdateWatchlist() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      watchlistId, 
      updates 
    }: { 
      watchlistId: string; 
      updates: { name?: string; description?: string } 
    }) => updateWatchlist(watchlistId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlists'] });
    },
  });
}

/**
 * Hook to delete a watchlist
 */
export function useDeleteWatchlist() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (watchlistId: string) => deleteWatchlist(watchlistId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlists'] });
    },
  });
}

/**
 * Hook to add a stock to a watchlist
 */
export function useAddToWatchlist() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      watchlistId, 
      symbol, 
      notes 
    }: { 
      watchlistId: string; 
      symbol: string; 
      notes?: string 
    }) => addToWatchlist(watchlistId, symbol, notes),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['watchlist-items', variables.watchlistId] });
    },
  });
}

/**
 * Hook to remove a stock from a watchlist
 */
export function useRemoveFromWatchlist() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (itemId: string) => removeFromWatchlist(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist-items'] });
    },
  });
}
