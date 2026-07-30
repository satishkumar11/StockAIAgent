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
- **Holdings list**: the segment list is embedded as static text directly
  in the routine's prompt, not read from `data/sectors.json`. Update the
  routine's prompt by hand (via the `schedule` skill or the routines UI)
  after any re-ingest that changes the holdings materially.
- **Website updates are manual — both automated paths are platform-blocked
  for this session type**, confirmed by direct testing, not assumption:
  - `curl` from the routine to our own Vercel API (`/api/news-digest`) gets
    a `403` from the sandbox's own outbound egress policy proxy — arbitrary
    HTTPS hosts aren't allowlisted (only `anthropic.com`, package registries,
    and private network ranges are). Confirmed via the proxy's own status
    endpoint and its `recentRelayFailures` log (`connect_rejected`).
  - Adding `sources: [{git_repository: {...}}]` to give the routine a real
    checkout of this repo (once it went public) does grant **read** access
    — but `git push` still gets a `403 Forbidden` from a separate local git
    proxy. Read-only, by design, apparently.
  - A GitHub MCP connector (which would route around both, the same way
    Gmail/Resend MCP calls already do) was connected via
    claude.ai/customize/connectors but never appeared in the "Available MCP
    Connectors" list this project's `schedule`-skill invocations surface —
    unresolved as of 2026-07-30.
  - Until one of these is actually resolved, the routine only emails +
    drafts; the website is updated via `npm run sync-digest` afterward. Do
    **not** re-add a curl-to-our-API or git-push step to the routine's
    prompt without first confirming (via a live test run) that the
    underlying platform restriction has actually changed — see "Displaying
    digests on the website" below for the full incident history.

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
   - Date: computed explicitly in **IST** (`TZ=Asia/Kolkata date +%Y-%m-%d`),
     not the sandbox's default UTC clock — otherwise a run close to midnight
     IST can label the subject with the wrong calendar day.
   - Subject: `Portfolio Digest — <IST date> (<N updates>)`
   - Body grouped by segment header, 1-3 bullets per item: headline, one-line
     takeaway, source link.
5. **Send** via the Resend MCP connector's `send-email` tool (from
   `hello@imsatty.com` to `<recipient-email>`).
6. **Also** create a Gmail draft with the same content as a backup/record.

Website ingestion is **not** a routine step — see below.

## Displaying digests on the website

Beyond email, the dashboard also shows past digests (see
`components/NewsDigest.tsx`, `lib/digests.ts`). There's no database — the
source of truth is `data/digests.csv`, committed to the repo like other
non-sensitive data files (it's news headlines/links, not financial figures,
so unlike `data/portfolio.json` it isn't gitignored).

**Current state: manual only.** `npm run sync-digest`
(`scripts/sync-digest.ts`) fetches recently-sent emails from the **Resend
REST API** (not the MCP connector — this runs as a plain local script) and
appends any new `Portfolio Digest —` emails as rows. Requires a
**full-access** `RESEND_API_KEY` in `.env.local` — a sending-only key can
send but can't call `GET /emails` to list past sends. Run it, then
commit/push — same rhythm as the `portfolio.json` workflow in
[docs/reingest.md](reingest.md).

### Automation attempts and why they're on hold

`app/api/news-digest/route.ts` still exists and works — it's a POST
endpoint taking `{ emailId }`, checking an `x-digest-secret` header against
`DIGEST_INGEST_SECRET`, then fetching the real subject/text/timestamp from
Resend server-side and committing to GitHub via the Contents API (a
`GITHUB_TOKEN` fine-grained PAT, "Contents: Read and write"). It's excluded
from the cookie auth-gate in `proxy.ts`. You can call it manually
(`curl -X POST .../api/news-digest -d '{"emailId": "..."}'`) as a third
option alongside `sync-digest`, but **the routine itself cannot call it**:

- **Round 1** (2026-07-28): routine hand-wrote the JSON payload inline in a
  `curl -d '...'` string; real news text full of quotes/apostrophes is
  error-prone to escape by hand, and the ingest failed silently.
- **Round 2**: switched the routine to writing subject/text to plain files
  (heredoc, zero escaping) and building JSON with Python's `json.dump`. The
  *next* run still failed to ingest with no GitHub commit landing, despite
  identical manual `curl` calls to the same endpoint succeeding every time.
- **Round 3**: simplified the payload to just `{ emailId }` — trivially
  safe to inline, no escaping possible. Still failed. At this point the
  routine's own execution transcript (viewable at
  claude.ai/code/routines/trig_018iiuaS4z5FxH4aPUrGxRCL, not accessible to
  Claude directly — 403) revealed the real cause: **the sandbox's outbound
  egress proxy rejects the request outright** (`403`,
  `recentRelayFailures: [{kind: "connect_rejected"}]`) before it ever
  reaches Vercel. Only `anthropic.com`, package registries (npm, PyPI,
  crates.io, Go proxy), and private network ranges are allowlisted — not
  arbitrary user-hosted services. This is a platform security boundary, not
  something fixable by changing the payload.
- **Round 4**: since curl to our API is blocked, tried giving the routine a
  real git checkout instead — `sources: [{git_repository: {url: ...}}]}` in
  `session_context` (works now that the repo is public; it 403'd on a
  private repo before). The routine edited `data/digests.csv` directly with
  its normal file tools and ran `git commit && git push`. Read access
  worked; `git push` still failed with `403 Forbidden` from a *separate*
  local git proxy — `sources: git_repository` grants read-only repo
  context, not push credentials.
- **Considered but not yet available**: a GitHub MCP connector, the same
  mechanism that lets Gmail/Resend MCP calls succeed despite neither
  `mcp.resend.com` nor `gmailmcp.googleapis.com` being on the egress
  allowlist either (MCP tool calls are proxied by the outer Claude Code
  harness, not raw network requests from inside the sandbox — so they
  aren't subject to this same block). Connected via
  claude.ai/customize/connectors, but never appeared in the "Available MCP
  Connectors" list the `schedule` skill surfaces for routines, as of
  2026-07-30. Worth re-checking periodically; if it starts showing up,
  that's the way to make this fully automatic again.

Required Vercel env vars for the manual `/api/news-digest` path:
`DIGEST_INGEST_SECRET` and `GITHUB_TOKEN` (neither is needed for
`sync-digest` alone).

## Website UI

`components/NewsDigest.tsx` is a client component (needs interactivity, so
it can't be a server component like the rest of the dashboard): a date
filter (`<select>` of days that actually have a digest), "Show more"
pagination (5 at a time, not a hard cutoff), and each entry displays
formatted date + time in IST via `lib/format.ts`'s `formatDateTime`. Since
multiple digests can land on the same calendar day (manual runs, retries),
rows are de-duplicated only by `email_id`, never collapsed by date — the
date filter narrows to a day but still shows every entry within it.

## Resolved: how the routine gets the holdings list

Embedded as static text directly in the routine's prompt. Repo access via
`sources: git_repository` does work now (confirmed in the round-4 test
above, once the repo went public) but is read-only, and the routine's
current prompt doesn't include it (removed along with the git-push attempt
— no reason to carry the read-access source if nothing uses it). Update the
list by hand (via the `schedule` skill or the routines UI) after any
re-ingest that changes holdings materially.

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
