import { Header } from "@/components/Header";
import { StockCard } from "@/components/StockCard";
import { MetricCard } from "@/components/MetricCard";
import { TechnicalAnalysisDashboard } from "@/components/TechnicalAnalysisDashboard";
import { PriceChart } from "@/components/PriceChart";
import { PlotlyPriceChart } from "@/components/PlotlyPriceChart";
import { TradingViewChart } from "@/components/TradingViewChart";
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
import { useFeatureFlags } from "@/lib/featureFlags";
import type { Interval } from "@/lib/aggregateBars";
import { validateParity } from "@/lib/chartValidator";
import { useUnifiedChartData } from "@/hooks/useUnifiedChartData";
import type { Bar } from "@/lib/aggregateBars";

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

const resolveIntradayRange = (range: string): "1d" | "5d" | "1w" => {
  switch (range) {
    case "1d":
      return "1d";
    case "5d":
      return "5d";
    default:
      return "1w";
  }
};

const Index = () => {
  const [selectedSymbol, setSelectedSymbol] = useState("AAPL");
  const [dateRange, setDateRange] = useState("1mo"); // Default to 1 month
  const [selectedIndicators, setSelectedIndicators] = useState<IndicatorConfig>(() => ({
    ...DEFAULT_INDICATOR_CONFIG,
  }));
  const [candleInterval, setCandleInterval] = useState<CandleInterval>("1d");
  const { data: liveQuote, isLoading: quoteLoading } = useStockQuote(selectedSymbol);
  const { usePlotlyChart } = useFeatureFlags();
  const [plotlyParitySnapshot, setPlotlyParitySnapshot] = useState<{
    close: number;
    st: number | null;
  } | null>(null);

  const intervalMap: Record<CandleInterval, Interval> = {
    "10m": "10m",
    "1h": "1h",
    "4h": "4h",
    "1d": "1d",
  };

  useEffect(() => {
    if (!usePlotlyChart && plotlyParitySnapshot !== null) {
      setPlotlyParitySnapshot(null);
    }
  }, [plotlyParitySnapshot, usePlotlyChart]);

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
  } = unified;

  const selectedBarsForDisplay = useMemo<Bar[]>(() => {
    if (!unifiedBars || unifiedBars.length === 0) {
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

    const filtered = unifiedBars.filter((bar) => {
      const barDate = new Date(bar.datetime);
      return !Number.isNaN(barDate.getTime()) && barDate >= cutoff;
    });

    const sorted = (filtered.length > 0 ? filtered : unifiedBars)
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
  }, [chartInterval, dateRange, unifiedBars, unifiedSource]);

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
  const intradayErrorMessage = isIntradayActive && unifiedError
    ? unifiedError instanceof Error
      ? unifiedError.message
      : String(unifiedError)
    : null;
  const intradayRange = isIntradayActive ? resolveIntradayRange(dateRange) : undefined;

  const priceChartData = useMemo(() => {
    const overlayByDate = new Map<string, SuperTrendAISeriesPoint>();

    if (chartSupertrendResult) {
      chartSupertrendResult.series.forEach((point) => {
        overlayByDate.set(point.date, point);
      });
    }

    const hasMultipleDays = (() => {
      if (selectedBarsForDisplay.length < 2) {
        return false;
      }
      const first = selectedBarsForDisplay[0];
      const firstDate = new Date(first.datetime);
      if (Number.isNaN(firstDate.getTime())) {
        return true;
      }
      const benchmark = firstDate.toDateString();
      return selectedBarsForDisplay.some((bar) => {
        const dt = new Date(bar.datetime);
        if (Number.isNaN(dt.getTime())) {
          return true;
        }
        return dt.toDateString() !== benchmark;
      });
    })();

    const formatLabel = (iso: string) => {
      const dateObj = new Date(iso);
      if (Number.isNaN(dateObj.getTime())) {
        return iso;
      }
      if (chartInterval === "1d") {
        return dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      }
      const includeDate = chartInterval === "4h" || hasMultipleDays;
      if (includeDate) {
        return dateObj.toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        });
      }
      return dateObj.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    };

    return selectedBarsForDisplay.map((bar) => {
      const overlay = overlayByDate.get(bar.datetime);
      const supertrend = overlay?.supertrend ?? null;
      const atrValue = overlay?.atr ?? null;

      return {
        date: formatLabel(bar.datetime),
        rawDate: bar.datetime,
        price: bar.close,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        volume: bar.volume,
        trailLong: overlay && overlay.trend === 1 && supertrend !== null ? supertrend : null,
        trailShort: overlay && overlay.trend === -1 && supertrend !== null ? supertrend : null,
        ama: overlay?.ama ?? null,
        atrUpper: supertrend !== null && atrValue !== null ? supertrend + atrValue : null,
        atrLower: supertrend !== null && atrValue !== null ? supertrend - atrValue : null,
        upperBand: overlay?.upperBand ?? null,
        lowerBand: overlay?.lowerBand ?? null,
        buySignal: overlay?.signal === 1 ? supertrend ?? bar.close : null,
        sellSignal: overlay?.signal === -1 ? supertrend ?? bar.close : null,
        supertrend,
        trendDirection: overlay?.trend ?? 0,
      };
    });
  }, [chartInterval, chartSupertrendResult, selectedBarsForDisplay]);

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
      error: unifiedError,
    };
  }, [chartSupertrendResult, selectedBarsForDisplay, unifiedError, unifiedLoading, unifiedSource]);

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

  const legacyParitySnapshot = useMemo(() => {
    const lastBar = selectedBarsForDisplay.at(-1);
    if (!lastBar) {
      return null;
    }
    const stSeries = chartSupertrendResult?.series ?? [];
    const stPoint =
      stSeries.find((point) => point.date === lastBar.datetime) ?? stSeries.at(-1) ?? null;
    if (!Number.isFinite(lastBar.close)) {
      return null;
    }
    return { close: lastBar.close, st: stPoint?.supertrend ?? null };
  }, [chartSupertrendResult, selectedBarsForDisplay]);

  useEffect(() => {
    if (!usePlotlyChart) {
      return;
    }
    if (!legacyParitySnapshot || !plotlyParitySnapshot) {
      return;
    }
    const legacyClose = legacyParitySnapshot.close;
    const plotlyClose = plotlyParitySnapshot.close;
    if (!Number.isFinite(legacyClose) || !Number.isFinite(plotlyClose)) {
      return;
    }
    if (import.meta.env.DEV) {
      const legacyDates = selectedBarsForDisplay.map((bar) => bar.datetime);
      const legacyClose = selectedBarsForDisplay.map((bar) => bar.close);
      const plotlyDates = plotlyChartDataOverride?.dates ?? [];
      const plotlyClose = plotlyChartDataOverride?.ohlc.close ?? [];
      console.log("Legacy tail", legacyDates.slice(-5), legacyClose.slice(-5));
      console.log("Plotly tail", plotlyDates.slice(-5), plotlyClose.slice(-5));
      if (typeof window !== "undefined") {
        const parityWindow = window as typeof window & {
          __chartParity?: {
            legacyDates: string[];
            legacyClose: number[];
            plotlyDates: string[];
            plotlyClose: number[];
          };
        };
        parityWindow.__chartParity = {
          legacyDates,
          legacyClose,
          plotlyDates,
          plotlyClose,
        };
      }
    }
    validateParity(
      selectedSymbol,
      { close: legacyClose, st: legacyParitySnapshot.st ?? 0 },
      { close: plotlyClose, st: plotlyParitySnapshot.st ?? 0 }
    );
  }, [legacyParitySnapshot, plotlyParitySnapshot, plotlyChartDataOverride, selectedBarsForDisplay, selectedSymbol, usePlotlyChart]);
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

        {/* Key Metrics Overview */}
        <section>
          <h3 className="text-lg font-semibold mb-4">Key Metrics</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
        </section>

        {/* Main Price Chart */}
        <section>
          <TradingViewChart
            symbol={selectedSymbol}
            range={dateRange}
            onRangeChange={handleDateRangeChange}
            showSupertrend={Boolean(selectedIndicators.supertrendAI)}
          />
        </section>

        {/* Legacy Recharts Visualization */}
        <section>
          {usePlotlyChart ? (
            <PlotlyPriceChart
              symbol={selectedSymbol}
              interval={chartInterval}
              chartDataOverride={plotlyChartDataOverride}
              onDataReady={({ close, st }) => {
                setPlotlyParitySnapshot({ close, st });
              }}
            />
          ) : (
            <PriceChart
              symbol={selectedSymbol}
              data={priceChartData}
              selectedRange={dateRange}
              onRangeChange={handleDateRangeChange}
              candleInterval={candleInterval}
              onCandleIntervalChange={setCandleInterval}
              isIntradayActive={isIntradayActive}
              isIntradayLoading={isIntradayPending}
              intradayError={intradayErrorMessage}
              intradayRange={intradayRange}
              showSupertrend={Boolean(selectedIndicators.supertrendAI)}
              supertrendMeta={chartSupertrendResult?.info ?? null}
            />
          )}
        </section>

        {/* Technical Analysis Dashboard */}
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
      </main>
    </div>
  );
};

export default Index;
