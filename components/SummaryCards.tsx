import { formatInr, formatPct } from "@/lib/format";

export function SummaryCards({
  invested,
  currentValue,
  pnl,
  pnlPct,
}: {
  invested: number;
  currentValue: number;
  pnl: number;
  pnlPct: number;
}) {
  const isGain = pnl >= 0;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      <StatTile label="Invested" value={formatInr(invested)} />
      <StatTile label="Current value" value={formatInr(currentValue)} />
      <StatTile
        label="Total P&L"
        value={formatInr(pnl)}
        sub={formatPct(pnlPct)}
        deltaGood={isGain}
      />
    </div>
  );
}

function StatTile({
  label,
  value,
  sub,
  deltaGood,
}: {
  label: string;
  value: string;
  sub?: string;
  deltaGood?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="text-sm text-[var(--text-secondary)]">{label}</div>
      <div className="tabular-nums mt-1 text-2xl font-semibold">{value}</div>
      {sub && (
        <div
          className={`tabular-nums mt-1 text-sm font-medium ${
            deltaGood ? "text-[var(--delta-good)]" : "text-[var(--delta-bad)]"
          }`}
        >
          {sub}
        </div>
      )}
    </div>
  );
}
