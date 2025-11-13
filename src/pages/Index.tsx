import { Header } from "@/components/Header";
import { StockCard } from "@/components/StockCard";
import { MetricCard } from "@/components/MetricCard";
import { TechnicalAnalysisDashboard } from "@/components/TechnicalAnalysisDashboard";
import { PlotlyPriceChart } from "@/components/PlotlyPriceChart";
import { NewsWidget } from "@/components/NewsWidget";
import { featuredStocks } from "@/lib/mockData";
import { TrendingUp, DollarSign, BarChart3, Activity } from "lucide-react";
import { useStockQuote } from "@/hooks/useStockQuote";
import { useStockHistorical } from "@/hooks/useStockHistorical";
import { useState, useMemo, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { DEFAULT_INDICATOR_CONFIG, type IndicatorConfig } from "@/components/IndicatorSelector";
import type { PriceData } from "@/lib/technicalIndicators";
import {
  calculateSuperTrendAI,
  type SuperTrendAIResult,
  type SuperTrendAISeriesPoint,
} from "@/lib/superTrendAI";
import type { Interval } from "@/lib/aggregateBars";
import { useUnifiedChartData } from "@/hooks/useUnifiedChartData";
import { useStockStream } from "@/hooks/useStockStream";
import type { Bar } from "@/lib/aggregateBars";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TIME_BUTTONS } from "@/lib/chartConfig";
import { useToast } from "@/hooks/use-toast";

const formatCurrency = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const formatCurrencyWithSign = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: "always",
  }).format(value);
};

const formatPercent = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: "always",
  }).format(value / 100);
};

const formatCompactNumber = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
};

type CandleInterval = "10m" | "1h" | "4h" | "1d";

