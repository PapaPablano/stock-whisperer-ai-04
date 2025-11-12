import { useParams } from "react-router-dom";
import { useWatchlistStore } from "@/hooks/useWatchlists";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlusCircle, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const WatchlistDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { watchlists, addSymbolToWatchlist, removeSymbolFromWatchlist } = useWatchlistStore();
  const watchlist = watchlists.find((w) => w.id === id);

  const [newSymbol, setNewSymbol] = useState("");

  if (!watchlist) {
    return <div className="container mx-auto px-4 py-8">Watchlist not found.</div>;
  }

  const handleAddSymbol = () => {
    if (newSymbol.trim() && id) {
      addSymbolToWatchlist(id, newSymbol.trim().toUpperCase());
      setNewSymbol("");
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
          {watchlist.name}
        </h1>
        <p className="text-lg text-muted-foreground mt-2">
          Manage the stocks in your watchlist.
        </p>
      </header>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Add a new stock</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Enter stock symbol (e.g. AAPL)"
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddSymbol()}
              className="max-w-xs"
            />
            <Button onClick={handleAddSymbol}>
              <PlusCircle className="mr-2 h-4 w-4" /> Add Symbol
            </Button>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-2xl font-semibold mb-4">Stocks in this Watchlist</h2>
        {watchlist.symbols.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {watchlist.symbols.map((symbol) => (
              <Card key={symbol}>
                <CardContent className="p-4 flex items-center justify-between">
                  <span className="font-bold text-lg">{symbol}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSymbolFromWatchlist(watchlist.id, symbol)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">
            This watchlist is empty. Add some stocks to get started.
          </p>
        )}
      </div>
    </div>
  );
};

export default WatchlistDetail;
