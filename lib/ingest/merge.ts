import type { BrokerLot, MergedHolding, Portfolio, SegmentSummary } from "./types";
import { canonicalizeSymbol, lookupSector } from "./sectors";

export function mergeLots(allLots: BrokerLot[]): MergedHolding[] {
  const bySymbol = new Map<string, BrokerLot[]>();

  for (const lot of allLots) {
    const symbol = canonicalizeSymbol(lot.symbol);
    const canonicalLot = { ...lot, symbol };
    const existing = bySymbol.get(symbol);
    if (existing) existing.push(canonicalLot);
    else bySymbol.set(symbol, [canonicalLot]);
  }

  const holdings: MergedHolding[] = [];

  for (const [symbol, lots] of bySymbol) {
    const qty = lots.reduce((sum, l) => sum + l.qty, 0);
    const invested = lots.reduce((sum, l) => sum + l.invested, 0);
    const currentValue = lots.reduce((sum, l) => sum + l.currentValue, 0);
    const pnl = currentValue - invested;
    const pnlPct = invested !== 0 ? (pnl / invested) * 100 : 0;
    const avgCost = qty !== 0 ? invested / qty : 0;
    const dayChgPct =
      currentValue !== 0
        ? lots.reduce((sum, l) => sum + l.dayChgPct * l.currentValue, 0) / currentValue
        : 0;

    const { companyName, sector } = lookupSector(symbol);

    holdings.push({
      symbol,
      companyName,
      sector,
      qty,
      avgCost,
      invested,
      currentValue,
      pnl,
      pnlPct,
      dayChgPct,
      lots,
    });
  }

  holdings.sort((a, b) => b.currentValue - a.currentValue);
  return holdings;
}

export function summarizeSegments(holdings: MergedHolding[]): SegmentSummary[] {
  const bySector = new Map<string, SegmentSummary>();

  for (const holding of holdings) {
    const existing = bySector.get(holding.sector);
    if (existing) {
      existing.invested += holding.invested;
      existing.currentValue += holding.currentValue;
      existing.holdingCount += 1;
    } else {
      bySector.set(holding.sector, {
        sector: holding.sector,
        invested: holding.invested,
        currentValue: holding.currentValue,
        pnl: 0,
        pnlPct: 0,
        holdingCount: 1,
      });
    }
  }

  const segments = Array.from(bySector.values()).map((segment) => {
    const pnl = segment.currentValue - segment.invested;
    const pnlPct = segment.invested !== 0 ? (pnl / segment.invested) * 100 : 0;
    return { ...segment, pnl, pnlPct };
  });

  segments.sort((a, b) => b.currentValue - a.currentValue);
  return segments;
}

export function buildPortfolio(allLots: BrokerLot[]): Portfolio {
  const holdings = mergeLots(allLots);
  const segments = summarizeSegments(holdings);

  const invested = holdings.reduce((sum, h) => sum + h.invested, 0);
  const currentValue = holdings.reduce((sum, h) => sum + h.currentValue, 0);
  const pnl = currentValue - invested;
  const pnlPct = invested !== 0 ? (pnl / invested) * 100 : 0;

  return {
    generatedAt: new Date().toISOString(),
    totals: { invested, currentValue, pnl, pnlPct },
    segments,
    holdings,
  };
}
