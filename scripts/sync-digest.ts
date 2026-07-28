import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";
import { DIGEST_CSV_HEADER, buildDigestCsvRow } from "../lib/digestCsv";

const CSV_PATH = path.join(process.cwd(), "data", "digests.csv");

interface ResendEmailSummary {
  id: string;
  subject: string;
  created_at: string;
}

interface ResendEmailDetail {
  text: string | null;
}

// tsx doesn't auto-load .env.local the way `next dev` does — read it by hand.
function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf-8").split("\n")) {
    const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (match && !(match[1] in process.env)) {
      process.env[match[1]] = match[2];
    }
  }
}

function loadExistingIds(): Set<string> {
  if (!fs.existsSync(CSV_PATH)) return new Set();
  const content = fs.readFileSync(CSV_PATH, "utf-8");
  if (!content.trim()) return new Set();
  const rows: Record<string, string>[] = parse(content, {
    columns: true,
    skip_empty_lines: true,
  });
  return new Set(rows.map((row) => row.email_id));
}

async function resendFetch(apiKey: string, urlPath: string) {
  const res = await fetch(`https://api.resend.com${urlPath}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    throw new Error(`Resend request to ${urlPath} failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function main() {
  loadEnvLocal();
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY not set (checked process.env and .env.local).");
    process.exit(1);
  }

  const existingIds = loadExistingIds();
  const list = (await resendFetch(apiKey, "/emails?limit=20")) as {
    data: ResendEmailSummary[];
  };

  const newDigests = (list.data ?? [])
    .filter((email) => email.subject?.startsWith("Portfolio Digest") && !existingIds.has(email.id))
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  if (newDigests.length === 0) {
    console.log("No new digest emails to sync.");
    return;
  }

  const rows: string[] = [];
  for (const email of newDigests) {
    const detail = (await resendFetch(apiKey, `/emails/${email.id}`)) as ResendEmailDetail;
    const date = email.created_at.slice(0, 10);
    const text = (detail.text ?? "").trim();
    rows.push(buildDigestCsvRow({ date, subject: email.subject, emailId: email.id, text }));
    console.log(`Synced: ${email.subject}`);
  }

  const needsHeader = !fs.existsSync(CSV_PATH) || !fs.readFileSync(CSV_PATH, "utf-8").trim();
  const prefix = needsHeader ? `${DIGEST_CSV_HEADER}\n` : "";
  fs.appendFileSync(CSV_PATH, prefix + rows.join("\n") + "\n");

  console.log(`Wrote ${rows.length} new digest row(s) to ${CSV_PATH}`);
}

main();
