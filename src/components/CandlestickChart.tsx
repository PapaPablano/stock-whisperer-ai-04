import { useState, useMemo } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { TooltipProps } from 'recharts';
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';
import { Button } from '@/components/ui/button';

export interface OHLCData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface CandlestickChartProps {
  data: OHLCData[];
  height?: number;
  showVolume?: boolean;
  onTimeFrameChange?: (timeFrame: TimeFrame) => void;
}

export type TimeFrame = '1D' | '5D' | '1M' | '3M' | '6M' | '1Y' | '5Y' | 'MAX';

type CandlestickPayload = OHLCData & {
  dateLabel: string;
  range: [number, number];
  body: [number, number];
  volumeMA?: number | null;
};

interface CandlestickBarProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: CandlestickPayload;
}

// Custom Candlestick Shape Component
const CandlestickBar = ({ x, y, width, height, payload }: CandlestickBarProps) => {
  if (
    payload === undefined ||
    x === undefined ||
    y === undefined ||
    width === undefined ||
    height === undefined
  ) {
    return null;
  }

  const { open, close, high, low } = payload;
  
  const isPositive = close >= open;
  const color = isPositive ? '#10b981' : '#ef4444';
  const candleWidth = Math.max(width * 0.6, 4);
  const xCenter = x + width / 2;
  
  // Calculate positions
  const topPrice = Math.max(open, close);
  const bottomPrice = Math.min(open, close);
  const yScale = height / (high - low);
  
  const candleTop = y + (high - topPrice) * yScale;
  const candleHeight = Math.abs((topPrice - bottomPrice) * yScale);
  const wickTop = y;
  const wickBottom = y + height;
  
  return (
    <g>
      {/* High-Low Wick */}
      <line
        x1={xCenter}
        y1={wickTop}
        x2={xCenter}
        y2={wickBottom}
        stroke={color}
        strokeWidth={1}
      />
      {/* Open-Close Body */}
      <rect
        x={xCenter - candleWidth / 2}
        y={candleTop}
        width={candleWidth}
        height={Math.max(candleHeight, 1)}
        fill={color}
        stroke={color}
        strokeWidth={1}
      />
    </g>
  );
};

