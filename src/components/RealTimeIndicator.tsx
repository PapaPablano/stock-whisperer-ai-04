import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Activity, AlertCircle, Wifi, WifiOff } from "lucide-react";
import type { StreamStatus } from "@/hooks/useStockStream";

interface RealTimeIndicatorProps {
  status: StreamStatus;
  symbol?: string;
  dataSource?: string;
  showLabel?: boolean;
  error?: string | null;
}

const statusConfig: Record<StreamStatus, {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
  color: string;
  tooltip: string;
}> = {
  connecting: {
    icon: Activity,
    label: "Connecting",
    variant: "secondary",
    color: "text-yellow-500",
    tooltip: "Establishing connection to real-time data stream..."
  },
  connected: {
    icon: Wifi,
    label: "Live",
    variant: "default",
    color: "text-green-500",
    tooltip: "Connected to real-time data stream"
  },
  disconnected: {
    icon: WifiOff,
    label: "Offline",
    variant: "outline",
    color: "text-gray-500",
    tooltip: "Not connected to real-time stream"
  },
  error: {
    icon: AlertCircle,
    label: "Error",
    variant: "destructive",
    color: "text-red-500",
    tooltip: "Connection error - data may be delayed"
  }
};

/**
 * Indicator component showing real-time connection status
 * 
 * @example
 * const { status } = useStockStream({ symbols: ['AAPL'] });
 * <RealTimeIndicator status={status} symbol="AAPL" />
 */
export const RealTimeIndicator = ({ 
  status, 
  symbol, 
  dataSource,
  showLabel = true,
  error 
}: RealTimeIndicatorProps) => {
  const config = statusConfig[status];
  const Icon = config.icon;
  
  const tooltipMessage = error || config.tooltip;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={config.variant} className="gap-1.5">
            <Icon className={`h-3 w-3 ${config.color} ${status === 'connecting' ? 'animate-pulse' : ''}`} />
            {showLabel && <span>{config.label}</span>}
            {symbol && <span className="text-xs opacity-70">· {symbol}</span>}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-medium">{tooltipMessage}</p>
            {dataSource && (
              <p className="text-xs text-muted-foreground">
                Source: {dataSource}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

/**
 * Compact version showing only the icon
 */
export const CompactRealTimeIndicator = ({ status }: { status: StreamStatus }) => {
  return (
    <RealTimeIndicator 
      status={status} 
      showLabel={false}
    />
  );
};

/**
 * Data source badge showing which Alpaca feed is being used
 */
export const DataSourceBadge = ({ source }: { source: 'iex' | 'sip' | 'alpaca' | string }) => {
  const isRealtime = source.includes('iex') || source.includes('sip');
  const isPremium = source.includes('sip');
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={isPremium ? "default" : "secondary"} className="text-xs">
            {source.toUpperCase()}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-medium">
              {isPremium ? "Consolidated SIP Feed" : "IEX Exchange Feed"}
            </p>
            <p className="text-xs text-muted-foreground">
              {isPremium 
                ? "Real-time data from all exchanges" 
                : "Real-time data from IEX exchange"}
            </p>
            {!isRealtime && (
              <p className="text-xs text-muted-foreground">
                Data provided by Alpaca Markets
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
