// services/polygonFallback.ts
// Fallback strategy: try Polygon first, fallback to Finnhub on throttling or outages.

import type { PolygonClient } from "./polygon.ts";
import { FinnhubClient, type FinnhubBar } from "./finnhub.ts";

export type Bar = {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v?: number;
};

export type BarsResult = {
  bars: Bar[];
  provider: "polygon" | "finnhub";
};

export type BarsFallbackParams = {
  polygonClient: PolygonClient;
  finnhubClient: FinnhubClient;
  maxRetries?: number;
  backoffMsInitial?: number;
};

const isRetriable = (status?: number, message?: string): boolean => {
  if (!status) {
    if (!message) return false;
    const lower = message.toLowerCase();
    return lower.includes("timeout") || lower.includes("network") || lower.includes("fetch");
  }
  if (status === 429) return true;
  if (status >= 500) return true;
  return false;
};

export class BarsFallback {
  private polygon: PolygonClient;
  private finnhub: FinnhubClient;
  private maxRetries: number;
  private backoffMsInitial: number;

  constructor(params: BarsFallbackParams) {
    this.polygon = params.polygonClient;
    this.finnhub = params.finnhubClient;
    this.maxRetries = params.maxRetries ?? 2;
    this.backoffMsInitial = params.backoffMsInitial ?? 1_000;
  }

  async getBars(symbol: string, from: string, to: string, resolution: string = "1m"): Promise<BarsResult> {
    let lastError: unknown = null;
    const normalizedResolution = normalizeResolution(resolution);

    try {
      const polygonBars = await this.polygon.getAggs(symbol, normalizedResolution, from, to);
      const mapped = polygonBars.map((bar) => ({
        t: bar.t,
        o: bar.o,
        h: bar.h,
        l: bar.l,
        c: bar.c,
        v: bar.v,
      }));
      return { bars: mapped, provider: "polygon" };
    } catch (error) {
      const status = (error as { status?: number }).status;
      const message = error instanceof Error ? error.message : undefined;
      if (!isRetriable(status, message)) {
        throw error;
      }
      lastError = error;
      console.warn(`[Fallback] Polygon failed (${status ?? "n/a"}): ${message ?? "unknown"}`);
    }

    let backoff = this.backoffMsInitial;
    const finnhubResolution = toFinnhubResolution(normalizedResolution);
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        console.log(`[Fallback] Finnhub attempt ${attempt + 1}/${this.maxRetries}`);
        const result = await this.finnhub.getBars({ symbol, from, to, resolution: finnhubResolution });
        const aggregated = aggregateFinnhubBars(result, normalizedResolution);
        const mapped = aggregated.map((bar) => ({
          t: bar.t,
          o: bar.o,
          h: bar.h,
          l: bar.l,
          c: bar.c,
          v: bar.v,
        }));
        return { bars: mapped, provider: "finnhub" };
      } catch (error) {
        lastError = error;
        if (attempt < this.maxRetries - 1) {
          console.warn(`[Fallback] Finnhub attempt ${attempt + 1} failed, retrying in ${backoff}ms...`);
          await this.sleep(backoff);
          backoff *= 2;
        }
      }
    }

    const finalMessage = lastError instanceof Error ? lastError.message : String(lastError ?? "unknown");
    throw new Error(`[Fallback] All providers exhausted. Last error: ${finalMessage}`);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export default BarsFallback;

const normalizeResolution = (resolution: string): string => {
  if (!resolution) return "1m";
  const value = resolution.toLowerCase();
  switch (value) {
    case "1":
    case "1m":
      return "1m";
    case "5":
    case "5m":
      return "5m";
    case "10":
    case "10m":
      return "10m";
    case "15":
    case "15m":
      return "15m";
    case "30":
    case "30m":
      return "30m";
    case "60":
    case "60m":
    case "1h":
      return "1h";
    case "4h":
    case "240":
    case "240m":
      return "4h";
    case "d":
    case "1d":
    case "day":
      return "1d";
    default:
      return value;
  }
};

const toFinnhubResolution = (resolution: string): "1" | "5" | "15" | "30" | "60" | "D" | "W" | "M" => {
  switch (resolution) {
    case "1m":
      return "1";
    case "5m":
      return "5";
    case "10m":
      return "1";
    case "15m":
      return "15";
    case "30m":
      return "5";
    case "1h":
      return "60";
    case "4h":
      return "60";
    case "1d":
      return "D";
    default:
      return "1";
  }
};

const aggregateFinnhubBars = (bars: FinnhubBar[], resolution: string): FinnhubBar[] => {
  const normalized = normalizeResolution(resolution);
  if (normalized === "1m") {
    return bars;
  }

  if (normalized === "1d") {
    return bars;
  }

  const minuteBuckets: Record<string, number> = {
    "5m": 5,
    "10m": 10,
    "15m": 15,
    "30m": 30,
    "1h": 60,
    "4h": 240,
  };

  const bucketMinutes = minuteBuckets[normalized];
  if (!bucketMinutes) {
    return bars;
  }

  const bucketMs = bucketMinutes * 60 * 1000;
  const aggregated: FinnhubBar[] = [];
  let current: FinnhubBar & { start: number } | null = null;

  for (const bar of bars) {
    const start = Math.floor(bar.t / bucketMs) * bucketMs;
    if (!current || current.start !== start) {
      if (current) {
        aggregated.push({ t: current.start, o: current.o, h: current.h, l: current.l, c: current.c, v: current.v });
      }
      current = { start, t: start, o: bar.o, h: bar.h, l: bar.l, c: bar.c, v: bar.v };
      continue;
    }

    current.h = Math.max(current.h, bar.h);
    current.l = Math.min(current.l, bar.l);
    current.c = bar.c;
    current.v += bar.v;
  }

  if (current) {
    aggregated.push({ t: current.start, o: current.o, h: current.h, l: current.l, c: current.c, v: current.v });
  }

  return aggregated;
};
