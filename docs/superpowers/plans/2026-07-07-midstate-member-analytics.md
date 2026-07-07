# Midstate Member Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dedicated Midstate member sell-through analytics module with fixed-format Excel import, monthly/member/SKU dashboards, and read-only Agent context.

**Architecture:** Keep Midstate sell-through data separate from existing sell-in `SalesRecord` data. Add Prisma models for Midstate imports and records, services under `services/midstate`, API routes under `app/api/analytics/midstate`, and client components under `components/analytics/midstate`. Reuse the current analytics patterns for parsing, import summaries, metrics, charts, tests, and API error handling.

**Tech Stack:** Next.js App Router, TypeScript, TailwindCSS, Prisma, PostgreSQL, Vitest, React Testing Library, Recharts, `xlsx`.

## Global Constraints

- Midstate monthly files are sell-through data and must not be inserted into `SalesRecord`.
- First version uses the `RAW DATA` worksheet as the source of truth.
- First version requires these source headers: `Vendor Name`, `MS Item Number`, `Description`, `VIN`, `Member Name`, `Member Number`, `Vendor Number`, `Order Class`, `Qty Shipped`, `Post Date`, `Cost`, `Cost Ext`.
- Quantity is the primary metric.
- `Cost Ext` is imported and shown as a secondary amount metric.
- Duplicate period replacement must be explicit through a `replaceExisting` flag.
- Existing Sales Analytics totals must not change after Midstate import.
- Use ASCII text in new source files and UI copy.
- Keep files focused and follow existing analytics service/component patterns.
- Use TDD: write focused failing tests before implementation code for each task.

---

## File Structure

Create:

- `prisma/migrations/20260707190000_midstate_member_analytics/migration.sql`: PostgreSQL schema for Midstate imports and records.
- `services/midstate/parser.ts`: fixed-format workbook parsing, preview extraction, and row normalization.
- `services/midstate/parser.test.ts`: parser unit tests using generated workbooks.
- `services/midstate/imports.ts`: upload persistence, duplicate-period detection, batch insert, and replacement behavior.
- `services/midstate/imports.test.ts`: import service unit tests with mocked Prisma and storage.
- `services/midstate/metrics.ts`: dashboard aggregation for YTD, current month, YoY, MoM, members, SKUs, order class split, and filter options.
- `services/midstate/metrics.test.ts`: metrics unit tests using in-memory rows.
- `app/api/analytics/midstate/imports/route.ts`: upload and list API.
- `app/api/analytics/midstate/imports/[id]/commit/route.ts`: commit API with optional replacement.
- `app/api/analytics/midstate/overview/route.ts`: dashboard API.
- `app/analytics/midstate/page.tsx`: Midstate dashboard route.
- `app/analytics/midstate/import/page.tsx`: Midstate import route.
- `components/analytics/midstate/midstate-dashboard.tsx`: client dashboard shell.
- `components/analytics/midstate/midstate-importer.tsx`: client upload and commit flow.
- `components/analytics/midstate/midstate-filters.tsx`: dashboard filters.
- `components/analytics/midstate/order-class-chart.tsx`: Warehouse vs Direct stacked chart.
- `components/analytics/midstate/member-heatmap.tsx`: member x month quantity heatmap.
- `components/analytics/midstate/midstate-detail-table.tsx`: member and SKU detail table.
- `components/analytics/midstate/midstate-dashboard.test.tsx`: dashboard component tests.
- `components/analytics/midstate/midstate-importer.test.tsx`: importer component tests.

Modify:

- `prisma/schema.prisma`: add Midstate enums and models.
- `app/analytics/page.tsx`: add link to Midstate dashboard and import page.
- `services/agent/context-builder.ts`: include compact Midstate analytics context.
- `services/agent/context-builder.test.ts`: assert Midstate context is included.
- `components/layout/sidebar.tsx`: keep Analytics entry as the primary nav; no new sidebar item in first version.

---

### Task 1: Midstate Prisma Schema

**Files:**

- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260707190000_midstate_member_analytics/migration.sql`

**Interfaces:**

- Produces Prisma models: `MidstateImport`, `MidstateSellThroughRecord`
- Produces enum: `MidstateImportStatus`
- Later tasks rely on Prisma Client exposing `prisma.midstateImport` and `prisma.midstateSellThroughRecord`.

- [ ] **Step 1: Add Prisma schema models**

Add this enum near existing import enums:

```prisma
enum MidstateImportStatus {
  uploaded
  imported
  failed
}
```

Add these models after `SalesRecord`:

```prisma
model MidstateImport {
  id           String                 @id @default(cuid())
  fileName     String
  storagePath  String
  sheetName    String?
  status       MidstateImportStatus   @default(uploaded)
  totalRows    Int                    @default(0)
  importedRows Int                    @default(0)
  rejectedRows Int                    @default(0)
  errorMessage String?
  periodYear   Int?
  periodMonth  Int?
  vendorNumber String?
  createdAt    DateTime               @default(now())
  updatedAt    DateTime               @updatedAt
  records      MidstateSellThroughRecord[]

  @@index([createdAt])
  @@index([status])
  @@index([periodYear, periodMonth])
  @@index([vendorNumber])
}

model MidstateSellThroughRecord {
  id           String          @id @default(cuid())
  importId     String
  postDate     DateTime
  vendorName   String?
  vendorNumber String?
  memberNumber String
  memberName   String
  msItemNumber String?
  sku          String
  description  String?
  orderClass   String
  quantity     Decimal         @db.Decimal(18, 4)
  cost         Decimal?        @db.Decimal(18, 4)
  costExt      Decimal?        @db.Decimal(18, 4)
  category     String?
  createdAt    DateTime        @default(now())
  import       MidstateImport  @relation(fields: [importId], references: [id], onDelete: Cascade)

  @@index([importId])
  @@index([postDate])
  @@index([memberNumber])
  @@index([memberName])
  @@index([sku])
  @@index([orderClass])
  @@index([category])
}
```

- [ ] **Step 2: Add migration SQL**

Create `prisma/migrations/20260707190000_midstate_member_analytics/migration.sql`:

```sql
CREATE TYPE "MidstateImportStatus" AS ENUM ('uploaded', 'imported', 'failed');

