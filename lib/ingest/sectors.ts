import fs from "node:fs";
import path from "node:path";
import type { SectorInfo } from "./types";

const SECTORS_PATH = path.join(process.cwd(), "data", "sectors.json");
const ALIASES_PATH = path.join(process.cwd(), "data", "aliases.json");

let sectorsCache: Record<string, SectorInfo> | null = null;
let aliasesCache: Record<string, string> | null = null;

function loadJson<T>(filePath: string, fallback: T): T {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
}

export function canonicalizeSymbol(rawSymbol: string): string {
  if (!aliasesCache) {
    aliasesCache = loadJson<Record<string, string>>(ALIASES_PATH, {});
  }
  const symbol = rawSymbol.trim().toUpperCase();
  return aliasesCache[symbol] ?? symbol;
}

export function lookupSector(symbol: string): SectorInfo {
  if (!sectorsCache) {
    sectorsCache = loadJson<Record<string, SectorInfo>>(SECTORS_PATH, {});
  }
  return (
    sectorsCache[symbol] ?? {
      companyName: symbol,
      sector: "Uncategorized",
    }
  );
}
