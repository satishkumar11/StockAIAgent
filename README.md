# Portfolio Tracker

Personal stock-portfolio dashboard: merges holdings exported from brokers
into one view, grouped by segment, behind a password gate. Next.js (App
Router) + TypeScript, deployed to Vercel.

## Local setup

```bash
npm install
cp .env.local.example .env.local   # set SITE_PASSWORD
```

Place your broker CSV exports at:

- `data/raw/zerodha-holdings.csv` — Zerodha
- `data/raw/invest-right.csv` — HDFC Securities ("Invest Right")

`npm run ingest` only reads these two files. A third file,
`data/raw/groww-holdings.csv`, also lives in `data/raw/` but is **not**
currently read by the ingest script — the Groww account is not merged into
the dashboard yet.

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

Live as a cloud routine (`portfolio-news-digest`), weekdays 10:00 AM IST —
generates a materiality-filtered news digest over current holdings and
**sends it via the Resend MCP connector** (from `hello@imsatty.com`, a
domain registered and DNS-verified specifically for this project) to
`kr.satish123@gmail.com`, with a Gmail **draft** created as a backup/record
(Gmail MCP itself has no send tool). Details and links are in
[docs/news-digest-prompt.md](docs/news-digest-prompt.md).

The dashboard also **displays past digests** in-app. Run `npm run
sync-digest` (needs a **full-access** `RESEND_API_KEY` in `.env.local` —
sending-only keys can't list past emails) to pull newly-sent digests from
Resend into `data/digests.csv`, which the dashboard reads directly. This is
a manual step, same rhythm as re-ingesting portfolio data — run it, then
commit/push/redeploy to update the live site.

## Deploying

Real portfolio data (`data/raw/`, `data/portfolio.json`) is gitignored and
never committed. See [docs/reingest.md](docs/reingest.md) for how data gets
into the deployed app via the `PORTFOLIO_DATA_BASE64` Vercel env var instead.