CREATE TABLE "MidstateImport" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "sheetName" TEXT,
    "status" "MidstateImportStatus" NOT NULL DEFAULT 'uploaded',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "importedRows" INTEGER NOT NULL DEFAULT 0,
    "rejectedRows" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "periodYear" INTEGER,
    "periodMonth" INTEGER,
    "vendorNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MidstateImport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MidstateSellThroughRecord" (
    "id" TEXT NOT NULL,
    "importId" TEXT NOT NULL,
    "postDate" TIMESTAMP(3) NOT NULL,
    "vendorName" TEXT,
    "vendorNumber" TEXT,
    "memberNumber" TEXT NOT NULL,
    "memberName" TEXT NOT NULL,
    "msItemNumber" TEXT,
    "sku" TEXT NOT NULL,
    "description" TEXT,
    "orderClass" TEXT NOT NULL,
    "quantity" DECIMAL(18,4) NOT NULL,
    "cost" DECIMAL(18,4),
    "costExt" DECIMAL(18,4),
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MidstateSellThroughRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MidstateImport_createdAt_idx" ON "MidstateImport"("createdAt");
CREATE INDEX "MidstateImport_status_idx" ON "MidstateImport"("status");
CREATE INDEX "MidstateImport_periodYear_periodMonth_idx" ON "MidstateImport"("periodYear", "periodMonth");
CREATE INDEX "MidstateImport_vendorNumber_idx" ON "MidstateImport"("vendorNumber");
CREATE INDEX "MidstateSellThroughRecord_importId_idx" ON "MidstateSellThroughRecord"("importId");
CREATE INDEX "MidstateSellThroughRecord_postDate_idx" ON "MidstateSellThroughRecord"("postDate");
CREATE INDEX "MidstateSellThroughRecord_memberNumber_idx" ON "MidstateSellThroughRecord"("memberNumber");
CREATE INDEX "MidstateSellThroughRecord_memberName_idx" ON "MidstateSellThroughRecord"("memberName");
CREATE INDEX "MidstateSellThroughRecord_sku_idx" ON "MidstateSellThroughRecord"("sku");
CREATE INDEX "MidstateSellThroughRecord_orderClass_idx" ON "MidstateSellThroughRecord"("orderClass");
CREATE INDEX "MidstateSellThroughRecord_category_idx" ON "MidstateSellThroughRecord"("category");

ALTER TABLE "MidstateSellThroughRecord"
ADD CONSTRAINT "MidstateSellThroughRecord_importId_fkey"
FOREIGN KEY ("importId") REFERENCES "MidstateImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

- [ ] **Step 3: Apply schema locally**

Run:

```bash
npm run prisma:migrate
npm run prisma:generate
```

Expected: migration applies and Prisma Client generates successfully.

- [ ] **Step 4: Commit schema**

Run:

```bash
git add prisma/schema.prisma prisma/migrations/20260707190000_midstate_member_analytics/migration.sql
git commit -m "feat: add midstate analytics schema"
```

Expected: one commit.

---

### Task 2: Midstate Parser and Import Service

**Files:**

- Create: `services/midstate/parser.ts`
- Create: `services/midstate/parser.test.ts`
- Create: `services/midstate/imports.ts`
- Create: `services/midstate/imports.test.ts`

**Interfaces:**

- Produces `extractMidstatePreview(input): MidstateWorkbookPreview`
- Produces `rowsFromMidstateWorkbook(buffer, sheetName?): Record<string, unknown>[]`
- Produces `normalizeMidstateRow(row): NormalizedMidstateRow`
- Produces `createMidstateImportFromFile(file): Promise<MidstateImportPreview>`
- Produces `commitMidstateImport(importId, options): Promise<MidstateImportSummary>`
- Produces `listMidstateImports(): Promise<MidstateImportListItem[]>`
- Produces `midstateCommitSchema` with `{ replaceExisting?: boolean }`

- [ ] **Step 1: Write parser tests**

Create `services/midstate/parser.test.ts` with generated workbook tests:

```ts
import { describe, expect, test } from "vitest";
import { utils, write } from "xlsx";
import {
  extractMidstatePreview,
  normalizeMidstateRow,
  rowsFromMidstateWorkbook,
} from "@/services/midstate/parser";

const headers = [
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
];

function workbookBuffer(rows: unknown[][], sheetName = "RAW DATA") {
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, utils.aoa_to_sheet(rows), sheetName);
  return Buffer.from(write(workbook, { type: "buffer", bookType: "xlsx" }));
}

describe("midstate parser", () => {
  test("extracts preview from RAW DATA and totals the source file", () => {
    const buffer = workbookBuffer([
      headers,
      ["Sutong", 10047918, "4.80/4.00-8-4 WB", "CT1008", "Bomgaars", "82801", "1001718", "Warehouse", 2, new Date(2026, 4, 1), 9.88, 19.76],
      ["Sutong", 10047919, "LG 15X6-6 WHT", "ASB1088", "Olney", "759004", "1001718", "Direct", 1, new Date(2026, 4, 2), 25.22, 25.22],
    ]);

    const preview = extractMidstatePreview({ buffer, fileName: "1001718 May 2026.xlsx" });

    expect(preview.sheetName).toBe("RAW DATA");
    expect(preview.totalRows).toBe(2);
    expect(preview.totalQuantity).toBe(3);
    expect(preview.warehouseQuantity).toBe(2);
    expect(preview.directQuantity).toBe(1);
    expect(preview.memberCount).toBe(2);
    expect(preview.skuCount).toBe(2);
    expect(preview.periodYear).toBe(2026);
    expect(preview.periodMonth).toBe(5);
    expect(preview.vendorNumber).toBe("1001718");
  });

  test("requires the RAW DATA worksheet", () => {
    const buffer = workbookBuffer([headers], "Sheet1");

    expect(() =>
      extractMidstatePreview({ buffer, fileName: "bad.xlsx" }),
    ).toThrow("Midstate workbook must include a RAW DATA sheet.");
  });

  test("normalizes a valid row", () => {
    const result = normalizeMidstateRow({
      "Vendor Name": "Sutong Tire Resources",
      "MS Item Number": 10047919,
      Description: "LG 15X6-6 WHT",
      VIN: "ASB1088",
      "Member Name": "Running Supply, Inc.",
      "Member Number": "758801",
      "Vendor Number": "1001718",
      "Order Class": "Warehouse",
      "Qty Shipped": 2,
      "Post Date": new Date(2026, 4, 2),
      Cost: 25.22,
      "Cost Ext": 50.44,
    });

    expect(result).toMatchObject({
      ok: true,
      record: {
        sku: "ASB1088",
        memberNumber: "758801",
        memberName: "Running Supply, Inc.",
        orderClass: "Warehouse",
        quantity: 2,
        cost: 25.22,
        costExt: 50.44,
      },
    });
  });

  test("rejects invalid required values", () => {
    const result = normalizeMidstateRow({
      "Member Name": "",
      "Member Number": "",
      VIN: "",
      "Order Class": "",
      "Qty Shipped": "not-a-number",
      "Post Date": "not-a-date",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain("Post Date is invalid.");
      expect(result.errors).toContain("SKU is required.");
      expect(result.errors).toContain("Qty Shipped is invalid.");
    }
  });

  test("returns rows from RAW DATA", () => {
    const buffer = workbookBuffer([headers, ["Sutong", 1, "desc", "SKU1", "Member", "1", "1001718", "Warehouse", 1, new Date(2026, 4, 1), 1, 1]]);

    expect(rowsFromMidstateWorkbook(buffer)).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run parser tests to verify failure**

Run:

```bash
npm run test -- services/midstate/parser.test.ts
```

Expected: FAIL because `services/midstate/parser.ts` does not exist.

- [ ] **Step 3: Implement parser**

Create `services/midstate/parser.ts` with:

```ts
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
    Object.values(row).some((value) => value !== null && String(value).trim() !== ""),
  );
}

