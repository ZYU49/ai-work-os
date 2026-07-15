import { writeFileSync } from "node:fs";
import { basename } from "node:path";
import XLSX from "xlsx";

const sourcePath = process.argv[2];

if (!sourcePath) {
  console.error("Usage: node scripts/generate-midstate-fob-costs.mjs <container-builder.xlsx>");
  process.exit(1);
}

const ignoredSheets = new Set(["master sku list", "Sheet1"]);

function text(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
}

function itemKey(value) {
  return String(value ?? "").trim().toUpperCase();
}

function numberValue(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(String(value).replaceAll(",", ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizedHeader(value) {
  return String(value ?? "").trim();
}

function findHeaderRow(rows) {
  return rows.findIndex((row) => {
    const values = row.map(normalizedHeader);
    return values.includes("Item #") && values.includes("SKU #");
  });
}

function fobValue(row, headers, label) {
  const index = headers.findIndex((header) => normalizedHeader(header) === label);
  return index === -1 ? null : numberValue(row[index]);
}

function textValue(row, headers, label) {
  const index = headers.findIndex((header) => normalizedHeader(header) === label);
  return index === -1 ? null : text(row[index]);
}

function containerQty(row, headers, label) {
  const index = headers.findIndex((header) => normalizedHeader(header) === label);
  return index === -1 ? null : numberValue(row[index]);
}

function entryFromRow(sheetName, row, headers) {
  const itemNumber = itemKey(textValue(row, headers, "Item #"));

  if (!itemNumber) {
    return null;
  }

  const thailandFob = fobValue(row, headers, "FOB Thailand(5.15.2025)");

  return {
    itemNumber,
    sourceSheet: sheetName,
    midstatesSku: textValue(row, headers, "SKU #"),
    size: textValue(row, headers, "Size"),
    currentFob: fobValue(row, headers, "FOB China(current)"),
    increase: fobValue(row, headers, "Increase"),
    effectiveFob:
      thailandFob ?? fobValue(row, headers, "FOB China(5.15.2025)"),
    effectiveDate: "2025-05-15",
    containerQty40:
      containerQty(row, headers, "40' QTY") ??
      containerQty(row, headers, "40HQ QTY"),
    containerQty20: containerQty(row, headers, "20' QTY"),
  };
}

function mergeEntries(current, next) {
  if (!current) {
    return next;
  }

  return {
    ...current,
    sourceSheet: Array.from(
      new Set([...current.sourceSheet.split(" / "), next.sourceSheet]),
    ).join(" / "),
    containerQty40: current.containerQty40 ?? next.containerQty40,
    containerQty20: current.containerQty20 ?? next.containerQty20,
  };
}

const workbook = XLSX.readFile(sourcePath, { cellDates: true });
const costMap = new Map();

for (const sheetName of workbook.SheetNames) {
  if (ignoredSheets.has(sheetName)) {
    continue;
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, {
    defval: null,
    header: 1,
    raw: true,
  });
  const headerIndex = findHeaderRow(rows);

  if (headerIndex === -1) {
    continue;
  }

  const headers = rows[headerIndex];
  const dataRows = rows.slice(headerIndex + 1);

  for (const row of dataRows) {
    const entry = entryFromRow(sheetName, row, headers);

    if (!entry) {
      continue;
    }

    costMap.set(entry.itemNumber, mergeEntries(costMap.get(entry.itemNumber), entry));
  }
}

const entries = [...costMap.entries()].sort(([a], [b]) => a.localeCompare(b));
const output = `// Generated from ${basename(sourcePath)}. Do not edit by hand.
export const MIDSTATE_FOB_COSTS = ${JSON.stringify(
  Object.fromEntries(entries),
  null,
  2,
)} as const;
`;

writeFileSync("services/midstate/fob-cost.generated.ts", output);
console.log(`Generated ${entries.length} Midstate FOB cost records.`);
