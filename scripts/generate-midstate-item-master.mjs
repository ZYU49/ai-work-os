import { writeFileSync } from "node:fs";
import { basename } from "node:path";
import XLSX from "xlsx";

const sourcePath = process.argv[2];

if (!sourcePath) {
  console.error("Usage: node scripts/generate-midstate-item-master.mjs <item-list.xlsx>");
  process.exit(1);
}

function text(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function entryKey(value) {
  return String(value ?? "").trim().toUpperCase();
}

const workbook = XLSX.readFile(sourcePath, { cellDates: true });
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { defval: null, raw: false });
const itemMap = new Map();

for (const row of rows) {
  const itemNumber = entryKey(row.VIN);

  if (!itemNumber || itemMap.has(itemNumber)) {
    continue;
  }

  itemMap.set(itemNumber, {
    description: text(row.Description),
    itemGroup: text(row["Item Group"]),
  });
}

const entries = [...itemMap.entries()].sort(([a], [b]) => a.localeCompare(b));
const output = `// Generated from ${basename(sourcePath)}. Do not edit by hand.
export const MIDSTATE_ITEM_MASTER = ${JSON.stringify(
  Object.fromEntries(entries),
  null,
  2,
)} as const;
`;

writeFileSync("services/midstate/item-master.generated.ts", output);
console.log(`Generated ${entries.length} Midstate item master records.`);
