# Daily news digest — routine spec

Not wired up yet. This is the spec to hand to the `schedule` skill once
**both** of these are true:

1. The Gmail MCP connector is authorized (via claude.ai connector settings —
   this can't be done from a non-interactive session).
2. We've decided how the routine gets the current holdings list (see "Open
   question" below).

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
5. **Send** via the Gmail MCP connector's send-email tool to
   kr.satish123@gmail.com.

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
