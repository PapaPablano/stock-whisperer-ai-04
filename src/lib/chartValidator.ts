export function validateParity(
  symbol: string,
  legacyLast: { close: number; st: number },
  plotlyLast: { close: number; st: number }
) {
  const epsClose = 1e-6;
  const epsST = 1e-3;
  const okClose = Math.abs(legacyLast.close - plotlyLast.close) <= epsClose;
  const okST = Math.abs((legacyLast.st ?? 0) - (plotlyLast.st ?? 0)) <= epsST;
  console.table([
    {
      symbol,
      okClose,
      okST,
      dClose: legacyLast.close - plotlyLast.close,
      dST: (legacyLast.st ?? 0) - (plotlyLast.st ?? 0),
    },
  ]);
  return okClose && okST;
}