const Index = () => {
  const [selectedSymbol, setSelectedSymbol] = useState("AAPL");
  const [dateRange, setDateRange] = useState("1mo"); // Default to 1 month
  const [selectedIndicators, setSelectedIndicators] = useState<IndicatorConfig>(() => ({
    ...DEFAULT_INDICATOR_CONFIG,
  }));
  const [candleInterval, setCandleInterval] = useState<CandleInterval>("1d");
  const [intradayUnavailable, setIntradayUnavailable] = useState(false);
  const { data: liveQuote, isLoading: quoteLoading } = useStockQuote(selectedSymbol);
  const { toast } = useToast();
  const [liveChartData, setLiveChartData] = useState<Bar[]>([]);
  const { latestTrade, isConnected: isStreamConnected } = useStockStream(selectedSymbol);


  const intervalMap: Record<CandleInterval, Interval> = {
    "10m": "10m",
    "1h": "1h",
    "4h": "4h",
    "1d": "1d",
  };

  const RANGE_MAP: Record<string, string | undefined> = {
    "1D": "1d",
    "5D": "5d",
    "1M": "1mo",
    "3M": "3mo",
    "6M": "6mo",
    "1Y": "1y",
    "5Y": "5y",
    All: undefined,
  };

  const CANDLE_INTERVAL_OPTIONS: Array<{ label: string; value: CandleInterval }> = [
    { label: "10m", value: "10m" },
    { label: "1h", value: "1h" },
    { label: "4h", value: "4h" },
    { label: "1d", value: "1d" },
  ];

  useEffect(() => {
    if (candleInterval === "1d") {
      return;
    }

    if (dateRange !== "1d" && dateRange !== "5d") {
      setDateRange("5d");
    }
  }, [candleInterval, dateRange]);

  // Calculate the range needed for indicator calculations (always fetch enough data)
  const calculationRange = useMemo(() => {
    // For short display ranges, fetch more data to calculate long-period indicators (SMA 200, etc.)
    switch(dateRange) {
      case '1d':
      case '5d':
      case '1mo':
        return '1y';  // Fetch 1 year to calculate all indicators properly
      case '3mo':
        return '1y';  // Fetch 1 year
      case '6mo':
        return '1y';  // Fetch 1 year
      case '1y':
        return '2y';  // Fetch 2 years (for warmup period)
      case '5y':
        return '5y';  // Already enough data
      default:
        return '1y';
    }
  }, [dateRange]);
  
  console.log(`[Index] Display range: ${dateRange}, Fetching: ${calculationRange} for calculations`);
  
  const { data: historicalData, isLoading: historyLoading } = useStockHistorical(selectedSymbol, calculationRange);
  
  // Full dataset for indicator calculations
  const calculationData = useMemo(() => {
    if (!historicalData || historicalData.length === 0) {
      return [] as PriceData[];
    }

    const formattedData = historicalData.map(item => ({
      ...item,
      date: typeof item.date === "string" ? item.date.split("T")[0] : item.date,
    }));

    formattedData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    console.log(`[Index] Using ${historicalData.length} data points for calculations`);
    console.log(`[Index] Calculation date range: ${formattedData[0]?.date} to ${formattedData[formattedData.length - 1]?.date}`);

    return formattedData;
  }, [historicalData]);
  
  // Filter data for display based on selected date range
  const displayData = useMemo(() => {
    if (!calculationData || calculationData.length === 0) return [];
    
    const today = new Date();
    const cutoffDate = new Date();
    
    switch(dateRange) {
      case '1d':
        cutoffDate.setDate(today.getDate() - 1);
        break;
      case '5d':
        cutoffDate.setDate(today.getDate() - 5);
        break;
      case '1mo':
        cutoffDate.setMonth(today.getMonth() - 1);
        break;
      case '3mo':
        cutoffDate.setMonth(today.getMonth() - 3);
        break;
      case '6mo':
        cutoffDate.setMonth(today.getMonth() - 6);
        break;
      case '1y':
        cutoffDate.setFullYear(today.getFullYear() - 1);
        break;
      case '5y':
        cutoffDate.setFullYear(today.getFullYear() - 5);
        break;
    }
    
    const filtered = calculationData.filter(item => {
      const itemDate = new Date(item.date);
      return itemDate >= cutoffDate;
    });
    
    console.log(`[Index] Filtered to ${filtered.length} data points for display range: ${dateRange}`);
    if (filtered.length > 0) {
      console.log(`[Index] Display date range: ${filtered[0]?.date} to ${filtered[filtered.length - 1]?.date}`);
    }
    
    filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return filtered;
  }, [calculationData, dateRange]);

  const dashboardSupertrendResult = useMemo<SuperTrendAIResult | null>(() => {
    if (!selectedIndicators.supertrendAI || calculationData.length === 0) {
      return null;
    }
    return calculateSuperTrendAI(calculationData);
  }, [selectedIndicators.supertrendAI, calculationData]);

  const chartInterval = intervalMap[candleInterval];
  const unified = useUnifiedChartData(selectedSymbol, chartInterval, {
    session: "EQUITY_RTH",
    historyRange: calculationRange,
  });

  const {
    bars: unifiedBars,
    source: unifiedSource,
    loading: unifiedLoading,
    error: unifiedError,
    isFallback: unifiedFallback,
  } = unified;

  useEffect(() => {
    if (unifiedBars && unifiedBars.length > 0) {
      setLiveChartData(unifiedBars);
    }
  }, [unifiedBars]);

  const getIntervalMilliseconds = (interval: CandleInterval): number => {
    switch (interval) {
      case '10m': return 10 * 60 * 1000;
      case '1h': return 60 * 60 * 1000;
      case '4h': return 4 * 60 * 60 * 1000;
      case '1d': return 24 * 60 * 60 * 1000;
      default: return 60 * 1000; // Default to 1 minute for safety
    }
  };

  useEffect(() => {
    if (!latestTrade || liveChartData.length === 0 || candleInterval === '1d') {
      return;
    }

    setLiveChartData(currentBars => {
      const newBars = [...currentBars];
      const lastBar = newBars[newBars.length - 1];
      const tradeTime = new Date(latestTrade.t).getTime();
      const lastBarTime = new Date(lastBar.datetime).getTime();
      const intervalMs = getIntervalMilliseconds(candleInterval);
      
      if (tradeTime >= lastBarTime + intervalMs) {
        // Create a new bar
        const newBarStartTime = new Date(tradeTime - (tradeTime % intervalMs));
        const newBar: Bar = {
          datetime: newBarStartTime.toISOString(),
          open: latestTrade.p,
          high: latestTrade.p,
          low: latestTrade.p,
          close: latestTrade.p,
          volume: latestTrade.s,
        };
        newBars.push(newBar);
      } else {
        // Update the last bar immutably
        newBars[newBars.length - 1] = {
          ...lastBar,
          close: latestTrade.p,
          high: Math.max(lastBar.high, latestTrade.p),
          low: Math.min(lastBar.low, latestTrade.p),
          volume: lastBar.volume + latestTrade.s,
        };
      }
      
      return newBars;
    });

  }, [latestTrade, candleInterval, liveChartData]);


  useEffect(() => {
    if (candleInterval === "1d" || !unifiedFallback) {
      return;
    }
    setCandleInterval("1d");
    setIntradayUnavailable(true);
    toast({
      title: "Intraday data unavailable",
      description:
        "Intraday intervals require a premium data plan. Showing daily candles instead.",
    });
  }, [candleInterval, toast, unifiedFallback]);

  const selectedBarsForDisplay = useMemo<Bar[]>(() => {
    if (!liveChartData || liveChartData.length === 0) {
      return [];
    }

    const cutoff = new Date();
    switch (dateRange) {
      case "1d":
        cutoff.setDate(cutoff.getDate() - 1);
        break;
      case "5d":
        cutoff.setDate(cutoff.getDate() - 5);
        break;
      case "1mo":
        cutoff.setMonth(cutoff.getMonth() - 1);
        break;
      case "3mo":
        cutoff.setMonth(cutoff.getMonth() - 3);
        break;
      case "6mo":
        cutoff.setMonth(cutoff.getMonth() - 6);
        break;
      case "1y":
        cutoff.setFullYear(cutoff.getFullYear() - 1);
        break;
      case "5y":
        cutoff.setFullYear(cutoff.getFullYear() - 5);
        break;
      default:
        cutoff.setMonth(cutoff.getMonth() - 1);
        break;
    }

    const filtered = liveChartData.filter((bar) => {
      const barDate = new Date(bar.datetime);
      return !Number.isNaN(barDate.getTime()) && barDate >= cutoff;
    });

    const sorted = (filtered.length > 0 ? filtered : liveChartData)
      .slice()
      .sort((a, b) => a.datetime.localeCompare(b.datetime));

    const MAX_VISIBLE = 1500;
    const trimmed = sorted.length > MAX_VISIBLE ? sorted.slice(-MAX_VISIBLE) : sorted;

    if (import.meta.env.DEV) {
      const tail = trimmed.slice(-5).map((bar) => ({
        date: bar.datetime,
        close: bar.close,
      }));
      console.debug(
        "[Index] Selected bars for display",
        { range: dateRange, count: trimmed.length, interval: chartInterval, source: unifiedSource },
        tail
      );
    }

    return trimmed;
  }, [chartInterval, dateRange, liveChartData, unifiedSource]);

  const chartSupertrendResult = useMemo<SuperTrendAIResult | null>(() => {
    if (!selectedIndicators.supertrendAI || selectedBarsForDisplay.length === 0) {
      return null;
    }
    const series: PriceData[] = selectedBarsForDisplay.map((bar) => ({
      date: bar.datetime,
      open: bar.open,
      high: bar.high,
      low: bar.low,
      close: bar.close,
      volume: bar.volume,
    }));
    return calculateSuperTrendAI(series);
  }, [selectedBarsForDisplay, selectedIndicators.supertrendAI]);

  const isIntradayActive = chartInterval !== "1d";
  const isIntradayPending = unifiedLoading && isIntradayActive;
  const intradayErrorMessage = useMemo(() => {
    if (intradayUnavailable || unifiedFallback) {
      return "Intraday data requires a premium data plan. Showing daily candles instead.";
    }
    if (isIntradayActive && unifiedError) {
      const raw = unifiedError instanceof Error ? unifiedError.message : String(unifiedError);
      return raw;
    }
    return null;
  }, [intradayUnavailable, isIntradayActive, unifiedError, unifiedFallback]);

  const plotlyChartDataOverride = useMemo(() => {
    const dates = selectedBarsForDisplay.map((bar) => bar.datetime);
    const open = selectedBarsForDisplay.map((bar) => bar.open);
    const high = selectedBarsForDisplay.map((bar) => bar.high);
    const low = selectedBarsForDisplay.map((bar) => bar.low);
    const close = selectedBarsForDisplay.map((bar) => bar.close);
    const volumeValues = selectedBarsForDisplay.map((bar) => bar.volume);
    const volumeColors: Array<"up" | "down"> = close.map((value, index) => {
      const prev = index > 0 ? close[index - 1] : value;
      return value >= prev ? "up" : "down";
    });

    return {
      dates,
      ohlc: { open, high, low, close },
      volume: { values: volumeValues, colors: volumeColors },
      st: chartSupertrendResult,
      source: unifiedSource ?? null,
      loading: unifiedLoading,
      error: unifiedFallback ? null : unifiedError,
    };
  }, [chartSupertrendResult, selectedBarsForDisplay, unifiedError, unifiedLoading, unifiedSource, unifiedFallback]);

  const { low52Week, high52Week } = useMemo(() => {
    if (!calculationData.length) {
      return { low52Week: null as number | null, high52Week: null as number | null };
    }

    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 1);

    let hasData = false;
    let low = Number.POSITIVE_INFINITY;
    let high = Number.NEGATIVE_INFINITY;

    calculationData.forEach((point) => {
      const pointDate = new Date(point.date);
      if (pointDate >= cutoff) {
        hasData = true;
        if (point.low !== undefined && point.low !== null) {
          low = Math.min(low, point.low);
        } else {
          low = Math.min(low, point.close);
        }

        if (point.high !== undefined && point.high !== null) {
          high = Math.max(high, point.high);
        } else {
          high = Math.max(high, point.close);
        }
      }
    });

    if (!hasData || !Number.isFinite(low) || !Number.isFinite(high)) {
      return { low52Week: null, high52Week: null };
    }

    return { low52Week: low, high52Week: high };
  }, [calculationData]);

  const averageVolume30 = useMemo(() => {
    if (!calculationData.length) return null;
    const sliceStart = Math.max(calculationData.length - 30, 0);
    const recent = calculationData.slice(sliceStart);
    if (!recent.length) return null;
    const total = recent.reduce((sum, point) => sum + (point.volume ?? 0), 0);
    return total / recent.length;
  }, [calculationData]);

  const keyMetrics = useMemo(() => {
    const change = liveQuote?.change ?? null;
    const changePercent = liveQuote?.changePercent ?? null;
    const trend: "up" | "down" | "neutral" | undefined = change === null
      ? undefined
      : change > 0
        ? "up"
        : change < 0
          ? "down"
          : "neutral";

    const changeSubtitle = (() => {
      if (change === null && changePercent === null) return "—";
      const parts: string[] = [];
      if (change !== null) {
        parts.push(formatCurrencyWithSign(change));
      }
      if (changePercent !== null) {
        parts.push(formatPercent(changePercent));
      }
      return parts.join(" ");
    })();

    const dayRange = liveQuote?.low !== null && liveQuote?.low !== undefined && liveQuote?.high !== null && liveQuote?.high !== undefined
      ? `${formatCurrency(liveQuote.low)} – ${formatCurrency(liveQuote.high)}`
      : "—";

    const week52Range = low52Week !== null && high52Week !== null
      ? `${formatCurrency(low52Week)} – ${formatCurrency(high52Week)}`
      : "—";

    const volumeValue = liveQuote?.volume !== null && liveQuote?.volume !== undefined
      ? formatCompactNumber(liveQuote.volume)
      : "—";

    const avgVolumeValue = averageVolume30 !== null
      ? formatCompactNumber(averageVolume30)
      : "—";

    return [
      {
        title: "Last Price",
        value: formatCurrency(liveQuote?.price ?? null),
        subtitle: changeSubtitle,
        icon: DollarSign,
        trend,
      },
      {
        title: "Day Range",
        value: dayRange,
        subtitle: liveQuote?.open !== null && liveQuote?.open !== undefined
          ? `Open ${formatCurrency(liveQuote.open)}`
          : undefined,
        icon: TrendingUp,
      },
      {
        title: "52W Range",
        value: week52Range,
        subtitle: "Based on the past 52 weeks",
        icon: BarChart3,
      },
      {
        title: "Volume",
        value: volumeValue,
        subtitle: "Today",
        icon: Activity,
      },
      {
        title: "Avg Volume (30d)",
        value: avgVolumeValue,
        subtitle: "Trailing 30 sessions",
        icon: Activity,
      },
      {
        title: "Previous Close",
        value: formatCurrency(liveQuote?.previousClose ?? null),
        subtitle: liveQuote?.source ? `Source: ${liveQuote.source}` : undefined,
        icon: DollarSign,
      },
    ];
  }, [liveQuote, low52Week, high52Week, averageVolume30]);

  const handleSymbolSelect = (symbol: string) => {
    setSelectedSymbol(symbol.toUpperCase());
  };

  const handleDateRangeChange = (range: string) => {
    setDateRange(range);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* 1. Header */}
      <Header onSymbolSelect={handleSymbolSelect} />
      
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Featured Stocks Watchlist */}
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

        {/* 2. Selected Stock Header */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl font-bold">{selectedSymbol}</h2>
            {liveQuote?.name && (
              <Badge variant="secondary" className="text-sm">
                {liveQuote.name}
              </Badge>
            )}
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
              Range: {dateRange} | Display: {displayData.length} pts | Calc: {calculationData.length} pts
            </Badge>
          </div>
        </section>

        {/* 3. Main Chart - Full Width */}
        <section>
          <Card className="h-full">
              <CardHeader className="gap-4">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="text-lg">{selectedSymbol} Overview</CardTitle>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex flex-wrap gap-1">
                        {TIME_BUTTONS.map((button) => {
                          const value = RANGE_MAP[button.label];
                          const disabled = value === undefined;
                          const isActive = value === dateRange;

                          return (
                            <Button
                              key={button.label}
                              variant={isActive ? "default" : "ghost"}
                              size="sm"
                              className="text-xs"
                              disabled={disabled}
                              onClick={() => {
                                if (!disabled && value) {
                                  handleDateRangeChange(value);
                                }
                              }}
                            >
                              {button.label}
                            </Button>
                          );
                        })}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {CANDLE_INTERVAL_OPTIONS.map((option) => {
                          const active = candleInterval === option.value;
                          const disabled = option.value !== "1d" && intradayUnavailable;
                          return (
                            <Button
                              key={option.value}
                              variant={active ? "secondary" : "ghost"}
                              size="sm"
                              className="text-xs"
                              disabled={disabled}
                              onClick={() => {
                                if (!disabled) {
                                  setCandleInterval(option.value as CandleInterval);
                                }
                              }}
                            >
                              {option.label.toUpperCase()}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  {chartSupertrendResult?.info && selectedIndicators.supertrendAI && (
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span>
                        <span className="font-semibold text-foreground">Target Factor:</span>{" "}
                        {chartSupertrendResult.info.targetFactor.toFixed(2)}
                      </span>
                      <span>
                        <span className="font-semibold text-foreground">Performance Index:</span>{" "}
                        {chartSupertrendResult.info.performanceIndex.toFixed(4)}
                      </span>
                      <span>
                        <span className="font-semibold text-foreground">Base Signals:</span>{" "}
                        {chartSupertrendResult.info.signalMetrics.length}
                      </span>
                    </div>
                  )}
                </div>
              </CardHeader>
            <CardContent>
              <div className="h-[560px]">
                <PlotlyPriceChart
                  symbol={selectedSymbol}
                  interval={chartInterval}
                  chartDataOverride={plotlyChartDataOverride}
                  height={560}
                />
              </div>
              {intradayErrorMessage && (
                <p className="mt-3 text-xs text-destructive">{intradayErrorMessage}</p>
              )}
              {isIntradayPending && (
                <p className="mt-3 text-xs text-muted-foreground">Loading intraday data…</p>
              )}
            </CardContent>
          </Card>
        </section>

        {/* 4. Technical Analysis Dashboard - Full Width */}
        <section>
          <h2 className="text-2xl font-bold mb-4">Technical Indicators</h2>
          <TechnicalAnalysisDashboard
            symbol={selectedSymbol}
            data={calculationData}
            displayData={displayData}
            selectedIndicators={selectedIndicators}
            onSelectedIndicatorsChange={setSelectedIndicators}
            supertrendAIResult={dashboardSupertrendResult}
          />
        </section>

        {/* 5. Split Layout: News Widget (left) and Key Metrics (right) */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* News Widget - Left side */}
          <div>
            <NewsWidget symbol={selectedSymbol} limit={10} height={600} />
          </div>

          {/* Key Metrics - Right side */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Key Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {keyMetrics.map((metric) => (
                    <MetricCard
                      key={metric.title}
                      title={metric.title}
                      value={metric.value}
                      subtitle={metric.subtitle}
                      icon={metric.icon}
                      trend={metric.trend}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Index;
