import { useState } from "react";
import { Responsive, WidthProvider } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { EnhancedPriceChart } from "@/components/EnhancedPriceChart";
import { useStockHistorical } from "@/hooks/useStockHistorical";
import { useStockQuote } from "@/hooks/useStockQuote";
import { useGridLayout } from "@/hooks/useGridLayout";
import { IndicatorSelector } from "@/components/IndicatorSelector";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StockSearch } from "@/components/StockSearch";
import { MetricCard } from "@/components/MetricCard";
import { NewsWidget } from "@/components/NewsWidget";
import { SignalWidget } from "@/components/SignalWidget";
import { RefreshCw } from "lucide-react";
import type { IndicatorConfig } from "@/config/indicators";

const ResponsiveGridLayout = WidthProvider(Responsive);

const Dashboard = () => {
  const [selectedSymbol, setSelectedSymbol] = useState("AAPL");
  const [dateRange, setDateRange] = useState("1y");
  const [indicators, setIndicators] = useState<IndicatorConfig>({
    sma20: true,
    sma50: true,
    sma200: false,
    ema12: false,
    ema26: false,
    ema50: false,
    bollingerBands: true,
    keltnerChannel: false,
  });

  const { data: historicalData, isLoading: isLoadingHistorical, isError: isErrorHistorical } = useStockHistorical(selectedSymbol, dateRange);
  const { data: quote, isLoading: isLoadingQuote, isError: isErrorQuote } = useStockQuote(selectedSymbol);
  const { layouts, onLayoutChange, resetLayout } = useGridLayout();

  const formatCurrency = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
  const formatNumber = (value: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(value);

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
            Trading Dashboard
          </h1>
          <p className="text-lg text-muted-foreground mt-2">
            Your all-in-one view of the market. Drag and resize panels to customize.
          </p>
        </div>
        <Button onClick={resetLayout} variant="outline" size="icon">
          <RefreshCw className="h-4 w-4" />
          <span className="sr-only">Reset Layout</span>
        </Button>
      </header>
      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        onLayoutChange={onLayoutChange}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={30}
        draggableHandle=".drag-handle"
      >
        <div key="chart">
          <Card className="h-full flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 drag-handle cursor-move">
              <StockSearch onSelect={setSelectedSymbol} initialSymbol={selectedSymbol} />
            </CardHeader>
            <CardContent className="flex-grow">
              {isLoadingHistorical && <div className="h-[400px] flex items-center justify-center"><p>Loading chart data...</p></div>}
              {isErrorHistorical && <div className="h-[400px] flex items-center justify-center"><p>Error loading chart data.</p></div>}
              {historicalData && (
                <EnhancedPriceChart
                  symbol={selectedSymbol}
                  data={historicalData}
                  indicators={indicators}
                />
              )}
            </CardContent>
          </Card>
        </div>
        <div key="metrics">
          <Card className="h-full">
            <CardHeader className="drag-handle cursor-move">
              <CardTitle>Key Metrics</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              {isLoadingQuote ? <p>Loading metrics...</p> : isErrorQuote ? <p>Error loading metrics.</p> : quote && (
                <>
                  <MetricCard title="Price" value={formatCurrency(quote.price)} trend={quote.change > 0 ? 'up' : quote.change < 0 ? 'down' : 'neutral'} />
                  <MetricCard title="Change" value={`${quote.change.toFixed(2)} (${quote.changePercent.toFixed(2)}%)`} trend={quote.change > 0 ? 'up' : quote.change < 0 ? 'down' : 'neutral'} />
                  <MetricCard title="Open" value={formatCurrency(quote.open)} />
                  <MetricCard title="High" value={formatCurrency(quote.high)} />
                  <MetricCard title="Low" value={formatCurrency(quote.low)} />
                  <MetricCard title="Volume" value={formatNumber(quote.volume)} />
                </>
              )}
            </CardContent>
          </Card>
        </div>
        <div key="indicators">
          <Card className="h-full">
            <CardHeader className="drag-handle cursor-move">
              <CardTitle>Technical Indicators</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <IndicatorSelector
                selectedIndicators={indicators}
                onChange={setIndicators}
              />
            </CardContent>
          </Card>
        </div>
        <div key="signal">
          <SignalWidget symbol={selectedSymbol} />
        </div>
        <div key="news">
          <Card className="h-full flex flex-col">
             <CardHeader className="drag-handle cursor-move">
              <CardTitle>Market News</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
              <NewsWidget symbol={selectedSymbol} />
            </CardContent>
          </Card>
        </div>
      </ResponsiveGridLayout>
    </div>
  );
};

export default Dashboard;
