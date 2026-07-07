import { read, utils } from "xlsx";

import {
  salesFieldDefinitions,
  type SalesFieldKey,
  type SalesFieldMapping,
} from "@/services/analytics/fields";

export type WorkbookPreview = {
  sheetName: string;
  headers: string[];
  previewRows: Record<string, unknown>[];
  totalRows: number;
};

export type NormalizedSalesRecord = {
  orderDate: Date;
  invoiceNumber?: string;
  customerCode?: string;
  customerName: string;
  customerPo?: string;
  sku: string;
  productName?: string;
  category?: string;
  salesperson?: string;
  shipToState?: string;
  shipToCity?: string;
  warehouse?: string;
  shipmentNumber?: string;
  shipToCode?: string;
  memberName?: string;
  quantity: number;
  revenue: number;
  unitPrice: number | null;
};

export type RejectedSalesRow = { ok: false; errors: string[] };
export type NormalizedSalesRow =
  | { ok: true; record: NormalizedSalesRecord }
  | RejectedSalesRow;

type ParsedWorkbookRows = {
  headers: string[];
  rows: Record<string, unknown>[];
};

function textValue(value: unknown) {
  if (value === null || value === undefined) {
    return undefined;
  }

  const text = String(value).trim();
  return text.length > 0 ? text : undefined;
}

function numberValue(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const text = textValue(value);
  if (!text) {
    return null;
  }

  const parsed = Number(text.replaceAll(",", "").replace(/^\((.*)\)$/, "-$1"));
  return Number.isFinite(parsed) ? parsed : null;
}

function dateValue(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "number") {
    const parsed = utils.format_cell({ t: "n", v: value, z: "yyyy-mm-dd" });
    const date = new Date(`${parsed}T00:00:00`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const text = textValue(value);
  if (!text) {
    return null;
  }

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function sourceValue(
  row: Record<string, unknown>,
  mapping: SalesFieldMapping,
  field: SalesFieldKey,
) {
  const source = mapping[field];
  return source ? row[source] : undefined;
}

function hasMeaningfulCell(value: unknown) {
  if (value === null || value === undefined) {
    return false;
  }

  if (typeof value === "string") {
    return value.trim().length > 0;
  }

  return true;
}

function toHeaderName(value: unknown, index: number) {
  const text = textValue(value);
  return text ?? `__EMPTY${index === 0 ? "" : `_${index}`}`;
}

function uniqueHeaders(values: unknown[]) {
  const seen = new Map<string, number>();

  return values.map((value, index) => {
    const base = toHeaderName(value, index);
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base}_${count}`;
  });
}

function parseSheetRows(sheet: utils.WorkSheet): ParsedWorkbookRows {
  const matrix = utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: null,
    blankrows: true,
    raw: true,
  });
  const headerRowIndex = matrix.findIndex((row) => row.some(hasMeaningfulCell));

  if (headerRowIndex === -1) {
    return { headers: [], rows: [] };
  }

  const headers = uniqueHeaders(matrix[headerRowIndex] ?? []);
  const rows = matrix
    .slice(headerRowIndex + 1)
    .filter((row) => row.some(hasMeaningfulCell))
    .map((row) =>
      Object.fromEntries(
        headers.map((header, index) => [header, row[index] ?? null]),
      ),
    );

  return { headers, rows };
}

export function extractWorkbookPreview(input: {
  buffer: Buffer;
  fileName: string;
  mimeType?: string;
}): WorkbookPreview {
  const workbook = read(input.buffer, { type: "buffer", cellDates: true });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error("Workbook has no readable sheets.");
  }

  const sheet = workbook.Sheets[sheetName];
  const { headers, rows } = parseSheetRows(sheet);

  return {
    sheetName,
    headers,
    previewRows: rows.slice(0, 10),
    totalRows: rows.length,
  };
}

export function rowsFromWorkbook(buffer: Buffer, sheetName?: string) {
  const workbook = read(buffer, { type: "buffer", cellDates: true });
  const targetSheetName = sheetName ?? workbook.SheetNames[0];

  if (!targetSheetName || !workbook.Sheets[targetSheetName]) {
    throw new Error("Workbook sheet is not readable.");
  }

  return parseSheetRows(workbook.Sheets[targetSheetName]).rows;
}

export function normalizeSalesRow(
  row: Record<string, unknown>,
  mapping: SalesFieldMapping,
): NormalizedSalesRow {
  const errors: string[] = [];
  const orderDate = dateValue(sourceValue(row, mapping, "orderDate"));
  const customerName = textValue(sourceValue(row, mapping, "customerName"));
  const sku = textValue(sourceValue(row, mapping, "sku"));
  const quantity = numberValue(sourceValue(row, mapping, "quantity"));
  const revenue = numberValue(sourceValue(row, mapping, "revenue"));

  if (!orderDate) {
    errors.push(`${salesFieldDefinitions.orderDate.label} is invalid.`);
  }
  if (!customerName) {
    errors.push(`${salesFieldDefinitions.customerName.label} is required.`);
  }
  if (!sku) {
    errors.push("SKU is required.");
  }
  if (quantity === null) {
    errors.push(`${salesFieldDefinitions.quantity.label} is invalid.`);
  }
  if (revenue === null) {
    errors.push(`${salesFieldDefinitions.revenue.label} is invalid.`);
  }

  if (
    errors.length > 0 ||
    !orderDate ||
    !customerName ||
    !sku ||
    quantity === null ||
    revenue === null
  ) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    record: {
      orderDate,
      invoiceNumber: textValue(sourceValue(row, mapping, "invoiceNumber")),
      customerCode: textValue(sourceValue(row, mapping, "customerCode")),
      customerName,
      customerPo: textValue(sourceValue(row, mapping, "customerPo")),
      sku,
      productName: textValue(sourceValue(row, mapping, "productName")),
      category: textValue(sourceValue(row, mapping, "category")),
      salesperson: textValue(sourceValue(row, mapping, "salesperson")),
      shipToState: textValue(sourceValue(row, mapping, "shipToState")),
      shipToCity: textValue(sourceValue(row, mapping, "shipToCity")),
      warehouse: textValue(sourceValue(row, mapping, "warehouse")),
      shipmentNumber: textValue(sourceValue(row, mapping, "shipmentNumber")),
      shipToCode: textValue(sourceValue(row, mapping, "shipToCode")),
      memberName: textValue(sourceValue(row, mapping, "memberName")),
      quantity,
      revenue,
      unitPrice: quantity !== 0 ? revenue / quantity : null,
    },
  };
}
