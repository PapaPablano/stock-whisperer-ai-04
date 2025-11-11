// Deprecated Polygon/Finnhub fallback. Alpaca is now the primary data source.
export type Bar = never
export type BarsResult = never

export class BarsFallback {
  constructor() {
    throw new Error('BarsFallback has been removed. Switch to the Alpaca data pipeline.')
  }
}

export const normalizeResolution = (resolution: string): string => resolution
export const toFinnhubResolution = () => '1'
export const aggregateFinnhubBars = () => []
export const fetchNormalizedFinnhubBars = async () => [] as never

export default BarsFallback
