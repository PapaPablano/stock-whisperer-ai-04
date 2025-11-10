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

  const traces = useMemo<Data[]>(() => {
    const base: Data[] = [
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

    if (!effectiveData.st || !effectiveData.dates.length) {
      return base;
    }

    const xValues = effectiveData.dates;
    const extras = effectiveData.st.extras;
    const fallbackSeries = effectiveData.st.series;
    const hasFinite = (values: Array<number | null | undefined>) =>
      values.some((value) => typeof value === "number" && Number.isFinite(value));

    const tsBullValues = extras?.tsBull?.length
      ? extras.tsBull
      : fallbackSeries.map((point) =>
          point.trend === 1 ? point.supertrend ?? null : null
        );
    const tsBearValues = extras?.tsBear?.length
      ? extras.tsBear
      : fallbackSeries.map((point) =>
          point.trend === -1 ? point.supertrend ?? null : null
        );
    const amaBullValues = extras?.amaBull?.length
      ? extras.amaBull
      : fallbackSeries.map((point) =>
          point.trend === 1 ? point.ama ?? point.supertrend ?? null : null
        );
    const amaBearValues = extras?.amaBear?.length
      ? extras.amaBear
      : fallbackSeries.map((point) =>
          point.trend === -1 ? point.ama ?? point.supertrend ?? null : null
        );
    const perfAmaValues = extras?.perfAma?.length
      ? extras.perfAma
      : fallbackSeries.map((point) => point.ama ?? point.supertrend ?? null);
    const tsSeriesValues = extras?.tsSeries?.length
      ? extras.tsSeries
      : fallbackSeries.map((point) => point.supertrend);

    const overlayTraces: Data[] = [];

    if (hasFinite(tsSeriesValues)) {
      overlayTraces.push({
        type: "scattergl",
        mode: "lines",
        x: xValues,
        y: tsSeriesValues,
        name: "SuperTrend AI",
        line: { color: COLORS.supertrend, width: 2 },
        xaxis: "x",
        yaxis: "y",
        hovertemplate: "%{y:.2f}<extra>SuperTrend AI</extra>",
      } as Data);
    }

    if (hasFinite(tsBullValues)) {
      overlayTraces.push({
        type: "scattergl",
        mode: "lines",
        x: xValues,
        y: tsBullValues,
        name: "Trailing Stop (Bull)",
        line: { color: COLORS.supertrendBull, width: 2 },
        xaxis: "x",
        yaxis: "y",
        hovertemplate: "%{y:.2f}<extra>TS Bull</extra>",
      } as Data);
    }

    if (hasFinite(tsBearValues)) {
      overlayTraces.push({
        type: "scattergl",
        mode: "lines",
        x: xValues,
        y: tsBearValues,
        name: "Trailing Stop (Bear)",
        line: { color: COLORS.supertrendBear, width: 2 },
        xaxis: "x",
        yaxis: "y",
        hovertemplate: "%{y:.2f}<extra>TS Bear</extra>",
      } as Data);
    }

    if (hasFinite(perfAmaValues)) {
      overlayTraces.push({
        type: "scattergl",
        mode: "lines",
        x: xValues,
        y: perfAmaValues,
        name: "Adaptive MA",
        line: { color: COLORS.supertrend, width: 2, dash: "dot" },
        xaxis: "x",
        yaxis: "y",
        hovertemplate: "%{y:.2f}<extra>Adaptive MA</extra>",
      } as Data);
    }

    if (hasFinite(amaBullValues)) {
      overlayTraces.push({
        type: "scattergl",
        mode: "lines",
        x: xValues,
        y: amaBullValues,
        name: "AMA Bull",
        line: { color: COLORS.supertrendAmaBull, width: 2, dash: "dot" },
        xaxis: "x",
        yaxis: "y",
        hovertemplate: "%{y:.2f}<extra>AMA Bull</extra>",
      } as Data);
    }

    if (hasFinite(amaBearValues)) {
      overlayTraces.push({
        type: "scattergl",
        mode: "lines",
        x: xValues,
        y: amaBearValues,
        name: "AMA Bear",
        line: { color: COLORS.supertrendAmaBear, width: 2, dash: "dot" },
        xaxis: "x",
        yaxis: "y",
        hovertemplate: "%{y:.2f}<extra>AMA Bear</extra>",
      } as Data);
    }

    const buySignals: { x: string; y: number }[] = [];
    const sellSignals: { x: string; y: number }[] = [];
    fallbackSeries.forEach((point, index) => {
      if (!point.signal) {
        return;
      }
      const value = point.supertrend ?? point.close;
      if (typeof value !== "number" || !Number.isFinite(value)) {
        return;
      }
      const bucket = point.signal === 1 ? buySignals : sellSignals;
      bucket.push({ x: xValues[index], y: value });
    });

    if (buySignals.length > 0) {
      overlayTraces.push({
        type: "scattergl",
        mode: "markers",
        x: buySignals.map((item) => item.x),
        y: buySignals.map((item) => item.y),
        marker: {
          color: COLORS.supertrendBull,
          symbol: "triangle-up",
          size: 10,
        },
        name: "Signal Up",
        xaxis: "x",
        yaxis: "y",
        hovertemplate: "Buy @ %{y:.2f}<extra>Signal Up</extra>",
      } as Data);
    }

    if (sellSignals.length > 0) {
      overlayTraces.push({
        type: "scattergl",
        mode: "markers",
        x: sellSignals.map((item) => item.x),
        y: sellSignals.map((item) => item.y),
        marker: {
          color: COLORS.supertrendBear,
          symbol: "triangle-down",
          size: 10,
        },
        name: "Signal Down",
        xaxis: "x",
        yaxis: "y",
        hovertemplate: "Sell @ %{y:.2f}<extra>Signal Down</extra>",
      } as Data);
    }

    return [...base, ...overlayTraces];
  }, [effectiveData.dates, effectiveData.ohlc.close, effectiveData.ohlc.high, effectiveData.ohlc.low, effectiveData.ohlc.open, effectiveData.volume.colors, effectiveData.volume.values, effectiveData.st]);

  if (effectiveData.error)
    return (
      <div className="rounded bg-red-900/30 p-3 text-red-200">Failed to load chart.</div>
    );
  if (effectiveData.loading || !effectiveData.dates?.length)
    return (
      <div className="rounded bg-gray-800 p-6 text-gray-300">Loading chart...</div>
    );

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
