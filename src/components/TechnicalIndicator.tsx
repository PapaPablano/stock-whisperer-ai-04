import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TechnicalIndicatorProps {
  name: string;
  value: number;
  signal: "bullish" | "bearish" | "neutral";
  description: string;
}

export const TechnicalIndicator = ({ name, value, signal, description }: TechnicalIndicatorProps) => {
  const getSignalColor = () => {
    if (signal === "bullish") return "bg-success text-success-foreground";
    if (signal === "bearish") return "bg-destructive text-destructive-foreground";
    return "bg-muted text-muted-foreground";
  };

  const getSignalText = () => {
    if (signal === "bullish") return "Bullish";
    if (signal === "bearish") return "Bearish";
    return "Neutral";
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">{name}</CardTitle>
          <Badge className={getSignalColor()}>{getSignalText()}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <p className="text-2xl font-bold tabular-nums">{value.toFixed(2)}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
};
