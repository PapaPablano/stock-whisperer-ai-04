import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Watchlist {
  id: string;
  name: string;
  symbols: string[];
}

interface WatchlistState {
  watchlists: Watchlist[];
  createWatchlist: (name: string) => void;
  deleteWatchlist: (id: string) => void;
  addSymbolToWatchlist: (id: string, symbol: string) => void;
  removeSymbolFromWatchlist: (id: string, symbol: string) => void;
}

export const useWatchlistStore = create<WatchlistState>()(
  persist(
    (set) => ({
      watchlists: [
        { id: 'tech-giants', name: 'Tech Giants', symbols: ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'META'] },
        { id: 'ev-revolution', name: 'EV Revolution', symbols: ['TSLA', 'RIVN', 'LCID', 'NIO'] },
      ],
      createWatchlist: (name) =>
        set((state) => ({
          watchlists: [
            ...state.watchlists,
            { id: `wl_${Date.now()}`, name, symbols: [] },
          ],
        })),
      deleteWatchlist: (id) =>
        set((state) => ({
          watchlists: state.watchlists.filter((w) => w.id !== id),
        })),
      addSymbolToWatchlist: (id, symbol) =>
        set((state) => ({
          watchlists: state.watchlists.map((w) =>
            w.id === id ? { ...w, symbols: [...w.symbols, symbol] } : w
          ),
        })),
      removeSymbolFromWatchlist: (id, symbol) =>
        set((state) => ({
          watchlists: state.watchlists.map((w) =>
            w.id === id
              ? { ...w, symbols: w.symbols.filter((s) => s !== symbol) }
              : w
          ),
        })),
    }),
    {
      name: 'stockml-watchlists', // unique name for localStorage key
    }
  )
);
