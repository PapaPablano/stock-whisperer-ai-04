import { Search, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { useStockSearch } from "@/hooks/useStockSearch";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface HeaderProps {
  onSymbolSelect?: (symbol: string) => void;
}

export const Header = ({ onSymbolSelect }: HeaderProps) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  
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
    setOpen(false);
    onSymbolSelect?.(symbol);
  };

  return (
    <header className="border-b border-border bg-card sticky top-0 z-50 backdrop-blur-sm bg-card/95">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold text-foreground">StockML Analytics</h1>
        </div>
        
        <div className="flex-1 max-w-md">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                <Input 
                  placeholder="Search stocks (e.g., AAPL, TSLA)..." 
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setOpen(true);
                  }}
                  onFocus={() => searchQuery && setOpen(true)}
                />
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
              <Command>
                <CommandList>
                  {isLoading && (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                      Searching...
                    </div>
                  )}
                  {!isLoading && searchResults && searchResults.length === 0 && (
                    <CommandEmpty>No stocks found.</CommandEmpty>
                  )}
                  {!isLoading && searchResults && searchResults.length > 0 && (
                    <CommandGroup heading="Search Results">
                      {searchResults.map((result) => (
                        <CommandItem
                          key={result.symbol}
                          onSelect={() => handleSelect(result.symbol)}
                          className="cursor-pointer"
                        >
                          <div className="flex items-center justify-between w-full">
                            <div>
                              <div className="font-semibold">{result.symbol}</div>
                              <div className="text-xs text-muted-foreground">{result.name}</div>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {result.exchange}
                            </div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground hidden sm:inline">
            Market: <span className="text-success font-medium">Open</span>
          </span>
        </div>
      </div>
    </header>
  );
};
