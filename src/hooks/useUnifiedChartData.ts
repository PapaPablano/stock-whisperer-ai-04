import { useMemo } from "react";
import { useStockHistorical, type HistoricalData } from "./useStockHistorical";
import { useStockIntraday, type InstrumentType } from "./useStockIntraday";
import {
  aggregateBars,
  filterBySession,
  type Interval,
  type Bar,
} from "@/lib/aggregateBars";
import { resolveSession, SESSIONS } from "@/lib/marketSessions";
import { calculateSuperTrendAI } from "@/lib/superTrendAI";
import { calculateRSI, calculateMACD } from "@/lib/technicalIndicators";

type Options = {
  maxBars?: number;
  session?: "EQUITY_RTH" | "FUTURES_EXT" | "CRYPTO_247";
  historyRange?: string;
  intradayRange?: "1d" | "5d" | "1w" | "1mo" | "3mo" | "6mo" | "1y" | "2y";
};

const normalizeInterval = (value?: string) =>
  (value ?? "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace("minutes", "min")
    .replace("minute", "min")
    .replace("hours", "h")
    .replace("hour", "h")
    .replace("min", "m");

export const useUnifiedChartData = (
  symbol: string,
  interval: Interval,
  opts: Options = {}
) => {
  const session = opts.session ?? resolveSession(symbol);
  const tz = SESSIONS[session].tz;
  const maxBars = opts.maxBars ?? 5000;
  const historyRange = opts.historyRange ?? "5y";
  const intradayRange = opts.intradayRange ?? "2y";
  const instrumentType: InstrumentType = session === "FUTURES_EXT" ? "future" : "equity";

  const isDaily = interval === "1d";
  const {
    data: historicalDaily,
    isLoading: ld,
    error: ed,
  } = useStockHistorical(symbol, historyRange, { instrumentType });
  const {
    data: intra,
    isLoading: li,
    error: ei,
  } = useStockIntraday(symbol, interval, intradayRange, {
    enabled: !isDaily,
    instrumentType,
  });

  const loading = isDaily ? ld : li;
  const error = isDaily ? ed : ei;

  const { bars, source, fallback } = useMemo(() => {
    const historicalRows = historicalDaily ?? [];
    if (isDaily) {
      const d = historicalRows.map((r: HistoricalData): Bar => ({
        datetime: r.date,
        open: r.open,
        high: r.high,
        low: r.low,
        close: r.close,
        volume: r.volume,
      }));
      const capped = d.length > maxBars ? d.slice(-maxBars) : d;
      return { bars: capped, source: "daily-native" as const, fallback: false };
    }

    if (!intra || !intra.data || intra.data.length === 0) {
      // intraday unavailable, fallback to daily
      const d = historicalRows.map((r: HistoricalData): Bar => ({
        datetime: r.date,
        open: r.open,
        high: r.high,
        low: r.low,
        close: r.close,
        volume: r.volume,
      }));
      const capped = d.length > maxBars ? d.slice(-maxBars) : d;
      return { bars: capped, source: "daily-fallback" as const, fallback: true };
    }

    const baseInterval = intra.interval; // e.g., '1min', '5min', '15min'
    const raw: Bar[] = intra.data.map((r) => ({
      datetime: r.datetime ?? r.date,
      open: r.open,
      high: r.high,
      low: r.low,
      close: r.close,
      volume: r.volume,
    }));

    // Session filter (drop OOH for equities; pass-through for futures/crypto)
    const sessionFiltered =
      session === "EQUITY_RTH" ? filterBySession(raw, "EQUITY_RTH") : raw;

    // If provider delivers native interval equal to UI interval, use it.
    const base = normalizeInterval(baseInterval);
    const requested = normalizeInterval(interval);
    const native = Boolean(base && base === requested);

    if (import.meta.env.DEV) {
      console.debug(
        "[useUnifiedChartData] Intervals",
        baseInterval,
        interval,
        base,
        requested,
        native ? "native" : "aggregated"
      );
    }

    if (import.meta.env.DEV) {
      const resolved = native ? "native" : "aggregated";
      console.log("Unified base/ui/source", base, requested, resolved);
    }

    if (native) {
      const capped =
        sessionFiltered.length > maxBars
          ? sessionFiltered.slice(-maxBars)
          : sessionFiltered;
      return { bars: capped, source: "native" as const, fallback: false };
    }

    // Provider returned 1min or different; aggregate client-side
    const agg = aggregateBars(sessionFiltered, interval, tz);
    const capped = agg.length > maxBars ? agg.slice(-maxBars) : agg;
    return { bars: capped, source: "aggregated" as const, fallback: false };
  }, [historicalDaily, interval, intra, isDaily, session, tz, maxBars]);

  const effectiveError = fallback ? null : error;

  // Indicators (only when bars exist)
  const enriched = useMemo(() => {
    if (!bars || bars.length === 0) {
      return {
        dates: [] as string[],
        ohlc: { open: [], high: [], low: [], close: [] as number[] },
        volume: { values: [] as number[], colors: [] as string[] },
        st: null,
        rsi: null,
        macd: null,
      };
    }
    const dates = bars.map((b) => b.datetime);
    const open = bars.map((b) => b.open);
    const high = bars.map((b) => b.high);
    const low = bars.map((b) => b.low);
    const close = bars.map((b) => b.close);
    const volume = bars.map((b) => b.volume);

    const stRes = calculateSuperTrendAI(
      bars.map((b) => ({ date: b.datetime, open: b.open, high: b.high, low: b.low, close: b.close, volume: b.volume }))
    );
    const rsi = calculateRSI(close, 14);
    const macd = calculateMACD(close, 12, 26, 9);

    const volColors = close.map<"up" | "down">((c, i) =>
      i === 0 || c >= close[i - 1] ? "up" : "down"
    );

    return {
      dates,
      ohlc: { open, high, low, close },
      volume: { values: volume, colors: volColors },
      st: stRes,
      rsi: { values: rsi },
      macd, // { macd, signal, histogram }
    };
  }, [bars]);

  return {
    loading,
    error: effectiveError,
    source,
    isFallback: fallback,
    bars,
    dates: enriched.dates,
    ohlc: enriched.ohlc,
    volume: enriched.volume,
    st: enriched.st,
    rsi: enriched.rsi,
    macd: enriched.macd,
  };
};
