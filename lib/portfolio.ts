import fs from "node:fs";
import path from "node:path";
import type { Portfolio } from "./ingest/types";

const PORTFOLIO_PATH = path.join(process.cwd(), "data", "portfolio.json");

export function getPortfolio(): Portfolio | null {
  if (!fs.existsSync(PORTFOLIO_PATH)) return null;
  return JSON.parse(fs.readFileSync(PORTFOLIO_PATH, "utf-8")) as Portfolio;
}
