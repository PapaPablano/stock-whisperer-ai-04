// services/finnhub.ts
// Finnhub API client for intraday bars fallback when Polygon throttles.
// Designed for Deno/Supabase Edge runtime (fetch/WebSocket available globally).

export type FinnhubBar = {
  t: number; // Unix timestamp (milliseconds)
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
};

export type FinnhubQuote = {
  c: number;
  h: number;
  l: number;
  o: number;
  pc: number;
  t: number;
};

export type FinnhubParams = {
  apiKey: string;
  baseUrl?: string;
  cacheTtlMs?: number;
  requestDedup?: boolean;
};

export type BarRequest = {
  symbol: string;
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  resolution: "1" | "5" | "15" | "30" | "60" | "D" | "W" | "M";
};

const DEFAULT_BASE_URL = "https://finnhub.io/api/v1";
const DEFAULT_CACHE_TTL_MS = 60 * 1000; // 1 min for bars

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

type FinnhubEventHandlers = {
  trade: (payload: { symbol: string; price: number; timestamp: number }) => void;
  quote: (payload: { symbol: string; bid: number; ask: number; timestamp: number }) => void;
  error: (payload: unknown) => void;
  close: () => void;
};

type FinnhubEventName = keyof FinnhubEventHandlers;

type FinnhubWsMessage = {
  type?: string;
  data?: Array<Record<string, unknown>>;
};

export class FinnhubClient {
  private apiKey: string;
  private baseUrl: string;
  private cacheTtlMs: number;
  private requestDedup: boolean;
  private cache: Map<string, CacheEntry<unknown>> = new Map();
  private inFlightRequests: Map<string, Promise<unknown>> = new Map();
  private listeners: Map<FinnhubEventName, Set<(payload: unknown) => void>> = new Map();
  private socket: WebSocket | null = null;

  constructor(params: FinnhubParams) {
    this.apiKey = params.apiKey;
    this.baseUrl = params.baseUrl ?? DEFAULT_BASE_URL;
    this.cacheTtlMs = params.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
    this.requestDedup = params.requestDedup ?? true;
  }

  on<EventName extends FinnhubEventName>(event: EventName, handler: FinnhubEventHandlers[EventName]): void {
  const listeners = this.listeners.get(event) ?? new Set<(payload: unknown) => void>();
  listeners.add(handler as (payload: unknown) => void);
  this.listeners.set(event, listeners);
  }

  off<EventName extends FinnhubEventName>(event: EventName, handler: FinnhubEventHandlers[EventName]): void {
  const listeners = this.listeners.get(event);
  if (!listeners) return;
  listeners.delete(handler as unknown as (payload: unknown) => void);
    if (listeners.size === 0) {
      this.listeners.delete(event);
    }
  }

  private emit(event: FinnhubEventName, payload?: unknown): void {
    const listeners = this.listeners.get(event);
    if (!listeners || listeners.size === 0) return;
    for (const listener of listeners) {
      try {
        (listener as (payload: unknown) => void)(payload);
      } catch (error) {
        console.error("[Finnhub] listener error", error);
      }
    }
  }

  clearCache(): void {
    this.cache.clear();
  }

  async getBars(req: BarRequest): Promise<FinnhubBar[]> {
    const cacheKey = `bars:${req.symbol}:${req.resolution}:${req.from}:${req.to}`;

    const cached = this.cache.get(cacheKey) as CacheEntry<FinnhubBar[]> | undefined;
    if (cached && Date.now() < cached.expiry) {
      return cached.data;
    }

    if (this.requestDedup && this.inFlightRequests.has(cacheKey)) {
      return this.inFlightRequests.get(cacheKey) as Promise<FinnhubBar[]>;
    }

    const promise = this.fetchBars(req);
    if (this.requestDedup) {
      this.inFlightRequests.set(cacheKey, promise);
    }

    try {
      const result = await promise;
      this.cache.set(cacheKey, { data: result, expiry: Date.now() + this.cacheTtlMs });
      return result;
    } finally {
      if (this.requestDedup) {
        this.inFlightRequests.delete(cacheKey);
      }
    }
  }

