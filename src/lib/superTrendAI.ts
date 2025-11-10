import type { PriceData } from "@/lib/technicalIndicators";

export type TrendDirection = -1 | 0 | 1;

export interface SuperTrendAISeriesPoint {
  date: string;
  close: number;
  supertrend: number | null;
  trend: TrendDirection;
  upperBand: number | null;
  lowerBand: number | null;
  ama: number | null;
  signal: TrendDirection;
  distance: number | null;
  targetFactor: number | null;
  targetFactorHistory?: number;
}

export interface SuperTrendAIOptions {
  atrLength?: number;
  minMultiplier?: number;
  maxMultiplier?: number;
  step?: number;
  perfAlpha?: number;
  fromCluster?: "Best" | "Average" | "Worst";
  maxIter?: number;
  maxData?: number;
  snapToGrid?: boolean;
  confirmBars?: number;
  returnAllFactors?: boolean;
}

export interface SuperTrendAIClusterDiagnostics {
  size: number;
  dispersion: number;
  factors: number[];
  avgPerformance: number;
  minPerformance: number;
  maxPerformance: number;
}

export interface SuperTrendAISignalMetric {
  timestamp: string;
  signalType: "Buy" | "Sell";
  price: number;
  supertrendLevel: number | null;
  distance: number | null;
  distancePct: number | null;
  atrFactor: number;
  performanceIndex: number;
  trend: "Bullish" | "Bearish";
  confidence: number;
  stopLevel: number | null;
  takeProfit1: number | null;
}

export interface SuperTrendAIFactorDetail {
  factor: number;
  performance: number;
  upper: number[];
  lower: number[];
}

export interface SuperTrendAIInfo {
  targetFactor: number;
  performanceIndex: number;
  clusterDiagnostics: Record<string, SuperTrendAIClusterDiagnostics>;
  clusterMapping: Record<number, "Best" | "Average" | "Worst">;
  clusterDispersions: Record<number, number>;
  signalMetrics: SuperTrendAISignalMetric[];
  clusters: Record<number, number[]>;
  perfClusters: Record<number, number[]>;
  factorsTested: number[];
  fromCluster: "Best" | "Average" | "Worst";
  selectedClusterId: number | null;
  selectedClusterLabel: "Best" | "Average" | "Worst" | null;
  rawPerformanceIndex: number;
  dataOffset: number;
  regimeMetrics: {
    averageTrendRun: number;
    churnRate: number;
  };
  confirmBars: number;
  allFactorAnalytics?: SuperTrendAIFactorDetail[];
}

export interface SuperTrendAIResult {
  series: SuperTrendAISeriesPoint[];
  info: SuperTrendAIInfo;
}

const DEFAULT_OPTIONS: Required<SuperTrendAIOptions> = {
  atrLength: 10,
  minMultiplier: 1.0,
  maxMultiplier: 5.0,
  step: 0.5,
  perfAlpha: 10.0,
  fromCluster: "Best",
  maxIter: 1000,
  maxData: 10000,
  snapToGrid: false,
  confirmBars: 0,
  returnAllFactors: false,
};

const createEmptyResult = (
  config: Required<SuperTrendAIOptions>,
  dataOffset: number = 0,
): SuperTrendAIResult => ({
  series: [],
  info: {
    targetFactor: config.minMultiplier,
    performanceIndex: 0,
    clusterDiagnostics: {},
    clusterMapping: {},
    clusterDispersions: {},
    signalMetrics: [],
    clusters: {},
    perfClusters: {},
    factorsTested: [],
    fromCluster: config.fromCluster,
    selectedClusterId: null,
    selectedClusterLabel: null,
    rawPerformanceIndex: 0,
    dataOffset,
    regimeMetrics: {
      averageTrendRun: 0,
      churnRate: 0,
    },
    confirmBars: config.confirmBars,
    allFactorAnalytics: config.returnAllFactors ? [] : undefined,
  },
});

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const ema = (values: number[], span: number, seed?: number, alphaOverride?: number): number[] => {
  if (values.length === 0) {
    return [];
  }

  const computedAlpha = span <= 0 ? 1 : 2 / (span + 1);
  const alpha = clamp(alphaOverride ?? computedAlpha, 0.001, 1);
  const result: number[] = [];
  const initialCandidate =
    typeof seed === "number" && Number.isFinite(seed)
      ? seed
      : values.find((val) => Number.isFinite(val)) ?? 0;
  let current = initialCandidate;
  result.push(current);

  for (let i = 1; i < values.length; i++) {
    const value = Number.isFinite(values[i]) ? values[i] : current;
    current = alpha * value + (1 - alpha) * current;
    result.push(current);
  }

  return result;
};

