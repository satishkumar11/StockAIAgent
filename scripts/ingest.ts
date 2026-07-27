import fs from "node:fs";
import path from "node:path";
import { loadZerodhaLots, loadInvestRightLots } from "../lib/ingest/csv";
import { buildPortfolio } from "../lib/ingest/merge";

const RAW_DIR = path.join(process.cwd(), "data", "raw");
const ZERODHA_PATH = path.join(RAW_DIR, "zerodha-holdings.csv");
const INVEST_RIGHT_PATH = path.join(RAW_DIR, "invest-right.csv");
const OUTPUT_PATH = path.join(process.cwd(), "data", "portfolio.json");

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function main() {
  const lots = [
    ...(fs.existsSync(ZERODHA_PATH) ? loadZerodhaLots(ZERODHA_PATH) : []),
    ...(fs.existsSync(INVEST_RIGHT_PATH) ? loadInvestRightLots(INVEST_RIGHT_PATH) : []),
  ];

  if (lots.length === 0) {
    console.error(
      `No raw CSVs found in ${RAW_DIR}. Expected zerodha-holdings.csv and/or invest-right.csv.`
    );
    process.exit(1);
  }

  const rawInvested = lots.reduce((sum, l) => sum + l.invested, 0);
  const rawCurrentValue = lots.reduce((sum, l) => sum + l.currentValue, 0);

  const portfolio = buildPortfolio(lots);

  const investedDiff = Math.abs(portfolio.totals.invested - rawInvested);
  const currentValueDiff = Math.abs(portfolio.totals.currentValue - rawCurrentValue);
  const TOLERANCE = 1; // rupee

  if (investedDiff > TOLERANCE || currentValueDiff > TOLERANCE) {
    console.warn(
      `WARNING: merged totals differ from raw sums by more than ₹${TOLERANCE} ` +
        `(invested diff ₹${round2(investedDiff)}, current value diff ₹${round2(currentValueDiff)}). ` +
        `A row may have been dropped or misparsed.`
    );
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(portfolio, null, 2));

  const uncategorized = portfolio.holdings.filter((h) => h.sector === "Uncategorized");

  console.log(`Wrote ${OUTPUT_PATH}`);
  console.log(`Lots parsed: ${lots.length} (from ${lots.filter((l) => l.broker === "zerodha").length} zerodha + ${lots.filter((l) => l.broker === "invest-right").length} invest-right)`);
  console.log(`Merged holdings: ${portfolio.holdings.length}`);
  console.log(`Total invested: ₹${round2(portfolio.totals.invested)}`);
  console.log(`Total current value: ₹${round2(portfolio.totals.currentValue)}`);
  console.log(`Total P&L: ₹${round2(portfolio.totals.pnl)} (${round2(portfolio.totals.pnlPct)}%)`);
  if (uncategorized.length > 0) {
    console.log(
      `Uncategorized symbols (edit data/sectors.json to fix): ${uncategorized.map((h) => h.symbol).join(", ")}`
    );
  }
}

main();