const CustomTooltip = ({ active, payload }: TooltipProps<ValueType, NameType>) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as CandlestickPayload;
    const isPositive = data.close >= data.open;
    const change = data.close - data.open;
    const changePercent = ((change / data.open) * 100).toFixed(2);
    
    return (
      <div className="bg-gray-900 border border-gray-700 p-3 rounded-lg shadow-lg">
        <p className="text-gray-400 text-xs mb-2">{new Date(data.time).toLocaleString()}</p>
        <div className="space-y-1 text-sm">
          <p className="flex justify-between gap-4">
            <span className="text-gray-400">Open:</span>
            <span className="text-white font-medium">${data.open.toFixed(2)}</span>
          </p>
          <p className="flex justify-between gap-4">
            <span className="text-gray-400">High:</span>
            <span className="text-green-400 font-medium">${data.high.toFixed(2)}</span>
          </p>
          <p className="flex justify-between gap-4">
            <span className="text-gray-400">Low:</span>
            <span className="text-red-400 font-medium">${data.low.toFixed(2)}</span>
          </p>
          <p className="flex justify-between gap-4">
            <span className="text-gray-400">Close:</span>
            <span className="text-white font-medium">${data.close.toFixed(2)}</span>
          </p>
          <p className="flex justify-between gap-4">
            <span className="text-gray-400">Change:</span>
            <span className={isPositive ? 'text-green-400' : 'text-red-400'}>
              {isPositive ? '+' : ''}{change.toFixed(2)} ({changePercent}%)
            </span>
          </p>
          {data.volume && (
            <p className="flex justify-between gap-4">
              <span className="text-gray-400">Volume:</span>
              <span className="text-white font-medium">{data.volume.toLocaleString()}</span>
            </p>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export function CandlestickChart({ 
  data, 
  height = 500,
  showVolume = true,
  onTimeFrameChange
}: CandlestickChartProps) {
  const [selectedTimeFrame, setSelectedTimeFrame] = useState<TimeFrame>('1M');

  const timeFrames: TimeFrame[] = ['1D', '5D', '1M', '3M', '6M', '1Y', '5Y', 'MAX'];

  // Process data for visualization
  const chartData = useMemo(() => {
    return data.map(item => ({
      ...item,
      dateLabel: new Date(item.time).toLocaleDateString(),
      range: [item.low, item.high],
      body: [Math.min(item.open, item.close), Math.max(item.open, item.close)],
    }));
  }, [data]);

  const handleTimeFrameChange = (timeFrame: TimeFrame) => {
    setSelectedTimeFrame(timeFrame);
    onTimeFrameChange?.(timeFrame);
  };

  // Calculate volume moving average (20-period)
  const volumeMA = useMemo(() => {
    if (!showVolume || !data.some(d => d.volume)) return [] as Array<number | null>;

    const period = 20;
    return data.map((_, index) => {
      if (index < period - 1) return null;
      const sum = data
        .slice(index - period + 1, index + 1)
        .reduce((acc, d) => acc + (d.volume ?? 0), 0);
      return sum / period;
    });
  }, [data, showVolume]);

  const chartDataWithVolumeMA = useMemo(() => {
    if (volumeMA.length === 0) return chartData;
    return chartData.map((item, index) => ({
      ...item,
      volumeMA: volumeMA[index] ?? null,
    }));
  }, [chartData, volumeMA]);

  return (
    <div className="w-full">
      {/* Timeframe selector */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {timeFrames.map(tf => (
          <Button
            key={tf}
            variant={selectedTimeFrame === tf ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleTimeFrameChange(tf)}
            className="min-w-[60px]"
          >
            {tf}
          </Button>
        ))}
      </div>

      {/* Candlestick Chart */}
      <div className="w-full rounded-lg border border-gray-800 p-4 bg-gray-950">
        <ResponsiveContainer width="100%" height={showVolume ? height * 0.7 : height}>
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
            <XAxis 
              dataKey="dateLabel" 
              stroke="#6b7280"
              tick={{ fill: '#9ca3af', fontSize: 12 }}
            />
            <YAxis 
              domain={['dataMin - 5', 'dataMax + 5']} 
              stroke="#6b7280"
              tick={{ fill: '#9ca3af', fontSize: 12 }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            
            {/* Render candlesticks using Line chart as workaround */}
            <Bar 
              dataKey="high" 
              fill="transparent"
              shape={<CandlestickBar />}
              name="Price"
            />
          </ComposedChart>
        </ResponsiveContainer>

        {/* Volume Chart */}
        {showVolume && (
          <ResponsiveContainer width="100%" height={height * 0.3} className="mt-4">
            <ComposedChart data={chartDataWithVolumeMA}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis 
                dataKey="dateLabel" 
                stroke="#6b7280"
                tick={{ fill: '#9ca3af', fontSize: 12 }}
              />
              <YAxis 
                stroke="#6b7280"
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                tickFormatter={(value) => {
                  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
                  return value.toString();
                }}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                labelStyle={{ color: '#9ca3af' }}
              />
              <Bar dataKey="volume" name="Volume">
                {chartDataWithVolumeMA.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.close >= entry.open ? '#10b98180' : '#ef444480'} 
                  />
                ))}
              </Bar>
              {volumeMA.length > 0 && (
                <Line 
                  type="monotone" 
                  dataKey="volumeMA" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  dot={false}
                  name="Volume MA(20)"
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Chart info */}
      <div className="mt-2 text-xs text-gray-500">
        <p>Candlestick chart showing OHLC data with volume indicator</p>
      </div>
    </div>
  );
}