const calculateATR = (data: PriceData[], span: number): number[] => {
  if (data.length === 0) {
    return [];
  }

  const trueRanges: number[] = [];

  for (let i = 0; i < data.length; i++) {
    const current = data[i];
    const previous = i > 0 ? data[i - 1] : current;

    const high = Number.isFinite(current.high) ? current.high : current.close;
    const low = Number.isFinite(current.low) ? current.low : current.close;
    const close = Number.isFinite(current.close) ? current.close : previous.close;
    const prevClose = Number.isFinite(previous.close) ? previous.close : close;

    const tr1 = high - low;
    const tr2 = Math.abs(high - prevClose);
    const tr3 = Math.abs(low - prevClose);
    const trueRange = Math.max(tr1, tr2, tr3);

    trueRanges.push(Number.isFinite(trueRange) ? trueRange : 0);
  }

  return ema(trueRanges, span);
};

const generateFactors = (min: number, max: number, step: number): number[] => {
  const factors: number[] = [];
  const epsilon = step / 1000;
  for (let value = min; value <= max + epsilon; value += step) {
    factors.push(Number(value.toFixed(6)));
  }
  return factors;
};

const calculateSupertrendForFactor = (
  data: PriceData[],
  atr: number[],
  factor: number,
) => {
  const length = data.length;
  const supertrend = new Array<number>(length).fill(0);
  const trend = new Array<TrendDirection>(length).fill(0);
  const finalUpper = new Array<number>(length).fill(0);
  const finalLower = new Array<number>(length).fill(0);

  if (length === 0) {
    return { supertrend, trend, finalUpper, finalLower };
  }

  const upperBand = data.map((point, idx) => {
    const basis = (point.high + point.low) / 2;
    const atrValue = Number.isFinite(atr[idx]) ? atr[idx] : 0;
    return basis + atrValue * factor;
  });
  const lowerBand = data.map((point, idx) => {
    const basis = (point.high + point.low) / 2;
    const atrValue = Number.isFinite(atr[idx]) ? atr[idx] : 0;
    return basis - atrValue * factor;
  });

  finalUpper[0] = upperBand[0];
  finalLower[0] = lowerBand[0];
  trend[0] = 0;
  supertrend[0] = finalUpper[0];

  for (let i = 1; i < length; i++) {
    const closePrev = data[i - 1].close;
    const closeCurr = data[i].close;

    if (upperBand[i] < finalUpper[i - 1] || closePrev > finalUpper[i - 1]) {
      finalUpper[i] = upperBand[i];
    } else {
      finalUpper[i] = finalUpper[i - 1];
    }

    if (lowerBand[i] > finalLower[i - 1] || closePrev < finalLower[i - 1]) {
      finalLower[i] = lowerBand[i];
    } else {
      finalLower[i] = finalLower[i - 1];
    }

    if (closeCurr > finalUpper[i]) {
      trend[i] = 1;
    } else if (closeCurr < finalLower[i]) {
      trend[i] = -1;
    } else {
      trend[i] = trend[i - 1];
    }

    supertrend[i] = trend[i] === 1 ? finalLower[i] : finalUpper[i];
  }

  return { supertrend, trend, finalUpper, finalLower };
};

