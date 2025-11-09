import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface StockCardProps {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume?: string;
}

export const StockCard = ({ symbol, name, price, change, changePercent, volume }: StockCardProps) => {
  const isPositive = change >= 0;
  
  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg font-bold">{symbol}</CardTitle>
            <p className="text-sm text-muted-foreground">{name}</p>
          </div>
          {isPositive ? (
            <TrendingUp className="h-5 w-5 text-success" />
          ) : (
            <TrendingDown className="h-5 w-5 text-destructive" />
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tabular-nums">${price.toFixed(2)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className={cn(
              "font-medium tabular-nums",
              isPositive ? "text-success" : "text-destructive"
            )}>
              {isPositive ? "+" : ""}{change.toFixed(2)} ({isPositive ? "+" : ""}{changePercent.toFixed(2)}%)
            </span>
          </div>
          {volume && (
            <div className="text-xs text-muted-foreground">
              Vol: {volume}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
