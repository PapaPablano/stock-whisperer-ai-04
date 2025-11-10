import { useState, useMemo } from 'react';
import { IndicatorSelector, type IndicatorConfig } from './IndicatorSelector';
import { RSIChart, MACDChart, StochasticChart, KDJChart, VolumeIndicatorChart, SuperTrendAIChart } from './IndicatorCharts';
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
import {
  calculateSuperTrendAI,
  type SuperTrendAIInfo,
  type TrendDirection,
} from '@/lib/superTrendAI';

type SuperTrendAIChartPoint = {
  date: string;
  rawDate: string;
  close: number;
  supertrend: number | null;
  upperBand: number | null;
  lowerBand: number | null;
  ama: number | null;
  signal: TrendDirection;
  trend: TrendDirection;
  distance: number | null;
};

interface TechnicalAnalysisDashboardProps {
  symbol: string;
  data: PriceData[]; // Full dataset for calculations
  displayData?: PriceData[]; // Optional filtered dataset for display
}

export function TechnicalAnalysisDashboard({ symbol, data, displayData }: TechnicalAnalysisDashboardProps) {
  // Use displayData if provided, otherwise use full data (backward compatible)
  const dataForDisplay = displayData || data;
  const [selectedIndicators, setSelectedIndicators] = useState<IndicatorConfig>({
    sma20: true,
    sma50: false,
    sma200: false,
    ema12: false,
    ema26: false,
    ema50: false,
    supertrendAI: true,
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
  const indicatorData = useMemo<{
    rsi: Array<{ date: string; rsi: number | null }>;
    macd: Array<{ date: string; macd: number | null; signal: number | null; histogram: number | null }>;
    stochastic: Array<{ date: string; k: number | null; d: number | null }>;
    kdj: Array<{ date: string; k: number | null; d: number | null; j: number | null }>;
    obv: Array<{ date: string; value: number | null }>;
    vroc: Array<{ date: string; value: number | null }>;
    mfi: Array<{ date: string; value: number | null }>;
    atr: Array<{ date: string; value: number | null }>;
    adx: Array<{ date: string; value: number | null }>;
    supertrendAI: { series: SuperTrendAIChartPoint[]; info: SuperTrendAIInfo | null };
  }>(() => {
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
        supertrendAI: {
          series: [],
          info: null,
        },
      };
    }

    console.log(`[TechnicalAnalysisDashboard] Calculation data: ${data.length} points (${data[0]?.date} to ${data[data.length - 1]?.date})`);
    console.log(`[TechnicalAnalysisDashboard] Display data: ${dataForDisplay.length} points (${dataForDisplay[0]?.date} to ${dataForDisplay[dataForDisplay.length - 1]?.date})`);

    // Calculate indicators on FULL dataset for accuracy
    const closes = data.map(d => d.close);
    const volumes = data.map(d => d.volume);
    
    // RSI - calculated on full data
    const rsiRaw = selectedIndicators.rsi ? calculateRSI(closes, 14) : [];
    
    // MACD - calculated on full data
    const macdRaw = selectedIndicators.macd ? calculateMACD(closes, 12, 26, 9) : null;
    
    // Stochastic - calculated on full data
    const stochasticRaw = selectedIndicators.stochastic
      ? calculateStochastic(data, 14, 3)
      : null;
    
    // KDJ - calculated on full data
    const kdjRaw = selectedIndicators.kdj
      ? calculateKDJ(data, 9, 3, 3)
      : null;
    
    // Volume indicators - calculated on full data
    const obvRaw = selectedIndicators.obv ? calculateOBV(data) : [];
    const vrocRaw = selectedIndicators.vroc ? calculateVROC(volumes, 14) : [];
    const mfiRaw = selectedIndicators.mfi ? calculateMFI(data, 14) : [];
    
    // Volatility indicators - calculated on full data
    const atrRaw = selectedIndicators.atr ? calculateATR(data, 14) : [];
    const adxRaw = selectedIndicators.adx ? calculateADX(data, 14) : [];
    
    // Now filter calculated results to match display range
    // Create a map of dates from displayData for efficient lookup
    const displayDates = new Set(dataForDisplay.map(item => item.date));
    
    // Format dates consistently
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
    };
    
    // Filter calculated indicators to display range only
    const filteredIndices: number[] = [];
    data.forEach((item, i) => {
      if (displayDates.has(item.date)) {
        filteredIndices.push(i);
      }
    });
    
    console.log(`[TechnicalAnalysisDashboard] Filtered ${filteredIndices.length} indicator data points for display`);
    
    const supertrendAIResult = selectedIndicators.supertrendAI
      ? calculateSuperTrendAI(data)
      : null;

    const supertrendAISeries = supertrendAIResult
      ? filteredIndices.map((i) => {
          const rawPoint = supertrendAIResult.series[i];
          if (!rawPoint) {
            return null;
          }

          return {
            date: formatDate(data[i].date),
            rawDate: data[i].date,
            close: rawPoint.close,
            supertrend: rawPoint.supertrend,
            upperBand: rawPoint.upperBand,
            lowerBand: rawPoint.lowerBand,
            ama: rawPoint.ama,
            signal: rawPoint.signal,
            trend: rawPoint.trend,
            distance: rawPoint.distance,
          };
        }).filter((value): value is {
          date: string;
          rawDate: string;
          close: number;
          supertrend: number | null;
          upperBand: number | null;
          lowerBand: number | null;
          ama: number | null;
          signal: TrendDirection;
          trend: TrendDirection;
          distance: number | null;
        } => value !== null)
      : [];

    return {
      rsi: filteredIndices.map(i => ({
        date: formatDate(data[i].date),
        rsi: rsiRaw[i] || null,
      })),
      macd: macdRaw
        ? filteredIndices.map(i => ({
            date: formatDate(data[i].date),
            macd: macdRaw.macd[i],
            signal: macdRaw.signal[i],
            histogram: macdRaw.histogram[i],
          }))
        : [],
      stochastic: stochasticRaw
        ? filteredIndices.map(i => ({
            date: formatDate(data[i].date),
            k: stochasticRaw.k[i],
            d: stochasticRaw.d[i],
          }))
        : [],
      kdj: kdjRaw
        ? filteredIndices.map(i => ({
            date: formatDate(data[i].date),
            k: kdjRaw.k[i],
            d: kdjRaw.d[i],
            j: kdjRaw.j[i],
          }))
        : [],
      obv: filteredIndices.map(i => ({
        date: formatDate(data[i].date),
        value: obvRaw[i] || null,
      })),
      vroc: filteredIndices.map(i => ({
        date: formatDate(data[i].date),
        value: vrocRaw[i] || null,
      })),
      mfi: filteredIndices.map(i => ({
        date: formatDate(data[i].date),
        value: mfiRaw[i] || null,
      })),
      atr: filteredIndices.map(i => ({
        date: formatDate(data[i].date),
        value: atrRaw[i] || null,
      })),
      adx: filteredIndices.map(i => ({
        date: formatDate(data[i].date),
        value: adxRaw[i] || null,
      })),
      supertrendAI: {
        series: supertrendAISeries,
        info: supertrendAIResult?.info ?? null,
      },
    };
  }, [data, dataForDisplay, selectedIndicators]);

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

          {selectedIndicators.supertrendAI && indicatorData.supertrendAI.series.length > 0 && (
            <SuperTrendAIChart
              data={indicatorData.supertrendAI.series}
              meta={indicatorData.supertrendAI.info}
              symbol={symbol}
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
