// Polygon fallback removed after migrating to Alpaca.
export type PolygonAgg = never

export interface PolygonClient {
  getAggs(): Promise<never>
}

export default class DeprecatedPolygonClient implements PolygonClient {
  async getAggs(): Promise<never> {
    throw new Error('Polygon client has been removed; use Alpaca integrations instead.')
  }
}