function validateHeaders(headers: string[]) {
  const missing = midstateRequiredHeaders.filter((header) => !headers.includes(header));
  if (missing.length > 0) {
    throw new Error(`Midstate RAW DATA is missing required columns: ${missing.join(", ")}.`);
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

export function rowsFromMidstateWorkbook(buffer: Buffer, sheetName = MIDSTATE_RAW_DATA_SHEET) {
  const workbook = readWorkbook(buffer);
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error("Midstate workbook must include a RAW DATA sheet.");
  }
  return parseSheetRows(sheet);
}

export function normalizeMidstateRow(row: Record<string, unknown>): NormalizedMidstateRow {
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

  if (!postDate || !memberNumber || !memberName || !sku || !orderClass || quantity === null) {
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

export function extractMidstatePreview(input: { buffer: Buffer; fileName: string }): MidstateWorkbookPreview {
  const workbook = readWorkbook(input.buffer);
  const sheet = workbook.Sheets[MIDSTATE_RAW_DATA_SHEET];
  if (!sheet) {
    throw new Error("Midstate workbook must include a RAW DATA sheet.");
  }
  const rows = parseSheetRows(sheet);
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
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
  const dates = valid.map((row) => row.postDate).sort((a, b) => a.getTime() - b.getTime());
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
    dateRange: { start: isoDate(dates[0] ?? null), end: isoDate(dates.at(-1) ?? null) },
    periodYear,
    periodMonth,
    vendorNumber: valid[0]?.vendorNumber ?? null,
  };
}
```

- [ ] **Step 4: Run parser tests**

Run:

```bash
npm run test -- services/midstate/parser.test.ts
```

Expected: PASS.

- [ ] **Step 5: Write import service tests**

Create `services/midstate/imports.test.ts` with mocked Prisma, storage, and parser:

```ts
import { beforeEach, describe, expect, test, vi } from "vitest";
import { commitMidstateImport, createMidstateImportFromFile } from "@/services/midstate/imports";
import { prisma } from "@/lib/db";
import { saveUploadedFile } from "@/lib/storage";
import { extractMidstatePreview, rowsFromMidstateWorkbook } from "@/services/midstate/parser";

vi.mock("@/lib/db", () => ({
  prisma: {
    midstateImport: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    midstateSellThroughRecord: {
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(async (callback) => callback(prisma)),
  },
}));

vi.mock("@/lib/storage", () => ({
  saveUploadedFile: vi.fn(),
  deleteStoredFile: vi.fn(),
}));

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(async () => Buffer.from("file")),
}));

vi.mock("@/services/midstate/parser", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/midstate/parser")>();
  return {
    ...actual,
    extractMidstatePreview: vi.fn(),
    rowsFromMidstateWorkbook: vi.fn(),
  };
});

