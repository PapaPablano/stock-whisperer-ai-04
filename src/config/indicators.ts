export interface IndicatorConfig {
  // Trend Indicators
  sma20?: boolean;
  sma50?: boolean;
  sma200?: boolean;
  ema12?: boolean;
  ema26?: boolean;
  ema50?: boolean;
  supertrendAI?: boolean;

  // Momentum Indicators
  rsi?: boolean;
  macd?: boolean;
  stochastic?: boolean;
  kdj?: boolean;

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

export const DEFAULT_INDICATOR_CONFIG: IndicatorConfig = Object.freeze({
  sma20: false,
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
