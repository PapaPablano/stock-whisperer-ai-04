import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';

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
        <ResponsiveContainer width="100%" height={150}>
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#9ca3af', fontSize: 10 }}
              height={20}
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
        <ResponsiveContainer width="100%" height={150}>
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#9ca3af', fontSize: 10 }}
              height={20}
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
        <ResponsiveContainer width="100%" height={150}>
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#9ca3af', fontSize: 10 }}
              height={20}
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
        <ResponsiveContainer width="100%" height={120}>
          <ComposedChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#9ca3af', fontSize: 10 }}
              height={20}
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