describe("midstate imports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(saveUploadedFile).mockResolvedValue({
      storagePath: "storage/uploads/midstate.xlsx",
      originalName: "1001718 May 2026.xlsx",
      size: 123,
    });
    vi.mocked(extractMidstatePreview).mockReturnValue({
      sheetName: "RAW DATA",
      headers: ["VIN"],
      previewRows: [],
      totalRows: 2,
      totalQuantity: 3,
      warehouseQuantity: 2,
      directQuantity: 1,
      memberCount: 2,
      skuCount: 2,
      dateRange: { start: "2026-05-01", end: "2026-05-02" },
      periodYear: 2026,
      periodMonth: 5,
      vendorNumber: "1001718",
    });
  });

  test("creates an upload preview", async () => {
    vi.mocked(prisma.midstateImport.create).mockResolvedValue({
      id: "import-1",
      fileName: "1001718 May 2026.xlsx",
      storagePath: "storage/uploads/midstate.xlsx",
      sheetName: "RAW DATA",
      status: "uploaded",
      totalRows: 2,
      importedRows: 0,
      rejectedRows: 0,
      errorMessage: null,
      periodYear: 2026,
      periodMonth: 5,
      vendorNumber: "1001718",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const file = new File(["data"], "1001718 May 2026.xlsx");
    const result = await createMidstateImportFromFile(file);

    expect(result.importId).toBe("import-1");
    expect(result.totalQuantity).toBe(3);
    expect(prisma.midstateImport.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        sheetName: "RAW DATA",
        periodYear: 2026,
        periodMonth: 5,
        vendorNumber: "1001718",
      }),
    });
  });

  test("requires explicit replacement for existing imported period", async () => {
    vi.mocked(prisma.midstateImport.findUnique).mockResolvedValue({
      id: "import-1",
      fileName: "1001718 May 2026.xlsx",
      storagePath: "storage/uploads/midstate.xlsx",
      sheetName: "RAW DATA",
      status: "uploaded",
      totalRows: 0,
      importedRows: 0,
      rejectedRows: 0,
      errorMessage: null,
      periodYear: 2026,
      periodMonth: 5,
      vendorNumber: "1001718",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(prisma.midstateImport.findMany).mockResolvedValue([{ id: "old-import" }] as never);
    vi.mocked(rowsFromMidstateWorkbook).mockReturnValue([]);

    await expect(commitMidstateImport("import-1", { replaceExisting: false })).rejects.toThrow(
      "Midstate period already exists. Confirm replacement to continue.",
    );
  });
});
```

- [ ] **Step 6: Run import service tests to verify failure**

Run:

```bash
npm run test -- services/midstate/imports.test.ts
```

Expected: FAIL because `services/midstate/imports.ts` does not exist.

- [ ] **Step 7: Implement import service**

Create `services/midstate/imports.ts` with fixed-format upload and batch commit behavior. Use the same storage cleanup pattern as `services/analytics/imports.ts`.

Required public API:

```ts
export const midstateCommitSchema = z.object({
  replaceExisting: z.boolean().optional().default(false),
});

export type MidstateImportPreview = MidstateWorkbookPreview & {
  importId: string;
  fileName: string;
};

export type MidstateImportSummary = {
  importId: string;
  totalRows: number;
  importedRows: number;
  rejectedRows: number;
  replacedImports: number;
  errors: string[];
};

export async function createMidstateImportFromFile(file: File): Promise<MidstateImportPreview>;
export async function listMidstateImports();
export async function commitMidstateImport(
  importId: string,
  options?: { replaceExisting?: boolean },
): Promise<MidstateImportSummary>;
```

Implementation requirements:

- Accept `.xlsx` and `.xls` only.
- Save upload through `saveUploadedFile`.
- Store `periodYear`, `periodMonth`, and `vendorNumber` from preview.
- On commit, load rows using `rowsFromMidstateWorkbook`.
- Normalize rows with `normalizeMidstateRow`.
- Detect existing imported periods using `periodYear`, `periodMonth`, and `vendorNumber`.
- If existing imports are found and `replaceExisting` is false, throw `Midstate period already exists. Confirm replacement to continue.`
- If `replaceExisting` is true, delete previous `MidstateImport` rows for the same period except the current import. Cascading deletes remove their records.
- Delete current import records before inserting, so re-committing the same import is idempotent.
- Insert in batches of `1_000`.
- Update import status to `imported`.

- [ ] **Step 8: Run parser and import tests**

Run:

```bash
npm run test -- services/midstate/parser.test.ts services/midstate/imports.test.ts
```

Expected: PASS.

- [ ] **Step 9: Commit parser and import service**

Run:

```bash
git add services/midstate
git commit -m "feat: add midstate import services"
```

Expected: one commit.

---

### Task 3: Midstate Metrics Service

**Files:**

- Create: `services/midstate/metrics.ts`
- Create: `services/midstate/metrics.test.ts`

**Interfaces:**

- Consumes Prisma model `MidstateSellThroughRecord`
- Produces `midstateAnalyticsFiltersSchema`
- Produces `getMidstateAnalytics(filters): Promise<MidstateAnalyticsOverview>`
- Produces `summarizeMidstateRowsForTest(rows, filters, filterOptionRows?)`

- [ ] **Step 1: Write metrics tests**

Create `services/midstate/metrics.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import { summarizeMidstateRowsForTest } from "@/services/midstate/metrics";

const rows = [
  { postDate: new Date(2025, 4, 1), memberNumber: "82801", memberName: "Bomgaars", sku: "WD1030", description: "Wheel", orderClass: "Warehouse", category: null, quantity: 100, costExt: 1000 },
  { postDate: new Date(2026, 0, 1), memberNumber: "82801", memberName: "Bomgaars", sku: "WD1030", description: "Wheel", orderClass: "Warehouse", category: null, quantity: 50, costExt: 500 },
  { postDate: new Date(2026, 3, 1), memberNumber: "758801", memberName: "Running Supply", sku: "ASB1088", description: "Tire", orderClass: "Warehouse", category: "Lawn & Garden", quantity: 25, costExt: 625 },
  { postDate: new Date(2026, 4, 1), memberNumber: "82801", memberName: "Bomgaars", sku: "WD1030", description: "Wheel", orderClass: "Warehouse", category: null, quantity: 200, costExt: 2000 },
  { postDate: new Date(2026, 4, 2), memberNumber: "759004", memberName: "Olney", sku: "ASR1200", description: "Radial", orderClass: "Direct", category: "ST Radial", quantity: 10, costExt: 900 },
];