const calculatePerformance = (
  data: PriceData[],
  supertrend: number[],
  trend: TrendDirection[],
  perfAlpha: number,
): number => {
  if (data.length === 0) {
    return 0;
  }

  const perf = new Array<number>(data.length).fill(0);
  const alpha = perfAlpha > 1 ? Math.min(2 / (perfAlpha + 1), 0.99) : clamp(perfAlpha, 0.01, 0.99);

  for (let i = 1; i < data.length; i++) {
    const closePrev = data[i - 1].close;
    const closeCurr = data[i].close;
    const priceChange = closeCurr - closePrev;
    const signal = Math.sign(closePrev - supertrend[i - 1]);

    perf[i] = perf[i - 1] + alpha * (priceChange * signal - perf[i - 1]);
  }

  return perf[perf.length - 1];
};

const percentile = (values: number[], q: number): number => {
  if (values.length === 0) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
};

const kMeans1D = (
  values: number[],
  initialCentroids: number[],
  maxIter: number,
): { centroids: number[]; labels: number[] } => {
  if (values.length === 0) {
    return { centroids: initialCentroids, labels: [] };
  }

  const centroids = [...initialCentroids];
  const labels = new Array<number>(values.length).fill(0);

  for (let iter = 0; iter < maxIter; iter++) {
    let changed = false;
    const clusterSums = new Array<number>(centroids.length).fill(0);
    const clusterCounts = new Array<number>(centroids.length).fill(0);

    for (let i = 0; i < values.length; i++) {
      const value = values[i];
      let bestIdx = 0;
      let bestDist = Math.abs(value - centroids[0]);

      for (let j = 1; j < centroids.length; j++) {
        const dist = Math.abs(value - centroids[j]);
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = j;
        }
      }

      if (labels[i] !== bestIdx) {
        changed = true;
        labels[i] = bestIdx;
      }

      clusterSums[bestIdx] += value;
      clusterCounts[bestIdx] += 1;
    }

    for (let j = 0; j < centroids.length; j++) {
      if (clusterCounts[j] > 0) {
        centroids[j] = clusterSums[j] / clusterCounts[j];
      } else {
        const randomIndex = Math.floor(Math.random() * values.length);
        centroids[j] = values[randomIndex];
        changed = true;
      }
    }

    if (!changed) {
      break;
    }
  }

  return { centroids, labels };
};

const calculateDispersion = (values: number[]): number => {
  if (values.length <= 1) {
    return 0;
  }
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
};

const buildDiagnostics = (
  clusters: Record<number, number[]>,
  perfClusters: Record<number, number[]>,
  clusterMapping: Record<number, "Best" | "Average" | "Worst">,
): Record<string, SuperTrendAIClusterDiagnostics> => {
  const diagnostics: Record<string, SuperTrendAIClusterDiagnostics> = {};

  Object.entries(clusterMapping).forEach(([clusterId, label]) => {
    const id = Number(clusterId);
    const factors = clusters[id] ?? [];
    const performances = perfClusters[id] ?? [];

    diagnostics[label] = {
      size: factors.length,
      dispersion: calculateDispersion(factors),
      factors,
      avgPerformance: performances.length > 0
        ? performances.reduce((sum, value) => sum + value, 0) / performances.length
        : 0,
      minPerformance: performances.length > 0 ? Math.min(...performances) : 0,
      maxPerformance: performances.length > 0 ? Math.max(...performances) : 0,
    };
  });

  return diagnostics;
};

