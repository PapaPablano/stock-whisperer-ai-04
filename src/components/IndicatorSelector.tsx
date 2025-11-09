import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { TrendingUp, Activity, BarChart3, Volume2 } from 'lucide-react';

export interface IndicatorConfig {
  // Trend Indicators
  sma20?: boolean;
  sma50?: boolean;
  sma200?: boolean;
  ema12?: boolean;
  ema26?: boolean;
  ema50?: boolean;
  
  // Momentum Indicators
  rsi?: boolean;
  macd?: boolean;
  stochastic?: boolean;
  
  // Volatility Indicators
  bollingerBands?: boolean;
  atr?: boolean;
  keltnerChannel?: boolean;
  
  // Volume Indicators
  obv?: boolean;
  vroc?: boolean;
  mfi?: boolean;
  adx?: boolean;
}

interface IndicatorSelectorProps {
  selectedIndicators: IndicatorConfig;
  onChange: (indicators: IndicatorConfig) => void;
}

export function IndicatorSelector({ selectedIndicators, onChange }: IndicatorSelectorProps) {
  const handleToggle = (key: keyof IndicatorConfig) => {
    onChange({
      ...selectedIndicators,
      [key]: !selectedIndicators[key],
    });
  };

  const countSelected = (keys: (keyof IndicatorConfig)[]) => {
    return keys.filter(key => selectedIndicators[key]).length;
  };

  const trendIndicators: { key: keyof IndicatorConfig; label: string; description: string }[] = [
    { key: 'sma20', label: 'SMA 20', description: '20-period Simple Moving Average' },
    { key: 'sma50', label: 'SMA 50', description: '50-period Simple Moving Average' },
    { key: 'sma200', label: 'SMA 200', description: '200-period Simple Moving Average' },
    { key: 'ema12', label: 'EMA 12', description: '12-period Exponential Moving Average' },
    { key: 'ema26', label: 'EMA 26', description: '26-period Exponential Moving Average' },
    { key: 'ema50', label: 'EMA 50', description: '50-period Exponential Moving Average' },
  ];

  const momentumIndicators: { key: keyof IndicatorConfig; label: string; description: string }[] = [
    { key: 'rsi', label: 'RSI (14)', description: 'Relative Strength Index' },
    { key: 'macd', label: 'MACD', description: 'Moving Average Convergence Divergence' },
    { key: 'stochastic', label: 'Stochastic', description: 'Stochastic Oscillator' },
  ];

  const volatilityIndicators: { key: keyof IndicatorConfig; label: string; description: string }[] = [
    { key: 'bollingerBands', label: 'Bollinger Bands', description: 'Standard deviation bands' },
    { key: 'atr', label: 'ATR (14)', description: 'Average True Range' },
    { key: 'keltnerChannel', label: 'Keltner Channel', description: 'Volatility-based channel' },
  ];

  const volumeIndicators: { key: keyof IndicatorConfig; label: string; description: string }[] = [
    { key: 'obv', label: 'OBV', description: 'On-Balance Volume' },
    { key: 'vroc', label: 'VROC (14)', description: 'Volume Rate of Change' },
    { key: 'mfi', label: 'MFI (14)', description: 'Money Flow Index' },
    { key: 'adx', label: 'ADX (14)', description: 'Average Directional Index' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Technical Indicators
          <Badge variant="secondary">
            {countSelected([
              ...trendIndicators.map(i => i.key),
              ...momentumIndicators.map(i => i.key),
              ...volatilityIndicators.map(i => i.key),
              ...volumeIndicators.map(i => i.key),
            ])} selected
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="w-full" defaultValue={['trend', 'momentum']}>
          {/* Trend Indicators */}
          <AccordionItem value="trend">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                <span>Trend Indicators</span>
                <Badge variant="outline" className="ml-2">
                  {countSelected(trendIndicators.map(i => i.key))}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 pt-2">
                {trendIndicators.map(({ key, label, description }) => (
                  <div key={key} className="flex items-start space-x-3">
                    <Checkbox
                      id={key}
                      checked={selectedIndicators[key]}
                      onCheckedChange={() => handleToggle(key)}
                    />
                    <div className="grid gap-1.5 leading-none flex-1">
                      <Label
                        htmlFor={key}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {label}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Momentum Indicators */}
          <AccordionItem value="momentum">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-purple-500" />
                <span>Momentum Indicators</span>
                <Badge variant="outline" className="ml-2">
                  {countSelected(momentumIndicators.map(i => i.key))}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 pt-2">
                {momentumIndicators.map(({ key, label, description }) => (
                  <div key={key} className="flex items-start space-x-3">
                    <Checkbox
                      id={key}
                      checked={selectedIndicators[key]}
                      onCheckedChange={() => handleToggle(key)}
                    />
                    <div className="grid gap-1.5 leading-none flex-1">
                      <Label
                        htmlFor={key}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {label}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Volatility Indicators */}
          <AccordionItem value="volatility">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-orange-500" />
                <span>Volatility Indicators</span>
                <Badge variant="outline" className="ml-2">
                  {countSelected(volatilityIndicators.map(i => i.key))}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 pt-2">
                {volatilityIndicators.map(({ key, label, description }) => (
                  <div key={key} className="flex items-start space-x-3">
                    <Checkbox
                      id={key}
                      checked={selectedIndicators[key]}
                      onCheckedChange={() => handleToggle(key)}
                    />
                    <div className="grid gap-1.5 leading-none flex-1">
                      <Label
                        htmlFor={key}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {label}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Volume Indicators */}
          <AccordionItem value="volume">
            <AccordionTrigger>
              <div className="flex items-center gap-2">
                <Volume2 className="h-4 w-4 text-green-500" />
                <span>Volume Indicators</span>
                <Badge variant="outline" className="ml-2">
                  {countSelected(volumeIndicators.map(i => i.key))}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 pt-2">
                {volumeIndicators.map(({ key, label, description }) => (
                  <div key={key} className="flex items-start space-x-3">
                    <Checkbox
                      id={key}
                      checked={selectedIndicators[key]}
                      onCheckedChange={() => handleToggle(key)}
                    />
                    <div className="grid gap-1.5 leading-none flex-1">
                      <Label
                        htmlFor={key}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {label}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
