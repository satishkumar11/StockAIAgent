import fs from "node:fs";
import path from "node:path";
import { parse } from "csv-parse/sync";

const DIGESTS_PATH = path.join(process.cwd(), "data", "digests.csv");

export interface Digest {
  date: string;
  subject: string;
  emailId: string;
  text: string;
}

export function getDigests(): Digest[] {
  if (!fs.existsSync(DIGESTS_PATH)) return [];

  const content = fs.readFileSync(DIGESTS_PATH, "utf-8");
  if (!content.trim()) return [];

  const rows: Record<string, string>[] = parse(content, {
    columns: true,
    skip_empty_lines: true,
  });

  return rows
    .map((row) => ({
      date: row.date,
      subject: row.subject,
      emailId: row.email_id,
      text: row.text,
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}