describe("midstate metrics", () => {
  test("summarizes YTD, current month, rankings, and order class split", () => {
    const analytics = summarizeMidstateRowsForTest(rows, {
      year: 2026,
      startMonth: 1,
      endMonth: 5,
    });

    expect(analytics.kpis.ytdQuantity).toBe(285);
    expect(analytics.kpis.currentMonthQuantity).toBe(210);
    expect(analytics.kpis.ytdCostExt).toBe(4025);
    expect(analytics.kpis.activeMembers).toBe(3);
    expect(analytics.topMembers[0]).toMatchObject({ name: "Bomgaars", quantity: 250 });
    expect(analytics.topSkus[0]).toMatchObject({ name: "WD1030", quantity: 250 });
    expect(analytics.orderClassMonthly.at(-1)).toMatchObject({
      month: "2026-05",
      Warehouse: 200,
      Direct: 10,
    });
  });

  test("computes YoY and MoM for the latest month", () => {
    const analytics = summarizeMidstateRowsForTest(rows, {
      year: 2026,
      startMonth: 1,
      endMonth: 5,
    });

    const may = analytics.monthly.find((month) => month.month === "2026-05");
    expect(may?.momQuantityGrowth).toBe(7.4);
    expect(may?.yoyQuantityGrowth).toBe(1.1);
  });

  test("applies member, sku, category, and order class filters", () => {
    const analytics = summarizeMidstateRowsForTest(rows, {
      year: 2026,
      startMonth: 1,
      endMonth: 5,
      memberNumber: "759004",
      sku: "ASR1200",
      category: "ST Radial",
      orderClass: "Direct",
    });

    expect(analytics.kpis.ytdQuantity).toBe(10);
    expect(analytics.topMembers).toHaveLength(1);
    expect(analytics.topMembers[0].name).toBe("Olney");
  });
});
```

- [ ] **Step 2: Run metrics tests to verify failure**

Run:

```bash
npm run test -- services/midstate/metrics.test.ts
```

Expected: FAIL because `services/midstate/metrics.ts` does not exist.

- [ ] **Step 3: Implement metrics service**

Create `services/midstate/metrics.ts` with:

```ts
import type { MidstateSellThroughRecord } from "@prisma/client";
import { z } from "zod";

export const midstateAnalyticsFiltersSchema = z
  .object({
    year: z.coerce.number().int().min(2000).max(2100).optional(),
    startMonth: z.coerce.number().int().min(1).max(12).optional(),
    endMonth: z.coerce.number().int().min(1).max(12).optional(),
    memberNumber: z.string().trim().optional(),
    sku: z.string().trim().optional(),
    category: z.string().trim().optional(),
    orderClass: z.string().trim().optional(),
  })
  .superRefine((filters, context) => {
    const startMonth = filters.startMonth ?? 1;
    const endMonth = filters.endMonth ?? 12;
    if (startMonth > endMonth) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["startMonth"],
        message: "Start month must be before or equal to end month.",
      });
    }
  });

export type MidstateAnalyticsFilters = z.infer<typeof midstateAnalyticsFiltersSchema>;

type MidstateMetricRow = Pick<
  MidstateSellThroughRecord,
  "postDate" | "memberNumber" | "memberName" | "sku" | "description" | "orderClass" | "category"
> & {
  quantity: number;
  costExt: number | null;
};
```

Include these output types:

```ts
export type MidstateAnalyticsOverview = {
  kpis: {
    ytdQuantity: number;
    currentMonthQuantity: number;
    ytdCostExt: number;
    latestMoMQuantityGrowth: number | null;
    latestYoYQuantityGrowth: number | null;
    activeMembers: number;
    topMember: string | null;
    topSku: string | null;
  };
  monthly: Array<{
    month: string;
    quantity: number;
    costExt: number;
    momQuantityGrowth: number | null;
    yoyQuantityGrowth: number | null;
  }>;
  yoyComparison: Array<{
    month: string;
    monthLabel: string;
    currentYear: number;
    priorYear: number;
    currentQuantity: number;
    priorQuantity: number | null;
    quantityGrowth: number | null;
  }>;
  orderClassMonthly: Array<{ month: string; Warehouse: number; Direct: number; Other: number }>;
  topMembers: Array<{ name: string; memberNumber: string; quantity: number; costExt: number }>;
  topSkus: Array<{ name: string; description: string | null; quantity: number; costExt: number }>;
  memberHeatmap: Array<{ memberNumber: string; memberName: string; months: Record<string, number> }>;
  skuByMember: Array<{ name: string; memberNumber: string; quantity: number; costExt: number }>;
  memberRows: Array<{ memberNumber: string; memberName: string; quantity: number; costExt: number; topSku: string | null }>;
  skuRows: Array<{ sku: string; description: string | null; quantity: number; costExt: number; topMember: string | null }>;
  filterOptions: {
    years: string[];
    members: Array<{ value: string; label: string }>;
    skus: string[];
    categories: string[];
    orderClasses: string[];
  };
};
```

Implementation rules:

- Use `new Date(year - 1, startMonth - 1, 1)` through `new Date(year, endMonth, 1)` for query range so prior-year YoY rows are available.
- Current period rows are selected by `year` and `startMonth..endMonth`.
- Prior rows are selected by `year - 1` and `startMonth..endMonth`.
- Filter current and prior rows by `memberNumber`, `sku`, `category`, and `orderClass`.
- `calculateGrowth(current, previous)` returns `null` when `previous` is missing or zero.
- Round growth only in UI. Keep service values as numbers.
- Convert Prisma decimals using `Number(row.quantity)` and `Number(row.costExt ?? 0)`.

- [ ] **Step 4: Run metrics tests**

Run:

```bash
npm run test -- services/midstate/metrics.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit metrics service**

