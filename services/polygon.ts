// services/polygon.ts
// Shared Polygon client contract used by fallback adapters.

export type PolygonAgg = {
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
};

export interface PolygonClient {
  /**
   * Fetch aggregated bars for a symbol between two dates (inclusive).
   * @param symbol Stock ticker (e.g., AAPL)
   * @param resolution Interval identifier understood by the client (e.g., '1m', '5m', '60', 'D').
   * @param from ISO date (YYYY-MM-DD)
   * @param to ISO date (YYYY-MM-DD)
   */
  getAggs(symbol: string, resolution: string, from: string, to: string): Promise<PolygonAgg[]>;
}

export type { PolygonClient as default };
