import fs from "node:fs";
import path from "node:path";

const OUTPUT_PATH = path.join(process.cwd(), "data", "portfolio.json");

function main() {
  const encoded = process.env.PORTFOLIO_DATA_BASE64;

  if (!encoded) {
    if (fs.existsSync(OUTPUT_PATH)) {
      console.log("PORTFOLIO_DATA_BASE64 not set — using existing local data/portfolio.json");
    } else {
      console.warn(
        "PORTFOLIO_DATA_BASE64 not set and data/portfolio.json is missing. " +
          "Run `npm run ingest` locally, or set PORTFOLIO_DATA_BASE64 in this environment."
      );
    }
    return;
  }

  const json = Buffer.from(encoded, "base64").toString("utf-8");
  JSON.parse(json); // fail fast if the env var is malformed
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, json);
  console.log(`Hydrated ${OUTPUT_PATH} from PORTFOLIO_DATA_BASE64`);
}

main();
