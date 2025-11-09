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

const Index = () => {
  const [selectedSymbol] = useState("AAPL");
  const { data: liveQuote, isLoading: quoteLoading } = useStockQuote(selectedSymbol);
  const { data: historicalData, isLoading: historyLoading } = useStockHistorical(selectedSymbol, "1mo");
  
  const priceData = historicalData || generatePriceData(30);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Featured Stocks */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Market Overview</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredStocks.map((stock) => (
              <StockCard key={stock.symbol} {...stock} />
            ))}
          </div>
        </section>

        {/* Main Analysis Section */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Price Chart */}
            <PriceChart symbol="AAPL" data={priceData} />
            
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
