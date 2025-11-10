export type OhlcPoint = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

export type SeriesOpts = {
  color?: string;
  lineWidth?: number;
};

const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

const isOhlcLike = (value: unknown): value is Partial<OhlcPoint> => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return typeof record.date === 'string'
    && (record.open === undefined || isFiniteNumber(record.open))
    && (record.high === undefined || isFiniteNumber(record.high))
    && (record.low === undefined || isFiniteNumber(record.low))
    && (record.close === undefined || isFiniteNumber(record.close))
    && (record.volume === undefined || record.volume === null || isFiniteNumber(record.volume));
};

export const toSeries = (points: unknown[]): OhlcPoint[] => {
  if (!Array.isArray(points)) {
    return [];
  }

  return points
    .filter(isOhlcLike)
    .map((point) => {
      const volumeValue = point.volume;
      const volume = volumeValue === undefined || volumeValue === null || !isFiniteNumber(volumeValue)
        ? undefined
        : volumeValue;

      const open = isFiniteNumber(point.open) ? point.open : 0;
      const high = isFiniteNumber(point.high) ? point.high : open;
      const low = isFiniteNumber(point.low) ? point.low : open;
      const close = isFiniteNumber(point.close) ? point.close : open;

      return {
        date: point.date,
        open,
        high,
        low,
        close,
        ...(volume !== undefined ? { volume } : {}),
      } satisfies OhlcPoint;
    });
};
