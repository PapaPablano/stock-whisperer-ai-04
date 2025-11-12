import { useMlSignal } from '@/hooks/useMlSignal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, MinusCircle } from 'lucide-react';

interface SignalDisplayProps {
  symbol: string;
}

const getSignalStyles = (signal: 'Buy' | 'Sell' | 'Hold') => {
  switch (signal) {
    case 'Buy':
      return {
        Icon: TrendingUp,
        color: 'text-green-500',
        bgColor: 'bg-green-100 dark:bg-green-900',
        text: 'Strong Buy Signal',
      };
    case 'Sell':
      return {
        Icon: TrendingDown,
        color: 'text-red-500',
        bgColor: 'bg-red-100 dark:bg-red-900',
        text: 'Strong Sell Signal',
      };
    case 'Hold':
    default:
      return {
        Icon: MinusCircle,
        color: 'text-gray-500 dark:text-gray-400',
        bgColor: 'bg-gray-100 dark:bg-gray-800',
        text: 'Hold Signal',
      };
  }
};

export const SignalWidget = ({ symbol }: SignalDisplayProps) => {
  const { data: signalData, isLoading, isError, error } = useMlSignal(symbol);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI Signal</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-24">
          <p>Analyzing...</p>
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>AI Signal</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-24">
          <p className="text-red-500">Error: {error.message}</p>
        </CardContent>
      </Card>
    );
  }

  if (!signalData) {
    return null;
  }

  const { Icon, color, bgColor, text } = getSignalStyles(signalData.signal);

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Signal</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`p-4 rounded-lg flex items-center space-x-4 ${bgColor}`}>
          <Icon className={`w-10 h-10 ${color}`} />
          <div>
            <p className={`text-xl font-bold ${color}`}>{text}</p>
            <p className="text-sm text-muted-foreground">
              Based on RSI ({signalData.rsi.toFixed(2)})
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
