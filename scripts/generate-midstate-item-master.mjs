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

function numberValue(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(String(value).replaceAll(",", ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function extractSize(description) {
  const value = text(description);

  if (!value) {
    return null;
  }

  const patterns = [
    /\bST\d{3}\/\d{2}[DR]\d{2}\b/i,
    /\b\d{1,2}(?:\.\d+)?X\d{1,2}(?:\.\d+)?(?:-\d{1,2}(?:\.\d+)?)?\b/i,
    /\b\d{1,2}(?:\.\d+)?-\d{1,2}(?:\.\d+)?\b/i,
  ];

  for (const pattern of patterns) {
    const match = value.match(pattern);

    if (match) {
      return match[0].toUpperCase();
    }
  }

  return null;
}

function entryKey(value) {
  return String(value ?? "").trim().toUpperCase();
}

function rowScore(row) {
  const uom = entryKey(row.UoM);
  let score = 0;

  if (uom === "EA") {
    score += 100;
  } else if (uom.includes("CASE")) {
    score -= 20;
  }

  if (text(row.Description)) {
    score += 10;
  }

  if (text(row["Item Group"])) {
    score += 5;
  }

  return score;
}

function buildEntry(row) {
  return {
    description: text(row.Description),
    size: extractSize(row.Description),
    brand: text(row.Brand),
    itemGroup: text(row["Item Group"]),
    status: text(row.Status),
    uom: text(row.UoM),
    upc: text(row["UPC#"]),
    length: numberValue(row.Length),
    width: numberValue(row.Width),
    height: numberValue(row.Height),
    weight: numberValue(row.Weight),
    containerLoadQty: numberValue(row["Container Load Qty"]),
    truckLoadQty: numberValue(row["TruckLoad Qty"]),
    tariffCode: text(row["Tariff Code"]),
    treadDepth: numberValue(row["Tread Depth"]),
    loadIndex: text(row["Load Index"]),
    speedRating: text(row["Speed Rating"]),
    od: numberValue(row.OD),
    sw: numberValue(row.SW),
    maxLoading: numberValue(row["Max Loading"]),
    psi: numberValue(row.PSI),
    utqg: text(row.UTQG),
  };
}

const workbook = XLSX.readFile(sourcePath, { cellDates: true });
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { defval: null, raw: true });
const itemMap = new Map();

for (const row of rows) {
  const itemNumber = entryKey(row.VIN);

  if (!itemNumber) {
    continue;
  }

  const current = itemMap.get(itemNumber);
  const candidate = { score: rowScore(row), entry: buildEntry(row) };

  if (!current || candidate.score > current.score) {
    itemMap.set(itemNumber, candidate);
  }
}

const entries = [...itemMap.entries()]
  .map(([itemNumber, value]) => [itemNumber, value.entry])
  .sort(([a], [b]) => a.localeCompare(b));
const output = `// Generated from ${basename(sourcePath)}. Do not edit by hand.
export const MIDSTATE_ITEM_MASTER = ${JSON.stringify(
  Object.fromEntries(entries),
  null,
  2,
)} as const;
`;

writeFileSync("services/midstate/item-master.generated.ts", output);
console.log(`Generated ${entries.length} Midstate item master records.`);
