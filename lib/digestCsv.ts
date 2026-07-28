export const DIGEST_CSV_HEADER = "date,subject,email_id,text";

export function csvEscape(field: string): string {
  if (/[",\n]/.test(field)) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

export function buildDigestCsvRow(row: {
  date: string;
  subject: string;
  emailId: string;
  text: string;
}): string {
  return [
    csvEscape(row.date),
    csvEscape(row.subject),
    csvEscape(row.emailId),
    csvEscape(row.text),
  ].join(",");
}
