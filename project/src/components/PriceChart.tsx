import { Candle } from '../schwab-api/types'

type Props = {
  history: Candle[]
  title?: string
}

const CHART_WIDTH = 480
const CHART_HEIGHT = 160

function buildSparklinePoints(candles: Candle[]): string {
  if (candles.length === 0) {
    return ''
  }

  const closes = candles.map((candle) => candle.close)
  const max = Math.max(...closes)
  const min = Math.min(...closes)
  const range = max - min || 1

  return candles
    .map((candle, index) => {
      const x = (index / (candles.length - 1 || 1)) * CHART_WIDTH
      const y = CHART_HEIGHT - ((candle.close - min) / range) * CHART_HEIGHT
      return `${x},${y}`
    })
    .join(' ')
}

export function PriceChart({ history, title = 'Price History' }: Props) {
  if (history.length === 0) {
    return <div className="p-4 text-sm text-muted-foreground">No price history available.</div>
  }

  const points = buildSparklinePoints(history)
  const latest = history[history.length - 1]

  return (
    <section className="space-y-4">
      <header className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        <div className="text-sm text-muted-foreground">
          Last close: <span className="font-semibold text-foreground">{latest.close.toFixed(2)}</span>
        </div>
      </header>
      <div className="overflow-hidden rounded border border-border bg-background p-4">
        <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} className="h-40 w-full">
          <polyline
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            points={points}
            className="text-primary"
          />
        </svg>
      </div>
    </section>
  )
}
