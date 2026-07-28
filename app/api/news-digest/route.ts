import { NextResponse, type NextRequest } from "next/server";
import { parse } from "csv-parse/sync";
import { DIGEST_CSV_HEADER, buildDigestCsvRow } from "@/lib/digestCsv";

const GITHUB_REPO = "satishkumar11/StockAIAgent";
const GITHUB_BRANCH = "main";
const CSV_REPO_PATH = "data/digests.csv";

interface DigestPayload {
  emailId: string;
}

function isValidPayload(body: unknown): body is DigestPayload {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  return typeof b.emailId === "string" && b.emailId.trim().length > 0;
}

interface ResendEmail {
  subject: string;
  text: string | null;
  created_at: string;
}

export async function POST(request: NextRequest) {
  const secret = process.env.DIGEST_INGEST_SECRET;
  const githubToken = process.env.GITHUB_TOKEN;
  const resendApiKey = process.env.RESEND_API_KEY;

  if (!secret || !githubToken || !resendApiKey) {
    return NextResponse.json(
      { error: "DIGEST_INGEST_SECRET, GITHUB_TOKEN, or RESEND_API_KEY is not configured" },
      { status: 500 }
    );
  }

  if (request.headers.get("x-digest-secret") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body: unknown = await request.json().catch(() => null);
  if (!isValidPayload(body)) {
    return NextResponse.json(
      { error: "expected JSON body { emailId } (a non-empty string)" },
      { status: 400 }
    );
  }
  const emailId = body.emailId;

  const githubHeaders = {
    Authorization: `Bearer ${githubToken}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  const getRes = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/contents/${CSV_REPO_PATH}?ref=${GITHUB_BRANCH}`,
    { headers: githubHeaders }
  );
  if (!getRes.ok) {
    return NextResponse.json(
      { error: `GitHub read failed: ${getRes.status} ${await getRes.text()}` },
      { status: 502 }
    );
  }
  const file = (await getRes.json()) as { content: string; sha: string };
  const currentCsv = Buffer.from(file.content, "base64").toString("utf-8");

  const existingRows: Record<string, string>[] = currentCsv.trim()
    ? parse(currentCsv, { columns: true, skip_empty_lines: true })
    : [];

  if (existingRows.some((row) => row.email_id === emailId)) {
    return NextResponse.json({ status: "already synced", emailId });
  }

  // Fetch the actual content from Resend server-side, rather than trusting the
  // caller to transmit it — the caller only needs to send the emailId, which is
  // a short opaque string with no escaping concerns. See docs/news-digest-prompt.md
  // for why: the routine kept failing to safely hand-build JSON from free-text
  // news content across multiple attempts.
  const emailRes = await fetch(`https://api.resend.com/emails/${emailId}`, {
    headers: { Authorization: `Bearer ${resendApiKey}` },
  });
  if (!emailRes.ok) {
    return NextResponse.json(
      { error: `Resend fetch failed: ${emailRes.status} ${await emailRes.text()}` },
      { status: 502 }
    );
  }
  const email = (await emailRes.json()) as ResendEmail;
  const text = (email.text ?? "").trim();
  if (!text) {
    return NextResponse.json({ error: "email has no text content" }, { status: 502 });
  }

  const newRow = buildDigestCsvRow({
    sentAt: email.created_at,
    subject: email.subject,
    emailId,
    text,
  });
  const updatedCsv = currentCsv.trim()
    ? currentCsv.replace(/\n?$/, "\n") + newRow + "\n"
    : `${DIGEST_CSV_HEADER}\n${newRow}\n`;

  const putRes = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/contents/${CSV_REPO_PATH}`,
    {
      method: "PUT",
      headers: { ...githubHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `Add digest sent at ${email.created_at}`,
        content: Buffer.from(updatedCsv, "utf-8").toString("base64"),
        sha: file.sha,
        branch: GITHUB_BRANCH,
      }),
    }
  );

  if (!putRes.ok) {
    return NextResponse.json(
      { error: `GitHub commit failed: ${putRes.status} ${await putRes.text()}` },
      { status: 502 }
    );
  }

  return NextResponse.json({ status: "committed", emailId });
}
