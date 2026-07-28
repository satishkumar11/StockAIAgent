# Daily news digest — routine spec

**Live as of 2026-07-27** as routine `portfolio-news-digest`
(`trig_018iiuaS4z5FxH4aPUrGxRCL`), weekdays 04:30 UTC / 10:00 AM IST.

Links:

- Routine: <https://claude.ai/code/routines/trig_018iiuaS4z5FxH4aPUrGxRCL>
- Artifact: <https://claude.ai/code/artifact/0a075055-e8d7-4018-a9ad-a422ae829a1a>

Resolved during setup:

- **Gmail**: connector only exposes `create_draft`/`update_draft`, no send
  tool. Kept as a **backup/record** draft only — not the primary delivery
  path (see Resend below).
- **Actual delivery — Resend**: since Gmail MCP can't send, the routine's
  primary delivery path is the **Resend MCP connector's `send-email` tool**,
  sending from `hello@imsatty.com` to `<recipient-email>`.
  `imsatty.com` was registered (via Cloudflare Registrar) and DNS-verified
  in Resend specifically for this project — no API key is embedded in the
  routine's prompt and no unrelated project's credentials are reused. The
  routine's `mcp_connections` includes the Resend connector; `allowed_tools`
  no longer needs `Bash` since there's no `curl` call to make.
- **Holdings list**: the cloud environment does not have access to this
  private repo (403 on `git_repository` source), so the segment list is
  embedded as static text directly in the routine's prompt, not read from
  `data/sectors.json`. Update the routine's prompt by hand (via the
  `schedule` skill or the routines UI) after any re-ingest that changes the
  holdings materially.

## What the routine should do, every weekday morning (~7:30 AM IST)

1. **Group holdings by segment**, using the symbol → {companyName, sector}
   list below (or `data/sectors.json` if the routine turns out to have repo
   access — see open question).
2. **Search per segment first**, not per symbol, to keep the query count
   sane: one broader query per segment (e.g. "Indian defense sector stocks
   news <today's date>" covering AVANTEL/BDL/BEL/GRSE/MAZDOCK/DATAPATTNS/
   ZENTEC/SOLARINDS together). Fall back to a per-symbol query only for
   companies the segment-level search didn't surface anything on.
3. **Skip anything not material.** Don't force a blurb for all ~53 holdings
   every day — only include earnings, corporate actions, rating changes, or
   genuinely price-moving news. An empty digest (or one with just 2-3 items)
   is the expected common case, not a failure.
4. **Compose the email:**
   - Subject: `Portfolio Digest — <date> (<N updates>)`
   - Body grouped by segment header, 1-3 bullets per item: headline, one-line
     takeaway, source link.
5. **Send** via the Resend MCP connector's `send-email` tool (from
   `hello@imsatty.com` to `<recipient-email>`).
