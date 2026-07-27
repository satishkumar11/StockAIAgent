# Portfolio Tracker

Personal stock-portfolio dashboard: merges holdings exported from two
brokers into one view, grouped by segment, behind a password gate.
Next.js (App Router) + TypeScript, deployed to Vercel.

## Local setup

```bash
npm install
cp .env.local.example .env.local   # set SITE_PASSWORD
```

Place your two broker CSV exports at:

- `data/raw/zerodha-holdings.csv`
- `data/raw/invest-right.csv`

Then:

```bash
npm run ingest   # parses + merges the CSVs into data/portfolio.json
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected
to `/login`.

## Refreshing data later

See [docs/reingest.md](docs/reingest.md).

## Correcting sector classification

Some holdings ship as `"Uncategorized"` in `data/sectors.json` — edit that
file directly (symbol → company name + sector), no code changes needed.

## Daily news digest

Not wired up yet — spec is in [docs/news-digest-prompt.md](docs/news-digest-prompt.md).
Blocked on Gmail MCP connector authorization.

## Deploying

Real portfolio data (`data/raw/`, `data/portfolio.json`) is gitignored and
never committed. See [docs/reingest.md](docs/reingest.md) for how data gets
into the deployed app via the `PORTFOLIO_DATA_BASE64` Vercel env var instead.
