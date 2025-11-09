import { useState, useMemo } from 'react';
import { IndicatorSelector, type IndicatorConfig } from './IndicatorSelector';
import { RSIChart, MACDChart, StochasticChart, KDJChart, VolumeIndicatorChart } from './IndicatorCharts';
import {
  calculateRSI,
  calculateMACD,
  calculateStochastic,
  calculateKDJ,
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
    kdj: false,
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
    if (!data || data.length === 0) {
      return {
        rsi: [],
        macd: [],
        stochastic: [],
        kdj: [],
        obv: [],
        vroc: [],
        mfi: [],
        atr: [],
        adx: [],
      };
    }

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
    
    // KDJ
    const kdj = selectedIndicators.kdj
      ? calculateKDJ(data, 9, 3, 3)
      : null;
    
    // Volume indicators
    const obv = selectedIndicators.obv ? calculateOBV(data) : [];
    const vroc = selectedIndicators.vroc ? calculateVROC(volumes, 14) : [];
    const mfi = selectedIndicators.mfi ? calculateMFI(data, 14) : [];
    
    // Volatility indicators
    const atr = selectedIndicators.atr ? calculateATR(data, 14) : [];
    const adx = selectedIndicators.adx ? calculateADX(data, 14) : [];
    
    // Format dates consistently
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
    };
    
    return {
      rsi: data.map((item, i) => ({
        date: formatDate(item.date),
        rsi: rsi[i] || null,
      })),
      macd: macd
        ? data.map((item, i) => ({
            date: formatDate(item.date),
            macd: macd.macd[i],
            signal: macd.signal[i],
            histogram: macd.histogram[i],
          }))
        : [],
      stochastic: stochastic
        ? data.map((item, i) => ({
            date: formatDate(item.date),
            k: stochastic.k[i],
            d: stochastic.d[i],
          }))
        : [],
      kdj: kdj
        ? data.map((item, i) => ({
            date: formatDate(item.date),
            k: kdj.k[i],
            d: kdj.d[i],
            j: kdj.j[i],
          }))
        : [],
      obv: data.map((item, i) => ({
        date: formatDate(item.date),
        value: obv[i] || null,
      })),
      vroc: data.map((item, i) => ({
        date: formatDate(item.date),
        value: vroc[i] || null,
      })),
      mfi: data.map((item, i) => ({
        date: formatDate(item.date),
        value: mfi[i] || null,
      })),
      atr: data.map((item, i) => ({
        date: formatDate(item.date),
        value: atr[i] || null,
      })),
      adx: data.map((item, i) => ({
        date: formatDate(item.date),
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

        {/* Indicator Charts */}
        <div className="lg:col-span-3 space-y-6">
          {/* Momentum Indicators */}
          {selectedIndicators.rsi && indicatorData.rsi.length > 0 && (
            <RSIChart data={indicatorData.rsi} />
          )}
          
          {selectedIndicators.macd && indicatorData.macd.length > 0 && (
            <MACDChart data={indicatorData.macd} />
          )}
          
          {selectedIndicators.stochastic && indicatorData.stochastic.length > 0 && (
            <StochasticChart data={indicatorData.stochastic} />
          )}
          
          {selectedIndicators.kdj && indicatorData.kdj.length > 0 && (
            <KDJChart data={indicatorData.kdj} />
          )}

          {/* Volume Indicators */}
          {selectedIndicators.obv && indicatorData.obv.length > 0 && (
            <VolumeIndicatorChart
              data={indicatorData.obv}
              title="OBV - On-Balance Volume"
              color="#10b981"
            />
          )}
          
          {selectedIndicators.vroc && indicatorData.vroc.length > 0 && (
            <VolumeIndicatorChart
              data={indicatorData.vroc}
              title="VROC (14) - Volume Rate of Change"
              color="#f59e0b"
            />
          )}
          
          {selectedIndicators.mfi && indicatorData.mfi.length > 0 && (
            <VolumeIndicatorChart
              data={indicatorData.mfi}
              title="MFI (14) - Money Flow Index"
              color="#8b5cf6"
            />
          )}

          {/* Volatility Indicators */}
          {selectedIndicators.atr && indicatorData.atr.length > 0 && (
            <VolumeIndicatorChart
              data={indicatorData.atr}
              title="ATR (14) - Average True Range"
              color="#ef4444"
            />
          )}
          
          {selectedIndicators.adx && indicatorData.adx.length > 0 && (
            <VolumeIndicatorChart
              data={indicatorData.adx}
              title="ADX (14) - Average Directional Index"
              color="#3b82f6"
            />
          )}

          {/* Show message if no indicators selected */}
          {!selectedIndicators.rsi && 
           !selectedIndicators.macd && 
           !selectedIndicators.stochastic && 
           !selectedIndicators.kdj &&
           !selectedIndicators.obv && 
           !selectedIndicators.vroc && 
           !selectedIndicators.mfi && 
           !selectedIndicators.atr && 
           !selectedIndicators.adx && (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg">Select indicators from the left to display charts</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
