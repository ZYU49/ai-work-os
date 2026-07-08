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

type MidstatePeriod = {
  periodYear: number | null;
  periodMonth: number | null;
};

const MIDSTATE_WORKSHEET_ROW_NUMBER = "__midstateWorksheetRowNumber";

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
  return rows
    .map((row, index) =>
      withMidstateWorksheetRowNumber(row, worksheetRowNumber(row, index)),
    )
    .filter((row) =>
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

const monthNumberByName = new Map(
  [
    ["jan", 1],
    ["january", 1],
    ["feb", 2],
    ["february", 2],
    ["mar", 3],
    ["march", 3],
    ["apr", 4],
    ["april", 4],
    ["may", 5],
    ["jun", 6],
    ["june", 6],
    ["jul", 7],
    ["july", 7],
    ["aug", 8],
    ["august", 8],
    ["sep", 9],
    ["sept", 9],
    ["september", 9],
    ["oct", 10],
    ["october", 10],
    ["nov", 11],
    ["november", 11],
    ["dec", 12],
    ["december", 12],
  ] as const,
);

function periodFromFileName(fileName: string): MidstatePeriod {
  const tokens = fileName.toLowerCase().match(/[a-z]+|\d+/g) ?? [];
  const periodMonth = tokens
    .map((token) => monthNumberByName.get(token))
    .find((month): month is number => month !== undefined);
  const periodYear = tokens
    .filter((token) => /^\d{4}$/.test(token))
    .map((token) => Number(token))
    .find((year) => year >= 1900 && year <= 2100);

  if (!periodMonth || !periodYear) {
    return { periodYear: null, periodMonth: null };
  }

  return { periodYear, periodMonth };
}

function latestPeriodFromDates(dates: Date[]): MidstatePeriod {
  if (dates.length === 0) return { periodYear: null, periodMonth: null };
  const latest = [...dates].sort((a, b) => b.getTime() - a.getTime())[0];
  return {
    periodYear: latest.getFullYear(),
    periodMonth: latest.getMonth() + 1,
  };
}

function rowPostDate(row: Record<string, unknown>) {
  return dateValue(row["Post Date"]);
}

function dateIsInPeriod(date: Date | null, period: MidstatePeriod) {
  return (
    date !== null &&
    period.periodYear !== null &&
    period.periodMonth !== null &&
    date.getFullYear() === period.periodYear &&
    date.getMonth() + 1 === period.periodMonth
  );
}

function worksheetRowNumber(row: Record<string, unknown>, index: number) {
  const sheetRowIndex = (row as { __rowNum__?: unknown }).__rowNum__;
  return typeof sheetRowIndex === "number" ? sheetRowIndex + 1 : index + 2;
}

function withMidstateWorksheetRowNumber<T extends Record<string, unknown>>(
  row: T,
  rowNumber: number,
) {
  if (getMidstateWorksheetRowNumber(row) !== null) {
    return row;
  }

  Object.defineProperty(row, MIDSTATE_WORKSHEET_ROW_NUMBER, {
    value: rowNumber,
    enumerable: false,
    configurable: true,
  });
  return row;
}

export function getMidstateWorksheetRowNumber(row: Record<string, unknown>) {
  const rowNumber = (row as { [MIDSTATE_WORKSHEET_ROW_NUMBER]?: unknown })[
    MIDSTATE_WORKSHEET_ROW_NUMBER
  ];
  return typeof rowNumber === "number" ? rowNumber : null;
}

function targetPeriodForRows(
  rows: Record<string, unknown>[],
  fileName: string,
): MidstatePeriod {
  const filePeriod = periodFromFileName(fileName);
  if (filePeriod.periodYear !== null && filePeriod.periodMonth !== null) {
    return filePeriod;
  }

  return latestPeriodFromDates(
    rows
      .map(rowPostDate)
      .filter((date): date is Date => date !== null),
  );
}

export function filterMidstateRowsForPeriod(
  rows: Record<string, unknown>[],
  period: MidstatePeriod,
) {
  return rows
    .map((row, index) =>
      withMidstateWorksheetRowNumber(row, worksheetRowNumber(row, index)),
    )
    .filter((row) => dateIsInPeriod(rowPostDate(row), period));
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

  const { periodYear, periodMonth } = targetPeriodForRows(rows, input.fileName);
  const targetRows = filterMidstateRowsForPeriod(rows, {
    periodYear,
    periodMonth,
  });
  const normalized = targetRows.map(normalizeMidstateRow);
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

  return {
    sheetName: MIDSTATE_RAW_DATA_SHEET,
    headers,
    previewRows: targetRows.slice(0, 10),
    totalRows: targetRows.length,
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
