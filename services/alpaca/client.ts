// services/alpaca/client.ts
// Lightweight Alpaca Market Data REST client used across Supabase Edge functions.

export type AlpacaCredentials = {
  key: string;
  secret: string;
};

export type AlpacaRestClientOptions = {
  credentials: AlpacaCredentials;
  /** Defaults to https://data.alpaca.markets */
  baseUrl?: string;
  /** Optional fetch implementation override (for testing). */
  fetchImpl?: typeof fetch;
};

export type TimeframeUnit = "minute" | "hour" | "day";

export type GetBarsParams = {
  symbol: string;
  timeframe: `${number}${"Min" | "Hour" | "Day"}`;
  start?: string;
  end?: string;
  limit?: number;
  adjustment?: "raw" | "split";
  feed?: "iex" | "sip";
  sort?: "asc" | "desc";
  pageToken?: string;
};

export type AlpacaBar = {
  t: string;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
  n: number;
  vw?: number;
};

export type AlpacaQuote = {
  t: string;
  ap: number;
  as: number;
  bp: number;
  bs: number;
  c: string[];
  x: string;
};

export type AlpacaTrade = {
  t: string;
  p: number;
  s: number;
  c: string[];
  i: number;
  x: string;
};

export type GetLatestQuoteResponse = {
  symbol: string;
  quote: AlpacaQuote;
};

export type GetLatestTradeResponse = {
  symbol: string;
  trade: AlpacaTrade;
};

export type AlpacaTickerDetails = {
  name?: string;
  asset_class?: string;
  currency?: string;
  exchange?: string;
  symbol: string;
  status?: string;
};

export type GetTickerDetailsResponse = {
  ticker: AlpacaTickerDetails;
};

export type SearchTickersParams = {
  search?: string;
  symbols?: string;
  active?: boolean;
  assetClass?: string;
  locale?: string;
  exchange?: string;
  limit?: number;
  pageToken?: string;
};

export type SearchTickersResponse = {
  tickers: Array<{
    symbol: string;
    name?: string;
    exchange?: string;
    asset_class?: string;
    status?: string;
  }>;
  next_page_token?: string;
};

const DEFAULT_DATA_BASE_URL = "https://data.alpaca.markets";

const JSON_HEADERS = {
  "Content-Type": "application/json",
};

export class AlpacaRestClient {
  private readonly credentials: AlpacaCredentials;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: AlpacaRestClientOptions) {
    this.credentials = options.credentials;
    this.baseUrl = options.baseUrl ?? DEFAULT_DATA_BASE_URL;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async getLatestQuote(symbol: string, feed: "iex" | "sip" = "iex"): Promise<GetLatestQuoteResponse> {
    const path = `/v2/stocks/${encodeURIComponent(symbol)}/quotes/latest`;
    const url = new URL(path, this.baseUrl);
    url.searchParams.set("feed", feed);
    return this.request<GetLatestQuoteResponse>(url);
  }

  async getLatestTrade(symbol: string, feed: "iex" | "sip" = "iex"): Promise<GetLatestTradeResponse> {
    const path = `/v2/stocks/${encodeURIComponent(symbol)}/trades/latest`;
    const url = new URL(path, this.baseUrl);
    url.searchParams.set("feed", feed);
    return this.request<GetLatestTradeResponse>(url);
  }

  async getBars(params: GetBarsParams): Promise<{ bars: AlpacaBar[]; symbol: string; next_page_token?: string }> {
  const { symbol, timeframe, start, end, limit, adjustment, feed, sort, pageToken } = params;
    const path = `/v2/stocks/${encodeURIComponent(symbol)}/bars`;
    const url = new URL(path, this.baseUrl);
    url.searchParams.set("timeframe", timeframe);
    if (start) url.searchParams.set("start", start);
    if (end) url.searchParams.set("end", end);
    if (limit) url.searchParams.set("limit", String(limit));
    if (adjustment) url.searchParams.set("adjustment", adjustment);
    if (feed) url.searchParams.set("feed", feed);
  if (sort) url.searchParams.set("sort", sort);
  if (pageToken) url.searchParams.set("page_token", pageToken);
    return this.request<{ bars: AlpacaBar[]; symbol: string; next_page_token?: string }>(url);
  }

  async getTickerDetails(symbol: string): Promise<GetTickerDetailsResponse> {
    const path = `/v2/reference/tickers/${encodeURIComponent(symbol)}`;
    const url = new URL(path, this.baseUrl);
    return this.request<GetTickerDetailsResponse>(url);
  }

  async searchTickers(params: SearchTickersParams): Promise<SearchTickersResponse> {
    const url = new URL(`/v2/reference/tickers`, this.baseUrl);
    if (params.search) url.searchParams.set("search", params.search);
    if (params.symbols) url.searchParams.set("symbols", params.symbols);
    if (typeof params.active === "boolean") url.searchParams.set("active", String(params.active));
    if (params.assetClass) url.searchParams.set("asset_class", params.assetClass);
    if (params.locale) url.searchParams.set("locale", params.locale);
    if (params.exchange) url.searchParams.set("exchange", params.exchange);
    if (params.limit) url.searchParams.set("limit", String(params.limit));
    if (params.pageToken) url.searchParams.set("page_token", params.pageToken);
    return this.request<SearchTickersResponse>(url);
  }

  private async request<T>(url: URL): Promise<T> {
    const response = await this.fetchImpl(url.toString(), {
      method: "GET",
      headers: this.createHeaders(),
    });

    if (!response.ok) {
      const message = await this.safeReadBody(response);
      throw new Error(`Alpaca request failed: ${response.status} ${message}`);
    }

    return (await response.json()) as T;
  }

  private createHeaders(): HeadersInit {
    return {
      ...JSON_HEADERS,
      "Apca-Api-Key-Id": this.credentials.key,
      "Apca-Api-Secret-Key": this.credentials.secret,
    };
  }

  private async safeReadBody(response: Response): Promise<string> {
    try {
      return await response.text();
    } catch {
      return "<failed to read body>";
    }
  }
}

declare const Deno: { env?: { get(key: string): string | undefined } } | undefined;
declare const process: { env?: Record<string, string | undefined> } | undefined;

const readEnv = (key: string): string | undefined => {
  if (typeof Deno !== "undefined" && typeof Deno?.env?.get === "function") {
    return Deno.env.get(key);
  }
  if (typeof process !== "undefined" && typeof process.env === "object") {
    return process.env[key];
  }
  return undefined;
};

export const resolveAlpacaCredentials = (): AlpacaCredentials => {
  const key =
    readEnv("APCA_API_KEY_ID") ??
    readEnv("APCA-API-KEY-ID") ??
    readEnv("APCA_API_KEY") ??
    "";

  const secret =
    readEnv("APCA_API_SECRET_KEY") ??
    readEnv("APCA-API-SECRET-KEY") ??
    readEnv("APCA_API_SECRET") ??
    "";

  if (!key || !secret) {
    throw new Error("Missing Alpaca credentials. Ensure APCA_API_KEY_ID and APCA_API_SECRET_KEY are configured.");
  }

  return { key, secret };
};

export const createDefaultAlpacaClient = (): AlpacaRestClient =>
  new AlpacaRestClient({ credentials: resolveAlpacaCredentials() });
