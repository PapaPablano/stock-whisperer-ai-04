import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Info, Database, Zap, TrendingUp } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AlpacaSettingsPanelProps {
  realTimeEnabled: boolean;
  onRealTimeToggle: (enabled: boolean) => void;
  newsEnabled: boolean;
  onNewsToggle: (enabled: boolean) => void;
  dataFeed?: 'iex' | 'sip';
}

/**
 * Settings panel for configuring Alpaca data features
 * Allows users to enable/disable real-time streaming and news feeds
 */
export const AlpacaSettingsPanel = ({
  realTimeEnabled,
  onRealTimeToggle,
  newsEnabled,
  onNewsToggle,
  dataFeed = 'iex',
}: AlpacaSettingsPanelProps) => {
  const isPremium = dataFeed === 'sip';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          <CardTitle>Data Settings</CardTitle>
        </div>
        <CardDescription>
          Configure real-time data and news from Alpaca Markets
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Data Feed Information */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Data Feed</Label>
            <Badge variant={isPremium ? "default" : "secondary"}>
              {dataFeed.toUpperCase()}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {isPremium 
              ? "Consolidated SIP feed with data from all exchanges"
              : "IEX exchange feed with real-time market data"}
          </p>
        </div>

        <Separator />

        {/* Real-Time Streaming */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-yellow-500" />
              <Label htmlFor="realtime" className="cursor-pointer">
                Real-Time Streaming
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">
                      Enable WebSocket streaming for live price updates. 
                      Uses more bandwidth but provides instant market data.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Switch
              id="realtime"
              checked={realTimeEnabled}
              onCheckedChange={onRealTimeToggle}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {realTimeEnabled 
              ? "✓ Live trades and quotes streaming"
              : "Using cached data with 45-second refresh"}
          </p>
        </div>

        <Separator />

        {/* News Feed */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <Label htmlFor="news" className="cursor-pointer">
                News Feed
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs">
                      Display real-time market news and analysis from multiple sources.
                      News updates every 5 minutes.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Switch
              id="news"
              checked={newsEnabled}
              onCheckedChange={onNewsToggle}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {newsEnabled 
              ? "✓ Real-time news and analysis enabled"
              : "News feed disabled"}
          </p>
        </div>

        {/* Supabase Integration Info */}
        <div className="rounded-lg bg-muted p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Database className="h-4 w-4 text-muted-foreground" />
            <p className="text-xs font-medium">Powered by Supabase</p>
          </div>
          <p className="text-xs text-muted-foreground">
            All data is processed through Supabase Edge Functions with intelligent caching.
            Real-time features use WebSocket connections for minimal latency.
          </p>
        </div>

        {/* Performance Tips */}
        <div className="space-y-2">
          <p className="text-xs font-medium">Performance Tips</p>
          <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
            <li>Disable real-time when analyzing multiple stocks</li>
            <li>News feed uses 5-minute caching for efficiency</li>
            <li>Quote data cached for 45 seconds by default</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Compact settings toggle for toolbar
 */
export const CompactAlpacaSettings = ({
  realTimeEnabled,
  onRealTimeToggle,
}: {
  realTimeEnabled: boolean;
  onRealTimeToggle: (enabled: boolean) => void;
}) => {
  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="compact-realtime" className="text-sm cursor-pointer">
        Real-Time
      </Label>
      <Switch
        id="compact-realtime"
        checked={realTimeEnabled}
        onCheckedChange={onRealTimeToggle}
      />
    </div>
  );
};
