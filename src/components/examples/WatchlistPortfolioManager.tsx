import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  useWatchlists, 
  useWatchlistItems, 
  useCreateWatchlist, 
  useAddToWatchlist,
  useRemoveFromWatchlist 
} from '@/hooks/useWatchlists';
import { 
  usePortfolios, 
  usePortfolioHoldings, 
  useCreatePortfolio, 
  useAddHolding 
} from '@/hooks/usePortfolio';
import { PlusCircle, Trash2, TrendingUp, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

export function WatchlistPortfolioManager() {
  const [newWatchlistName, setNewWatchlistName] = useState('');
  const [newPortfolioName, setNewPortfolioName] = useState('');
  const [selectedWatchlist, setSelectedWatchlist] = useState<string>();
  const [selectedPortfolio, setSelectedPortfolio] = useState<string>();
  const [newSymbol, setNewSymbol] = useState('');

  // Watchlist hooks
  const { data: watchlists, isLoading: loadingWatchlists } = useWatchlists();
  const { data: watchlistItems } = useWatchlistItems(selectedWatchlist);
  const createWatchlist = useCreateWatchlist();
  const addToWatchlist = useAddToWatchlist();
  const removeFromWatchlist = useRemoveFromWatchlist();

  // Portfolio hooks
  const { data: portfolios, isLoading: loadingPortfolios } = usePortfolios();
  const { data: holdings } = usePortfolioHoldings(selectedPortfolio);
  const createPortfolio = useCreatePortfolio();
  const addHolding = useAddHolding();

  const handleCreateWatchlist = async () => {
    if (!newWatchlistName.trim()) {
      toast.error('Please enter a watchlist name');
      return;
    }

    try {
      await createWatchlist.mutateAsync({ name: newWatchlistName });
      setNewWatchlistName('');
      toast.success('Watchlist created successfully!');
    } catch (error) {
      toast.error('Failed to create watchlist');
      console.error(error);
    }
  };

  const handleAddToWatchlist = async () => {
    if (!selectedWatchlist || !newSymbol.trim()) {
      toast.error('Please select a watchlist and enter a symbol');
      return;
    }

    try {
      await addToWatchlist.mutateAsync({
        watchlistId: selectedWatchlist,
        symbol: newSymbol.toUpperCase(),
      });
      setNewSymbol('');
      toast.success(`${newSymbol.toUpperCase()} added to watchlist!`);
    } catch (error) {
      const errorWithCode = error as { code?: string };
      if (errorWithCode?.code === '23505') {
        toast.error('Stock already in watchlist');
      } else {
        toast.error('Failed to add stock to watchlist');
      }
      console.error(error);
    }
  };

  const handleRemoveFromWatchlist = async (itemId: string, symbol: string) => {
    try {
      await removeFromWatchlist.mutateAsync(itemId);
      toast.success(`${symbol} removed from watchlist`);
    } catch (error) {
      toast.error('Failed to remove stock');
      console.error(error);
    }
  };

  const handleCreatePortfolio = async () => {
    if (!newPortfolioName.trim()) {
      toast.error('Please enter a portfolio name');
      return;
    }

    try {
      await createPortfolio.mutateAsync({ 
        name: newPortfolioName,
        cashBalance: 10000 // Default starting cash
      });
      setNewPortfolioName('');
      toast.success('Portfolio created successfully!');
    } catch (error) {
      toast.error('Failed to create portfolio');
      console.error(error);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Portfolio & Watchlist Manager</h1>
        <p className="text-muted-foreground">
          Manage your investment portfolios and stock watchlists
        </p>
      </div>

      <Tabs defaultValue="watchlists" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="watchlists">
            <TrendingUp className="mr-2 h-4 w-4" />
            Watchlists
          </TabsTrigger>
          <TabsTrigger value="portfolios">
            <DollarSign className="mr-2 h-4 w-4" />
            Portfolios
          </TabsTrigger>
        </TabsList>

        {/* Watchlists Tab */}
        <TabsContent value="watchlists" className="space-y-4">
          {/* Create Watchlist */}
          <Card>
            <CardHeader>
              <CardTitle>Create New Watchlist</CardTitle>
              <CardDescription>
                Create a watchlist to track stocks you're interested in
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="Watchlist name (e.g., Tech Stocks)"
                  value={newWatchlistName}
                  onChange={(e) => setNewWatchlistName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateWatchlist()}
                />
                <Button 
                  onClick={handleCreateWatchlist}
                  disabled={createWatchlist.isPending}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Watchlists List */}
          <div className="grid gap-4 md:grid-cols-2">
            {loadingWatchlists ? (
              <Card>
                <CardContent className="p-6">Loading watchlists...</CardContent>
              </Card>
            ) : watchlists && watchlists.length > 0 ? (
              watchlists.map((watchlist) => (
                <Card 
                  key={watchlist.id}
                  className={selectedWatchlist === watchlist.id ? 'ring-2 ring-primary' : ''}
                >
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                      {watchlist.name}
                      <Badge variant="secondary">
                        {watchlistItems?.length || 0} stocks
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedWatchlist(watchlist.id)}
                    >
                      {selectedWatchlist === watchlist.id ? 'Selected' : 'Select'}
                    </Button>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-6">
                  No watchlists yet. Create one to get started!
                </CardContent>
              </Card>
            )}
          </div>

          {/* Add Stock to Watchlist */}
          {selectedWatchlist && (
            <Card>
              <CardHeader>
                <CardTitle>Add Stock to Watchlist</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Stock symbol (e.g., AAPL)"
                    value={newSymbol}
                    onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddToWatchlist()}
                  />
                  <Button 
                    onClick={handleAddToWatchlist}
                    disabled={addToWatchlist.isPending}
                  >
                    Add
                  </Button>
                </div>

                {/* Watchlist Items */}
                {watchlistItems && watchlistItems.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium">Stocks in this watchlist:</h4>
                    <div className="grid gap-2">
                      {watchlistItems.map((item) => (
                        <div 
                          key={item.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <span className="font-medium">{item.symbol}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveFromWatchlist(item.id, item.symbol)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Portfolios Tab */}
        <TabsContent value="portfolios" className="space-y-4">
          {/* Create Portfolio */}
          <Card>
            <CardHeader>
              <CardTitle>Create New Portfolio</CardTitle>
              <CardDescription>
                Create a portfolio to track your investments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="Portfolio name (e.g., Growth Portfolio)"
                  value={newPortfolioName}
                  onChange={(e) => setNewPortfolioName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreatePortfolio()}
                />
                <Button 
                  onClick={handleCreatePortfolio}
                  disabled={createPortfolio.isPending}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Portfolios List */}
          <div className="grid gap-4 md:grid-cols-2">
            {loadingPortfolios ? (
              <Card>
                <CardContent className="p-6">Loading portfolios...</CardContent>
              </Card>
            ) : portfolios && portfolios.length > 0 ? (
              portfolios.map((portfolio) => (
                <Card 
                  key={portfolio.id}
                  className={selectedPortfolio === portfolio.id ? 'ring-2 ring-primary' : ''}
                >
                  <CardHeader>
                    <CardTitle className="text-lg">{portfolio.name}</CardTitle>
                    <CardDescription>
                      Total Value: ${portfolio.total_value?.toLocaleString() || '0.00'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Cash: ${portfolio.cash_balance?.toLocaleString() || '0.00'}
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedPortfolio(portfolio.id)}
                      >
                        {selectedPortfolio === portfolio.id ? 'Selected' : 'Select'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="p-6">
                  No portfolios yet. Create one to get started!
                </CardContent>
              </Card>
            )}
          </div>

          {/* Portfolio Holdings */}
          {selectedPortfolio && holdings && holdings.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Portfolio Holdings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {holdings.map((holding) => (
                    <div 
                      key={holding.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <span className="font-medium">{holding.symbol}</span>
                        <p className="text-sm text-muted-foreground">
                          {holding.quantity} shares @ ${holding.buy_price}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">
                          ${(Number(holding.quantity) * (holding.current_price || holding.buy_price)).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
