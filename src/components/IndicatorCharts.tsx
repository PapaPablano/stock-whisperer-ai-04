import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ComposedChart,
  Line,
  Bar,
  Area,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import type { SuperTrendAIInfo, TrendDirection } from '../lib/superTrendAI';

// Utility function to calculate appropriate X-axis tick interval based on data length
// This ensures readable date labels regardless of the selected time range
const getTickInterval = (dataLength: number): number => {
  if (dataLength <= 30) return 0; // Show all ticks for 1 month or less
  if (dataLength <= 90) return Math.floor(dataLength / 10); // ~10 ticks for 3 months
  if (dataLength <= 180) return Math.floor(dataLength / 8); // ~8 ticks for 6 months
  if (dataLength <= 365) return Math.floor(dataLength / 10); // ~10 ticks for 1 year
  return Math.floor(dataLength / 12); // ~12 ticks for 5 years
};

interface RSIChartProps {
  data: Array<{
    date: string;
    rsi: number | null;
  }>;
}

export function RSIChart({ data }: RSIChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">RSI (14) - Relative Strength Index</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
            <XAxis
              dataKey="date"
              type="category"
              scale="point"
              allowDuplicatedCategory={false}
              tick={{ fill: '#9ca3af', fontSize: 10 }}
              height={30}
              angle={-45}
              textAnchor="end"
              interval={getTickInterval(data.length)}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: '#9ca3af', fontSize: 10 }}
              width={40}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '6px',
              }}
            />
            
            {/* Overbought zone (70-100) */}
            <ReferenceArea
              y1={70}
              y2={100}
              fill="#ef4444"
              fillOpacity={0.1}
              label={{ value: 'Overbought', position: 'insideTopRight', fill: '#ef4444', fontSize: 10 }}
            />
            
            {/* Oversold zone (0-30) */}
            <ReferenceArea
              y1={0}
              y2={30}
              fill="#10b981"
              fillOpacity={0.1}
              label={{ value: 'Oversold', position: 'insideBottomRight', fill: '#10b981', fontSize: 10 }}
            />
            
            {/* Reference lines */}
            <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" />
            <ReferenceLine y={50} stroke="#6b7280" strokeDasharray="3 3" />
            <ReferenceLine y={30} stroke="#10b981" strokeDasharray="3 3" />
            
            <Line
              type="monotone"
              dataKey="rsi"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={false}
              name="RSI"
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

interface MACDChartProps {
  data: Array<{
    date: string;
    macd: number | null;
    signal: number | null;
    histogram: number | null;
  }>;
}

export function MACDChart({ data }: MACDChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">MACD - Moving Average Convergence Divergence</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
            <XAxis
              dataKey="date"
              type="category"
              scale="point"
              allowDuplicatedCategory={false}
              tick={{ fill: '#9ca3af', fontSize: 10 }}
              height={30}
              angle={-45}
              textAnchor="end"
              interval={getTickInterval(data.length)}
            />
            <YAxis
              tick={{ fill: '#9ca3af', fontSize: 10 }}
              width={40}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '6px',
              }}
            />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            
            <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="3 3" />
            
            <Bar
              dataKey="histogram"
              fill="#3b82f6"
              opacity={0.6}
              name="Histogram"
            />
            <Line
              type="monotone"
              dataKey="macd"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
              name="MACD"
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="signal"
              stroke="#ef4444"
              strokeWidth={2}
              dot={false}
              name="Signal"
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

interface StochasticChartProps {
  data: Array<{
    date: string;
    k: number | null;
    d: number | null;
  }>;
}

export function StochasticChart({ data }: StochasticChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Stochastic Oscillator</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
            <XAxis
              dataKey="date"
              type="category"
              scale="point"
              allowDuplicatedCategory={false}
              tick={{ fill: '#9ca3af', fontSize: 10 }}
              height={30}
              angle={-45}
              textAnchor="end"
              interval={getTickInterval(data.length)}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: '#9ca3af', fontSize: 10 }}
              width={40}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '6px',
              }}
            />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            
            {/* Overbought zone (80-100) */}
            <ReferenceArea
              y1={80}
              y2={100}
              fill="#ef4444"
              fillOpacity={0.1}
              label={{ value: 'Overbought', position: 'insideTopRight', fill: '#ef4444', fontSize: 10 }}
            />
            
            {/* Oversold zone (0-20) */}
            <ReferenceArea
              y1={0}
              y2={20}
              fill="#10b981"
              fillOpacity={0.1}
              label={{ value: 'Oversold', position: 'insideBottomRight', fill: '#10b981', fontSize: 10 }}
            />
            
            <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="3 3" />
            <ReferenceLine y={50} stroke="#6b7280" strokeDasharray="3 3" />
            <ReferenceLine y={20} stroke="#10b981" strokeDasharray="3 3" />
            
            <Line
              type="monotone"
              dataKey="k"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={false}
              name="%K"
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="d"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={false}
              name="%D"
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

