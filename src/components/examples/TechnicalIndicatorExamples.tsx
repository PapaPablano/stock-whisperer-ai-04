import { useState } from 'react';
import { TechnicalAnalysisDashboard } from '@/components/TechnicalAnalysisDashboard';
import { IndicatorSelector, type IndicatorConfig } from '@/components/IndicatorSelector';
import { useStockHistorical } from '@/hooks/useStockHistorical';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { calculateRSI, calculateMACD, calculateSMA } from '@/lib/technicalIndicators';

/**
 * Example 1: Basic Usage with Default Indicators
 * Shows how to use the dashboard with minimal configuration
 */
export function BasicTechnicalAnalysis() {
  const { data, isLoading } = useStockHistorical('AAPL', '3mo');
  
  if (isLoading) return <div>Loading...</div>;
  if (!data) return <div>No data available</div>;

  return (
    <TechnicalAnalysisDashboard
      symbol="AAPL"
      data={data}
    />
  );
}

/**
 * Example 2: Custom Indicator Configuration
 * Shows how to customize which indicators are displayed
 */
export function CustomIndicatorConfig() {
  const { data } = useStockHistorical('TSLA', '6mo');
  
  // Custom configuration for momentum trading strategy
  const momentumTraderConfig: IndicatorConfig = {
    // No trend indicators
    sma20: false,
    sma50: false,
    sma200: false,
    ema12: false,
    ema26: false,
    ema50: false,
    
    // All momentum indicators
    rsi: true,
    macd: true,
    stochastic: true,
    
    // Volatility for risk management
    bollingerBands: true,
    atr: true,
    keltnerChannel: false,
    adx: false,
    
    // Volume confirmation
    obv: true,
    vroc: true,
    mfi: true,
  };

  return (
    <TechnicalAnalysisDashboard
      symbol="TSLA"
      data={data || []}
    />
  );
}

/**
 * Example 3: Indicator Presets
 * Shows how to implement preset configurations for different trading styles
 */
export function IndicatorPresets() {
  const [symbol, setSymbol] = useState('MSFT');
  const { data } = useStockHistorical(symbol, '3mo');
  
  const presets = {
    trendFollower: {
      sma20: true,
      sma50: true,
      sma200: true,
      ema12: false,
      ema26: false,
      ema50: true,
      rsi: false,
      macd: true,
      stochastic: false,
      bollingerBands: false,
      atr: false,
      keltnerChannel: false,
      adx: true,
      obv: true,
      vroc: false,
      mfi: false,
    } as IndicatorConfig,
    
    momentumTrader: {
      sma20: false,
      sma50: false,
      sma200: false,
      ema12: true,
      ema26: true,
      ema50: false,
      rsi: true,
      macd: true,
      stochastic: true,
      bollingerBands: false,
      atr: false,
      keltnerChannel: false,
      adx: false,
      obv: true,
      vroc: true,
      mfi: true,
    } as IndicatorConfig,
    
    volatilityTrader: {
      sma20: true,
      sma50: false,
      sma200: false,
      ema12: false,
      ema26: false,
      ema50: false,
      rsi: true,
      macd: false,
      stochastic: false,
      bollingerBands: true,
      atr: true,
      keltnerChannel: true,
      adx: false,
      obv: false,
      vroc: false,
      mfi: false,
    } as IndicatorConfig,
  };
  
  const [selectedPreset, setSelectedPreset] = useState<keyof typeof presets>('trendFollower');

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="font-semibold mb-2">Select Trading Style</h3>
        <div className="flex gap-2">
          <Button
            variant={selectedPreset === 'trendFollower' ? 'default' : 'outline'}
            onClick={() => setSelectedPreset('trendFollower')}
          >
            Trend Follower
          </Button>
          <Button
            variant={selectedPreset === 'momentumTrader' ? 'default' : 'outline'}
            onClick={() => setSelectedPreset('momentumTrader')}
          >
            Momentum Trader
          </Button>
          <Button
            variant={selectedPreset === 'volatilityTrader' ? 'default' : 'outline'}
            onClick={() => setSelectedPreset('volatilityTrader')}
          >
            Volatility Trader
          </Button>
        </div>
      </Card>
      
      <TechnicalAnalysisDashboard
        symbol={symbol}
        data={data || []}
      />
    </div>
  );
}

