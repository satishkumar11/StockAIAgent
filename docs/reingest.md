# Refreshing portfolio data

Run this whenever you have new CSV exports from either broker.

## Local

1. Export the latest holdings from each broker.
2. Overwrite the two fixed files (keep these exact names — the ingest script
   looks for them regardless of what the broker actually named the download):
   - `data/raw/zerodha-holdings.csv`
   - `data/raw/invest-right.csv`
3. Run:
   ```
   npm run ingest
   ```
   This regenerates `data/portfolio.json` and prints:
   - total invested / current value / P&L
   - a warning if merged totals don't match the raw CSV sums (within ₹1) —
     investigate before trusting the numbers if you see this
   - any symbols still marked `"Uncategorized"` — fix by editing
     `data/sectors.json` (no code changes needed)
4. `npm run dev` to eyeball the dashboard locally.

## Production (Vercel)

`data/portfolio.json` is gitignored — it never gets committed, so a `git push`
alone will NOT update the deployed site. Instead:

1. Do the local steps above.
2. Print the new data as a base64 blob:
   ```
   npm run print-env
   ```
3. Copy the output into the `PORTFOLIO_DATA_BASE64` environment variable in
   the Vercel project settings (or `vercel env rm PORTFOLIO_DATA_BASE64` then
   `vercel env add PORTFOLIO_DATA_BASE64`).
4. Redeploy: `vercel deploy --prod`.

(`scripts/hydrate-from-env.ts` runs automatically before `next build` and
decodes that env var back into `data/portfolio.json` for the production
build — see `package.json`'s `build` script.)