Run:

```bash
git add services/midstate/metrics.ts services/midstate/metrics.test.ts
git commit -m "feat: add midstate analytics metrics"
```

Expected: one commit.

---

### Task 4: Midstate API Routes

**Files:**

- Create: `app/api/analytics/midstate/imports/route.ts`
- Create: `app/api/analytics/midstate/imports/[id]/commit/route.ts`
- Create: `app/api/analytics/midstate/overview/route.ts`

**Interfaces:**

- Consumes services from Tasks 2 and 3.
- Produces `POST /api/analytics/midstate/imports`
- Produces `GET /api/analytics/midstate/imports`
- Produces `POST /api/analytics/midstate/imports/:id/commit`
- Produces `GET /api/analytics/midstate/overview`

- [ ] **Step 1: Create upload/list route**

Implement `app/api/analytics/midstate/imports/route.ts` using the same structure as `app/api/analytics/imports/route.ts`.

Required behavior:

- Reject missing file with `A Midstate file is required.`
- Reject files over storage limit with current upload limit helper.
- Reject invalid workbook errors with HTTP 400.
- Return `{ import: preview }` with status 201.
- Return `{ imports }` for GET.

- [ ] **Step 2: Create commit route**

Implement `app/api/analytics/midstate/imports/[id]/commit/route.ts`:

```ts
import { ZodError } from "zod";
import { commitMidstateImport, midstateCommitSchema } from "@/services/midstate/imports";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function errorResponse(message: string, status: number, details?: unknown) {
  return Response.json({ error: message, details }, { status });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const options = midstateCommitSchema.parse(body);
    return Response.json({ summary: await commitMidstateImport(id, options) });
  } catch (error) {
    if (error instanceof ZodError) {
      return errorResponse("Midstate import input is invalid.", 400, error.flatten());
    }
    const message = error instanceof Error ? error.message : "Unable to import Midstate rows.";
    const status = message.includes("not found") ? 404 : message.includes("already exists") ? 409 : 503;
    console.error("Failed to commit Midstate import", error);
    return errorResponse(message, status);
  }
}
```

- [ ] **Step 3: Create dashboard route**

Implement `app/api/analytics/midstate/overview/route.ts`:

```ts
import { ZodError } from "zod";
import {
  getMidstateAnalytics,
  midstateAnalyticsFiltersSchema,
} from "@/services/midstate/metrics";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function errorResponse(message: string, status: number, details?: unknown) {
  return Response.json({ error: message, details }, { status });
}

export async function GET(request: Request) {
  try {
    const searchParams = Object.fromEntries(new URL(request.url).searchParams.entries());
    const filters = midstateAnalyticsFiltersSchema.parse(searchParams);
    return Response.json({ analytics: await getMidstateAnalytics(filters) });
  } catch (error) {
    if (error instanceof ZodError) {
      return errorResponse("Midstate analytics filters are invalid.", 400, error.flatten());
    }
    console.error("Failed to load Midstate analytics", error);
    return errorResponse("Unable to load Midstate analytics.", 503);
  }
}
```

- [ ] **Step 4: Run API-adjacent tests**

Run:

```bash
npm run test -- services/midstate/parser.test.ts services/midstate/imports.test.ts services/midstate/metrics.test.ts app/api/analytics/imports/route.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit API routes**

Run:

```bash
git add app/api/analytics/midstate
git commit -m "feat: add midstate analytics api"
```

Expected: one commit.

---

### Task 5: Midstate Dashboard and Import UI

**Files:**

- Create: `app/analytics/midstate/page.tsx`
- Create: `app/analytics/midstate/import/page.tsx`
- Create: `components/analytics/midstate/midstate-dashboard.tsx`
- Create: `components/analytics/midstate/midstate-importer.tsx`
- Create: `components/analytics/midstate/midstate-filters.tsx`
- Create: `components/analytics/midstate/order-class-chart.tsx`
- Create: `components/analytics/midstate/member-heatmap.tsx`
- Create: `components/analytics/midstate/midstate-detail-table.tsx`
- Create: `components/analytics/midstate/midstate-dashboard.test.tsx`
- Create: `components/analytics/midstate/midstate-importer.test.tsx`
- Modify: `app/analytics/page.tsx`

**Interfaces:**

- Consumes `GET /api/analytics/midstate/overview`
- Consumes Midstate upload/commit APIs.
- Produces dashboard route `/analytics/midstate`
- Produces import route `/analytics/midstate/import`

- [ ] **Step 1: Write importer component test**

Create `components/analytics/midstate/midstate-importer.test.tsx`:

```ts
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { MidstateImporter } from "@/components/analytics/midstate/midstate-importer";

