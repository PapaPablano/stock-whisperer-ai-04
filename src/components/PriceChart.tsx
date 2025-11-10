import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TooltipProps, LegendProps, LegendType } from "recharts";
import type { CSSProperties } from "react";
import type { SuperTrendAIInfo } from "@/lib/superTrendAI";

type CandleInterval = "10m" | "1h" | "4h" | "1d";

interface PriceChartDatum {
  date: string;
  rawDate: string;
  price: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  trailLong: number | null;
  trailShort: number | null;
  ama: number | null;
  atrUpper: number | null;
  atrLower: number | null;
  upperBand: number | null;
  lowerBand: number | null;
  buySignal: number | null;
  sellSignal: number | null;
  supertrend: number | null;
  trendDirection: number;
}

interface PriceChartProps {
  symbol: string;
  data: PriceChartDatum[];
  selectedRange: string;
  onRangeChange: (range: string) => void;
  candleInterval: CandleInterval;
  onCandleIntervalChange: (interval: CandleInterval) => void;
  isIntradayActive: boolean;
  isIntradayLoading?: boolean;
  intradayError?: string | null;
  intradayRange?: "1d" | "5d" | "1w";
  showSupertrend?: boolean;
  supertrendMeta?: SuperTrendAIInfo | null;
}

const tooltipStyles: CSSProperties = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "6px",
  padding: "10px 12px",
  color: "hsl(var(--foreground))",
  minWidth: 180,
};

const formatNumber = (value: number | null | undefined, digits = 2) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "—";
  }
  return value.toFixed(digits);
};

const formatVolume = (value: number | null | undefined) => {
  if (value === null || value === undefined) {
    return "—";
  }
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
};

interface CandleShapeProps {
  x?: number;
  width?: number;
  payload?: PriceChartDatum;
  yAxis?: {
    scale?: (value: number) => number;
  };
}

const CandleShape = ({ x, width, payload, yAxis }: CandleShapeProps) => {
  if (!payload || !yAxis || typeof yAxis.scale !== "function") {
    return null;
  }

  const scale = yAxis.scale as (value: number) => number;
  const barWidth = typeof width === "number" && Number.isFinite(width) ? width : 6;
  const candleWidth = Math.max(barWidth * 0.6, 2);
  const xCenter = (typeof x === "number" ? x : 0) + barWidth / 2;

  const openY = scale(payload.open);
  const closeY = scale(payload.price);
  const highY = scale(payload.high);
  const lowY = scale(payload.low);

  const top = Math.min(openY, closeY);
  const bottom = Math.max(openY, closeY);
  const fill = payload.price >= payload.open ? "hsl(var(--success))" : "hsl(var(--destructive))";

  return (
    <g>
      <line x1={xCenter} x2={xCenter} y1={highY} y2={lowY} stroke={fill} strokeWidth={2} />
      <rect
        x={(typeof x === "number" ? x : 0) + (barWidth - candleWidth) / 2}
        y={top}
        width={candleWidth}
        height={Math.max(bottom - top, 1)}
        fill={fill}
        stroke={fill}
      />
    </g>
  );
};

const renderTooltip = ({ active, payload }: TooltipProps<number, string>) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const point = payload[0].payload as PriceChartDatum;
  const dateValue = new Date(point.rawDate);
  const heading = Number.isNaN(dateValue.getTime())
    ? point.rawDate
    : dateValue.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

  const supertrendLevel = point.trailLong ?? point.trailShort ?? null;
  const trendLabel = point.trailLong ? "Bullish" : point.trailShort ? "Bearish" : "Neutral";

  return (
    <div style={tooltipStyles}>
      <div className="text-xs font-semibold text-foreground">{heading}</div>
      <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <span>Open: {formatNumber(point.open)}</span>
        <span>Close: {formatNumber(point.price)}</span>
        <span>High: {formatNumber(point.high)}</span>
        <span>Low: {formatNumber(point.low)}</span>
        <span>Volume: {formatVolume(point.volume)}</span>
        <span>AMA: {formatNumber(point.ama)}</span>
      </div>
      {supertrendLevel !== null && (
        <div className="mt-2 border-t border-border/40 pt-2 text-[11px] text-muted-foreground">
          <div>SuperTrend: {formatNumber(supertrendLevel)} ({trendLabel})</div>
          <div>
            Distance: {formatNumber(point.price - supertrendLevel)}
            {point.atrUpper !== null && point.atrLower !== null
              ? ` | ATR Band: ${formatNumber(point.atrLower)} – ${formatNumber(point.atrUpper)}`
              : ""}
          </div>
        </div>
      )}
    </div>
  );
};

