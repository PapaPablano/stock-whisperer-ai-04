import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "recharts";
import type { TooltipProps } from "recharts";
import type { ValueType, NameType } from "recharts/types/component/DefaultTooltipContent";
import { useMemo } from "react";

interface VolumeChartProps {
  data: Array<{ date: string; volume: number; change: number }>;
  showMA?: boolean;
  maPeriod?: number;
}

type ChartDatum = {
  date: string;
  volume: number;
  change: number;
  volumeMA: number | null;
  color: string;
};

const CustomTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
  if (active && payload && payload.length) {
    const volumeData = payload.find((p) => p.dataKey === "volume");
    const maData = payload.find((p) => p.dataKey === "volumeMA");

    const volumeValue =
      typeof volumeData?.value === "number"
        ? volumeData.value.toLocaleString()
        : typeof volumeData?.value === "string"
          ? volumeData.value
          : null;

    const maValue =
      typeof maData?.value === "number"
        ? Math.round(maData.value).toLocaleString()
        : null;

    return (
      <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
        <p className="text-muted-foreground text-xs mb-2">{label}</p>
        {volumeValue && (
          <p className="text-sm font-medium">
            <span className="text-muted-foreground">Volume: </span>
            <span className="text-foreground">{volumeValue}</span>
          </p>
        )}
        {maValue && (
          <p className="text-sm font-medium">
            <span className="text-muted-foreground">MA: </span>
            <span className="text-purple-400">{maValue}</span>
          </p>
        )}
      </div>
    );
  }
  return null;
};

export const VolumeChart = ({ data, showMA = true, maPeriod = 20 }: VolumeChartProps) => {
  // Calculate volume moving average
  const chartData = useMemo<ChartDatum[]>(() => {
    return data.map((item, index) => {
      let volumeMA: number | null = null;

      if (showMA && index >= maPeriod - 1) {
        const sum = data
          .slice(index - maPeriod + 1, index + 1)
          .reduce((acc, curr) => acc + curr.volume, 0);
        volumeMA = sum / maPeriod;
      }

      return {
        ...item,
        volumeMA,
        color: item.change >= 0 ? '#10b981' : '#ef4444',
      };
    });
  }, [data, showMA, maPeriod]);

  // Format large numbers for Y-axis
  const formatYAxis = (value: number) => {
    if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`;
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span>Trading Volume</span>
          {showMA && (
            <span className="text-xs text-muted-foreground font-normal">
              with {maPeriod}-period MA
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis 
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={formatYAxis}
              />
              <Tooltip content={<CustomTooltip />} />
              {showMA && <Legend />}
              
              {/* Volume bars with color coding */}
              <Bar 
                dataKey="volume" 
                name="Volume"
                radius={[4, 4, 0, 0]}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.change >= 0 ? '#10b98180' : '#ef444480'}
                  />
                ))}
              </Bar>
              
              {/* Volume MA line */}
              {showMA && (
                <Line 
                  type="monotone" 
                  dataKey="volumeMA" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  dot={false}
                  name={`Volume MA(${maPeriod})`}
                  connectNulls
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        
        {/* Legend explanation */}
        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-green-500/50" />
            <span>Up day</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-500/50" />
            <span>Down day</span>
          </div>
          {showMA && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-purple-500" />
              <span>{maPeriod}-day average</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
