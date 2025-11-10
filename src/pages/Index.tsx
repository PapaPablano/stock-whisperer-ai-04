import { Header } from "@/components/Header";
import { StockCard } from "@/components/StockCard";
import { MetricCard } from "@/components/MetricCard";
import { TechnicalIndicator } from "@/components/TechnicalIndicator";
import { TechnicalAnalysisDashboard } from "@/components/TechnicalAnalysisDashboard";
import { PriceChart } from "@/components/PriceChart";
import { VolumeChart } from "@/components/VolumeChart";
import { featuredStocks, technicalIndicators, keyMetrics } from "@/lib/mockData";
import { TrendingUp, DollarSign, BarChart3, Activity } from "lucide-react";
import { useStockQuote } from "@/hooks/useStockQuote";
import { useStockHistorical } from "@/hooks/useStockHistorical";
import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import type { PriceData } from "@/lib/technicalIndicators";

const Index = () => {
  const [selectedSymbol, setSelectedSymbol] = useState("AAPL");
  const [dateRange, setDateRange] = useState("1mo"); // Default to 1 month
  const { data: liveQuote, isLoading: quoteLoading } = useStockQuote(selectedSymbol);
  const { data: historicalData, isLoading: historyLoading } = useStockHistorical(selectedSymbol, dateRange);
  
  // Convert historical data to the format needed for charts
  const priceData = useMemo(() => {
    if (!historicalData || historicalData.length === 0) {
      // Generate mock data with proper format based on selected date range
      const mockData: PriceData[] = [];
      const basePrice = 170;
      let currentPrice = basePrice;
      
      // Calculate number of days based on date range
      let daysToGenerate = 30;
      switch(dateRange) {
        case '1d':
          daysToGenerate = 1;
          break;
        case '5d':
          daysToGenerate = 5;
          break;
        case '1mo':
          daysToGenerate = 30;
          break;
        case '3mo':
          daysToGenerate = 90;
          break;
        case '6mo':
          daysToGenerate = 180;
          break;
        case '1y':
          daysToGenerate = 365;
          break;
        case '5y':
          daysToGenerate = 1825; // 5 years
          break;
        default:
          daysToGenerate = 30;
      }
      
      console.log(`Generating ${daysToGenerate} days of mock data for range: ${dateRange}`);
      
      for (let i = daysToGenerate - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        const change = (Math.random() - 0.5) * 5;
        currentPrice += change;
        const high = currentPrice + Math.random() * 3;
        const low = currentPrice - Math.random() * 3;
        
        mockData.push({
          date: date.toISOString().split('T')[0], // YYYY-MM-DD format
          open: parseFloat((currentPrice - change).toFixed(2)),
          high: parseFloat(high.toFixed(2)),
          low: parseFloat(low.toFixed(2)),
          close: parseFloat(currentPrice.toFixed(2)),
          volume: Math.floor(Math.random() * 50000000) + 30000000,
        });
      }
      return mockData;
    }
    
    // Ensure dates are in consistent format
    const formattedData = historicalData.map(item => ({
      ...item,
      date: typeof item.date === 'string' ? item.date.split('T')[0] : item.date,
    }));
    
    console.log(`Using real API data: ${historicalData.length} data points`);
    console.log(`Date range in data: ${formattedData[0]?.date} to ${formattedData[formattedData.length - 1]?.date}`);
    
    return formattedData;
  }, [historicalData, dateRange]);

  // Format data for PriceChart component (simplified format)
  const simplePriceData = useMemo(() => {
    return priceData.map(item => ({
      date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      price: item.close,
      volume: item.volume,
    }));
  }, [priceData]);

  const handleSymbolSelect = (symbol: string) => {
    setSelectedSymbol(symbol.toUpperCase());
  };

  const handleDateRangeChange = (range: string) => {
    setDateRange(range);
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

        {/* Currently Viewing Stock */}
        <section className="space-y-4">
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
            {/* Debug info */}
            <Badge variant="outline" className="text-xs">
              Range: {dateRange} | Data Points: {priceData.length}
            </Badge>
          </div>
        </section>

        {/* Key Metrics Overview */}
        <section>
          <h3 className="text-lg font-semibold mb-4">Key Metrics</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
        </section>

        {/* Main Price Chart */}
        <section>
          <PriceChart 
            symbol={selectedSymbol} 
            data={simplePriceData} 
            selectedRange={dateRange}
            onRangeChange={handleDateRangeChange}
          />
        </section>

        {/* Technical Analysis Dashboard */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Technical Indicators</h2>
          <TechnicalAnalysisDashboard
            symbol={selectedSymbol}
            data={priceData}
          />
        </section>
      </main>
    </div>
  );
};

export default Index;
