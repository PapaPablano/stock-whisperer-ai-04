import { useMemo } from "react";
import { useStockHistorical } from "@/hooks/useStockHistorical";
import {
  calculateSuperTrendAI,
  type SuperTrendAIResult,
  type TrendDirection,
} from "@/lib/superTrendAI";
import {
  calculateRSI,
  calculateMACD,
  type PriceData,
} from "@/lib/technicalIndicators";

interface UnifiedChartData {
  dates: string[];
  ohlc: {
    open: number[];
    high: number[];
    low: number[];
    close: number[];
  };
  volume: {
    values: number[];
    colors: ("up" | "down")[];
  };
  supertrend: {
    values: Array<number | null>;
    trend: TrendDirection[];
    upper: Array<number | null>;
    lower: Array<number | null>;
    info: SuperTrendAIResult["info"];
  };
  rsi: Array<number | null>;
  macd: {
    macd: Array<number | null>;
    signal: Array<number | null>;
    histogram: Array<number | null>;
  };
}

const resolveFetchRange = (range: string): string => {
  switch (range) {
    case "1d":
    case "5d":
    case "1mo":
      return "1y";
    case "3mo":
    case "6mo":
      return "1y";
    case "1y":
      return "2y";
    case "5y":
      return "5y";
    default:
      return range || "1y";
  }
};

const resolveCutoffDate = (range: string): Date | null => {
  const cutoff = new Date();

  switch (range) {
    case "1d":
      cutoff.setDate(cutoff.getDate() - 1);
      return cutoff;
    case "5d":
      cutoff.setDate(cutoff.getDate() - 5);
      return cutoff;
    case "1mo":
      cutoff.setMonth(cutoff.getMonth() - 1);
      return cutoff;
    case "3mo":
      cutoff.setMonth(cutoff.getMonth() - 3);
      return cutoff;
    case "6mo":
      cutoff.setMonth(cutoff.getMonth() - 6);
      return cutoff;
    case "1y":
      cutoff.setFullYear(cutoff.getFullYear() - 1);
      return cutoff;
    case "5y":
      cutoff.setFullYear(cutoff.getFullYear() - 5);
      return cutoff;
    default:
      return null;
  }
};

export const useUnifiedChartData = (symbol: string, range: string) => {
  const fetchRange = useMemo(() => resolveFetchRange(range), [range]);

  const {
    data: historical,
    isLoading,
    isFetching,
    error,
  } = useStockHistorical(symbol, fetchRange);

  const chart = useMemo<UnifiedChartData | null>(() => {
    if (!historical || historical.length === 0) {
      return null;
    }

    const ordered = [...historical]
      .filter((point) => point !== null && point !== undefined)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) as PriceData[];

    if (ordered.length === 0) {
      return null;
    }

    const cutoff = resolveCutoffDate(range);
    const displayIndices: number[] = [];

    ordered.forEach((point, index) => {
      if (!cutoff) {
        displayIndices.push(index);
        return;
      }

      const pointDate = new Date(point.date);
      if (pointDate >= cutoff) {
        displayIndices.push(index);
      }
    });

    if (displayIndices.length === 0) {
      const fallbackCount = Math.min(ordered.length, 120);
      for (let index = ordered.length - fallbackCount; index < ordered.length; index++) {
        if (index >= 0) {
          displayIndices.push(index);
        }
      }

      if (displayIndices.length === 0) {
        return null;
      }
    }

    const displayData = displayIndices.map((index) => ordered[index]);
    const closesAll = ordered.map((point) => point.close);
    const rsiAll = calculateRSI(closesAll, 14);
    const macdAll = calculateMACD(closesAll, 12, 26, 9);
    const supertrendAll = calculateSuperTrendAI(ordered);
    const supertrendByDate = new Map(
      supertrendAll.series.map((point) => [point.date, point]),
    );

    const volumeColors = displayData.map((point, idx) => {
      if (idx === 0) {
        return "up" as const;
      }
      const previous = displayData[idx - 1];
      return point.close >= previous.close ? "up" : "down";
    });

    return {
      dates: displayData.map((point) => point.date),
      ohlc: {
        open: displayData.map((point) => point.open),
        high: displayData.map((point) => point.high),
        low: displayData.map((point) => point.low),
        close: displayData.map((point) => point.close),
      },
      volume: {
        values: displayData.map((point) => point.volume ?? 0),
        colors: volumeColors,
      },
      supertrend: {
        values: displayData.map((point) =>
          supertrendByDate.get(point.date)?.supertrend ?? null,
        ),
        trend: displayData.map((point) =>
          supertrendByDate.get(point.date)?.trend ?? 0,
        ),
        upper: displayData.map((point) =>
          supertrendByDate.get(point.date)?.upperBand ?? null,
        ),
        lower: displayData.map((point) =>
          supertrendByDate.get(point.date)?.lowerBand ?? null,
        ),
        info: supertrendAll.info,
      },
      rsi: displayIndices.map((index) => rsiAll[index] ?? null),
      macd: {
        macd: displayIndices.map((index) => macdAll.macd[index] ?? null),
        signal: displayIndices.map((index) => macdAll.signal[index] ?? null),
        histogram: displayIndices.map((index) => macdAll.histogram[index] ?? null),
      },
    };
  }, [historical, range]);

  return {
    chart,
    loading: isLoading || isFetching,
    error,
  };
};
