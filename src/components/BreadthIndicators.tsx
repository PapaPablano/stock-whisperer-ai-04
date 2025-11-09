import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface BreadthIndicatorProps {
  label: string;
  value: number;
  total?: number;
  change?: number;
  description?: string;
  format?: 'percentage' | 'number' | 'ratio';
}

const BreadthIndicator = ({ 
  label, 
  value, 
  total, 
  change, 
  description,
  format = 'number'
}: BreadthIndicatorProps) => {
  const percentage = total ? (value / total) * 100 : value;
  const isPositive = change !== undefined ? change >= 0 : percentage >= 50;
  
  const formatValue = () => {
    switch (format) {
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'ratio':
        return `${value}/${total}`;
      default:
        return value.toLocaleString();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{label}</span>
          {change !== undefined && (
            <span className={`flex items-center text-xs ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
              {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(change).toFixed(1)}%
            </span>
          )}
        </div>
        <span className="text-lg font-bold">{formatValue()}</span>
      </div>
      
      {total && (
        <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div 
            className={`h-full transition-all ${percentage >= 50 ? 'bg-green-500' : 'bg-red-500'}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}
      
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
};

interface BreadthIndicatorsData {
  newHighs: number;
  newLows: number;
  stocksAbove40MA: number;
  totalStocks: number;
  stocksInUptrend: number;
  advancers: number;
  decliners: number;
  unchanged: number;
  advanceDeclineRatio?: number;
}

interface BreadthIndicatorsProps {
  data: BreadthIndicatorsData;
}

export function BreadthIndicators({ data }: BreadthIndicatorsProps) {
  const netNewHighsLows = data.newHighs - data.newLows;
  const uptrendPercentage = (data.stocksInUptrend / data.totalStocks) * 100;
  const above40MAPercentage = (data.stocksAbove40MA / data.totalStocks) * 100;
  const advanceDeclineRatio = data.advancers / Math.max(data.decliners, 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Market Breadth Indicators
          <span className="text-sm font-normal text-muted-foreground">
            Tracking {data.totalStocks.toLocaleString()} stocks
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Net New Highs/Lows */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground">New Highs vs New Lows</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">New Highs</p>
              <p className="text-2xl font-bold text-green-500">{data.newHighs}</p>
            </div>
            <div className="space-y-1 flex flex-col items-center">
              <p className="text-xs text-muted-foreground">Net</p>
              <div className="flex items-center gap-1">
                {netNewHighsLows > 0 ? (
                  <TrendingUp className="h-5 w-5 text-green-500" />
                ) : netNewHighsLows < 0 ? (
                  <TrendingDown className="h-5 w-5 text-red-500" />
                ) : (
                  <Minus className="h-5 w-5 text-gray-500" />
                )}
                <p className={`text-2xl font-bold ${
                  netNewHighsLows > 0 ? 'text-green-500' : 
                  netNewHighsLows < 0 ? 'text-red-500' : 
                  'text-gray-500'
                }`}>
                  {Math.abs(netNewHighsLows)}
                </p>
              </div>
            </div>
            <div className="space-y-1 text-right">
              <p className="text-xs text-muted-foreground">New Lows</p>
              <p className="text-2xl font-bold text-red-500">{data.newLows}</p>
            </div>
          </div>
        </div>

        <div className="border-t pt-4 space-y-4">
          {/* Stocks Above 40-day SMA */}
          <BreadthIndicator
            label="Stocks Above 40-day SMA"
            value={data.stocksAbove40MA}
            total={data.totalStocks}
            format="ratio"
            description={`${above40MAPercentage.toFixed(1)}% of stocks trading above their 40-day moving average`}
          />

          {/* Stocks in Uptrend */}
          <BreadthIndicator
            label="Stocks in Uptrend"
            value={data.stocksInUptrend}
            total={data.totalStocks}
            format="ratio"
            description={`${uptrendPercentage.toFixed(1)}% of stocks in confirmed uptrend`}
          />

          {/* Advance/Decline Ratio */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Advance/Decline Ratio</span>
              <span className="text-lg font-bold">{advanceDeclineRatio.toFixed(2)}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center p-2 rounded bg-green-500/10">
                <p className="text-muted-foreground">Advancers</p>
                <p className="font-bold text-green-500">{data.advancers}</p>
              </div>
              <div className="text-center p-2 rounded bg-gray-500/10">
                <p className="text-muted-foreground">Unchanged</p>
                <p className="font-bold">{data.unchanged}</p>
              </div>
              <div className="text-center p-2 rounded bg-red-500/10">
                <p className="text-muted-foreground">Decliners</p>
                <p className="font-bold text-red-500">{data.decliners}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Market Health Indicator */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Market Health</span>
            <span className="text-sm font-semibold">
              {uptrendPercentage >= 70 ? (
                <span className="text-green-500">Strong</span>
              ) : uptrendPercentage >= 50 ? (
                <span className="text-yellow-500">Neutral</span>
              ) : (
                <span className="text-red-500">Weak</span>
              )}
            </span>
          </div>
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div 
              className={`h-full transition-all ${
                uptrendPercentage >= 70 ? 'bg-green-500' : 
                uptrendPercentage >= 50 ? 'bg-yellow-500' : 
                'bg-red-500'
              }`}
              style={{ width: `${uptrendPercentage}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Based on percentage of stocks in uptrend and above key moving averages
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// Example usage component with mock data
export function BreadthIndicatorsExample() {
  const mockData: BreadthIndicatorsData = {
    newHighs: 342,
    newLows: 87,
    stocksAbove40MA: 3250,
    totalStocks: 5000,
    stocksInUptrend: 3100,
    advancers: 2800,
    decliners: 1850,
    unchanged: 350,
  };

  return <BreadthIndicators data={mockData} />;
}
