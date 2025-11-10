import { useMemo } from "react";
import { useStockHistorical } from "./useStockHistorical";
import { useStockIntraday } from "./useStockIntraday";
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
};

export const useUnifiedChartData = (
  symbol: string,
  interval: Interval,
  opts: Options = {}
) => {
  const session = opts.session ?? resolveSession(symbol);
  const tz = SESSIONS[session].tz;
  const maxBars = opts.maxBars ?? 5000;

  const isDaily = interval === "1d";
  const {
    data: historicalDaily,
    isLoading: ld,
    error: ed,
  } = useStockHistorical(symbol, "1d");
  const daily = historicalDaily ?? [];
  const {
    data: intra,
    isLoading: li,
    error: ei,
  } = useStockIntraday(symbol, interval, '1d', { enabled: !isDaily });

  const loading = isDaily ? ld : li;
  const error = isDaily ? ed : ei;

  const { bars, source } = useMemo(() => {
    if (isDaily) {
      const d = daily.map(
        (r: any) =>
          ({
            datetime: r.date,
            open: r.open,
            high: r.high,
            low: r.low,
            close: r.close,
            volume: r.volume,
          }) as Bar
      );
      const capped = d.length > maxBars ? d.slice(-maxBars) : d;
      return { bars: capped, source: "daily-fallback" as const };
    }

    if (!intra || !intra.data || intra.data.length === 0) {
      // intraday unavailable, fallback to daily
      const d = daily.map(
        (r: any) =>
          ({
            datetime: r.date,
            open: r.open,
            high: r.high,
            low: r.low,
            close: r.close,
            volume: r.volume,
          }) as Bar
      );
      const capped = d.length > maxBars ? d.slice(-maxBars) : d;
      return { bars: capped, source: "daily-fallback" as const };
    }

    const baseInterval = intra.interval; // e.g., '1min', '5min', '15min'
    const raw = intra.data.map(
      (r: any) =>
        ({
          datetime: r.datetime ?? r.date,
          open: r.open,
          high: r.high,
          low: r.low,
          close: r.close,
          volume: r.volume,
        }) as Bar
    );

    // Session filter (drop OOH for equities; pass-through for futures/crypto)
    const sessionFiltered =
      session === "EQUITY_RTH" ? filterBySession(raw, "EQUITY_RTH") : raw;

    // If provider delivers native interval equal to UI interval, use it.
    const normalizedReq = interval === "1h" ? "1hour" : interval; // match provider strings
    if (baseInterval && baseInterval === normalizedReq) {
      const capped =
        sessionFiltered.length > maxBars
          ? sessionFiltered.slice(-maxBars)
          : sessionFiltered;
      return { bars: capped, source: "native" as const };
    }

    // Provider returned 1min or different; aggregate client-side
    const agg = aggregateBars(sessionFiltered, interval, tz);
    const capped = agg.length > maxBars ? agg.slice(-maxBars) : agg;
    return { bars: capped, source: "aggregated" as const };
  }, [symbol, interval, daily, intra, isDaily, session, tz, maxBars]);

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
    error,
    source,
    bars,
    dates: enriched.dates,
    ohlc: enriched.ohlc,
    volume: enriched.volume,
    st: enriched.st,
    rsi: enriched.rsi,
    macd: enriched.macd,
  };
};
