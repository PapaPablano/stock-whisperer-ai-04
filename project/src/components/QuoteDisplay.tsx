import { Quote } from '../schwab-api/types'

type Props = {
  quotes: Quote[]
  title?: string
}

export function QuoteDisplay({ quotes, title = 'Quotes' }: Props) {
  if (quotes.length === 0) {
    return <div className="p-4 text-sm text-muted-foreground">No quotes available.</div>
  }

  return (
    <section className="space-y-4">
      <header>
        <h2 className="text-lg font-semibold">{title}</h2>
      </header>
      <div className="overflow-x-auto rounded border border-border">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Symbol</th>
              <th className="px-3 py-2 text-right font-medium">Bid</th>
              <th className="px-3 py-2 text-right font-medium">Ask</th>
              <th className="px-3 py-2 text-right font-medium">Last</th>
              <th className="px-3 py-2 text-right font-medium">Volume</th>
              <th className="px-3 py-2 text-right font-medium">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {quotes.map((quote) => (
              <tr key={quote.symbol}>
                <td className="px-3 py-2 font-mono">{quote.symbol}</td>
                <td className="px-3 py-2 text-right">{quote.bidPrice.toFixed(2)}</td>
                <td className="px-3 py-2 text-right">{quote.askPrice.toFixed(2)}</td>
                <td className="px-3 py-2 text-right">{quote.lastPrice.toFixed(2)}</td>
                <td className="px-3 py-2 text-right">{quote.volume.toLocaleString()}</td>
                <td className="px-3 py-2 text-right">
                  {new Date(quote.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
