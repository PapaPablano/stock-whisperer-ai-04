import { useMemo } from "react";
import Plot from "react-plotly.js";
import type { Data, Layout } from "plotly.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUnifiedChartData } from "@/hooks/useUnifiedChartData";
import { COLORS, DARK_LAYOUT, PLOTLY_CONFIG, TIME_BUTTONS } from "@/lib/chartConfig";
import type { Interval } from "@/lib/aggregateBars";
import type { SuperTrendAISeriesPoint } from "@/lib/superTrendAI";

interface TradingViewChartProps {
  symbol: string;
  range: string;
  onRangeChange: (range: string) => void;
  showSupertrend?: boolean;
}

const RANGE_MAP: Record<string, string> = {
  "1D": "1d",
  "5D": "5d",
  "1M": "1mo",
  "3M": "3mo",
  "6M": "6mo",
  "1Y": "1y",
  "5Y": "5y",
};

const resolveCutoffDate = (range: string): Date | null => {
  const cutoff = new Date();

  switch (range) {
    case "1d":
      cutoff.setDate(cutoff.getDate() - 1);
      return cutoff;
    case "5d":
      cutoff.setDate(cutoff.getDate() - 5);
      return cutoff;
    case "1mo":
      cutoff.setMonth(cutoff.getMonth() - 1);
      return cutoff;
    case "3mo":
      cutoff.setMonth(cutoff.getMonth() - 3);
      return cutoff;
    case "6mo":
      cutoff.setMonth(cutoff.getMonth() - 6);
      return cutoff;
    case "1y":
      cutoff.setFullYear(cutoff.getFullYear() - 1);
      return cutoff;
    case "5y":
      cutoff.setFullYear(cutoff.getFullYear() - 5);
      return cutoff;
    default:
      return null;
  }
};

type FilteredChart = {
  dates: string[];
  ohlc: {
    open: number[];
    high: number[];
    low: number[];
    close: number[];
  };
  volume: {
    values: number[];
    colors: ("up" | "down")[];
  };
  stSeries: Array<SuperTrendAISeriesPoint | null>;
  rsi: Array<number | null>;
  macd: {
    macd: Array<number | null>;
    signal: Array<number | null>;
    histogram: Array<number | null>;
  };
};

