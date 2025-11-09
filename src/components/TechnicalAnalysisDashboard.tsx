import { useState, useMemo } from 'react';
import { IndicatorSelector, type IndicatorConfig } from './IndicatorSelector';
import { EnhancedPriceChart } from './EnhancedPriceChart';
import { RSIChart, MACDChart, StochasticChart, VolumeIndicatorChart } from './IndicatorCharts';
import {
  calculateRSI,
  calculateMACD,
  calculateStochastic,
  calculateOBV,
  calculateVROC,
  calculateMFI,
  calculateATR,
  calculateADX,
  type PriceData,
} from '@/lib/technicalIndicators';

interface TechnicalAnalysisDashboardProps {
  symbol: string;
  data: PriceData[];
}

export function TechnicalAnalysisDashboard({ symbol, data }: TechnicalAnalysisDashboardProps) {
  const [selectedIndicators, setSelectedIndicators] = useState<IndicatorConfig>({
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
    obv: false,
    vroc: false,
    mfi: false,
    adx: false,
  });

  // Calculate indicators based on selection
  const indicatorData = useMemo(() => {
    const closes = data.map(d => d.close);
    const volumes = data.map(d => d.volume);
    
    // RSI
    const rsi = selectedIndicators.rsi ? calculateRSI(closes, 14) : [];
    
    // MACD
    const macd = selectedIndicators.macd ? calculateMACD(closes, 12, 26, 9) : null;
    
    // Stochastic
    const stochastic = selectedIndicators.stochastic
      ? calculateStochastic(data, 14, 3)
      : null;
    
    // Volume indicators
    const obv = selectedIndicators.obv ? calculateOBV(data) : [];
    const vroc = selectedIndicators.vroc ? calculateVROC(volumes, 14) : [];
    const mfi = selectedIndicators.mfi ? calculateMFI(data, 14) : [];
    
    // Volatility indicators
    const atr = selectedIndicators.atr ? calculateATR(data, 14) : [];
    const adx = selectedIndicators.adx ? calculateADX(data, 14) : [];
    
    return {
      rsi: data.map((item, i) => ({
        date: new Date(item.date).toLocaleDateString(),
        rsi: rsi[i] || null,
      })),
      macd: macd
        ? data.map((item, i) => ({
            date: new Date(item.date).toLocaleDateString(),
            macd: macd.macd[i],
            signal: macd.signal[i],
            histogram: macd.histogram[i],
          }))
        : [],
      stochastic: stochastic
        ? data.map((item, i) => ({
            date: new Date(item.date).toLocaleDateString(),
            k: stochastic.k[i],
            d: stochastic.d[i],
          }))
        : [],
      obv: data.map((item, i) => ({
        date: new Date(item.date).toLocaleDateString(),
        value: obv[i] || null,
      })),
      vroc: data.map((item, i) => ({
        date: new Date(item.date).toLocaleDateString(),
        value: vroc[i] || null,
      })),
      mfi: data.map((item, i) => ({
        date: new Date(item.date).toLocaleDateString(),
        value: mfi[i] || null,
      })),
      atr: data.map((item, i) => ({
        date: new Date(item.date).toLocaleDateString(),
        value: atr[i] || null,
      })),
      adx: data.map((item, i) => ({
        date: new Date(item.date).toLocaleDateString(),
        value: adx[i] || null,
      })),
    };
  }, [data, selectedIndicators]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Indicator Selector */}
        <div className="lg:col-span-1">
          <IndicatorSelector
            selectedIndicators={selectedIndicators}
            onChange={setSelectedIndicators}
          />
        </div>

        {/* Charts */}
        <div className="lg:col-span-3 space-y-6">
          {/* Main Price Chart with Overlays */}
          <EnhancedPriceChart
            symbol={symbol}
            data={data}
            indicators={selectedIndicators}
          />

          {/* Momentum Indicators */}
          {selectedIndicators.rsi && (
            <RSIChart data={indicatorData.rsi} />
          )}
          
          {selectedIndicators.macd && indicatorData.macd.length > 0 && (
            <MACDChart data={indicatorData.macd} />
          )}
          
          {selectedIndicators.stochastic && indicatorData.stochastic.length > 0 && (
            <StochasticChart data={indicatorData.stochastic} />
          )}

          {/* Volume Indicators */}
          {selectedIndicators.obv && (
            <VolumeIndicatorChart
              data={indicatorData.obv}
              title="OBV - On-Balance Volume"
              color="#10b981"
            />
          )}
          
          {selectedIndicators.vroc && (
            <VolumeIndicatorChart
              data={indicatorData.vroc}
              title="VROC (14) - Volume Rate of Change"
              color="#f59e0b"
            />
          )}
          
          {selectedIndicators.mfi && (
            <VolumeIndicatorChart
              data={indicatorData.mfi}
              title="MFI (14) - Money Flow Index"
              color="#8b5cf6"
            />
          )}

          {/* Volatility Indicators */}
          {selectedIndicators.atr && (
            <VolumeIndicatorChart
              data={indicatorData.atr}
              title="ATR (14) - Average True Range"
              color="#ef4444"
            />
          )}
          
          {selectedIndicators.adx && (
            <VolumeIndicatorChart
              data={indicatorData.adx}
              title="ADX (14) - Average Directional Index"
              color="#3b82f6"
            />
          )}
        </div>
      </div>
    </div>
  );
}
