import { OptionChain } from '../schwab-api/types'

type Props = {
  contracts: OptionChain[]
  title?: string
}

export function OptionsChain({ contracts, title = 'Option Chain' }: Props) {
  if (contracts.length === 0) {
    return <div className="p-4 text-sm text-muted-foreground">No option data available.</div>
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
              <th className="px-3 py-2 text-left font-medium">Option</th>
              <th className="px-3 py-2 text-right font-medium">Strike</th>
              <th className="px-3 py-2 text-right font-medium">Bid</th>
              <th className="px-3 py-2 text-right font-medium">Ask</th>
              <th className="px-3 py-2 text-right font-medium">Last</th>
              <th className="px-3 py-2 text-right font-medium">IV</th>
              <th className="px-3 py-2 text-right font-medium">Delta</th>
              <th className="px-3 py-2 text-right font-medium">Gamma</th>
              <th className="px-3 py-2 text-right font-medium">Theta</th>
              <th className="px-3 py-2 text-right font-medium">Vega</th>
              <th className="px-3 py-2 text-right font-medium">Volume</th>
              <th className="px-3 py-2 text-right font-medium">Open Interest</th>
              <th className="px-3 py-2 text-right font-medium">Expiry</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {contracts.map((contract) => (
              <tr key={contract.optionSymbol}>
                <td className="px-3 py-2 font-mono">
                  {contract.underlyingSymbol} {contract.contractType}
                </td>
                <td className="px-3 py-2 text-right">{contract.strikePrice.toFixed(2)}</td>
                <td className="px-3 py-2 text-right">{contract.bidPrice.toFixed(2)}</td>
                <td className="px-3 py-2 text-right">{contract.askPrice.toFixed(2)}</td>
                <td className="px-3 py-2 text-right">{contract.lastPrice.toFixed(2)}</td>
                <td className="px-3 py-2 text-right">{(contract.impliedVolatility * 100).toFixed(2)}%</td>
                <td className="px-3 py-2 text-right">{contract.greeks.delta.toFixed(3)}</td>
                <td className="px-3 py-2 text-right">{contract.greeks.gamma.toFixed(3)}</td>
                <td className="px-3 py-2 text-right">{contract.greeks.theta.toFixed(3)}</td>
                <td className="px-3 py-2 text-right">{contract.greeks.vega.toFixed(3)}</td>
                <td className="px-3 py-2 text-right">{contract.volume.toLocaleString()}</td>
                <td className="px-3 py-2 text-right">{contract.openInterest.toLocaleString()}</td>
                <td className="px-3 py-2 text-right">{contract.expirationDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