const calculateSignalMetrics = (
  data: PriceData[],
  series: SuperTrendAISeriesPoint[],
  info: SuperTrendAIInfo,
  atr: number[],
): SuperTrendAISignalMetric[] => {
  const metrics: SuperTrendAISignalMetric[] = [];
  const selectedDispersion = info.selectedClusterId !== null
    ? info.clusterDispersions[info.selectedClusterId] ?? 0
    : 0;
  const dispersionFactor = selectedDispersion > 0 ? 1 / (1 + selectedDispersion) : 1;
  const basePerformance = clamp(info.performanceIndex, 0, 1);
  const baseConfidence = clamp(basePerformance * dispersionFactor, 0, 1);

  series.forEach((point, index) => {
    if (point.signal === 0) {
      return;
    }

    const distance = point.distance;
    const distancePct = distance !== null && point.close !== 0
      ? (distance / point.close) * 100
      : null;
    const atrValue = Number.isFinite(atr[index]) ? atr[index] : 0;
    const rawAtrFactor = point.targetFactor ?? info.targetFactor;
    const atrFactor = Number.isFinite(rawAtrFactor) ? rawAtrFactor : info.targetFactor;
    const stopLevel = Number.isFinite(point.supertrend ?? NaN) ? point.supertrend : null;
    const takeProfit1 = atrValue > 0 && Number.isFinite(atrFactor)
      ? point.close + (point.signal === 1 ? atrValue * atrFactor : -atrValue * atrFactor)
      : null;

    metrics.push({
      timestamp: data[index]?.date ?? String(index),
      signalType: point.signal === 1 ? "Buy" : "Sell",
      price: point.close,
      supertrendLevel: stopLevel,
      distance,
      distancePct,
      atrFactor,
      performanceIndex: info.performanceIndex,
      trend: point.trend === 1 ? "Bullish" : "Bearish",
      confidence: baseConfidence,
      stopLevel,
      takeProfit1,
    });
  });

  return metrics;
};

