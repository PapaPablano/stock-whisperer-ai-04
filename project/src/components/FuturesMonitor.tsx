import { FutureQuote } from '../schwab-api/types'

type Props = {
  contracts: FutureQuote[]
  title?: string
}

export function FuturesMonitor({ contracts, title = 'Futures Monitor' }: Props) {
  if (contracts.length === 0) {
    return <div className="p-4 text-sm text-muted-foreground">No futures data available.</div>
  }

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-lg font-semibold">{title}</h2>
      </header>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {contracts.map((contract) => {
          const change = contract.lastPrice - contract.openPrice
          const changePct = contract.openPrice ? (change / contract.openPrice) * 100 : 0
          const isUp = change >= 0

          return (
            <article key={contract.symbol} className="rounded border border-border p-4 shadow-sm">
              <header className="mb-2 flex items-center justify-between">
                <h3 className="font-medium">{contract.symbol}</h3>
                <span className={`text-sm ${isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {change >= 0 ? '+' : ''}{change.toFixed(2)} ({changePct.toFixed(2)}%)
                </span>
              </header>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">Last</dt>
                  <dd className="font-semibold">{contract.lastPrice.toFixed(2)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Volume</dt>
                  <dd>{contract.volume.toLocaleString()}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Bid</dt>
                  <dd>{contract.bidPrice.toFixed(2)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Ask</dt>
                  <dd>{contract.askPrice.toFixed(2)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Open Interest</dt>
                  <dd>{contract.openInterest.toLocaleString()}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Range</dt>
                  <dd>{contract.lowPrice.toFixed(2)} - {contract.highPrice.toFixed(2)}</dd>
                </div>
              </dl>
            </article>
          )
        })}
      </div>
    </section>
  )
}
