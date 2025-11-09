import { Header } from "@/components/Header";
import { StockCard } from "@/components/StockCard";
import { PriceChart } from "@/components/PriceChart";
import { VolumeChart } from "@/components/VolumeChart";
import { MetricCard } from "@/components/MetricCard";
import { TechnicalIndicator } from "@/components/TechnicalIndicator";
import { featuredStocks, generatePriceData, technicalIndicators, keyMetrics } from "@/lib/mockData";
import { TrendingUp, DollarSign, BarChart3, Activity } from "lucide-react";
import { useStockQuote } from "@/hooks/useStockQuote";
import { useStockHistorical } from "@/hooks/useStockHistorical";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

const Index = () => {
  const [selectedSymbol, setSelectedSymbol] = useState("AAPL");
  const { data: liveQuote, isLoading: quoteLoading } = useStockQuote(selectedSymbol);
  const { data: historicalData, isLoading: historyLoading } = useStockHistorical(selectedSymbol, "1mo");
  
  const priceData = historicalData || generatePriceData(30);

  const handleSymbolSelect = (symbol: string) => {
    setSelectedSymbol(symbol.toUpperCase());
  };

  return (
    <div className="min-h-screen bg-background">
      <Header onSymbolSelect={handleSymbolSelect} />
      
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Featured Stocks */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Market Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredStocks.map((stock) => (
              <StockCard 
                key={stock.symbol} 
                {...stock} 
                onClick={() => handleSymbolSelect(stock.symbol)}
              />
            ))}
          </div>
        </section>

        {/* Main Analysis Section */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Currently Viewing Stock */}
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold">{selectedSymbol}</h2>
              {liveQuote && (
                <>
                  <Badge variant="outline" className="text-lg">
                    ${liveQuote.price?.toFixed(2)}
                  </Badge>
                  <Badge 
                    variant={liveQuote.change >= 0 ? "default" : "destructive"}
                    className="text-sm"
                  >
                    {liveQuote.change >= 0 ? '+' : ''}
                    {liveQuote.change?.toFixed(2)} ({liveQuote.changePercent?.toFixed(2)}%)
                  </Badge>
                </>
              )}
              {(quoteLoading || historyLoading) && (
                <Badge variant="secondary">Loading...</Badge>
              )}
            </div>
            
            {/* Price Chart */}
            <PriceChart symbol={selectedSymbol} data={priceData} />
            
            {/* Volume Chart */}
            <VolumeChart data={priceData} />
          </div>

          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Key Metrics</h3>
              <div className="grid grid-cols-2 gap-4">
                <MetricCard
                  title="Market Cap"
                  value={keyMetrics.marketCap}
                  icon={DollarSign}
                />
                <MetricCard
                  title="P/E Ratio"
                  value={keyMetrics.peRatio}
                  icon={BarChart3}
                />
                <MetricCard
                  title="52W High"
                  value={keyMetrics.fiftyTwoWeekHigh}
                  trend="up"
                  icon={TrendingUp}
                />
                <MetricCard
                  title="52W Low"
                  value={keyMetrics.fiftyTwoWeekLow}
                  trend="down"
                />
                <MetricCard
                  title="Div Yield"
                  value={keyMetrics.dividendYield}
                  icon={Activity}
                />
                <MetricCard
                  title="Beta"
                  value={keyMetrics.beta}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Technical Indicators */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Technical Analysis</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {technicalIndicators.map((indicator) => (
              <TechnicalIndicator key={indicator.name} {...indicator} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Index;
