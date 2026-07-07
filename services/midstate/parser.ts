import { read, utils, type WorkSheet } from "xlsx";

export type MidstateWorkbookPreview = {
  sheetName: string;
  headers: string[];
  previewRows: Record<string, unknown>[];
  totalRows: number;
  totalQuantity: number;
  warehouseQuantity: number;
  directQuantity: number;
  memberCount: number;
  skuCount: number;
  dateRange: { start: string | null; end: string | null };
  periodYear: number | null;
  periodMonth: number | null;
  vendorNumber: string | null;
};

export type NormalizedMidstateRecord = {
  postDate: Date;
  vendorName?: string;
  vendorNumber?: string;
  memberNumber: string;
  memberName: string;
  msItemNumber?: string;
  sku: string;
  description?: string;
  orderClass: string;
  quantity: number;
  cost: number | null;
  costExt: number | null;
  category?: string;
};

export type NormalizedMidstateRow =
  | { ok: true; record: NormalizedMidstateRecord }
  | { ok: false; errors: string[] };

export const MIDSTATE_RAW_DATA_SHEET = "RAW DATA";
export const midstateRequiredHeaders = [
  "Vendor Name",
  "MS Item Number",
  "Description",
  "VIN",
  "Member Name",
  "Member Number",
  "Vendor Number",
  "Order Class",
  "Qty Shipped",
  "Post Date",
  "Cost",
  "Cost Ext",
] as const;

function textValue(value: unknown) {
  if (value === null || value === undefined) return undefined;
  const text = String(value).trim();
  return text.length > 0 ? text : undefined;
}

function numberValue(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const text = textValue(value);
  if (!text) return null;
  const parsed = Number(text.replaceAll(",", "").replace(/^\((.*)\)$/, "-$1"));
  return Number.isFinite(parsed) ? parsed : null;
}

function dateValue(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "number") {
    const parsed = utils.format_cell({ t: "n", v: value, z: "yyyy-mm-dd" });
    const date = new Date(`${parsed}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const text = textValue(value);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function readWorkbook(buffer: Buffer) {
  try {
    return read(buffer, { type: "buffer", cellDates: true });
  } catch {
    throw new Error("File could not be read as a Midstate Excel workbook.");
  }
}

function parseSheetRows(sheet: WorkSheet) {
  const rows = utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: null,
    raw: true,
  });
  return rows.filter((row) =>
    Object.values(row).some(
      (value) => value !== null && String(value).trim() !== "",
    ),
  );
}

function parseSheetHeaders(sheet: WorkSheet) {
  const [headerRow = []] = utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: null,
    raw: false,
  });
  return headerRow
    .map((value) => textValue(value))
    .filter((value): value is string => Boolean(value));
}

function validateHeaders(headers: string[]) {
  const missing = midstateRequiredHeaders.filter(
    (header) => !headers.includes(header),
  );
  if (missing.length > 0) {
    throw new Error(
      `Midstate RAW DATA is missing required columns: ${missing.join(", ")}.`,
    );
  }
}

function isoDate(date: Date | null) {
  return date ? date.toISOString().slice(0, 10) : null;
}

function periodFromDates(dates: Date[]) {
  if (dates.length === 0) return { periodYear: null, periodMonth: null };
  const counts = new Map<string, number>();
  for (const date of dates) {
    const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const [key] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  const [year, month] = key.split("-").map(Number);
  return { periodYear: year, periodMonth: month };
}

export function rowsFromMidstateWorkbook(
  buffer: Buffer,
  sheetName = MIDSTATE_RAW_DATA_SHEET,
) {
  const workbook = readWorkbook(buffer);
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error("Midstate workbook must include a RAW DATA sheet.");
  }
  return parseSheetRows(sheet);
}

export function normalizeMidstateRow(
  row: Record<string, unknown>,
): NormalizedMidstateRow {
  const errors: string[] = [];
  const postDate = dateValue(row["Post Date"]);
  const memberNumber = textValue(row["Member Number"]);
  const memberName = textValue(row["Member Name"]);
  const sku = textValue(row.VIN);
  const orderClass = textValue(row["Order Class"]);
  const quantity = numberValue(row["Qty Shipped"]);
  const cost = numberValue(row.Cost);
  const costExt = numberValue(row["Cost Ext"]);

  if (!postDate) errors.push("Post Date is invalid.");
  if (!memberNumber) errors.push("Member Number is required.");
  if (!memberName) errors.push("Member Name is required.");
  if (!sku) errors.push("SKU is required.");
  if (!orderClass) errors.push("Order Class is required.");
  if (quantity === null) errors.push("Qty Shipped is invalid.");

  if (
    !postDate ||
    !memberNumber ||
    !memberName ||
    !sku ||
    !orderClass ||
    quantity === null
  ) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    record: {
      postDate,
      vendorName: textValue(row["Vendor Name"]),
      vendorNumber: textValue(row["Vendor Number"]),
      memberNumber,
      memberName,
      msItemNumber: textValue(row["MS Item Number"]),
      sku,
      description: textValue(row.Description),
      orderClass,
      quantity,
      cost,
      costExt,
    },
  };
}

export function extractMidstatePreview(input: {
  buffer: Buffer;
  fileName: string;
}): MidstateWorkbookPreview {
  const workbook = readWorkbook(input.buffer);
  const sheet = workbook.Sheets[MIDSTATE_RAW_DATA_SHEET];
  if (!sheet) {
    throw new Error("Midstate workbook must include a RAW DATA sheet.");
  }
  const headers = parseSheetHeaders(sheet);
  const rows = parseSheetRows(sheet);
  validateHeaders(headers);

  const normalized = rows.map(normalizeMidstateRow);
  const valid = normalized.flatMap((row) => (row.ok ? [row.record] : []));
  const totalQuantity = valid.reduce((sum, row) => sum + row.quantity, 0);
  const warehouseQuantity = valid
    .filter((row) => row.orderClass.toLowerCase() === "warehouse")
    .reduce((sum, row) => sum + row.quantity, 0);
  const directQuantity = valid
    .filter((row) => row.orderClass.toLowerCase() === "direct")
    .reduce((sum, row) => sum + row.quantity, 0);
  const dates = valid
    .map((row) => row.postDate)
    .sort((a, b) => a.getTime() - b.getTime());
  const { periodYear, periodMonth } = periodFromDates(dates);

  return {
    sheetName: MIDSTATE_RAW_DATA_SHEET,
    headers,
    previewRows: rows.slice(0, 10),
    totalRows: rows.length,
    totalQuantity,
    warehouseQuantity,
    directQuantity,
    memberCount: new Set(valid.map((row) => row.memberNumber)).size,
    skuCount: new Set(valid.map((row) => row.sku)).size,
    dateRange: {
      start: isoDate(dates[0] ?? null),
      end: isoDate(dates.at(-1) ?? null),
    },
    periodYear,
    periodMonth,
    vendorNumber: valid[0]?.vendorNumber ?? null,
  };
}