6. **Ingest** into the website — a single `curl` with just the email ID (see
   "Displaying digests on the website" below for why it's this minimal).
7. **Also** create a Gmail draft with the same content as a backup/record.

## Displaying digests on the website

Beyond email, the dashboard also shows past digests (see
`components/NewsDigest.tsx`, `lib/digests.ts`). There's no database — the
source of truth is `data/digests.csv`, committed to the repo like other
non-sensitive data files (it's news headlines/links, not financial figures,
so unlike `data/portfolio.json` it isn't gitignored).

Two ways `data/digests.csv` gets updated:

1. **Manual**: `npm run sync-digest` (`scripts/sync-digest.ts`) fetches
   recently-sent emails from the **Resend REST API** (not the MCP connector
   — this runs as a plain local script) and appends any new
   `Portfolio Digest —` emails as rows. Requires a **full-access**
   `RESEND_API_KEY` in `.env.local` — a sending-only key can send but can't
   call `GET /emails` to list past sends. Run it, then commit/push/redeploy
   — same rhythm as the `portfolio.json` workflow in
   [docs/reingest.md](reingest.md).
2. **Automatic, via the routine itself**: `app/api/news-digest/route.ts` is
   a POST endpoint that takes just `{ emailId }`, checks an
   `x-digest-secret` header against `DIGEST_INGEST_SECRET`, then **fetches
   the actual subject/text/timestamp from Resend's API itself** (using
   `RESEND_API_KEY`, already a Vercel env var) and commits an updated
   `data/digests.csv` straight to GitHub via the Contents API (using a
   `GITHUB_TOKEN` fine-grained PAT scoped to just this repo, "Contents:
   Read and write"). It's excluded from the cookie auth-gate in `proxy.ts`
   (alongside `/login` and `/api/login`) since the routine calls it
   directly, not as a logged-in browser session. Since Vercel auto-deploys
   on push, this commit triggers a fresh build that picks up the new row —
   no manual step needed, at the cost of a ~1-2 minute rebuild per digest.
   The routine needs `Bash` in `allowed_tools` to `curl` this endpoint, and
   `DIGEST_INGEST_SECRET` ends up embedded in plaintext in the routine's
   prompt (`job_config` is returned as plaintext by the routines API) — a
   real exposure consideration if the routine config is ever shared, though
   scoped narrowly to "can add one digest row" rather than a
   production-wide credential.

   **Incident (2026-07-28), round 1**: the first live run sent its email
   successfully but the ingest step failed silently — the routine's prompt
   originally had it hand-write the JSON payload inline in a `curl -d '...'`
   string, and real news text full of quotes/apostrophes is genuinely
   error-prone to escape correctly by hand. Fixed by having the routine
   write the subject/text to plain files verbatim (heredoc) and build the
   JSON with a Python script (`json.dump`) instead of by hand.

   **Incident (2026-07-28), round 2**: the *next* live run also failed to
   ingest despite that fix — email sent fine again, but no GitHub commit
   landed. Root cause unconfirmed (no access to the routine's execution
   transcript to see the actual error — the routines UI returns a 403 here,
   and there's no logs API), but the pattern was telling: manual `curl`
   calls to the exact same endpoint succeeded every time, while the
   *routine's* attempts failed 2/2 across two different scripting
   approaches — pointing at something environment-specific (e.g. `python3`
   not actually available in that sandbox) rather than a JSON-escaping bug
   specifically. Rather than guess a third scripting variant, the payload
   contract was changed to eliminate the fragile part entirely: the routine
   now sends only the **`emailId`** (a short opaque string, trivially safe
   to inline with zero quoting concerns), and the route fetches the real
   content from Resend server-side. Both missed digests were recovered
   manually (fetched from Resend's API, backfilled into `data/digests.csv`
   directly).

Required Vercel env vars for path 2: `DIGEST_INGEST_SECRET` and
`GITHUB_TOKEN` (neither is needed for path 1 alone).

## Website UI

`components/NewsDigest.tsx` is a client component (needs interactivity, so
it can't be a server component like the rest of the dashboard): a date
filter (`<select>` of days that actually have a digest), "Show more"
pagination (5 at a time, not a hard cutoff), and each entry displays
formatted date + time in IST via `lib/format.ts`'s `formatDateTime`. Since
multiple digests can land on the same calendar day (manual runs, retries),
rows are de-duplicated only by `email_id`, never collapsed by date — the
date filter narrows to a day but still shows every entry within it.

## Open question: how does the routine get the holdings list?

Unknown until we actually invoke the `schedule` skill: whether a scheduled
cloud routine has access to this repo's files. Two options:

- **If no repo access**: embed the symbol/company/segment list directly as
  text in the routine's prompt (it's small — ~53 rows — and changes rarely;
  update the prompt text by hand on re-ingest if the holdings list changes
  materially).
- **If repo access turns out to be available**: point it at `data/sectors.json`
  plus the current `data/portfolio.json` symbol list instead — no financial
  data needed for this purpose, only symbols/segments.

Resolve this the first time the `schedule` skill is actually invoked; don't
guess further ahead of time.

## Current holdings, by segment (as of 2026-07-28 ingest)

Power & Utilities: NTPC, JSWINFRA, RECLTD, JSWENERGY, BHEL, PFC, TATAPOWER
Defense: MAZDOCK, BEL, ZENTEC, GRSE, BDL, SOLARINDS, AVANTEL, DATAPATTNS
Industrials & Capital Goods: POLYCAB, KEI, ABB
Capital Markets & Exchanges: CDSL, MCX, BSE
Uncategorized (verify sector before searching): CPPLUS, INOXINDIA, GARFIBRES,
KRN-BE, PTCIL, ROTO, ATLANTAELE, VOGL, VISL
Metals & Mining: NATIONALUM, VAML, VEDL, JINDALSAW, JSWSTEEL, VEDPOWER
Internet: ETERNAL
ETF / Fund: MAFANG
Banking: SBIN, ICICIBANK
Financial Services / NBFC: MOTILALOFS, CREDITACC
Real Estate & Hospitality: PRESTIGE, INDHOTEL
Electronics Manufacturing: DIXON
Telecom: BHARTIARTL, TATACOMM
Fertilizers & Chemicals: PARADEEP
Healthcare: KIMS
Auto Components: SONACOMS
Conglomerate / Energy: RELIANCE
IT Services: BSOFT
Media: NETWORK18

Re-derive this list after any re-ingest (`npm run ingest` prints uncategorized
symbols; `data/sectors.json` has the full mapping).
