import React, { useEffect, useMemo, useRef } from "react";
import Plot from "react-plotly.js";
import type { Layout, Data } from "plotly.js";
import { useUnifiedChartData } from "@/hooks/useUnifiedChartData";
import { DARK_LAYOUT, PLOTLY_CONFIG, COLORS } from "@/lib/chartConfig";
import type { Interval } from "@/lib/aggregateBars";
import type { SuperTrendAIResult } from "@/lib/superTrendAI";

interface PlotlyChartDataOverride {
  dates: string[];
  ohlc: { open: number[]; high: number[]; low: number[]; close: number[] };
  volume: { values: number[]; colors: Array<"up" | "down"> };
  st: SuperTrendAIResult | null;
  source?: string | null;
  loading?: boolean;
  error?: unknown;
}

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
  chartDataOverride?: PlotlyChartDataOverride;
}

type AxisRangeBreak = {
  pattern: "day of week" | "hour";
  bounds: [number, number];
};

export const PlotlyPriceChart: React.FC<PlotlyPriceChartProps> = ({
  symbol,
  interval,
  height = 720,
  onDataReady,
  chartDataOverride,
}) => {
  const { loading, error, dates, ohlc, volume, st, source } = useUnifiedChartData(
    symbol,
    interval,
    { session: "EQUITY_RTH" }
  );
  const reportedRef = useRef<string | null>(null);

  const rangeBreaks = useMemo<AxisRangeBreak[]>(() => {
    const breaks: AxisRangeBreak[] = [{ pattern: "day of week", bounds: [6, 1] }];
    if (interval !== "1d") {
      breaks.push({ pattern: "hour", bounds: [16, 9.5] });
    }
    return breaks;
  }, [interval]);

  const effectiveData = useMemo(() => {
    if (!chartDataOverride) {
      return {
        loading,
        error,
        dates,
        ohlc,
        volume,
        st,
        source: source ?? "unknown",
      };
    }
    return {
      loading: chartDataOverride.loading ?? false,
      error: chartDataOverride.error ?? null,
      dates: chartDataOverride.dates,
      ohlc: chartDataOverride.ohlc,
      volume: chartDataOverride.volume,
      st: chartDataOverride.st,
      source: chartDataOverride.source ?? source ?? "unknown",
    };
  }, [chartDataOverride, dates, error, loading, ohlc, source, st, volume]);

  const tickSettings = useMemo(() => {
    const HOUR_MS = 60 * 60 * 1000;
    const DAY_MS = 24 * HOUR_MS;
    const defaults: Record<Interval, { dtick: number; tickformat: string }> = {
      "1m": { dtick: HOUR_MS, tickformat: "%b %d %H:%M" },
      "5m": { dtick: HOUR_MS, tickformat: "%b %d %H:%M" },
      "10m": { dtick: 2 * HOUR_MS, tickformat: "%b %d %H:%M" },
      "15m": { dtick: 3 * HOUR_MS, tickformat: "%b %d %H:%M" },
      "30m": { dtick: 6 * HOUR_MS, tickformat: "%b %d %H:%M" },
      "1h": { dtick: 6 * HOUR_MS, tickformat: "%b %d %H:%M" },
      "4h": { dtick: DAY_MS, tickformat: "%b %d %H:%M" },
      "1d": { dtick: 14 * DAY_MS, tickformat: "%b %d" },
    };
    return defaults[interval] ?? defaults["10m"];
  }, [interval]);

  useEffect(() => {
    if (!onDataReady || effectiveData.loading || effectiveData.error || !effectiveData.dates?.length) {
      return;
    }
    const lastIndex = effectiveData.dates.length - 1;
    const lastDate = effectiveData.dates[lastIndex];
    if (!lastDate) {
      return;
    }
    const key = `${lastDate}-${effectiveData.source ?? "unknown"}`;
    if (reportedRef.current === key) {
      return;
    }
    const lastClose = effectiveData.ohlc.close?.[lastIndex];
    if (typeof lastClose !== "number" || Number.isNaN(lastClose)) {
      return;
    }
    const series = effectiveData.st?.series ?? [];
    const stPoint = series.find((point) => point.date === lastDate) ?? series.at(-1) ?? null;
    onDataReady({
      date: lastDate,
      close: lastClose,
      st: stPoint?.supertrend ?? null,
      source: effectiveData.source ?? "unknown",
    });
    reportedRef.current = key;
  }, [effectiveData, onDataReady]);

  if (effectiveData.error)
    return (
      <div className="rounded bg-red-900/30 p-3 text-red-200">Failed to load chart.</div>
    );
  if (effectiveData.loading || !effectiveData.dates?.length)
    return (
      <div className="rounded bg-gray-800 p-6 text-gray-300">Loading chart...</div>
    );

  const traces: Data[] = [
    {
      type: "candlestick",
      x: effectiveData.dates,
      open: effectiveData.ohlc.open,
      high: effectiveData.ohlc.high,
      low: effectiveData.ohlc.low,
      close: effectiveData.ohlc.close,
      name: "Price",
      increasing: { line: { color: COLORS.candleUp } },
      decreasing: { line: { color: COLORS.candleDown } },
      xaxis: "x",
      yaxis: "y",
    },
    {
      type: "scatter",
      mode: "lines",
      x: effectiveData.dates,
      y: effectiveData.st?.series.map((s) => s.supertrend) ?? [],
      name: "SuperTrend AI",
      line: { color: COLORS.supertrend, width: 2 },
      xaxis: "x",
      yaxis: "y",
    },
    {
      type: "bar",
      x: effectiveData.dates,
      y: effectiveData.volume.values,
      name: "Volume",
      marker: {
        color: effectiveData.volume.colors.map((c) =>
          c === "up" ? COLORS.volumeUp : COLORS.volumeDown
        ),
      },
      xaxis: "x",
      yaxis: "y2",
      showlegend: false,
    },
  ];

    const layout: (Partial<Layout> & {
      separators?: string;
      xaxis?: (Layout["xaxis"] & { rangebreaks?: AxisRangeBreak[] }) | undefined;
    }) = {
    ...DARK_LAYOUT,
    title: { text: `${symbol.toUpperCase()} • ${interval.toUpperCase()} • ${effectiveData.source}` },
    height,
      separators: ",.",
    grid: { rows: 2, columns: 1, pattern: "independent" },
    xaxis: {
      ...(DARK_LAYOUT.xaxis ?? {}),
      type: "date",
      rangeslider: { visible: false },
      tickformat: tickSettings.tickformat,
      dtick: tickSettings.dtick,
      ticklabelmode: "period",
        rangebreaks: rangeBreaks,
    },
    yaxis: {
      ...(DARK_LAYOUT.yaxis ?? {}),
      domain: [0.35, 1],
      title: { text: "Price ($)" },
      type: "linear",
      tickformat: "~s",
    },
    yaxis2: {
      ...(DARK_LAYOUT.yaxis ?? {}),
      domain: [0, 0.28],
      title: { text: "Volume" },
      type: "linear",
      tickformat: "~s",
    },
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
