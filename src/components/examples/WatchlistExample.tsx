/**
 * Example Component: Using Supabase in React
 * 
 * This demonstrates how to use the Supabase helpers in a React component
 * Delete this file once you understand the pattern
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import {
  getUserWatchlists,
  createWatchlist,
  addToWatchlist,
  getWatchlistItems,
  removeFromWatchlist,
} from '@/lib/supabaseHelpers';

interface Watchlist {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

interface WatchlistItem {
  id: string;
  symbol: string;
  notes: string | null;
  added_at: string;
}

export function WatchlistExample() {
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [selectedWatchlist, setSelectedWatchlist] = useState<string | null>(null);
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [newWatchlistName, setNewWatchlistName] = useState('');
  const [newSymbol, setNewSymbol] = useState('');
  const [loading, setLoading] = useState(false);

  // Load watchlists on mount
  useEffect(() => {
    loadWatchlists();
  }, []);

  // Load items when watchlist is selected
  useEffect(() => {
    if (selectedWatchlist) {
      loadWatchlistItems(selectedWatchlist);
    }
  }, [selectedWatchlist]);

  async function loadWatchlists() {
    try {
      setLoading(true);
      const data = await getUserWatchlists();
      setWatchlists(data);
    } catch (error) {
      console.error('Error loading watchlists:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadWatchlistItems(watchlistId: string) {
    try {
      setLoading(true);
      const data = await getWatchlistItems(watchlistId);
      setItems(data);
    } catch (error) {
      console.error('Error loading items:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateWatchlist() {
    if (!newWatchlistName.trim()) return;
    
    try {
      setLoading(true);
      await createWatchlist(newWatchlistName);
      setNewWatchlistName('');
      await loadWatchlists();
    } catch (error) {
      console.error('Error creating watchlist:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddStock() {
    if (!selectedWatchlist || !newSymbol.trim()) return;
    
    try {
      setLoading(true);
      await addToWatchlist(selectedWatchlist, newSymbol.toUpperCase());
      setNewSymbol('');
      await loadWatchlistItems(selectedWatchlist);
    } catch (error) {
      console.error('Error adding stock:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveStock(itemId: string) {
    try {
      setLoading(true);
      await removeFromWatchlist(itemId);
      if (selectedWatchlist) {
        await loadWatchlistItems(selectedWatchlist);
      }
    } catch (error) {
      console.error('Error removing stock:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Watchlist Example (Supabase Demo)</h1>
      
      {/* Create Watchlist */}
      <Card>
        <CardHeader>
          <CardTitle>Create New Watchlist</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input
            placeholder="Watchlist name..."
            value={newWatchlistName}
            onChange={(e) => setNewWatchlistName(e.target.value)}
          />
          <Button onClick={handleCreateWatchlist} disabled={loading}>
            Create
          </Button>
        </CardContent>
      </Card>

      {/* Watchlist Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Your Watchlists</CardTitle>
        </CardHeader>
        <CardContent>
          {watchlists.length === 0 ? (
            <p className="text-muted-foreground">No watchlists yet. Create one above!</p>
          ) : (
            <div className="space-y-2">
              {watchlists.map((watchlist) => (
                <Button
                  key={watchlist.id}
                  variant={selectedWatchlist === watchlist.id ? 'default' : 'outline'}
                  onClick={() => setSelectedWatchlist(watchlist.id)}
                  className="w-full"
                >
                  {watchlist.name}
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Stock to Selected Watchlist */}
      {selectedWatchlist && (
        <Card>
          <CardHeader>
            <CardTitle>Add Stock to Watchlist</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Input
              placeholder="Stock symbol (e.g., AAPL)"
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value)}
            />
            <Button onClick={handleAddStock} disabled={loading}>
              Add Stock
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Watchlist Items */}
      {selectedWatchlist && (
        <Card>
          <CardHeader>
            <CardTitle>Stocks in Watchlist</CardTitle>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <p className="text-muted-foreground">No stocks in this watchlist yet.</p>
            ) : (
              <div className="space-y-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 border rounded"
                  >
                    <span className="font-mono font-bold">{item.symbol}</span>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRemoveStock(item.id)}
                      disabled={loading}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
