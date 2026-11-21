import fs from "fs";
import path from "path";

// 1. Synchronously load .env before loading any application modules
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = val;
    }
  }
}

async function main() {
  console.log("==================================================");
  console.log("Faculty Vault: Google Sheets Reporting Diagnostic");
  console.log("==================================================");

  try {
    // Dynamic import ensures process.env is populated before module evaluation
    const { runGoogleSheetsDiagnostic } = await import("@/lib/google/sheets");
    const result = await runGoogleSheetsDiagnostic();
    console.log("Diagnostic Status: SUCCESS");
    console.log("Spreadsheet ID:   ", result.spreadsheetId);
    console.log("Spreadsheet Title:", result.title);
    console.log("Available Tabs:   ", result.sheetTitles.join(", "));
    console.log("Append Verified:  ", result.appendVerified);
    console.log("Read-Back Row:    ", JSON.stringify(result.persistedValues));
    console.log("Summary:          ", result.details);
    console.log("==================================================");
    process.exit(0);
  } catch (err) {
    console.error("Diagnostic Status: FAILED");
    console.error("Error Message:    ", err.message);
    if (err.response?.data) {
      console.error("API Response Data:", JSON.stringify(err.response.data, null, 2));
    }
    console.log("==================================================");
    process.exit(1);
  }
}

main();
