import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
} from 'recharts';
import {
  calculateSMA,
  calculateEMA,
  calculateBollingerBands,
  calculateKeltnerChannel,
  PriceData,
} from '@/lib/technicalIndicators';
import type { IndicatorConfig } from './IndicatorSelector';

interface EnhancedPriceChartProps {
  symbol: string;
  data: PriceData[];
  indicators: IndicatorConfig;
}

export function EnhancedPriceChart({ symbol, data, indicators }: EnhancedPriceChartProps) {
  const chartData = useMemo(() => {
    const closes = data.map(d => d.close);
    
    // Calculate selected indicators
    const sma20 = indicators.sma20 ? calculateSMA(closes, 20) : [];
    const sma50 = indicators.sma50 ? calculateSMA(closes, 50) : [];
    const sma200 = indicators.sma200 ? calculateSMA(closes, 200) : [];
    const ema12 = indicators.ema12 ? calculateEMA(closes, 12) : [];
    const ema26 = indicators.ema26 ? calculateEMA(closes, 26) : [];
    const ema50 = indicators.ema50 ? calculateEMA(closes, 50) : [];
    
    const bollingerBands = indicators.bollingerBands
      ? calculateBollingerBands(closes, 20, 2)
      : null;
    
    const keltnerChannel = indicators.keltnerChannel
      ? calculateKeltnerChannel(data, 20, 10, 2)
      : null;
    
    return data.map((item, index) => {
      const date = new Date(item.date);
      return {
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }),
        close: item.close,
        ...(indicators.sma20 && { sma20: sma20[index] }),
        ...(indicators.sma50 && { sma50: sma50[index] }),
        ...(indicators.sma200 && { sma200: sma200[index] }),
        ...(indicators.ema12 && { ema12: ema12[index] }),
        ...(indicators.ema26 && { ema26: ema26[index] }),
        ...(indicators.ema50 && { ema50: ema50[index] }),
        ...(bollingerBands && {
          bbUpper: bollingerBands.upper[index],
          bbMiddle: bollingerBands.middle[index],
          bbLower: bollingerBands.lower[index],
        }),
        ...(keltnerChannel && {
          kcUpper: keltnerChannel.upper[index],
          kcMiddle: keltnerChannel.middle[index],
          kcLower: keltnerChannel.lower[index],
        }),
      };
    });
  }, [data, indicators]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <p className="text-muted-foreground text-xs mb-2">{payload[0].payload.date}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              <span className="font-medium">{entry.name}:</span> ${entry.value?.toFixed(2)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{symbol} - Price with Technical Indicators</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
            <XAxis
              dataKey="date"
              tick={{ fill: '#9ca3af', fontSize: 12 }}
            />
            <YAxis
              tick={{ fill: '#9ca3af', fontSize: 12 }}
              domain={['dataMin - 5', 'dataMax + 5']}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />

            {/* Bollinger Bands */}
            {indicators.bollingerBands && (
              <>
                <Line
                  type="monotone"
                  dataKey="bbUpper"
                  stroke="#ef4444"
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  dot={false}
                  name="BB Upper"
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="bbMiddle"
                  stroke="#6b7280"
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  dot={false}
                  name="BB Middle"
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="bbLower"
                  stroke="#10b981"
                  strokeWidth={1}
                  strokeDasharray="5 5"
                  dot={false}
                  name="BB Lower"
                  connectNulls
                />
              </>
            )}

            {/* Keltner Channel */}
            {indicators.keltnerChannel && (
              <>
                <Line
                  type="monotone"
                  dataKey="kcUpper"
                  stroke="#f59e0b"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  dot={false}
                  name="KC Upper"
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="kcMiddle"
                  stroke="#f59e0b"
                  strokeWidth={1}
                  dot={false}
                  name="KC Middle"
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="kcLower"
                  stroke="#f59e0b"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  dot={false}
                  name="KC Lower"
                  connectNulls
                />
              </>
            )}

            {/* Price Line */}
            <Line
              type="monotone"
              dataKey="close"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
              name="Close"
            />

            {/* Moving Averages */}
            {indicators.sma20 && (
              <Line
                type="monotone"
                dataKey="sma20"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                name="SMA 20"
                connectNulls
              />
            )}
            {indicators.sma50 && (
              <Line
                type="monotone"
                dataKey="sma50"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
                name="SMA 50"
                connectNulls
              />
            )}
            {indicators.sma200 && (
              <Line
                type="monotone"
                dataKey="sma200"
                stroke="#ef4444"
                strokeWidth={2}
                dot={false}
                name="SMA 200"
                connectNulls
              />
            )}
            {indicators.ema12 && (
              <Line
                type="monotone"
                dataKey="ema12"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={false}
                name="EMA 12"
                connectNulls
              />
            )}
            {indicators.ema26 && (
              <Line
                type="monotone"
                dataKey="ema26"
                stroke="#ec4899"
                strokeWidth={2}
                dot={false}
                name="EMA 26"
                connectNulls
              />
            )}
            {indicators.ema50 && (
              <Line
                type="monotone"
                dataKey="ema50"
                stroke="#06b6d4"
                strokeWidth={2}
                dot={false}
                name="EMA 50"
                connectNulls
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
