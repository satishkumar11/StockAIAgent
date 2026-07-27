import fs from "node:fs";
import path from "node:path";

const PORTFOLIO_PATH = path.join(process.cwd(), "data", "portfolio.json");

function main() {
  if (!fs.existsSync(PORTFOLIO_PATH)) {
    console.error(`${PORTFOLIO_PATH} not found. Run \`npm run ingest\` first.`);
    process.exit(1);
  }

  const json = fs.readFileSync(PORTFOLIO_PATH, "utf-8");
  const encoded = Buffer.from(json, "utf-8").toString("base64");

  console.log("Paste this as the PORTFOLIO_DATA_BASE64 value in Vercel:\n");
  console.log(encoded);
}

main();
