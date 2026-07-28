"use client";

import { useMemo, useState } from "react";
import type { MergedHolding, SegmentSummary } from "@/lib/ingest/types";
import { formatInr, formatPct } from "@/lib/format";

const deltaClass = (good: boolean) => (good ? "text-[var(--delta-good)]" : "text-[var(--delta-bad)]");

export function HoldingsExplorer({
  holdings,
  segments,
}: {
  holdings: MergedHolding[];
  segments: SegmentSummary[];
}) {
  const [activeSegment, setActiveSegment] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const visibleSegments = useMemo(
    () => (activeSegment ? segments.filter((s) => s.sector === activeSegment) : segments),
    [segments, activeSegment]
  );

  const holdingsBySegment = useMemo(() => {
    const map = new Map<string, MergedHolding[]>();
    for (const h of holdings) {
      const list = map.get(h.sector);
      if (list) list.push(h);
      else map.set(h.sector, [h]);
    }
    return map;
  }, [holdings]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <FilterChip
          label="All"
          count={holdings.length}
          active={activeSegment === null}
          onClick={() => setActiveSegment(null)}
        />
        {segments.map((s) => (
          <FilterChip
            key={s.sector}
            label={s.sector}
            count={s.holdingCount}
            active={activeSegment === s.sector}
            onClick={() => setActiveSegment(s.sector)}
          />
        ))}
      </div>

      <div className="flex flex-col gap-6">
        {visibleSegments.map((segment) => (
          <div key={segment.sector}>
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-sm font-semibold text-[var(--text-secondary)]">
                {segment.sector}
              </h2>
              <div className="tabular-nums text-sm text-[var(--text-muted)]">
                {formatInr(segment.currentValue)} ·{" "}
                <span className={deltaClass(segment.pnl >= 0)}>{formatPct(segment.pnlPct)}</span>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-[var(--gridline)] text-left text-[var(--text-muted)]">
                    <th className="px-4 py-2 font-medium">Company</th>
                    <th className="px-4 py-2 font-medium">Day chg</th>
                    <th className="px-4 py-2 font-medium">Returns %</th>
                    <th className="px-4 py-2 text-right font-medium">Current (Invested)</th>
                  </tr>
                </thead>
                <tbody>
                  {(holdingsBySegment.get(segment.sector) ?? []).map((h) => (
                    <HoldingRow
                      key={h.symbol}
                      holding={h}
                      expanded={expanded === h.symbol}
                      onToggle={() => setExpanded(expanded === h.symbol ? null : h.symbol)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-sm transition-colors ${
        active
          ? "border-[var(--accent)] bg-[var(--accent)] text-white"
          : "border-[var(--border)] bg-transparent text-[var(--text-secondary)]"
      }`}
    >
      {label} <span className="tabular-nums opacity-80">({count})</span>
    </button>
  );
}

function HoldingRow({
  holding,
  expanded,
  onToggle,
}: {
  holding: MergedHolding;
  expanded: boolean;
  onToggle: () => void;
}) {
  const dayGood = holding.dayChgPct >= 0;
  const returnsGood = holding.pnl >= 0;

  return (
    <>
      <tr
        onClick={onToggle}
        className="cursor-pointer border-b border-[var(--gridline)] last:border-b-0"
      >
        <td className="px-4 py-3">
          <div className="font-medium">{holding.companyName}</div>
          <div className="text-xs text-[var(--text-muted)]">
            {holding.symbol} · {holding.qty} shares · Avg {formatInr(holding.avgCost, true)}
            {holding.lots.length > 1 ? ` · ${holding.lots.length} brokers` : ""}
          </div>
        </td>
        <td className="px-4 py-3">
          <span className={`tabular-nums ${deltaClass(dayGood)}`}>
            {dayGood ? "▲" : "▼"} {formatPct(holding.dayChgPct)}
          </span>
        </td>
        <td className="px-4 py-3">
          <span className={`tabular-nums ${deltaClass(returnsGood)}`}>
            {formatPct(holding.pnlPct)}
          </span>
        </td>
        <td className="px-4 py-3 text-right">
          <div className="tabular-nums font-medium">{formatInr(holding.currentValue)}</div>
          <div className="tabular-nums text-xs text-[var(--text-muted)]">
            ({formatInr(holding.invested)})
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-[var(--surface-raised)]">
          <td colSpan={4} className="px-4 py-3">
            <div className="flex flex-col gap-2">
              {holding.lots.map((lot) => (
                <div
                  key={lot.broker}
                  className="tabular-nums flex flex-wrap items-center justify-between gap-x-6 gap-y-1 text-xs text-[var(--text-secondary)]"
                >
                  <span className="font-medium capitalize text-[var(--text-primary)]">
                    {lot.broker.replace("-", " ")}
                  </span>
                  <span>{lot.qty} shares</span>
                  <span>Avg {formatInr(lot.avgCost, true)}</span>
                  <span>LTP {formatInr(lot.ltp, true)}</span>
                  <span>Invested {formatInr(lot.invested)}</span>
                  <span>Current {formatInr(lot.currentValue)}</span>
                  <span className={deltaClass(lot.pnl >= 0)}>P&L {formatInr(lot.pnl)}</span>
                </div>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
