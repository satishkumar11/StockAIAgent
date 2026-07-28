export const DIGEST_CSV_HEADER = "sent_at,subject,email_id,text";

export function csvEscape(field: string): string {
  if (/[",\n]/.test(field)) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

// Normalizes to strict ISO 8601 (e.g. "2026-07-28T13:17:49.925Z") so rows stay
// lexicographically sortable regardless of the producer's original timestamp format
// (Resend's REST API returns "2026-07-28 09:16:05+00", not ISO 8601).
function normalizeTimestamp(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toISOString();
}

export function buildDigestCsvRow(row: {
  sentAt: string;
  subject: string;
  emailId: string;
  text: string;
}): string {
  return [
    csvEscape(normalizeTimestamp(row.sentAt)),
    csvEscape(row.subject),
    csvEscape(row.emailId),
    csvEscape(row.text),
  ].join(",");
}
