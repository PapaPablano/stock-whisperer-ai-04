import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getUserPortfolios, 
  createPortfolio, 
  deletePortfolio,
  getPortfolioHoldings, 
  addHolding, 
  updateHoldingPrice,
  deleteHolding,
  recordTransaction,
  getPortfolioTransactions
} from '@/lib/supabaseHelpers';
import { Tables } from '@/integrations/supabase/types';

export type Portfolio = Tables<'portfolios'>;
export type PortfolioHolding = Tables<'portfolio_holdings'>;
export type StockTransaction = Tables<'stock_transactions'>;

/**
 * Hook to fetch all user portfolios
 */
export function usePortfolios() {
  return useQuery({
    queryKey: ['portfolios'],
    queryFn: getUserPortfolios,
  });
}

/**
 * Hook to fetch holdings in a specific portfolio
 */
export function usePortfolioHoldings(portfolioId: string | undefined) {
  return useQuery({
    queryKey: ['portfolio-holdings', portfolioId],
    queryFn: () => getPortfolioHoldings(portfolioId!),
    enabled: !!portfolioId,
  });
}

/**
 * Hook to fetch transactions for a portfolio
 */
export function usePortfolioTransactions(portfolioId: string | undefined) {
  return useQuery({
    queryKey: ['portfolio-transactions', portfolioId],
    queryFn: () => getPortfolioTransactions(portfolioId!),
    enabled: !!portfolioId,
  });
}

/**
 * Hook to create a new portfolio
 */
export function useCreatePortfolio() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      name, 
      description, 
      cashBalance 
    }: { 
      name: string; 
      description?: string; 
      cashBalance?: number 
    }) => createPortfolio(name, description, cashBalance),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
    },
  });
}

/**
 * Hook to delete a portfolio
 */
export function useDeletePortfolio() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (portfolioId: string) => deletePortfolio(portfolioId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
    },
  });
}

/**
 * Hook to add a holding to a portfolio
 */
export function useAddHolding() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      portfolioId, 
      symbol, 
      quantity, 
      buyPrice, 
      purchaseDate,
      notes 
    }: { 
      portfolioId: string; 
      symbol: string; 
      quantity: number; 
      buyPrice: number; 
      purchaseDate: string;
      notes?: string;
    }) => addHolding(portfolioId, symbol, quantity, buyPrice, purchaseDate, notes),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['portfolio-holdings', variables.portfolioId] });
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
    },
  });
}

/**
 * Hook to update a holding's current price
 */
export function useUpdateHoldingPrice() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      holdingId, 
      currentPrice 
    }: { 
      holdingId: string; 
      currentPrice: number 
    }) => updateHoldingPrice(holdingId, currentPrice),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio-holdings'] });
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
    },
  });
}

/**
 * Hook to delete a holding
 */
export function useDeleteHolding() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (holdingId: string) => deleteHolding(holdingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio-holdings'] });
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
    },
  });
}

/**
 * Hook to record a stock transaction
 */
export function useRecordTransaction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      portfolioId, 
      symbol, 
      type, 
      quantity, 
      price,
      fees,
      notes 
    }: { 
      portfolioId: string; 
      symbol: string; 
      type: 'buy' | 'sell'; 
      quantity: number; 
      price: number;
      fees?: number;
      notes?: string;
    }) => recordTransaction(portfolioId, symbol, type, quantity, price, fees, notes),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['portfolio-transactions', variables.portfolioId] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-holdings', variables.portfolioId] });
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
    },
  });
}
