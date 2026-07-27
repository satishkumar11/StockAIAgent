import fs from "node:fs";
import { parse } from "csv-parse/sync";
import type { BrokerLot } from "./types";

function readFileStripBom(filePath: string): string {
  const raw = fs.readFileSync(filePath, "utf-8");
  return raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
}

function toNumber(value: string): number {
  const n = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : 0;
}

function isJunkRow(symbol: string | undefined): boolean {
  if (!symbol) return true;
  return /^total$/i.test(symbol.trim());
}

export function loadZerodhaLots(filePath: string): BrokerLot[] {
  const content = readFileStripBom(filePath);
  const rows: Record<string, string>[] = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });

  return rows
    .filter((row) => !isJunkRow(row["Instrument"]))
    .map((row) => ({
      broker: "zerodha" as const,
      symbol: row["Instrument"].trim().toUpperCase(),
      qty: toNumber(row["Qty."]),
      avgCost: toNumber(row["Avg. cost"]),
      ltp: toNumber(row["LTP"]),
      invested: toNumber(row["Invested"]),
      currentValue: toNumber(row["Cur. val"]),
      pnl: toNumber(row["P&L"]),
      dayChgPct: toNumber(row["Day chg."]),
    }));
}

export function loadInvestRightLots(filePath: string): BrokerLot[] {
  const content = readFileStripBom(filePath);
  const rows: Record<string, string>[] = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
    from_line: 3, // line 1 is the "Trading account: ..." preamble, line 2 is blank
  });

  return rows
    .filter((row) => !isJunkRow(row["SYMBOL"]))
    .map((row) => ({
      broker: "invest-right" as const,
      symbol: row["SYMBOL"].trim().toUpperCase(),
      qty: toNumber(row["QTY"]),
      avgCost: toNumber(row["AVG PRICE"]),
      ltp: toNumber(row["LTP"]),
      invested: toNumber(row["INVESTMENT VALUE"]),
      currentValue: toNumber(row["CURRENT VALUE"]),
      pnl: toNumber(row["UNREALISED P&L"]),
      dayChgPct: toNumber(row["TODAY'S CHG %"]),
      realisedPnl: toNumber(row["REALISED P&L"]),
    }));
}
