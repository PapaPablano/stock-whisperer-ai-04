import { Search, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";

export const Header = () => {
  return (
    <header className="border-b border-border bg-card sticky top-0 z-50 backdrop-blur-sm bg-card/95">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold text-foreground">StockML Analytics</h1>
        </div>
        
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search stocks (e.g., AAPL, TSLA)..." 
              className="pl-9"
            />
          </div>
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