export const calculateSuperTrendAI = (
  data: PriceData[],
  options: SuperTrendAIOptions = {},
): SuperTrendAIResult => {
  const config = { ...DEFAULT_OPTIONS, ...options };

  if (!data || data.length === 0) {
    return {
      series: [],
      info: {
        targetFactor: config.minMultiplier,
        performanceIndex: 0,
        clusterDiagnostics: {},
        clusterMapping: {},
        clusterDispersions: {},
        signalMetrics: [],
        clusters: {},
        perfClusters: {},
        factorsTested: [],
        fromCluster: config.fromCluster,
      },
    };
  }

  const atr = calculateATR(data, config.atrLength);
  const factors = generateFactors(config.minMultiplier, config.maxMultiplier, config.step);

  const performances: number[] = [];
  const supertrendsByFactor: number[][] = [];
  const trendsByFactor: TrendDirection[][] = [];
  const upperBandsByFactor: number[][] = [];
  const lowerBandsByFactor: number[][] = [];

  factors.forEach((factor) => {
    const { supertrend, trend, finalUpper, finalLower } = calculateSupertrendForFactor(data, atr, factor);
    supertrendsByFactor.push(supertrend);
    trendsByFactor.push(trend);
    upperBandsByFactor.push(finalUpper);
    lowerBandsByFactor.push(finalLower);

    const performance = calculatePerformance(data, supertrend, trend, config.perfAlpha);
    performances.push(performance);
  });

  let targetFactor = config.minMultiplier;
  let clusters: Record<number, number[]> = { 0: [], 1: [], 2: [] };
  let perfClusters: Record<number, number[]> = { 0: [], 1: [], 2: [] };
  let clusterMapping: Record<number, "Best" | "Average" | "Worst"> = {};

  if (performances.length < 3) {
    const bestIdx = performances.reduce((best, value, idx, array) => (
      value > array[best] ? idx : best
    ), 0);

    targetFactor = factors[bestIdx];
    clusters[0] = [...factors];
    perfClusters[0] = [...performances];
    clusterMapping = { 0: "Average" };
  } else {
    const q25 = percentile(performances, 0.25);
    const q50 = percentile(performances, 0.5);
    const q75 = percentile(performances, 0.75);

    const { labels } = kMeans1D(performances, [q25, q50, q75], config.maxIter);

    clusters = { 0: [], 1: [], 2: [] };
    perfClusters = { 0: [], 1: [], 2: [] };

    labels.forEach((label, index) => {
      const clusterId = label ?? 0;
      clusters[clusterId].push(factors[index]);
      perfClusters[clusterId].push(performances[index]);
    });

    const clusterMeans: Array<{ id: number; mean: number }> = Object.entries(perfClusters).map(([id, values]) => ({
      id: Number(id),
      mean: values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : Number.NEGATIVE_INFINITY,
    }));

    const sortedClusters = clusterMeans.sort((a, b) => a.mean - b.mean);

    if (sortedClusters.length === 3) {
      clusterMapping = {
        [sortedClusters[0].id]: "Worst",
        [sortedClusters[1].id]: "Average",
        [sortedClusters[2].id]: "Best",
      };
    }

    const targetLabel = Object.entries(clusterMapping).find(([, label]) => label === config.fromCluster)?.[0];

    if (targetLabel !== undefined) {
      const labelId = Number(targetLabel);
      const selectedFactors = clusters[labelId];
      const meanFactor = selectedFactors.length > 0
        ? selectedFactors.reduce((sum, value) => sum + value, 0) / selectedFactors.length
        : config.minMultiplier;

      targetFactor = meanFactor;
    }
  }

  const closestFactorIndex = factors.reduce((bestIdx, value, idx) => (
    Math.abs(value - targetFactor) < Math.abs(factors[bestIdx] - targetFactor) ? idx : bestIdx
  ), 0);

  targetFactor = factors[closestFactorIndex];
  const chosenSupertrend = supertrendsByFactor[closestFactorIndex];
  const chosenTrend = trendsByFactor[closestFactorIndex];
  const chosenUpper = upperBandsByFactor[closestFactorIndex];
  const chosenLower = lowerBandsByFactor[closestFactorIndex];

  const priceDiffs = data.map((point, index) => {
    if (index === 0) {
      return 0;
    }
    return Math.abs(point.close - data[index - 1].close);
  });

  const diffEma = ema(priceDiffs, 10, priceDiffs[0]);

  const targetClusterId = Object.entries(clusterMapping).find(([, label]) => label === config.fromCluster)?.[0];
  const clusterPerformanceValues = targetClusterId !== undefined ? perfClusters[Number(targetClusterId)] : [];
  const clusterPerformanceMean = clusterPerformanceValues.length > 0
    ? clusterPerformanceValues.reduce((sum, value) => sum + value, 0) / clusterPerformanceValues.length
    : 0;

  const performanceIndex = diffEma.length > 0
    ? Math.max(clusterPerformanceMean, 0) / (diffEma[diffEma.length - 1] + 1e-10)
    : 0;

  const series: SuperTrendAISeriesPoint[] = [];

  for (let index = 0; index < data.length; index++) {
    const point = data[index];
    const supertrendValue = chosenSupertrend[index] ?? null;
    const trendValue = chosenTrend[index] ?? 0;
    const upperValue = chosenUpper[index] ?? null;
    const lowerValue = chosenLower[index] ?? null;
    const previousTrend = index > 0 ? chosenTrend[index - 1] : 0;

    let signal: TrendDirection = 0;
    if (index > 0) {
      if (previousTrend === -1 && trendValue === 1) {
        signal = 1;
      } else if (previousTrend === 1 && trendValue === -1) {
        signal = -1;
      }
    }

    const previousAma = index === 0
      ? supertrendValue ?? point.close
      : series[index - 1].ama ?? series[index - 1].supertrend ?? series[index - 1].close;

    const targetValue = supertrendValue ?? previousAma ?? point.close;
    const ama = previousAma + performanceIndex * (targetValue - previousAma);
    const distance = supertrendValue !== null ? point.close - supertrendValue : null;

    series.push({
      date: point.date,
      close: point.close,
      supertrend: supertrendValue,
      trend: trendValue,
      upperBand: upperValue,
      lowerBand: lowerValue,
      signal,
      ama: Number.isFinite(ama) ? ama : previousAma,
      distance,
      targetFactor,
    });
  }

  const clusterDiagnostics = buildDiagnostics(clusters, perfClusters, clusterMapping);
  const clusterDispersions: Record<number, number> = {};
  Object.entries(clusters).forEach(([id, values]) => {
    clusterDispersions[Number(id)] = calculateDispersion(values);
  });

  const info: SuperTrendAIInfo = {
    targetFactor,
    performanceIndex,
    clusterDiagnostics,
    clusterMapping,
    clusterDispersions,
    clusters,
    perfClusters,
    factorsTested: factors,
    signalMetrics: [],
    fromCluster: config.fromCluster,
  };

  info.signalMetrics = calculateSignalMetrics(data, series, info);

  return {
    series,
    info,
  };
};