/**
 * Example 4: Manual Indicator Selection
 * Shows how to use the IndicatorSelector independently
 */
export function ManualIndicatorSelection() {
  const [symbol] = useState('GOOGL');
  const [indicators, setIndicators] = useState<IndicatorConfig>({
    sma20: true,
    sma50: false,
    sma200: false,
    ema12: false,
    ema26: false,
    ema50: false,
    rsi: true,
    macd: true,
    stochastic: false,
    bollingerBands: false,
    atr: false,
    keltnerChannel: false,
    adx: false,
    obv: false,
    vroc: false,
    mfi: false,
  });
  
  const { data } = useStockHistorical(symbol, '6mo');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      {/* Standalone Indicator Selector */}
      <div className="lg:col-span-1">
        <IndicatorSelector
          selectedIndicators={indicators}
          onChange={setIndicators}
        />
        
        {/* Show selected count */}
        <Card className="mt-4 p-4">
          <h4 className="font-semibold mb-2">Active Indicators</h4>
          <p className="text-sm text-muted-foreground">
            {Object.values(indicators).filter(Boolean).length} indicators selected
          </p>
        </Card>
      </div>
      
      {/* Charts will be rendered based on selection */}
      <div className="lg:col-span-3">
        <TechnicalAnalysisDashboard
          symbol={symbol}
          data={data || []}
        />
      </div>
    </div>
  );
}

/**
 * Example 5: Multi-Symbol Comparison
 * Shows how to display indicators for multiple stocks
 */
export function MultiSymbolAnalysis() {
  const symbols = ['AAPL', 'MSFT', 'GOOGL'];
  
  return (
    <div className="space-y-8">
      {symbols.map((symbol) => (
        <SymbolAnalysis key={symbol} symbol={symbol} />
      ))}
    </div>
  );
}

function SymbolAnalysis({ symbol }: { symbol: string }) {
  const { data } = useStockHistorical(symbol, '3mo');

  if (!data || data.length === 0) {
    return (
      <div>
        <h2 className="text-2xl font-bold mb-4">{symbol}</h2>
        <p className="text-sm text-muted-foreground">No historical data available.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">{symbol}</h2>
      <TechnicalAnalysisDashboard symbol={symbol} data={data} />
    </div>
  );
}

/**
 * Example 6: Trading Signals
 * Shows how to extract trading signals from indicator data
 */
export function TradingSignals() {
  const [symbol] = useState('NVDA');
  const { data } = useStockHistorical(symbol, '3mo');
  
  if (!data || data.length === 0) return null;
  
  // Calculate signals
  const latestClose = data[data.length - 1]?.close || 0;
  const closes = data.map(d => d.close);
  
  const rsi = calculateRSI(closes, 14);
  const latestRSI = rsi[rsi.length - 1];
  
  const macd = calculateMACD(closes, 12, 26, 9);
  const latestMACD = macd.histogram[macd.histogram.length - 1];
  
  const sma20 = calculateSMA(closes, 20);
  const latestSMA20 = sma20[sma20.length - 1];
  
  const sma50 = calculateSMA(closes, 50);
  const latestSMA50 = sma50[sma50.length - 1];
  
  // Determine signals
  const signals = {
    rsiSignal: latestRSI < 30 ? 'Oversold (Buy)' : latestRSI > 70 ? 'Overbought (Sell)' : 'Neutral',
    macdSignal: latestMACD > 0 ? 'Bullish' : 'Bearish',
    trendSignal: latestClose > latestSMA20 && latestSMA20 > latestSMA50 ? 'Uptrend' : 
                 latestClose < latestSMA20 && latestSMA20 < latestSMA50 ? 'Downtrend' : 'Sideways',
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <h3 className="font-semibold mb-4">Trading Signals for {symbol}</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>RSI Signal:</span>
            <span className="font-medium">{signals.rsiSignal}</span>
          </div>
          <div className="flex justify-between">
            <span>MACD Signal:</span>
            <span className="font-medium">{signals.macdSignal}</span>
          </div>
          <div className="flex justify-between">
            <span>Trend Signal:</span>
            <span className="font-medium">{signals.trendSignal}</span>
          </div>
        </div>
      </Card>
      
      <TechnicalAnalysisDashboard
        symbol={symbol}
        data={data}
      />
    </div>
  );
}
