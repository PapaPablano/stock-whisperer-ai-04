import { DateTime } from "luxon";
import { SESSIONS, type SessionTemplate } from "./marketSessions";

export type Interval = "1m" | "5m" | "10m" | "15m" | "30m" | "1h" | "4h" | "1d";

export type Bar = {
  datetime: string; // ISO
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

const minutesFor = (i: Interval) =>
  i === "1m"
    ? 1
    : i === "5m"
    ? 5
    : i === "10m"
    ? 10
    : i === "15m"
    ? 15
    : i === "30m"
    ? 30
    : i === "1h"
    ? 60
    : i === "4h"
    ? 240
    : 1440;

const inWindow = (local: DateTime, start: string, end: string) => {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const s = local.set({ hour: sh, minute: sm, second: 0, millisecond: 0 });
  const e = local.set({
    hour: eh === 24 ? 23 : eh,
    minute: eh === 24 ? 59 : em,
    second: eh === 24 ? 59 : 0,
    millisecond: eh === 24 ? 999 : 0,
  });
  // wrap window (e.g., 18:00->17:00 next day)
  if (e < s) return local >= s || local <= e;
  return local >= s && local <= e;
};

export function filterBySession(bars: Bar[], session: SessionTemplate): Bar[] {
  const { tz, windows } = SESSIONS[session];
  return bars.filter((b) => {
    const local = DateTime.fromISO(b.datetime).setZone(tz);
    return windows.some((w) => inWindow(local, w.start, w.end));
  });
}

export const floorToBucket = (iso: string, interval: Interval, tz: string) => {
  const dt = DateTime.fromISO(iso, { zone: tz });
  if (interval === "1d") return dt.startOf("day").toISO();
  const m = minutesFor(interval);
  const minutes = dt.hour * 60 + dt.minute;
  const floored = Math.floor(minutes / m) * m;
  const h = Math.floor(floored / 60);
  const min = floored % 60;
  return dt
    .set({ hour: h, minute: min, second: 0, millisecond: 0 })
    .toISO();
};

export function aggregateBars(bars: Bar[], target: Interval, tz: string): Bar[] {
  if (bars.length === 0) return [];
  const out = new Map<string, Bar>();
  for (const b of bars) {
    const key = floorToBucket(b.datetime, target, tz);
    const ex = out.get(key);
    if (!ex) {
      out.set(key, {
        datetime: key,
        open: b.open,
        high: b.high,
        low: b.low,
        close: b.close,
        volume: b.volume,
      });
    } else {
      ex.high = Math.max(ex.high, b.high);
      ex.low = Math.min(ex.low, b.low);
      ex.close = b.close;
      ex.volume += b.volume;
    }
  }
  return Array.from(out.values()).sort((a, z) => (a.datetime < z.datetime ? -1 : 1));
}
