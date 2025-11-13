import { useState, useEffect } from "react";
import { useStockSearch } from "@/hooks/useStockSearch";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Command, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

interface StockSearchProps {
  onSelect: (symbol: string) => void;
  initialSymbol: string;
}

export const StockSearch = ({ onSelect, initialSymbol }: StockSearchProps) => {
  const [query, setQuery] = useState("");
  const [selectedSymbol, setSelectedSymbol] = useState(initialSymbol);
  const { data: searchResults, isLoading } = useStockSearch(query);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setSelectedSymbol(initialSymbol);
  }, [initialSymbol]);

  const handleSelect = (symbol: string) => {
    setQuery("");
    setSelectedSymbol(symbol);
    onSelect(symbol);
    setIsOpen(false);
  };

  return (
    <Command shouldFilter={false} className="relative">
      <CommandInput
        placeholder="Search for a stock..."
        value={query}
        onValueChange={setQuery}
        onFocus={() => setIsOpen(true)}
      />
      {isOpen && (
        <div className="absolute top-full z-10 w-full mt-1">
          <Card>
            <CardContent className="p-0">
              <CommandList>
                {isLoading && <CommandItem>Loading...</CommandItem>}
                {searchResults?.map((result) => (
                  <CommandItem
                    key={result.symbol}
                    onSelect={() => handleSelect(result.symbol)}
                    value={result.symbol}
                  >
                    <span className="font-bold">{result.symbol}</span>
                    <span className="ml-2 text-muted-foreground">{result.name}</span>
                  </CommandItem>
                ))}
              </CommandList>
            </CardContent>
          </Card>
        </div>
      )}
    </Command>
  );
};
