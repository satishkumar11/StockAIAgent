import { getPortfolio } from "@/lib/portfolio";
import { SummaryCards } from "@/components/SummaryCards";
import { HoldingsExplorer } from "@/components/HoldingsExplorer";

export default function DashboardPage() {
  const portfolio = getPortfolio();

  if (!portfolio) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-center">
        <div>
          <h1 className="text-lg font-semibold">No portfolio data yet</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Run <code>npm run ingest</code> after placing your broker CSVs in{" "}
            <code>data/raw/</code>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Portfolio</h1>
        <form action="/api/logout" method="post">
          <button type="submit" className="text-sm text-[var(--text-secondary)]">
            Log out
          </button>
        </form>
      </header>

      <SummaryCards
        invested={portfolio.totals.invested}
        currentValue={portfolio.totals.currentValue}
        pnl={portfolio.totals.pnl}
        pnlPct={portfolio.totals.pnlPct}
      />

      <HoldingsExplorer holdings={portfolio.holdings} segments={portfolio.segments} />

      <footer className="pt-4 text-xs text-[var(--text-muted)]">
        Generated {new Date(portfolio.generatedAt).toLocaleString("en-IN")}
      </footer>
    </main>
  );
}
