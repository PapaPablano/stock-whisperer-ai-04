import { Search, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { useStockSearch } from "@/hooks/useStockSearch";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NavLink } from "./NavLink";

interface HeaderProps {
  onSymbolSelect?: (symbol: string) => void;
}

export const Header = ({ onSymbolSelect }: HeaderProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  
  const { data: searchResults, isLoading } = useStockSearch(debouncedQuery);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelect = (symbol: string) => {
    setSearchQuery(symbol);
    setShowResults(false);
    onSymbolSelect?.(symbol);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery) {
      const upperSymbol = searchQuery.toUpperCase();
      setShowResults(false);
      onSymbolSelect?.(upperSymbol);
    }
  };

  return (
    <header className="border-b border-border bg-card sticky top-0 z-50 backdrop-blur-sm bg-card/95">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold text-foreground">StockML Analytics</h1>
        </div>

        <nav className="flex items-center gap-4 text-sm font-medium text-muted-foreground">
          <NavLink to="/">Dashboard</NavLink>
          <NavLink to="/watchlists">Watchlists</NavLink>
        </nav>
        
        <div className="flex-1 max-w-md relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
            <Input 
              placeholder="Search stocks (e.g., AAPL, TSLA)..." 
              className="pl-9"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowResults(true);
              }}
              onKeyDown={handleKeyDown}
              onFocus={() => searchQuery && setShowResults(true)}
              onBlur={() => setTimeout(() => setShowResults(false), 200)}
            />
          </div>
          
          {/* Search Results Dropdown */}
          {showResults && searchQuery && (
            <Card className="absolute top-full mt-2 w-full max-h-96 overflow-auto shadow-lg z-50">
              {isLoading && (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Searching...
                </div>
              )}
              {!isLoading && searchResults && searchResults.length === 0 && (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No stocks found. Try searching for another symbol.
                </div>
              )}
              {!isLoading && searchResults && searchResults.length > 0 && (
                <div className="p-2">
                  <div className="text-xs font-medium text-muted-foreground px-2 py-1">
                    Search Results
                  </div>
                  {searchResults.map((result) => (
                    <div
                      key={result.symbol}
                      onClick={() => handleSelect(result.symbol)}
                      className={cn(
                        "flex items-center justify-between p-3 rounded-md cursor-pointer",
                        "hover:bg-accent transition-colors"
                      )}
                    >
                      <div>
                        <div className="font-semibold">{result.symbol}</div>
                        <div className="text-xs text-muted-foreground">{result.name}</div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {result.exchange}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground hidden sm:inline">
            Market: <span className="text-success font-medium">Open</span>
          </span>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
};
