import React from "react";
import Plot from "react-plotly.js";
import type { Layout, Data } from "plotly.js";
import { useUnifiedChartData } from "@/hooks/useUnifiedChartData";
import { DARK_LAYOUT, PLOTLY_CONFIG, COLORS } from "@/lib/chartConfig";
import type { Interval } from "@/lib/aggregateBars";

interface PlotlyPriceChartProps {
  symbol: string;
  interval: Interval;
  height?: number;
}

export const PlotlyPriceChart: React.FC<PlotlyPriceChartProps> = ({
  symbol,
  interval,
  height = 720,
}) => {
  const { loading, error, dates, ohlc, volume, st, source } = useUnifiedChartData(
    symbol,
    interval,
    { session: "EQUITY_RTH" }
  );

  if (error)
    return (
      <div className="rounded bg-red-900/30 p-3 text-red-200">Failed to load chart.</div>
    );
  if (loading || !dates?.length)
    return (
      <div className="rounded bg-gray-800 p-6 text-gray-300">Loading chart...</div>
    );

  const traces: Data[] = [
    {
      type: "candlestick",
      x: dates,
      open: ohlc.open,
      high: ohlc.high,
      low: ohlc.low,
      close: ohlc.close,
      name: "Price",
      increasing: { line: { color: COLORS.candleUp } },
      decreasing: { line: { color: COLORS.candleDown } },
      xaxis: "x",
      yaxis: "y",
    },
    {
      type: "scatter",
      mode: "lines",
      x: dates,
      y: st?.series.map((s) => s.supertrend) ?? [],
      name: "SuperTrend AI",
      line: { color: COLORS.supertrend, width: 2 },
      xaxis: "x",
      yaxis: "y",
    },
    {
      type: "bar",
      x: dates,
      y: volume.values,
      name: "Volume",
      marker: {
        color: volume.colors.map((c) =>
          c === "up" ? COLORS.volumeUp : COLORS.volumeDown
        ),
      },
      xaxis: "x",
      yaxis: "y2",
      showlegend: false,
    },
  ];

  const layout: Partial<Layout> = {
    ...DARK_LAYOUT,
    title: { text: `${symbol.toUpperCase()} • ${interval.toUpperCase()} • ${source}` },
    height,
    grid: { rows: 2, columns: 1, pattern: "independent" },
    xaxis: { ...(DARK_LAYOUT.xaxis ?? {}), type: "date", rangeslider: { visible: false } },
    yaxis: { ...(DARK_LAYOUT.yaxis ?? {}), domain: [0.35, 1], title: { text: "Price ($)" } },
    yaxis2: { ...(DARK_LAYOUT.yaxis ?? {}), domain: [0, 0.28], title: { text: "Volume" } },
    margin: { l: 60, r: 60, t: 70, b: 60 },
    showlegend: true,
    legend: { orientation: "h", y: 1.05, x: 1, xanchor: "right" },
  };

  return (
    <Plot
      data={traces}
      layout={layout}
      config={PLOTLY_CONFIG}
      style={{ width: "100%", height }}
      useResizeHandler
    />
  );
};