export const TradingViewChart = ({
  symbol,
  range,
  onRangeChange,
  showSupertrend = true,
}: TradingViewChartProps) => {
  const baseInterval: Interval = "1d";
  const { bars, dates, ohlc, volume, st, rsi, macd, loading, error } =
    useUnifiedChartData(symbol, baseInterval, { session: "EQUITY_RTH" });

  const filtered = useMemo<FilteredChart | null>(() => {
    if (!dates || dates.length === 0) {
      return null;
    }

    const cutoff = resolveCutoffDate(range);
    const indices: number[] = [];

    dates.forEach((date, index) => {
      if (!cutoff) {
        indices.push(index);
        return;
      }
      const time = new Date(date);
      if (time >= cutoff) {
        indices.push(index);
      }
    });

    if (indices.length === 0) {
      return null;
    }

    const pick = <T,>(source: T[]): T[] => indices.map((i) => source[i]);
    const selectedDates = pick(dates);
    const stByDate = st
      ? new Map<string, SuperTrendAISeriesPoint>(
          st.series.map((point) => [point.date, point])
        )
      : null;
    const stSeries: Array<SuperTrendAISeriesPoint | null> = selectedDates.map(
      (date) => stByDate?.get(date) ?? null
    );

    return {
      dates: selectedDates,
      ohlc: {
        open: pick(ohlc.open),
        high: pick(ohlc.high),
        low: pick(ohlc.low),
        close: pick(ohlc.close),
      },
      volume: {
        values: pick(volume.values),
        colors: pick(volume.colors as ("up" | "down")[]),
      },
      stSeries,
      rsi: rsi ? pick(rsi.values) : [] as Array<number | null>,
      macd: macd
        ? {
            macd: pick(macd.macd),
            signal: pick(macd.signal),
            histogram: pick(macd.histogram),
          }
        : { macd: [] as Array<number | null>, signal: [] as Array<number | null>, histogram: [] as Array<number | null> },
    };
  }, [dates, ohlc, volume, st, rsi, macd, range]);

  const plotData = useMemo<Data[]>(() => {
    if (!filtered) {
      return [] as Data[];
    }

    const supertrendValues = filtered.stSeries;
    const bullishSupertrend = supertrendValues.map((point) =>
      point && point.trend === 1 ? point.supertrend : null,
    );

    const bearishSupertrend = supertrendValues.map((point) =>
      point && point.trend === 0 ? point.supertrend : null,
    );

    const macdHistogramColors = filtered.macd.histogram.map((value) =>
      value !== null && value >= 0 ? COLORS.volumeUp : COLORS.volumeDown,
    );

    return [
      {
        type: "candlestick" as const,
        name: `${symbol} Price`,
        x: filtered.dates,
        open: filtered.ohlc.open,
        high: filtered.ohlc.high,
        low: filtered.ohlc.low,
        close: filtered.ohlc.close,
        increasing: { line: { color: COLORS.candleUp }, fillcolor: COLORS.candleUp },
        decreasing: { line: { color: COLORS.candleDown }, fillcolor: COLORS.candleDown },
        xaxis: "x",
        yaxis: "y",
  },
      ...(showSupertrend
        ? [
            {
              type: "scatter" as const,
              mode: "lines",
              name: "SuperTrend (Bullish)",
              x: filtered.dates,
              y: bullishSupertrend,
              line: { color: COLORS.candleUp, width: 2 },
              xaxis: "x",
              yaxis: "y",
            },
            {
              type: "scatter" as const,
              mode: "lines",
              name: "SuperTrend (Bearish)",
              x: filtered.dates,
              y: bearishSupertrend,
              line: { color: COLORS.candleDown, width: 2 },
              xaxis: "x",
              yaxis: "y",
            },
          ]
        : []),
      {
        type: "bar" as const,
        name: "Volume",
        x: filtered.dates,
        y: filtered.volume.values,
        marker: {
          color: filtered.volume.colors.map((direction) =>
            direction === "up" ? COLORS.volumeUp : COLORS.volumeDown,
          ),
        },
        opacity: 0.8,
        xaxis: "x2",
        yaxis: "y2",
      },
      {
        type: "scatter" as const,
        mode: "lines",
        name: "RSI",
        x: filtered.dates,
        y: filtered.rsi,
        line: { color: COLORS.rsi, width: 1.5 },
        xaxis: "x3",
        yaxis: "y3",
      },
      {
        type: "scatter" as const,
        mode: "lines",
        name: "MACD",
        x: filtered.dates,
        y: filtered.macd.macd,
        line: { color: COLORS.macd, width: 1.5 },
        xaxis: "x3",
        yaxis: "y4",
      },
      {
        type: "scatter" as const,
        mode: "lines",
        name: "Signal",
        x: filtered.dates,
        y: filtered.macd.signal,
        line: { color: COLORS.macdSignal, width: 1 },
        xaxis: "x3",
        yaxis: "y4",
      },
      {
        type: "bar" as const,
        name: "MACD Histogram",
        x: filtered.dates,
        y: filtered.macd.histogram,
        marker: { color: macdHistogramColors },
        opacity: 0.6,
        xaxis: "x3",
        yaxis: "y4",
      },
    ] as Data[];
  }, [filtered, showSupertrend, symbol]);

  const layout = useMemo<Partial<Layout>>(() => {
    return {
      ...DARK_LAYOUT,
      margin: { t: 32, r: 24, b: 32, l: 48 },
      showlegend: true,
      legend: { orientation: "h", x: 0, y: 1.12, font: { size: 10 } },
      xaxis: {
        ...(DARK_LAYOUT.xaxis ?? {}),
        rangeslider: { visible: false },
        showticklabels: false,
        domain: [0, 1],
      },
      yaxis: {
        ...(DARK_LAYOUT.yaxis ?? {}),
        title: { text: "Price", font: { size: 11 } },
        domain: [0.45, 1],
      },
      xaxis2: {
        matches: "x",
        domain: [0, 1],
        anchor: "y2",
        showgrid: false,
      },
      yaxis2: {
        title: { text: "Volume", font: { size: 11 } },
        overlaying: undefined,
        domain: [0.25, 0.42],
        showgrid: true,
        gridcolor: "#1f2430",
      },
      xaxis3: {
        matches: "x",
        domain: [0, 1],
        anchor: "y3",
        showgrid: false,
      },
      yaxis3: {
        title: { text: "RSI", font: { size: 11 } },
        domain: [0.09, 0.22],
        range: [0, 100],
        gridcolor: "#1f2430",
      },
      yaxis4: {
        title: { text: "MACD", font: { size: 11 } },
        overlaying: "y3",
        side: "right",
        showgrid: false,
        zeroline: true,
        zerolinecolor: "#475569",
      },
      separators: "",
    };
  }, []);

  const renderStatus = () => {
    if (loading) {
      return <div className="p-6 text-sm text-muted-foreground">Loading chart data…</div>;
    }

    if (error) {
      const message = error instanceof Error ? error.message : "Unable to load chart data.";
      return <div className="p-6 text-sm text-destructive">{message}</div>;
    }

    if (!filtered || plotData.length === 0) {
      return <div className="p-6 text-sm text-muted-foreground">No data available for this symbol.</div>;
    }

    return null;
  };

  const status = renderStatus();

  return (
    <Card className="h-full">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-lg">{symbol} Overview</CardTitle>
            <div className="flex flex-wrap gap-1">
              {TIME_BUTTONS.map((button) => {
                const value = RANGE_MAP[button.label];
                const disabled = value === undefined;
                const isActive = value === range;

                return (
                  <Button
                    key={button.label}
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    className="text-xs"
                    disabled={disabled}
                    onClick={() => {
                      if (!disabled) {
                        onRangeChange(value);
                      }
                    }}
                  >
                    {button.label}
                  </Button>
                );
              })}
            </div>
          </div>
          {filtered && st?.info && showSupertrend && (
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span>
                <span className="font-semibold text-foreground">Target Factor:</span>{" "}
                {st.info.targetFactor.toFixed(2)}
              </span>
              <span>
                <span className="font-semibold text-foreground">Performance Index:</span>{" "}
                {st.info.performanceIndex.toFixed(4)}
              </span>
              <span>
                <span className="font-semibold text-foreground">Base Signals:</span>{" "}
                {st.info.signalMetrics.length}
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[560px]">
          {status ? (
            status
          ) : (
            <Plot
              data={plotData}
              layout={layout}
              config={PLOTLY_CONFIG}
              style={{ width: "100%", height: "100%" }}
              useResizeHandler
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
};
