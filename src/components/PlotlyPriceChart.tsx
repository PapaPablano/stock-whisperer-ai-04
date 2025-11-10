import React, { useEffect, useRef } from "react";
import Plot from "react-plotly.js";
import type { Layout, Data } from "plotly.js";
import { useUnifiedChartData } from "@/hooks/useUnifiedChartData";
import { DARK_LAYOUT, PLOTLY_CONFIG, COLORS } from "@/lib/chartConfig";
import type { Interval } from "@/lib/aggregateBars";

interface PlotlyPriceChartProps {
  symbol: string;
  interval: Interval;
  height?: number;
  onDataReady?: (snapshot: {
    date: string;
    close: number;
    st: number | null;
    source: string;
  }) => void;
}

export const PlotlyPriceChart: React.FC<PlotlyPriceChartProps> = ({
  symbol,
  interval,
  height = 720,
  onDataReady,
}) => {
  const { loading, error, dates, ohlc, volume, st, source } = useUnifiedChartData(
    symbol,
    interval,
    { session: "EQUITY_RTH" }
  );
  const reportedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!onDataReady || loading || error || !dates?.length) {
      return;
    }
    const lastIndex = dates.length - 1;
    const lastDate = dates[lastIndex];
    if (!lastDate) {
      return;
    }
    const key = `${lastDate}-${source ?? "unknown"}`;
    if (reportedRef.current === key) {
      return;
    }
    const lastClose = ohlc.close?.[lastIndex];
    if (typeof lastClose !== "number" || Number.isNaN(lastClose)) {
      return;
    }
    const series = st?.series ?? [];
    const stPoint = series.find((point) => point.date === lastDate) ?? series.at(-1) ?? null;
    onDataReady({
      date: lastDate,
      close: lastClose,
      st: stPoint?.supertrend ?? null,
      source: source ?? "unknown",
    });
    reportedRef.current = key;
  }, [dates, error, loading, ohlc.close, onDataReady, source, st]);

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
