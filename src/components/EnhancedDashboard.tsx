import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NewsWidget, CompactNewsWidget } from "@/components/NewsWidget";
import { AlpacaSettingsPanel, CompactAlpacaSettings } from "@/components/AlpacaSettingsPanel";
import { RealTimeIndicator, DataSourceBadge } from "@/components/RealTimeIndicator";
import { useStockQuote } from "@/hooks/useStockQuote";
import { useStockStream } from "@/hooks/useStockStream";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Activity, Newspaper, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EnhancedDashboardProps {
  symbol: string;
  onSymbolChange?: (symbol: string) => void;
}

/**
 * Enhanced Dashboard showcasing Alpaca integration features:
 * - Real-time streaming data
 * - News feed
 * - Data source indicators
 * - Configurable settings
 * 
 * @example
 * <EnhancedDashboard symbol="AAPL" />
 */
export const EnhancedDashboard = ({ symbol, onSymbolChange }: EnhancedDashboardProps) => {
  const [realTimeEnabled, setRealTimeEnabled] = useState(false);
  const [newsEnabled, setNewsEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  // Fetch quote data (cached)
  const { data: quote, isLoading: quoteLoading } = useStockQuote(symbol);

  // Real-time streaming (optional)
  const {
    status: streamStatus,
    lastTrade,
    error: streamError,
  } = useStockStream({
    symbols: [symbol],
    subscribeTrades: true,
    enabled: realTimeEnabled,
    onTrade: (trade) => {
      console.log(`Real-time trade: ${trade.symbol} @ $${trade.price}`);
    },
  });

  // Use real-time price if available, otherwise use cached quote
  const currentPrice = realTimeEnabled && lastTrade 
    ? lastTrade.price 
    : quote?.price;

  const priceChange = quote?.change;
  const priceChangePercent = quote?.changePercent;
  const isPositive = (priceChange ?? 0) >= 0;

  return (
    <div className="space-y-6">
      {/* Header with Real-Time Controls */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-3xl font-bold">{symbol}</h2>
          {quote?.name && (
            <Badge variant="secondary">{quote.name}</Badge>
          )}
          {quote?.source && (
            <DataSourceBadge source={quote.source} />
          )}
          {realTimeEnabled && (
            <RealTimeIndicator 
              status={streamStatus} 
              symbol={symbol}
              error={streamError}
            />
          )}
        </div>
        <div className="flex items-center gap-2">
          <CompactAlpacaSettings
            realTimeEnabled={realTimeEnabled}
            onRealTimeToggle={setRealTimeEnabled}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Price Display */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Current Price</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-bold">
                ${currentPrice?.toFixed(2) ?? "—"}
              </span>
              {realTimeEnabled && lastTrade && (
                <Badge variant="secondary" className="animate-pulse">
                  <Activity className="h-3 w-3 mr-1" />
                  Live
                </Badge>
              )}
            </div>
            {priceChange !== undefined && priceChangePercent !== undefined && (
              <div className={`flex items-center gap-2 text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {isPositive ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                <span className="font-medium">
                  {isPositive ? '+' : ''}{priceChange.toFixed(2)} 
                  ({isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%)
                </span>
                <span className="text-muted-foreground">Today</span>
              </div>
            )}
            {realTimeEnabled && lastTrade && (
              <p className="text-xs text-muted-foreground">
                Last trade: {new Date(lastTrade.timestamp).toLocaleTimeString()} 
                • Size: {lastTrade.size.toLocaleString()}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Settings Panel (Collapsible) */}
      {showSettings && (
        <AlpacaSettingsPanel
          realTimeEnabled={realTimeEnabled}
          onRealTimeToggle={setRealTimeEnabled}
          newsEnabled={newsEnabled}
          onNewsToggle={setNewsEnabled}
          dataFeed="iex"
        />
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="news">
            <Newspaper className="h-4 w-4 mr-2" />
            News
          </TabsTrigger>
          <TabsTrigger value="analysis">Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Main chart area - 2 columns */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Price Chart</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                  Chart component goes here
                  {realTimeEnabled && (
                    <Badge variant="secondary" className="ml-2">
                      Real-Time Data
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* News sidebar - 1 column */}
            {newsEnabled && (
              <div className="lg:col-span-1">
                <CompactNewsWidget symbol={symbol} limit={5} />
              </div>
            )}
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Volume
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {quote?.volume ? (quote.volume / 1000000).toFixed(2) + 'M' : '—'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Day High
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  ${quote?.high?.toFixed(2) ?? '—'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Day Low
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  ${quote?.low?.toFixed(2) ?? '—'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Prev Close
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  ${quote?.previousClose?.toFixed(2) ?? '—'}
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="news" className="space-y-4">
          {newsEnabled ? (
            <NewsWidget symbol={symbol} limit={20} height={800} />
          ) : (
            <Card>
              <CardContent className="flex items-center justify-center h-[400px] text-muted-foreground">
                <div className="text-center">
                  <Newspaper className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>News feed is disabled</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => setNewsEnabled(true)}
                  >
                    Enable News
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Technical Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                Technical analysis components go here
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Real-Time Data Info */}
      {realTimeEnabled && (
        <Card className="border-primary/50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Activity className="h-5 w-5 text-primary mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Real-Time Mode Active</p>
                <p className="text-xs text-muted-foreground">
                  You are receiving live market data via WebSocket streaming. 
                  This provides instant updates but uses more bandwidth. 
                  Disable real-time mode to reduce data usage.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
