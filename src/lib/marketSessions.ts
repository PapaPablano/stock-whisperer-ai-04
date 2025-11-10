// Session templates and helpers

export type SessionTemplate = "EQUITY_RTH" | "FUTURES_EXT" | "CRYPTO_247";

export const SESSIONS: Record<
  SessionTemplate,
  { tz: string; windows: { start: string; end: string }[] }
> = {
  EQUITY_RTH: {
    tz: "America/New_York",
    windows: [{ start: "09:30", end: "16:00" }],
  },
  FUTURES_EXT: {
    tz: "America/Chicago",
    windows: [{ start: "18:00", end: "17:00" }], // wraps midnight
  },
  CRYPTO_247: {
    tz: "UTC",
    windows: [{ start: "00:00", end: "24:00" }],
  },
};

// Simple resolver; keep equities default for now.
export const resolveSession = (symbol: string): SessionTemplate => {
  if (symbol.endsWith("USD") || symbol.includes("BTC") || symbol.includes("ETH"))
    return "CRYPTO_247";
  if (["ES", "NQ", "CL", "GC", "ZB", "ZN"].some((r) => symbol.startsWith(r)))
    return "FUTURES_EXT";
  return "EQUITY_RTH";
};