export const PriceChart = ({
  symbol,
  data,
  selectedRange,
  onRangeChange,
  candleInterval,
  onCandleIntervalChange,
  isIntradayActive,
  isIntradayLoading = false,
  intradayError = null,
  intradayRange,
  showSupertrend = false,
  supertrendMeta = null,
}: PriceChartProps) => {
  const rangeMap: Record<string, string> = {
    "1D": "1d",
    "5D": "5d",
    "1M": "1mo",
    "3M": "3mo",
    "6M": "6mo",
    "1Y": "1y",
    "5Y": "5y",
  };

  const timeRanges = ["1D", "5D", "1M", "3M", "6M", "1Y", "5Y"];
  const intervalOptions: Array<{ label: string; value: CandleInterval }> = [
    { label: "10m", value: "10m" },
    { label: "1h", value: "1h" },
    { label: "4h", value: "4h" },
    { label: "1D", value: "1d" },
  ];

  const hasSupertrend = showSupertrend && data.some((point) => point.trailLong !== null || point.trailShort !== null);

  const legendPayload: LegendProps["payload"] = [
    {
      value: "Candlestick",
      type: "rect" as LegendType,
      color: "hsl(var(--primary))",
      id: "candles",
      dataKey: "candles",
    },
    ...(hasSupertrend
      ? [
          {
            value: "SuperTrend (Bullish)",
            type: "line" as LegendType,
            color: "#22c55e",
            id: "trailLong",
            dataKey: "trailLong",
          },
          {
            value: "SuperTrend (Bearish)",
            type: "line" as LegendType,
            color: "#f43f5e",
            id: "trailShort",
            dataKey: "trailShort",
          },
        ]
      : []),
  ];

  const intradayStatus = (() => {
    if (candleInterval === "1d") {
      return null;
    }
    if (isIntradayLoading) {
      return { text: "Loading intraday data…", className: "text-muted-foreground" };
    }
    if (intradayError) {
      return {
        text: `Intraday data unavailable (${intradayError}). Showing daily candles instead.`,
        className: "text-destructive",
      };
    }
    if (isIntradayActive) {
      const rangeLabel = intradayRange ? ` (${intradayRange.toUpperCase()})` : "";
      return {
        text: `Intraday feed${rangeLabel} using ${candleInterval.toUpperCase()} candles.`,
        className: "text-muted-foreground",
      };
    }
    return {
      text: "Intraday feed not available. Showing daily candles.",
      className: "text-muted-foreground",
    };
  })();

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>{symbol} Price Chart</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap gap-1">
                {timeRanges.map((range) => (
                  <Button
                    key={range}
                    variant={selectedRange === rangeMap[range] ? "default" : "ghost"}
                    size="sm"
                    className="text-xs"
                    onClick={() => onRangeChange(rangeMap[range])}
                  >
                    {range}
                  </Button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1">
                {intervalOptions.map((option) => (
                  <Button
                    key={option.value}
                    variant={candleInterval === option.value ? "default" : "ghost"}
                    size="sm"
                    className="text-xs"
                    onClick={() => onCandleIntervalChange(option.value)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {intradayStatus && (
            <div className={`text-xs ${intradayStatus.className}`}>{intradayStatus.text}</div>
          )}

          {hasSupertrend && supertrendMeta && (
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span>
                <span className="font-semibold text-foreground">Target Factor:</span> {supertrendMeta.targetFactor.toFixed(2)}
              </span>
              <span>
                <span className="font-semibold text-foreground">Performance Index:</span> {supertrendMeta.performanceIndex.toFixed(4)}
              </span>
              {supertrendMeta.clusterDiagnostics?.Best && (
                <span>
                  <span className="font-semibold text-foreground">Best Cluster Avg:</span> {supertrendMeta.clusterDiagnostics.Best.avgPerformance.toFixed(2)}
                </span>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 12, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                type="category"
                scale="point"
                allowDuplicatedCategory={false}
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
                domain={["auto", "auto"]}
              />
              <Tooltip content={renderTooltip} />
              <Legend wrapperStyle={{ fontSize: 10 }} payload={legendPayload} />

              <Bar
                dataKey="price"
                name="Candlestick"
                fill="transparent"
                shape={CandleShape}
                isAnimationActive={false}
                maxBarSize={18}
              />

              <Line
                type="monotone"
                dataKey="price"
                stroke="hsl(var(--primary))"
                strokeWidth={1}
                strokeOpacity={0.4}
                dot={false}
                name={`${symbol} Close`}
              />

              {hasSupertrend && (
                <>
                  <Line
                    type="monotone"
                    dataKey="trailLong"
                    stroke="#22c55e"
                    strokeWidth={2.5}
                    dot={false}
                    connectNulls={false}
                    name="SuperTrend (Bullish)"
                  />
                  <Line
                    type="monotone"
                    dataKey="trailShort"
                    stroke="#f43f5e"
                    strokeWidth={2.5}
                    dot={false}
                    connectNulls={false}
                    name="SuperTrend (Bearish)"
                  />
                  <Line
                    type="monotone"
                    dataKey="ama"
                    stroke="#a855f7"
                    strokeWidth={2}
                    strokeDasharray="4 2"
                    dot={false}
                    connectNulls
                    name="Adaptive MA"
                  />
                  <Line
                    type="monotone"
                    dataKey="atrUpper"
                    stroke="#0ea5e9"
                    strokeWidth={1}
                    strokeDasharray="5 4"
                    dot={false}
                    connectNulls
                    name="ATR Trail Upper"
                  />
                  <Line
                    type="monotone"
                    dataKey="atrLower"
                    stroke="#0ea5e9"
                    strokeWidth={1}
                    strokeDasharray="5 4"
                    dot={false}
                    connectNulls
                    name="ATR Trail Lower"
                  />
                  <Line
                    type="monotone"
                    dataKey="upperBand"
                    stroke="#f97316"
                    strokeWidth={1}
                    strokeDasharray="6 2"
                    dot={false}
                    connectNulls
                    name="Upper Band"
                  />
                  <Line
                    type="monotone"
                    dataKey="lowerBand"
                    stroke="#ef4444"
                    strokeWidth={1}
                    strokeDasharray="6 2"
                    dot={false}
                    connectNulls
                    name="Lower Band"
                  />
                  <Scatter
                    name="Buy Signal"
                    dataKey="buySignal"
                    fill="#10b981"
                    shape="triangle"
                  />
                  <Scatter
                    name="Sell Signal"
                    dataKey="sellSignal"
                    fill="#ef4444"
                    shape="triangle"
                  />
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