interface KDJChartProps {
  data: Array<{
    date: string;
    k: number | null;
    d: number | null;
    j: number | null;
  }>;
}

export function KDJChart({ data }: KDJChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">KDJ (9) - Stochastic with J Line</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
            <XAxis
              dataKey="date"
              type="category"
              scale="point"
              allowDuplicatedCategory={false}
              tick={{ fill: '#9ca3af', fontSize: 10 }}
              height={30}
              angle={-45}
              textAnchor="end"
              interval={getTickInterval(data.length)}
            />
            <YAxis
              domain={['dataMin - 10', 'dataMax + 10']}
              tick={{ fill: '#9ca3af', fontSize: 10 }}
              width={40}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '6px',
              }}
            />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            
            {/* Overbought zone (80-100) */}
            <ReferenceArea
              y1={80}
              y2={100}
              fill="#ef4444"
              fillOpacity={0.1}
              label={{ value: 'Overbought', position: 'insideTopRight', fill: '#ef4444', fontSize: 10 }}
            />
            
            {/* Oversold zone (0-20) */}
            <ReferenceArea
              y1={0}
              y2={20}
              fill="#10b981"
              fillOpacity={0.1}
              label={{ value: 'Oversold', position: 'insideBottomRight', fill: '#10b981', fontSize: 10 }}
            />
            
            <ReferenceLine y={80} stroke="#ef4444" strokeDasharray="3 3" />
            <ReferenceLine y={50} stroke="#6b7280" strokeDasharray="3 3" />
            <ReferenceLine y={20} stroke="#10b981" strokeDasharray="3 3" />
            
            <Line
              type="monotone"
              dataKey="k"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              name="K Line"
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="d"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={false}
              name="D Line"
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="j"
              stroke="#ec4899"
              strokeWidth={2}
              dot={false}
              name="J Line (Sensitive)"
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

interface VolumeIndicatorChartProps {
  data: Array<{
    date: string;
    value: number | null;
  }>;
  title: string;
  color?: string;
}

