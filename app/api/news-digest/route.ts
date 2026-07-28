import { NextResponse, type NextRequest } from "next/server";
import { parse } from "csv-parse/sync";
import { DIGEST_CSV_HEADER, buildDigestCsvRow } from "@/lib/digestCsv";

const GITHUB_REPO = "satishkumar11/StockAIAgent";
const GITHUB_BRANCH = "main";
const CSV_REPO_PATH = "data/digests.csv";

interface DigestPayload {
  date: string;
  subject: string;
  emailId: string;
  text: string;
}

function isValidPayload(body: unknown): body is DigestPayload {
  if (!body || typeof body !== "object") return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.date === "string" &&
    typeof b.subject === "string" &&
    typeof b.emailId === "string" &&
    typeof b.text === "string"
  );
}

export async function POST(request: NextRequest) {
  const secret = process.env.DIGEST_INGEST_SECRET;
  const githubToken = process.env.GITHUB_TOKEN;

  if (!secret || !githubToken) {
    return NextResponse.json(
      { error: "DIGEST_INGEST_SECRET or GITHUB_TOKEN is not configured" },
      { status: 500 }
    );
  }

  if (request.headers.get("x-digest-secret") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body: unknown = await request.json().catch(() => null);
  if (!isValidPayload(body)) {
    return NextResponse.json(
      { error: "expected JSON body { date, subject, emailId, text } (all strings)" },
      { status: 400 }
    );
  }

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

  if (existingRows.some((row) => row.email_id === body.emailId)) {
    return NextResponse.json({ status: "already synced", emailId: body.emailId });
  }

  const newRow = buildDigestCsvRow(body);
  const updatedCsv = currentCsv.trim()
    ? currentCsv.replace(/\n?$/, "\n") + newRow + "\n"
    : `${DIGEST_CSV_HEADER}\n${newRow}\n`;

  const putRes = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/contents/${CSV_REPO_PATH}`,
    {
      method: "PUT",
      headers: { ...githubHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `Add digest for ${body.date}`,
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

  return NextResponse.json({ status: "committed", emailId: body.emailId });
}
