// services/alpaca/aggregator.ts
// Utilities to aggregate Alpaca trade stream events into one-minute OHLCV bars suitable for stock_cache upserts.

export type NormalizedTradeEvent = {
  symbol: string;
  price: number;
  volume: number;
  timestamp: number;
};

export type AggregatedBar = {
  symbol: string;
  start: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  tradeCount: number;
};

const MINUTE_MS = 60_000;

interface BucketState {
  symbol: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  tradeCount: number;
  start: number;
}

const minuteKey = (timestamp: number): number => Math.floor(timestamp / MINUTE_MS) * MINUTE_MS;

export class MinuteBarAggregator {
  private readonly buckets = new Map<string, Map<number, BucketState>>();

  ingestTrade(event: NormalizedTradeEvent): AggregatedBar[] {
    const { symbol, price, volume, timestamp } = event;
    if (!symbol || Number.isNaN(price) || Number.isNaN(timestamp)) {
      return [];
    }
    const safeVolume = Number.isFinite(volume) ? Math.max(volume, 0) : 0;

    const bucketStart = minuteKey(timestamp);
    let symbolBuckets = this.buckets.get(symbol);
    if (!symbolBuckets) {
      symbolBuckets = new Map<number, BucketState>();
      this.buckets.set(symbol, symbolBuckets);
    }
    const bucket = symbolBuckets.get(bucketStart);

    if (!bucket) {
      symbolBuckets.set(bucketStart, {
        symbol,
        open: price,
        high: price,
        low: price,
        close: price,
        volume: safeVolume,
        tradeCount: 1,
        start: bucketStart,
      });
    } else {
      bucket.high = Math.max(bucket.high, price);
      bucket.low = Math.min(bucket.low, price);
      bucket.close = price;
      bucket.volume += safeVolume;
      bucket.tradeCount += 1;
    }

    return this.flushCompletedBuckets(symbol, bucketStart);
  }

  flush(now: number = Date.now()): AggregatedBar[] {
    const ready: AggregatedBar[] = [];
    for (const [symbol, symbolBuckets] of this.buckets.entries()) {
      for (const [start, bucket] of symbolBuckets.entries()) {
        if (start <= minuteKey(now - MINUTE_MS)) {
          ready.push({
            symbol,
            start,
            open: bucket.open,
            high: bucket.high,
            low: bucket.low,
            close: bucket.close,
            volume: bucket.volume,
            tradeCount: bucket.tradeCount,
          });
          symbolBuckets.delete(start);
        }
      }
      if (symbolBuckets.size === 0) {
        this.buckets.delete(symbol);
      }
    }
    ready.sort((a, b) => a.start - b.start);
    return ready;
  }

  private flushCompletedBuckets(symbol: string, currentBucketStart: number): AggregatedBar[] {
    const ready: AggregatedBar[] = [];
    const symbolBuckets = this.buckets.get(symbol);
    if (!symbolBuckets) {
      return ready;
    }
    for (const [start, bucket] of symbolBuckets.entries()) {
      if (start < currentBucketStart) {
        ready.push({
          symbol,
          start,
          open: bucket.open,
          high: bucket.high,
          low: bucket.low,
          close: bucket.close,
          volume: bucket.volume,
          tradeCount: bucket.tradeCount,
        });
        symbolBuckets.delete(start);
      }
    }
    if (symbolBuckets.size === 0) {
      this.buckets.delete(symbol);
    }
    ready.sort((a, b) => a.start - b.start);
    return ready;
  }
}