describe("MidstateImporter", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  test("uploads and imports a Midstate workbook", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          import: {
            importId: "import-1",
            fileName: "1001718 May 2026.xlsx",
            sheetName: "RAW DATA",
            totalRows: 7572,
            totalQuantity: 14757,
            warehouseQuantity: 14615,
            directQuantity: 142,
            memberCount: 19,
            skuCount: 121,
            dateRange: { start: "2026-05-01", end: "2026-05-30" },
            periodYear: 2026,
            periodMonth: 5,
            vendorNumber: "1001718",
            headers: ["VIN"],
            previewRows: [],
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          summary: {
            totalRows: 7572,
            importedRows: 7572,
            rejectedRows: 0,
            replacedImports: 0,
          },
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<MidstateImporter />);

    fireEvent.change(screen.getByLabelText(/midstate monthly file/i), {
      target: { files: [new File(["data"], "1001718 May 2026.xlsx")] },
    });
    fireEvent.click(screen.getByRole("button", { name: /upload midstate file/i }));

    expect(await screen.findByText(/14,757/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /import rows/i }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/analytics/midstate/imports/import-1/commit",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ replaceExisting: false }),
        }),
      );
    });
    expect(await screen.findByText(/Imported 7,572 of 7,572 rows/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Write dashboard component test**

Create `components/analytics/midstate/midstate-dashboard.test.tsx`:

```ts
import "@testing-library/jest-dom/vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { MidstateDashboard } from "@/components/analytics/midstate/midstate-dashboard";

describe("MidstateDashboard", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  test("loads and renders Midstate analytics", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        analytics: {
          kpis: {
            ytdQuantity: 14757,
            currentMonthQuantity: 14757,
            ytdCostExt: 371155,
            latestMoMQuantityGrowth: null,
            latestYoYQuantityGrowth: null,
            activeMembers: 19,
            topMember: "Bomgaars Supply, Inc.",
            topSku: "WD1030",
          },
          monthly: [{ month: "2026-05", quantity: 14757, costExt: 371155, momQuantityGrowth: null, yoyQuantityGrowth: null }],
          yoyComparison: [{ month: "05", monthLabel: "May", currentYear: 2026, priorYear: 2025, currentQuantity: 14757, priorQuantity: null, quantityGrowth: null }],
          orderClassMonthly: [{ month: "2026-05", Warehouse: 14615, Direct: 142, Other: 0 }],
          topMembers: [{ name: "Bomgaars Supply, Inc.", memberNumber: "82801", quantity: 5114, costExt: 0 }],
          topSkus: [{ name: "WD1030", description: "Wheel", quantity: 2256, costExt: 0 }],
          memberHeatmap: [{ memberNumber: "82801", memberName: "Bomgaars Supply, Inc.", months: { "2026-05": 5114 } }],
          skuByMember: [],
          memberRows: [{ memberNumber: "82801", memberName: "Bomgaars Supply, Inc.", quantity: 5114, costExt: 0, topSku: "WD1030" }],
          skuRows: [{ sku: "WD1030", description: "Wheel", quantity: 2256, costExt: 0, topMember: "Bomgaars Supply, Inc." }],
          filterOptions: { years: ["2026"], members: [{ value: "82801", label: "Bomgaars Supply, Inc." }], skus: ["WD1030"], categories: [], orderClasses: ["Warehouse", "Direct"] },
        },
      }),
    }));

    render(<MidstateDashboard />);

    expect(await screen.findByText("YTD Sell-through Qty")).toBeInTheDocument();
    expect(screen.getByText("14,757")).toBeInTheDocument();
    expect(screen.getByText("Top Members")).toBeInTheDocument();
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/analytics/midstate/overview?year=2026", expect.objectContaining({ cache: "no-store" }));
    });
  });
});
```

- [ ] **Step 3: Run UI tests to verify failure**

Run:

```bash
npm run test -- components/analytics/midstate/midstate-importer.test.tsx components/analytics/midstate/midstate-dashboard.test.tsx
```

Expected: FAIL because components do not exist.

- [ ] **Step 4: Implement pages**

Create `app/analytics/midstate/page.tsx`:

```tsx
import Link from "next/link";
import { MidstateDashboard } from "@/components/analytics/midstate/midstate-dashboard";
import { Button } from "@/components/ui/button";

export default function MidstateAnalyticsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">
            Midstate Member Analytics
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
            Analyze Midstate sell-through by member, SKU, month, and order class.
          </p>
        </div>
        <Button asChild>
          <Link href="/analytics/midstate/import">Import Midstate File</Link>
        </Button>
      </div>
      <MidstateDashboard />
    </div>
  );
}
```

Create `app/analytics/midstate/import/page.tsx`:

```tsx
import Link from "next/link";
import { MidstateImporter } from "@/components/analytics/midstate/midstate-importer";

export default function MidstateImportPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/analytics/midstate" className="text-sm font-medium text-zinc-500 hover:text-zinc-950">
          Back to Midstate Analytics
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-950">
          Import Midstate File
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
          Upload the monthly Midstate workbook. The RAW DATA sheet is imported as member sell-through data.
        </p>
      </div>
      <MidstateImporter />
    </div>
  );
}
```

- [ ] **Step 5: Implement importer**

Create `components/analytics/midstate/midstate-importer.tsx` as a client component.

Required behavior:

- File input label: `Midstate monthly file`
- Upload button: `Upload Midstate File`
- POST to `/api/analytics/midstate/imports`
- Show preview cards: total quantity, Warehouse, Direct, members, SKUs, date range.
- Commit button: `Import Rows`
- POST to `/api/analytics/midstate/imports/${importId}/commit` with `{ replaceExisting }`
- If commit returns 409, show a checkbox labeled `Replace existing period` and let user retry.
- Show import summary.

- [ ] **Step 6: Implement dashboard components**

Create client dashboard components using existing `ChartCard`, `KpiCard`, `MonthlyTrendChart`, `YoYComparisonChart`, `RankingBars`, and Recharts.

Required behavior:

- Default year: current year.
- GET `/api/analytics/midstate/overview?year=${year}`.
- Render KPI cards:
  - `YTD Sell-through Qty`
  - `Current Month Qty`
  - `YTD Cost Ext`
  - `Latest MoM`
  - `Latest YoY`
  - `Active Members`
  - `Top Member`
  - `Top SKU`
- Render charts:
  - Monthly trend using quantity and Cost Ext.
  - YoY quantity comparison.
  - Warehouse vs Direct stacked bar chart.
  - Top Members.
  - Top SKUs.
  - Member heatmap.
- Render detail tables for members and SKUs.

- [ ] **Step 7: Add links on main Analytics page**

Modify `app/analytics/page.tsx` so the header action area includes:

```tsx
<Button asChild variant="secondary">
  <Link href="/analytics/midstate">Midstate Analytics</Link>
</Button>
<Button asChild variant="secondary">
  <Link href="/analytics/midstate/import">Import Midstate</Link>
</Button>
```

Keep the existing sales import link.

- [ ] **Step 8: Run UI tests**

Run:

```bash
npm run test -- components/analytics/midstate/midstate-importer.test.tsx components/analytics/midstate/midstate-dashboard.test.tsx
```

Expected: PASS.

- [ ] **Step 9: Commit UI**

Run:

```bash
git add app/analytics components/analytics/midstate
git commit -m "feat: add midstate analytics ui"
```

Expected: one commit.

---

### Task 6: Agent Context, Full Verification, and Real Import Check

**Files:**

- Modify: `services/agent/context-builder.ts`
- Modify: `services/agent/context-builder.test.ts`

**Interfaces:**

- Consumes `getMidstateAnalytics({ year })`
- Produces a compact `Midstate Analytics` section in Agent context.

- [ ] **Step 1: Add failing Agent context test**

Modify `services/agent/context-builder.test.ts`:

```ts
vi.mock("@/services/midstate/metrics", () => ({
  getMidstateAnalytics: vi.fn(async () => ({
    kpis: {
      ytdQuantity: 14757,
      currentMonthQuantity: 14757,
      ytdCostExt: 371155,
      latestMoMQuantityGrowth: null,
      latestYoYQuantityGrowth: null,
      activeMembers: 19,
      topMember: "Bomgaars Supply, Inc.",
      topSku: "WD1030",
    },
    topMembers: [{ name: "Bomgaars Supply, Inc.", memberNumber: "82801", quantity: 5114, costExt: 0 }],
    topSkus: [{ name: "WD1030", description: "Wheel", quantity: 2256, costExt: 0 }],
  })),
}));
```

Add an assertion to the context test:

```ts
expect(context).toContain("Midstate Analytics");
expect(context).toContain("YTD Sell-through Quantity: 14,757");
expect(context).toContain("Top Member: Bomgaars Supply, Inc.");
expect(context).toContain("Top SKU: WD1030");
```

- [ ] **Step 2: Run Agent context test to verify failure**

Run:

```bash
npm run test -- services/agent/context-builder.test.ts
```

Expected: FAIL until context builder includes Midstate.

- [ ] **Step 3: Implement Agent context**

Modify `services/agent/context-builder.ts`:

```ts
import { getMidstateAnalytics } from "@/services/midstate/metrics";
```

Add a compact section after existing sales analytics context:

```ts
const midstate = await getMidstateAnalytics({ year: new Date().getFullYear() });
sections.push([
  "Midstate Analytics",
  `YTD Sell-through Quantity: ${midstate.kpis.ytdQuantity.toLocaleString()}`,
  `Current Month Quantity: ${midstate.kpis.currentMonthQuantity.toLocaleString()}`,
  `Active Members: ${midstate.kpis.activeMembers.toLocaleString()}`,
  `Top Member: ${midstate.kpis.topMember ?? "N/A"}`,
  `Top SKU: ${midstate.kpis.topSku ?? "N/A"}`,
].join("\n"));
```

Wrap this section in the same error-tolerant pattern used for existing optional analytics context so Agent chat still works when the database is empty or unavailable.

- [ ] **Step 4: Run focused test suite**

Run:

```bash
npm run test -- services/midstate/parser.test.ts services/midstate/imports.test.ts services/midstate/metrics.test.ts components/analytics/midstate/midstate-importer.test.tsx components/analytics/midstate/midstate-dashboard.test.tsx services/agent/context-builder.test.ts
```

Expected: PASS.

- [ ] **Step 5: Run full verification**

Run:

```bash
npm run test
npm run lint
npm run build
```

Expected: all pass. If build prints the existing Turbopack warning related to upload route tracing, record it as non-blocking only if the build exits successfully.

- [ ] **Step 6: Apply migration and import the real May file through the app**

Use the running local app or start it with:

```bash
npm run dev -- --hostname 127.0.0.1
```

Open:

```text
http://127.0.0.1:3000/analytics/midstate/import
```

Upload:

```text
C:\Users\RichardYu\OneDrive - Sutong Tire Resources, Inc\Desktop\midstate monthly\1001718 May 2026.xlsx
```

Expected preview values:

- Total quantity: `14,757`
- Warehouse quantity: `14,615`
- Direct quantity: `142`
- Member count: `19`
- SKU count: `121`

Commit import. Then open:

```text
http://127.0.0.1:3000/analytics/midstate
```

Expected dashboard:

- YTD Sell-through Qty includes `14,757` for May when only this file is imported.
- Top Member includes `Bomgaars Supply, Inc.` with `5,114`.
- Top SKU includes `WD1030` with `2,256`.
- Warehouse vs Direct shows `14,615` Warehouse and `142` Direct for May 2026.

- [ ] **Step 7: Verify existing Sales Analytics is unchanged**

Run a database check or use the existing Sales Analytics dashboard.

Expected current Sales Analytics 2026 Jan-Jun remains:

- Quantity: `705,286`
- Revenue: `21,209,879.3771`

Midstate import must not change `SalesRecord`.

- [ ] **Step 8: Commit Agent and verification changes**

Run:

```bash
git add services/agent
git commit -m "feat: add midstate analytics agent context"
```

Expected: one commit.

---

## Final Deliverable

After all tasks:

- `/analytics/midstate/import` imports Midstate monthly workbooks from `RAW DATA`.
- `/analytics/midstate` shows member sell-through analytics.
- Existing `/analytics` Sales Analytics remains sell-in only.
- Agent context includes a compact Midstate summary.
- Tests, lint, and build pass.