export function VolumeIndicatorChart({ data, title, color = '#3b82f6' }: VolumeIndicatorChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={180}>
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
            <XAxis
              dataKey="date"
              type="category"
              scale="point"
              allowDuplicatedCategory={false}
              tick={{ fill: '#9ca3af', fontSize: 10 }}
              height={30}
              angle={-45}
              textAnchor="end"
              interval={getTickInterval(data.length)}
            />
            <YAxis
              tick={{ fill: '#9ca3af', fontSize: 10 }}
              width={40}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '6px',
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

interface SuperTrendAIChartProps {
  data: Array<{
    date: string;
    rawDate: string;
    close: number;
    supertrend: number | null;
    upperBand: number | null;
    lowerBand: number | null;
    ama: number | null;
    signal: TrendDirection;
    trend: TrendDirection;
    distance: number | null;
    atr: number | null;
  }>;
  meta: SuperTrendAIInfo | null;
  symbol: string;
}

export function SuperTrendAIChart({ data, meta, symbol }: SuperTrendAIChartProps) {
  const chartData = data.map((point) => ({
    ...point,
    buySignal: point.signal === 1 ? point.supertrend ?? point.close : null,
    sellSignal: point.signal === -1 ? point.supertrend ?? point.close : null,
    trailLong: point.trend === 1 ? point.supertrend : null,
    trailShort: point.trend === -1 ? point.supertrend : null,
    atrUpper: point.supertrend !== null && point.atr !== null ? point.supertrend + point.atr : null,
    atrLower: point.supertrend !== null && point.atr !== null ? point.supertrend - point.atr : null,
  }));

  const desiredLabel = meta?.fromCluster ?? 'Best';
  const fallbackLabel = meta && Object.keys(meta.clusterDiagnostics).length > 0
    ? Object.keys(meta.clusterDiagnostics)[0]
    : desiredLabel;
  const focusLabel = meta?.clusterDiagnostics?.[desiredLabel] ? desiredLabel : fallbackLabel;
  const focusCluster = meta?.clusterDiagnostics?.[focusLabel ?? desiredLabel];
  const bestCluster = meta?.clusterDiagnostics?.Best;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">
          SuperTrend AI — {symbol}
        </CardTitle>
        {meta && (
          <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-2 text-xs text-muted-foreground">
            <div>
              <span className="font-semibold text-foreground">Target Factor:</span>{' '}
              {meta.targetFactor.toFixed(2)}
            </div>
            <div>
              <span className="font-semibold text-foreground">Performance Index:</span>{' '}
              {meta.performanceIndex.toFixed(4)}
            </div>
            {bestCluster && (
              <div>
                <span className="font-semibold text-foreground">Best Cluster Avg Perf:</span>{' '}
                {bestCluster.avgPerformance.toFixed(2)}
              </div>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
            <XAxis
              dataKey="date"
              type="category"
              scale="point"
              allowDuplicatedCategory={false}
              tick={{ fill: '#9ca3af', fontSize: 10 }}
              height={30}
              angle={-45}
              textAnchor="end"
              interval={getTickInterval(chartData.length)}
            />
            <YAxis
              tick={{ fill: '#9ca3af', fontSize: 10 }}
              width={60}
              domain={["auto", "auto"]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '6px',
              }}
              labelFormatter={(label, payload) => payload?.[0]?.payload?.rawDate ?? label}
              formatter={(value: number | null | undefined, name) => {
                if (value === null || value === undefined) {
                  return ['—', name];
                }
                return [value.toFixed(2), name];
              }}
            />
            <Legend wrapperStyle={{ fontSize: 10 }} />

            <Area
              type="monotone"
              dataKey="distance"
              name="Distance"
              stroke="#94a3b8"
              fill="#94a3b820"
              strokeDasharray="4 4"
              dot={false}
              connectNulls
            />

            <Line
              type="monotone"
              dataKey="close"
              stroke="#38bdf8"
              strokeWidth={2}
              dot={false}
              name={`${symbol} Close`}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="trailLong"
              stroke="#22c55e"
              strokeWidth={3}
              dot={false}
              name="SuperTrend (Bullish)"
            />
            <Line
              type="monotone"
              dataKey="trailShort"
              stroke="#f43f5e"
              strokeWidth={3}
              dot={false}
              name="SuperTrend (Bearish)"
            />
            <Line
              type="monotone"
              dataKey="ama"
              stroke="#a855f7"
              strokeWidth={2}
              strokeDasharray="4 2"
              dot={false}
              name="Adaptive MA"
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="atrUpper"
              stroke="#0ea5e9"
              strokeWidth={1}
              strokeDasharray="5 4"
              dot={false}
              name="ATR Trail Upper"
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="atrLower"
              stroke="#0ea5e9"
              strokeWidth={1}
              strokeDasharray="5 4"
              dot={false}
              name="ATR Trail Lower"
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="upperBand"
              stroke="#f97316"
              strokeWidth={1}
              strokeDasharray="6 2"
              dot={false}
              name="Upper Band"
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="lowerBand"
              stroke="#ef4444"
              strokeWidth={1}
              strokeDasharray="6 2"
              dot={false}
              name="Lower Band"
              connectNulls
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
          </ComposedChart>
        </ResponsiveContainer>

        {meta && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-muted-foreground">
            <div className="space-y-1">
              <p className="text-foreground font-medium">Cluster Diagnostics</p>
              <p>
                Focus cluster: <span className="text-foreground font-semibold">{focusLabel}</span>
              </p>
              {focusCluster && (
                <p>
                  Factors in focus cluster: {focusCluster.factors.map(f => f.toFixed(2)).join(', ') || 'n/a'}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-foreground font-medium">Signal Activity</p>
              <p>
                Signals generated: {meta.signalMetrics.length}
              </p>
              <p>
                Cluster dispersion (best): {bestCluster ? bestCluster.dispersion.toFixed(3) : '—'}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
