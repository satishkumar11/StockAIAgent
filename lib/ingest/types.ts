export type Broker = "zerodha" | "invest-right";

export interface BrokerLot {
  broker: Broker;
  symbol: string;
  qty: number;
  avgCost: number;
  ltp: number;
  invested: number;
  currentValue: number;
  pnl: number;
  dayChgPct: number;
  realisedPnl?: number;
}

export interface SectorInfo {
  companyName: string;
  sector: string;
}

export interface MergedHolding {
  symbol: string;
  companyName: string;
  sector: string;
  qty: number;
  avgCost: number;
  invested: number;
  currentValue: number;
  pnl: number;
  pnlPct: number;
  dayChgPct: number;
  lots: BrokerLot[];
}

export interface SegmentSummary {
  sector: string;
  invested: number;
  currentValue: number;
  pnl: number;
  pnlPct: number;
  holdingCount: number;
}

export interface Portfolio {
  generatedAt: string;
  totals: {
    invested: number;
    currentValue: number;
    pnl: number;
    pnlPct: number;
  };
  segments: SegmentSummary[];
  holdings: MergedHolding[];
}
