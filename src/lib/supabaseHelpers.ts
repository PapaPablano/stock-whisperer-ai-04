/**
 * Supabase Helper Functions
 * 
 * Common patterns for using Supabase in React components
 */

import { supabase } from '@/integrations/supabase/client';

// ============================================
// AUTHENTICATION HELPERS
// ============================================

/**
 * Get the current authenticated user
 */
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}

/**
 * Sign up a new user
 */
export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

/**
 * Sign in an existing user
 */
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

/**
 * Sign out the current user
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// ============================================
// WATCHLIST HELPERS
// ============================================

/**
 * Get all watchlists for the current user
 */
export async function getUserWatchlists() {
  const { data, error } = await supabase
    .from('watchlists')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
}

/**
 * Create a new watchlist
 */
export async function createWatchlist(name: string, description?: string) {
  const user = await getCurrentUser();
  
  const { data, error } = await supabase
    .from('watchlists')
    .insert({
      user_id: user.id,
      name,
      description,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Add a stock to a watchlist
 */
export async function addToWatchlist(watchlistId: string, symbol: string, notes?: string) {
  const { data, error } = await supabase
    .from('watchlist_items')
    .insert({
      watchlist_id: watchlistId,
      symbol: symbol.toUpperCase(),
      notes,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Get all stocks in a watchlist
 */
export async function getWatchlistItems(watchlistId: string) {
  const { data, error } = await supabase
    .from('watchlist_items')
    .select('*')
    .eq('watchlist_id', watchlistId)
    .order('added_at', { ascending: false });
  
  if (error) throw error;
  return data;
}

/**
 * Remove a stock from a watchlist
 */
export async function removeFromWatchlist(itemId: string) {
  const { error } = await supabase
    .from('watchlist_items')
    .delete()
    .eq('id', itemId);
  
  if (error) throw error;
}

/**
 * Delete a watchlist
 */
export async function deleteWatchlist(watchlistId: string) {
  const { error } = await supabase
    .from('watchlists')
    .delete()
    .eq('id', watchlistId);
  
  if (error) throw error;
}

/**
 * Update a watchlist
 */
export async function updateWatchlist(watchlistId: string, updates: { name?: string; description?: string }) {
  const { data, error } = await supabase
    .from('watchlists')
    .update(updates)
    .eq('id', watchlistId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// ============================================
// PORTFOLIO HELPERS
// ============================================

/**
 * Get all portfolios for the current user
 */
export async function getUserPortfolios() {
  const { data, error } = await supabase
    .from('portfolios')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
}

/**
 * Create a new portfolio
 */
export async function createPortfolio(name: string, description?: string, cashBalance?: number) {
  const user = await getCurrentUser();
  
  const { data, error } = await supabase
    .from('portfolios')
    .insert({
      user_id: user.id,
      name,
      description,
      cash_balance: cashBalance || 0,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Get all holdings in a portfolio
 */
export async function getPortfolioHoldings(portfolioId: string) {
  const { data, error } = await supabase
    .from('portfolio_holdings')
    .select('*')
    .eq('portfolio_id', portfolioId)
    .order('purchase_date', { ascending: false });
  
  if (error) throw error;
  return data;
}

/**
 * Add a stock holding to a portfolio
 */
export async function addHolding(
  portfolioId: string,
  symbol: string,
  quantity: number,
  buyPrice: number,
  purchaseDate: string,
  notes?: string
) {
  const { data, error } = await supabase
    .from('portfolio_holdings')
    .insert({
      portfolio_id: portfolioId,
      symbol: symbol.toUpperCase(),
      quantity,
      buy_price: buyPrice,
      purchase_date: purchaseDate,
      notes,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Record a stock transaction
 */
export async function recordTransaction(
  portfolioId: string,
  symbol: string,
  type: 'buy' | 'sell',
  quantity: number,
  price: number,
  fees?: number,
  notes?: string
) {
  const totalAmount = quantity * price;
  
  const { data, error } = await supabase
    .from('stock_transactions')
    .insert({
      portfolio_id: portfolioId,
      symbol: symbol.toUpperCase(),
      transaction_type: type,
      quantity,
      price,
      total_amount: totalAmount,
      fees: fees || 0,
      notes,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Update portfolio holding current price
 */
export async function updateHoldingPrice(holdingId: string, currentPrice: number) {
  const { data, error } = await supabase
    .from('portfolio_holdings')
    .update({ current_price: currentPrice })
    .eq('id', holdingId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Delete a portfolio holding
 */
export async function deleteHolding(holdingId: string) {
  const { error } = await supabase
    .from('portfolio_holdings')
    .delete()
    .eq('id', holdingId);
  
  if (error) throw error;
}

/**
 * Delete a portfolio
 */
export async function deletePortfolio(portfolioId: string) {
  const { error } = await supabase
    .from('portfolios')
    .delete()
    .eq('id', portfolioId);
  
  if (error) throw error;
}

/**
 * Get portfolio transactions
 */
export async function getPortfolioTransactions(portfolioId: string) {
  const { data, error } = await supabase
    .from('stock_transactions')
    .select('*')
    .eq('portfolio_id', portfolioId)
    .order('transaction_date', { ascending: false });
  
  if (error) throw error;
  return data;
}

// ============================================
// PRICE ALERT HELPERS
// ============================================

/**
 * Create a price alert
 */
export async function createPriceAlert(
  symbol: string,
  priceTarget: number,
  alertType: 'above' | 'below'
) {
  const user = await getCurrentUser();
  
  const { data, error } = await supabase
    .from('price_alerts')
    .insert({
      user_id: user.id,
      symbol: symbol.toUpperCase(),
      price_target: priceTarget,
      alert_type: alertType,
      is_active: true,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Get all active price alerts for the current user
 */
export async function getActivePriceAlerts() {
  const { data, error } = await supabase
    .from('price_alerts')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
}

/**
 * Deactivate a price alert
 */
export async function deactivatePriceAlert(alertId: string) {
  const { error } = await supabase
    .from('price_alerts')
    .update({ is_active: false })
    .eq('id', alertId);
  
  if (error) throw error;
}

// ============================================
// USER PREFERENCES HELPERS
// ============================================

/**
 * Get user preferences
 */
export async function getUserPreferences() {
  const user = await getCurrentUser();
  
  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', user.id)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
  return data;
}

/**
 * Update user preferences
 */
export async function updateUserPreferences(preferences: {
  theme?: string;
  notifications_enabled?: boolean;
  email_alerts?: boolean;
  preferred_currency?: string;
}) {
  const user = await getCurrentUser();
  
  const { data, error } = await supabase
    .from('user_preferences')
    .upsert({
      user_id: user.id,
      ...preferences,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}