  private async fetchBars(req: BarRequest): Promise<FinnhubBar[]> {
    const url = new URL(`${this.baseUrl}/stock/candle`);
    url.searchParams.set("symbol", req.symbol);
    url.searchParams.set("resolution", req.resolution);
    url.searchParams.set("from", this.dateToUnixSeconds(req.from).toString());
    url.searchParams.set("to", this.dateToUnixSeconds(req.to).toString());
    url.searchParams.set("token", this.apiKey);

    const response = await fetch(url.toString());

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Finnhub getBars failed: ${response.status} ${text}`);
    }

    const json = (await response.json()) as { s?: string; t?: number[]; o?: number[]; h?: number[]; l?: number[]; c?: number[]; v?: number[] };

    if (json.s === "no_data") {
      return [];
    }

    if (json.s !== "ok") {
      throw new Error(`Finnhub API error: ${json.s ?? "unknown"}`);
    }

    const bars: FinnhubBar[] = [];
    const { t, o, h, l, c, v } = json;
    if (!t || !o || !h || !l || !c) {
      return bars;
    }

    for (let i = 0; i < t.length; i++) {
      bars.push({
        t: t[i] * 1000,
        o: o[i] ?? 0,
        h: h[i] ?? 0,
        l: l[i] ?? 0,
        c: c[i] ?? 0,
        v: v?.[i] ?? 0,
      });
    }

    return bars;
  }

  async getQuote(symbol: string): Promise<FinnhubQuote | null> {
    const cacheKey = `quote:${symbol}`;

    const cached = this.cache.get(cacheKey) as CacheEntry<FinnhubQuote> | undefined;
    if (cached && Date.now() < cached.expiry) {
      return cached.data;
    }

    if (this.requestDedup && this.inFlightRequests.has(cacheKey)) {
      return this.inFlightRequests.get(cacheKey) as Promise<FinnhubQuote | null>;
    }

    const promise = this.fetchQuote(symbol);
    if (this.requestDedup) {
      this.inFlightRequests.set(cacheKey, promise);
    }

    try {
      const result = await promise;
      if (result) {
        this.cache.set(cacheKey, { data: result, expiry: Date.now() + 5_000 });
      }
      return result;
    } finally {
      if (this.requestDedup) {
        this.inFlightRequests.delete(cacheKey);
      }
    }
  }

  private async fetchQuote(symbol: string): Promise<FinnhubQuote | null> {
    const url = new URL(`${this.baseUrl}/quote`);
    url.searchParams.set("symbol", symbol);
    url.searchParams.set("token", this.apiKey);

    const response = await fetch(url.toString());

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Finnhub getQuote failed: ${response.status} ${text}`);
    }

    const json = (await response.json()) as { c?: number; h?: number; l?: number; o?: number; pc?: number; t?: number };
    if (json.c === undefined) {
      return null;
    }

    return {
      c: json.c,
      h: json.h ?? json.c,
      l: json.l ?? json.c,
      o: json.o ?? json.c,
      pc: json.pc ?? json.c,
      t: json.t ?? Date.now(),
    };
  }

  connectWebSocket(symbols: string[]): void {
    if (!symbols.length) {
      throw new Error("At least one symbol required for Finnhub WebSocket");
    }

    const wsUrl = `wss://ws.finnhub.io?token=${this.apiKey}`;
    const ws = new WebSocket(wsUrl);
    this.socket = ws;

    ws.onopen = () => {
      console.log("[Finnhub WS] Connected");
      for (const sym of symbols) {
        ws.send(JSON.stringify({ type: "subscribe", symbol: sym }));
      }
    };

    ws.onmessage = (event: MessageEvent<string>) => {
      try {
        const msg = JSON.parse(event.data) as FinnhubWsMessage;
        if (msg.type === "trade" && Array.isArray(msg.data)) {
          for (const trade of msg.data) {
            const symbol = String(trade.s ?? "");
            const price = Number(trade.p ?? 0);
            const timestamp = Number(trade.t ?? Date.now());
            this.emit("trade", { symbol, price, timestamp });
          }
        } else if (msg.type === "quote" && Array.isArray(msg.data)) {
          for (const quote of msg.data) {
            const symbol = String(quote.s ?? "");
            const bid = Number(quote.b ?? 0);
            const ask = Number(quote.a ?? 0);
            const timestamp = Number(quote.t ?? Date.now());
            this.emit("quote", { symbol, bid, ask, timestamp });
          }
        }
      } catch (error) {
        console.error("[Finnhub WS] Parse error", error);
        this.emit("error", error);
      }
    };

    ws.onerror = (event: Event | ErrorEvent) => {
      console.error("[Finnhub WS] Error", event);
      this.emit("error", event);
    };

    ws.onclose = () => {
      console.log("[Finnhub WS] Closed");
      this.emit("close", undefined);
      this.socket = null;
    };
  }

  disconnectWebSocket(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }

  private dateToUnixSeconds(dateStr: string): number {
    return Math.floor(new Date(`${dateStr}T00:00:00Z`).getTime() / 1000);
  }
}

export default FinnhubClient;
