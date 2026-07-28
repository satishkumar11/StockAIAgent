import type { ReactNode } from "react";
import type { Digest } from "@/lib/digests";

export function NewsDigest({ digests }: { digests: Digest[] }) {
  if (digests.length === 0) {
    return (
      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <h2 className="text-sm font-semibold text-[var(--text-secondary)]">News digest</h2>
        <p className="mt-2 text-sm text-[var(--text-muted)]">
          No digests synced yet. Run <code>npm run sync-digest</code> after the daily routine
          sends one.
        </p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-[var(--accent)]" aria-hidden />
        <h2 className="text-sm font-semibold text-[var(--text-secondary)]">News digest</h2>
        <span className="rounded-full bg-[var(--accent)]/10 px-2 py-0.5 text-xs font-medium text-[var(--accent)]">
          {digests.length}
        </span>
      </div>
      {digests.slice(0, 10).map((digest, i) => (
        <DigestCard key={digest.emailId} digest={digest} defaultOpen={i === 0} />
      ))}
    </section>
  );
}

function DigestCard({ digest, defaultOpen }: { digest: Digest; defaultOpen: boolean }) {
  const countMatch = digest.subject.match(/\((\d+)\s+updates?\)/i);
  const count = countMatch ? Number(countMatch[1]) : null;

  return (
    <details
      open={defaultOpen}
      className="group overflow-hidden rounded-xl border border-[var(--border)] border-l-4 border-l-[var(--accent)] bg-[var(--surface)]"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">
            {digest.subject.replace(/\s*\(\d+\s+updates?\)\s*$/i, "")}
          </span>
          <time className="text-xs text-[var(--text-muted)]">{digest.date}</time>
        </div>
        <div className="flex items-center gap-2">
          {count !== null && (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${count > 0
                ? "bg-[var(--accent)]/10 text-[var(--accent)]"
                : "bg-[var(--text-muted)]/10 text-[var(--text-muted)]"
                }`}
            >
              {count} update{count === 1 ? "" : "s"}
            </span>
          )}
          <span className="text-[var(--text-muted)] transition-transform group-open:rotate-90">
            ▸
          </span>
        </div>
      </summary>
      <div className="border-t border-[var(--border)] px-4 pb-4 pt-3">
        <DigestBody text={digest.text} />
      </div>
    </details>
  );
}

function DigestBody({ text }: { text: string }) {
  const lines = text.split("\n");
  const elements: ReactNode[] = [];

  lines.forEach((line, i) => {
    const trimmed = line.trim();

    if (i === 0 && /^PORTFOLIO DIGEST/i.test(trimmed)) return; // redundant with the summary line
    if (trimmed === "") return;

    if (trimmed === "---") {
      elements.push(<hr key={i} className="my-3 border-[var(--border)]" />);
      return;
    }

    if (trimmed.startsWith("http")) {
      elements.push(
        <a
          key={i}
          href={trimmed}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-4 block truncate text-xs text-[var(--accent)] underline decoration-[var(--accent)]/40 underline-offset-2 hover:decoration-[var(--accent)]"
        >
          {trimmed}
        </a>
      );
      return;
    }

    if (trimmed.startsWith("-")) {
      elements.push(
        <p key={i} className="mt-2 flex gap-2 text-sm text-[var(--text-primary)]">
          <span className="text-[var(--accent)]">●</span>
          <span>{trimmed.replace(/^-\s*/, "")}</span>
        </p>
      );
      return;
    }

    const isHeader = /^[A-Z0-9&/ ]+$/.test(trimmed) && trimmed.length > 2;
    if (isHeader) {
      elements.push(
        <h3
          key={i}
          className="mt-4 border-b border-[var(--border)] pb-1 text-xs font-semibold tracking-wide text-[var(--accent)] first:mt-0"
        >
          {trimmed}
        </h3>
      );
      return;
    }

    elements.push(
      <p key={i} className="mt-1 text-sm text-[var(--text-secondary)]">
        {trimmed}
      </p>
    );
  });

  return <div className="flex flex-col">{elements}</div>;
}
