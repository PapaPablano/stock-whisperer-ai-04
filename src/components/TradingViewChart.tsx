import { useMemo } from "react";
import Plot from "react-plotly.js";
import type { Data, Layout } from "plotly.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUnifiedChartData } from "@/hooks/useUnifiedChartData";
import { COLORS, DARK_LAYOUT, PLOTLY_CONFIG, TIME_BUTTONS } from "@/lib/chartConfig";

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

export const TradingViewChart = ({
  symbol,
  range,
  onRangeChange,
  showSupertrend = true,
}: TradingViewChartProps) => {
  const { chart, loading, error } = useUnifiedChartData(symbol, range);

  const plotData = useMemo<Data[]>(() => {
    if (!chart) {
      return [] as Data[];
    }

    const bullishSupertrend = chart.supertrend.values.map((value, index) =>
      chart.supertrend.trend[index] === 1 ? value : null,
    );

    const bearishSupertrend = chart.supertrend.values.map((value, index) =>
      chart.supertrend.trend[index] === -1 ? value : null,
    );

    const macdHistogramColors = chart.macd.histogram.map((value) =>
      value !== null && value >= 0 ? COLORS.volumeUp : COLORS.volumeDown,
    );

    return [
      {
        type: "candlestick" as const,
        name: `${symbol} Price`,
        x: chart.dates,
        open: chart.ohlc.open,
        high: chart.ohlc.high,
        low: chart.ohlc.low,
        close: chart.ohlc.close,
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
              x: chart.dates,
              y: bullishSupertrend,
              line: { color: COLORS.candleUp, width: 2 },
              xaxis: "x",
              yaxis: "y",
            },
            {
              type: "scatter" as const,
              mode: "lines",
              name: "SuperTrend (Bearish)",
              x: chart.dates,
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
        x: chart.dates,
        y: chart.volume.values,
        marker: {
          color: chart.volume.colors.map((direction) =>
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
        x: chart.dates,
        y: chart.rsi,
        line: { color: COLORS.rsi, width: 1.5 },
        xaxis: "x3",
        yaxis: "y3",
      },
      {
        type: "scatter" as const,
        mode: "lines",
        name: "MACD",
        x: chart.dates,
        y: chart.macd.macd,
        line: { color: COLORS.macd, width: 1.5 },
        xaxis: "x3",
        yaxis: "y4",
      },
      {
        type: "scatter" as const,
        mode: "lines",
        name: "Signal",
        x: chart.dates,
        y: chart.macd.signal,
        line: { color: COLORS.macdSignal, width: 1 },
        xaxis: "x3",
        yaxis: "y4",
      },
      {
        type: "bar" as const,
        name: "MACD Histogram",
        x: chart.dates,
        y: chart.macd.histogram,
        marker: { color: macdHistogramColors },
        opacity: 0.6,
        xaxis: "x3",
        yaxis: "y4",
      },
    ] as Data[];
  }, [chart, showSupertrend, symbol]);

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

    if (!chart || plotData.length === 0) {
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
          {chart && showSupertrend && chart.supertrend.info && (
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span>
                <span className="font-semibold text-foreground">Target Factor:</span>{" "}
                {chart.supertrend.info.targetFactor.toFixed(2)}
              </span>
              <span>
                <span className="font-semibold text-foreground">Performance Index:</span>{" "}
                {chart.supertrend.info.performanceIndex.toFixed(4)}
              </span>
              <span>
                <span className="font-semibold text-foreground">Base Signals:</span>{" "}
                {chart.supertrend.info.signalMetrics.length}
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
