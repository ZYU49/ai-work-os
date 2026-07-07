# Sales Analytics MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an import-based Sales Analytics module that accepts Excel/CSV sales detail files, maps columns, imports rows into PostgreSQL, and renders YTD, monthly, MoM, YoY-ready, customer, category, SKU, and salesperson visualizations.

**Architecture:** Add a new analytics domain with Prisma models, parser/mapping services, import APIs, aggregation APIs, and client pages under `/analytics`. Keep parsing and calculations in services so UI and Agent can reuse the same summaries.

**Tech Stack:** Next.js 16, TypeScript, TailwindCSS, Prisma/PostgreSQL, Vitest, Playwright, `xlsx` for Excel/CSV parsing, and `recharts` for dashboard charts.

## Global Constraints

- First version supports Excel and CSV imports only; no ERP, QuickBooks, Outlook, Gmail, or scheduled imports.
- Required mapping fields: `orderDate`, `customerName`, `sku`, `quantity`, `revenue`.
- Optional mapping fields: `invoiceNumber`, `customerCode`, `customerPo`, `productName`, `category`, `salesperson`, `shipToState`, `shipToCity`, `warehouse`, `shipmentNumber`, `shipToCode`, `memberName`.
- Rows with missing required values or invalid date/number values are rejected and counted.
- Growth metrics with zero or missing denominator return `null` and display as `N/A`.
- Quantity is the primary metric; revenue is included throughout.
- YoY works only when prior-year comparable data exists; 2026-only imports should show YoY as `N/A`.
- Mid-States member view is supported by an optional `memberName` mapped field; member derivation from ship-to code/address is future work.
- Keep existing local runtime behavior: scripts must run through existing npm scripts and `scripts/use-node24.cjs`.
- Do not commit `.env`, `.next`, `node_modules`, `dev-server.log`, local upload files, or desktop shortcut scripts.

---

## File Structure

Create:

- `services/analytics/fields.ts`: shared sales field names, labels, required/optional field metadata.
- `services/analytics/parser.ts`: Excel/CSV parsing, header extraction, preview extraction, row normalization.
- `services/analytics/imports.ts`: import persistence, mapping validation, row import transaction.
- `services/analytics/metrics.ts`: YTD, monthly, growth, top ranking, and filter aggregation.
- `services/analytics/fields.test.ts`
- `services/analytics/parser.test.ts`
- `services/analytics/imports.test.ts`
- `services/analytics/metrics.test.ts`
- `app/api/analytics/imports/route.ts`: upload/list imports.
- `app/api/analytics/imports/[id]/commit/route.ts`: commit mapped import.
- `app/api/analytics/sales/route.ts`: analytics summary endpoint.
- `app/analytics/page.tsx`: dashboard.
- `app/analytics/import/page.tsx`: import/mapping workflow.
- `components/analytics/analytics-dashboard.tsx`
- `components/analytics/analytics-importer.tsx`
- `components/analytics/chart-card.tsx`
- `components/analytics/kpi-card.tsx`
- `components/analytics/monthly-trend-chart.tsx`
- `components/analytics/ranking-bars.tsx`
- `components/analytics/sales-filters.tsx`

Modify:

- `package.json` and `package-lock.json`: add `xlsx` and `recharts`.
- `prisma/schema.prisma`: add `SalesImport`, `SalesRecord`, and enums.
- `prisma/migrations/<timestamp>_sales_analytics/migration.sql`: add tables and indexes.
- `components/layout/sidebar.tsx`: add Analytics nav item.
- `services/agent/context-builder.ts`: include a compact sales analytics summary.
- `tests/e2e/smoke.spec.ts`: include Analytics and Analytics Import pages.

---

### Task 1: Dependencies And Sales Schema

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260707120000_sales_analytics/migration.sql`

**Interfaces:**
- Produces Prisma models:
  - `SalesImport`
  - `SalesRecord`
  - enum `SalesImportStatus`
  - enum `SalesImportSourceType`
- Later tasks rely on Prisma Client exposing `prisma.salesImport` and `prisma.salesRecord`.

- [ ] **Step 1: Add dependencies**

Run:

```powershell
npm install xlsx recharts
```

Expected:

- `package.json` includes `xlsx` and `recharts`.
- `package-lock.json` updates.

- [ ] **Step 2: Modify Prisma schema**

Add enums:

```prisma
enum SalesImportStatus {
  uploaded
  mapped
  imported
  failed
}

enum SalesImportSourceType {
  excel
  csv
}
```

Add models:

```prisma
model SalesImport {
  id           String                @id @default(cuid())
  fileName     String
  storagePath  String
  sourceType   SalesImportSourceType
  sheetName    String?
  status       SalesImportStatus     @default(uploaded)
  mapping      Json?
  totalRows    Int                   @default(0)
  importedRows Int                   @default(0)
  rejectedRows Int                   @default(0)
  errorMessage String?
  createdAt    DateTime              @default(now())
  updatedAt    DateTime              @updatedAt
  records      SalesRecord[]

  @@index([createdAt])
  @@index([status])
}

model SalesRecord {
  id             String      @id @default(cuid())
  importId       String
  orderDate      DateTime
  invoiceNumber  String?
  customerCode   String?
  customerName   String
  customerPo     String?
  sku            String
  productName    String?
  category       String?
  salesperson    String?
  shipToState    String?
  shipToCity     String?
  warehouse      String?
  shipmentNumber String?
  shipToCode     String?
  memberName     String?
  quantity       Decimal     @db.Decimal(18, 4)
  revenue        Decimal     @db.Decimal(18, 4)
  unitPrice      Decimal?    @db.Decimal(18, 4)
  createdAt      DateTime    @default(now())
  import         SalesImport @relation(fields: [importId], references: [id], onDelete: Cascade)

  @@index([orderDate])
  @@index([customerName])
  @@index([sku])
  @@index([category])
  @@index([salesperson])
  @@index([memberName])
  @@index([shipToState])
}
```

- [ ] **Step 3: Create migration SQL**

Run:

```powershell
npm run prisma:migrate -- --create-only --name sales_analytics
```

If Prisma creates a different timestamp folder, keep Prisma's generated folder and do not duplicate migrations.

Expected migration includes:

```sql
CREATE TYPE "SalesImportStatus" AS ENUM ('uploaded', 'mapped', 'imported', 'failed');
CREATE TYPE "SalesImportSourceType" AS ENUM ('excel', 'csv');
CREATE TABLE "SalesImport" (
  "id" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "storagePath" TEXT NOT NULL,
  "sourceType" "SalesImportSourceType" NOT NULL,
  "sheetName" TEXT,
  "status" "SalesImportStatus" NOT NULL DEFAULT 'uploaded',
  "mapping" JSONB,
  "totalRows" INTEGER NOT NULL DEFAULT 0,
  "importedRows" INTEGER NOT NULL DEFAULT 0,
  "rejectedRows" INTEGER NOT NULL DEFAULT 0,
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SalesImport_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "SalesRecord" (
  "id" TEXT NOT NULL,
  "importId" TEXT NOT NULL,
  "orderDate" TIMESTAMP(3) NOT NULL,
  "invoiceNumber" TEXT,
  "customerCode" TEXT,
  "customerName" TEXT NOT NULL,
  "customerPo" TEXT,
  "sku" TEXT NOT NULL,
  "productName" TEXT,
  "category" TEXT,
  "salesperson" TEXT,
  "shipToState" TEXT,
  "shipToCity" TEXT,
  "warehouse" TEXT,
  "shipmentNumber" TEXT,
  "shipToCode" TEXT,
  "memberName" TEXT,
  "quantity" DECIMAL(18,4) NOT NULL,
  "revenue" DECIMAL(18,4) NOT NULL,
  "unitPrice" DECIMAL(18,4),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SalesRecord_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SalesRecord_orderDate_idx" ON "SalesRecord"("orderDate");
ALTER TABLE "SalesRecord" ADD CONSTRAINT "SalesRecord_importId_fkey" FOREIGN KEY ("importId") REFERENCES "SalesImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

- [ ] **Step 4: Generate Prisma client**

Run:

```powershell
npm run prisma:generate
```

Expected: command exits 0.

- [ ] **Step 5: Verify schema**

Run:

```powershell
node scripts/use-node24.cjs prisma validate --config prisma/prisma.config.ts
```

Expected: `The schema at prisma\schema.prisma is valid`.

- [ ] **Step 6: Commit**

```powershell
git add package.json package-lock.json prisma/schema.prisma prisma/migrations
git commit -m "feat: add sales analytics schema"
```

---

### Task 2: Field Metadata, Mapping Validation, And Parsing

**Files:**
- Create: `services/analytics/fields.ts`
- Create: `services/analytics/fields.test.ts`
- Create: `services/analytics/parser.ts`
- Create: `services/analytics/parser.test.ts`

**Interfaces:**
- Produces:
  - `salesFieldDefinitions`
  - `requiredSalesFields`
  - `optionalSalesFields`
  - `type SalesFieldKey`
  - `type SalesFieldMapping = Partial<Record<SalesFieldKey, string>>`
  - `validateSalesMapping(mapping: SalesFieldMapping): { ok: true } | { ok: false; errors: string[] }`
  - `extractWorkbookPreview(input: { buffer: Buffer; fileName: string; mimeType?: string }): WorkbookPreview`
  - `normalizeSalesRow(row: Record<string, unknown>, mapping: SalesFieldMapping): NormalizedSalesRow | RejectedSalesRow`

- [ ] **Step 1: Write failing field metadata tests**

Create `services/analytics/fields.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  requiredSalesFields,
  salesFieldDefinitions,
  validateSalesMapping,
} from "@/services/analytics/fields";

describe("sales field metadata", () => {
  it("marks the five core import fields as required", () => {
    expect(requiredSalesFields).toEqual([
      "orderDate",
      "customerName",
      "sku",
      "quantity",
      "revenue",
    ]);
  });

  it("rejects mappings missing required fields", () => {
    const result = validateSalesMapping({
      orderDate: "Invoice Date",
      customerName: "Customer Name",
    });

    expect(result).toEqual({
      ok: false,
      errors: [
        "SKU is required.",
        "Quantity is required.",
        "Revenue is required.",
      ],
    });
  });

  it("rejects duplicate source columns across standard fields", () => {
    const result = validateSalesMapping({
      orderDate: "Invoice Date",
      customerName: "Customer Name",
      sku: "Item",
      quantity: "Quantity",
      revenue: "Quantity",
    });

    expect(result.ok).toBe(false);
    expect(result.ok ? [] : result.errors).toContain(
      "Source column Quantity is mapped more than once.",
    );
  });

  it("exposes user-facing labels for optional fields", () => {
    expect(salesFieldDefinitions.memberName.label).toBe("Member");
    expect(salesFieldDefinitions.salesperson.label).toBe("Salesperson");
  });
});
```

Run:

```powershell
npm run test -- --run services/analytics/fields.test.ts
```

Expected: FAIL because module does not exist.

- [ ] **Step 2: Implement field metadata**

Create `services/analytics/fields.ts`:

```ts
export const salesFieldDefinitions = {
  orderDate: { label: "Date", required: true },
  customerName: { label: "Customer", required: true },
  sku: { label: "SKU / Item", required: true },
  quantity: { label: "Quantity", required: true },
  revenue: { label: "Revenue", required: true },
  invoiceNumber: { label: "Invoice #", required: false },
  customerCode: { label: "Customer Code", required: false },
  customerPo: { label: "Customer PO #", required: false },
  productName: { label: "Product Name", required: false },
  category: { label: "Category", required: false },
  salesperson: { label: "Salesperson", required: false },
  shipToState: { label: "Ship-To State", required: false },
  shipToCity: { label: "Ship-To City", required: false },
  warehouse: { label: "Warehouse", required: false },
  shipmentNumber: { label: "Shipment # / SHR #", required: false },
  shipToCode: { label: "Ship-To Code", required: false },
  memberName: { label: "Member", required: false },
} as const;

export type SalesFieldKey = keyof typeof salesFieldDefinitions;
export type SalesFieldMapping = Partial<Record<SalesFieldKey, string>>;

export const requiredSalesFields = Object.entries(salesFieldDefinitions)
  .filter(([, definition]) => definition.required)
  .map(([field]) => field) as SalesFieldKey[];

export const optionalSalesFields = Object.entries(salesFieldDefinitions)
  .filter(([, definition]) => !definition.required)
  .map(([field]) => field) as SalesFieldKey[];

export function validateSalesMapping(mapping: SalesFieldMapping) {
  const errors: string[] = [];

  for (const field of requiredSalesFields) {
    if (!mapping[field]?.trim()) {
      errors.push(`${salesFieldDefinitions[field].label} is required.`);
    }
  }

  const sourceCounts = new Map<string, number>();
  for (const source of Object.values(mapping)) {
    if (!source?.trim()) {
      continue;
    }
    const normalizedSource = source.trim();
    sourceCounts.set(normalizedSource, (sourceCounts.get(normalizedSource) ?? 0) + 1);
  }

  for (const [source, count] of sourceCounts.entries()) {
    if (count > 1) {
      errors.push(`Source column ${source} is mapped more than once.`);
    }
  }

  return errors.length > 0 ? { ok: false as const, errors } : { ok: true as const };
}
```

Run:

```powershell
npm run test -- --run services/analytics/fields.test.ts
```

Expected: PASS.

- [ ] **Step 3: Write failing parser tests**

Create `services/analytics/parser.test.ts`:

```ts
import { utils, write } from "xlsx";
import { describe, expect, it } from "vitest";
import {
  extractWorkbookPreview,
  normalizeSalesRow,
} from "@/services/analytics/parser";

function workbookBuffer(rows: Record<string, unknown>[]) {
  const sheet = utils.json_to_sheet(rows);
  const workbook = utils.book_new();
  utils.book_append_sheet(workbook, sheet, "Sales Report by Period");
  return Buffer.from(write(workbook, { type: "buffer", bookType: "xlsx" }));
}

const mapping = {
  orderDate: "Invoice Date",
  customerName: "Customer Name",
  sku: "Item",
  productName: "Description",
  category: "Item Group",
  salesperson: "Sales Person",
  quantity: "Quantity",
  revenue: "Total Sales",
} as const;

describe("sales parser", () => {
  it("extracts headers and preview rows from an Excel workbook", () => {
    const preview = extractWorkbookPreview({
      fileName: "sales.xlsx",
      buffer: workbookBuffer([
        {
          "Invoice Date": "2026-01-02",
          "Customer Name": "WAL-MART.COM",
          Item: "ASB1084",
          Quantity: 1,
          "Total Sales": 28,
        },
      ]),
    });

    expect(preview.sheetName).toBe("Sales Report by Period");
    expect(preview.headers).toEqual([
      "Invoice Date",
      "Customer Name",
      "Item",
      "Quantity",
      "Total Sales",
    ]);
    expect(preview.previewRows).toHaveLength(1);
  });

  it("normalizes a valid mapped row", () => {
    const row = normalizeSalesRow(
      {
        "Invoice Date": "2026-01-02",
        "Customer Name": "WAL-MART.COM",
        Item: "ASB1084",
        Description: "Assembly",
        "Item Group": "L&G Assembly",
        "Sales Person": "Bella Cui",
        Quantity: "2",
        "Total Sales": "56.00",
      },
      mapping,
    );

    expect(row.ok).toBe(true);
    if (row.ok) {
      expect(row.record.customerName).toBe("WAL-MART.COM");
      expect(row.record.sku).toBe("ASB1084");
      expect(row.record.quantity).toBe(2);
      expect(row.record.revenue).toBe(56);
      expect(row.record.unitPrice).toBe(28);
    }
  });

  it("rejects rows with invalid required values", () => {
    const row = normalizeSalesRow(
      {
        "Invoice Date": "not a date",
        "Customer Name": "",
        Item: "ASB1084",
        Quantity: "abc",
        "Total Sales": "56",
      },
      mapping,
    );

    expect(row).toEqual({
      ok: false,
      errors: [
        "Date is invalid.",
        "Customer is required.",
        "Quantity is invalid.",
      ],
    });
  });
});
```

Run:

```powershell
npm run test -- --run services/analytics/parser.test.ts
```

Expected: FAIL because parser does not exist.

- [ ] **Step 4: Implement parser**

Create `services/analytics/parser.ts` with:

```ts
import { read, utils } from "xlsx";
import {
  salesFieldDefinitions,
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

export type NormalizedSalesRow =
  | { ok: true; record: NormalizedSalesRecord }
  | { ok: false; errors: string[] };

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

function sourceValue(row: Record<string, unknown>, mapping: SalesFieldMapping, field: keyof SalesFieldMapping) {
  const source = mapping[field];
  return source ? row[source] : undefined;
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
  const rows = utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });
  const headers = rows[0] ? Object.keys(rows[0]) : [];

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
  return utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[targetSheetName], {
    defval: null,
  });
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

  if (!orderDate) errors.push(`${salesFieldDefinitions.orderDate.label} is invalid.`);
  if (!customerName) errors.push(`${salesFieldDefinitions.customerName.label} is required.`);
  if (!sku) errors.push(`${salesFieldDefinitions.sku.label} is required.`);
  if (quantity === null) errors.push(`${salesFieldDefinitions.quantity.label} is invalid.`);
  if (revenue === null) errors.push(`${salesFieldDefinitions.revenue.label} is invalid.`);

  if (errors.length > 0 || !orderDate || !customerName || !sku || quantity === null || revenue === null) {
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
```

Run:

```powershell
npm run test -- --run services/analytics/fields.test.ts services/analytics/parser.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add services/analytics package.json package-lock.json
git commit -m "feat: add sales import parsing"
```

---

### Task 3: Import Persistence And APIs

**Files:**
- Create: `services/analytics/imports.ts`
- Create: `services/analytics/imports.test.ts`
- Create: `app/api/analytics/imports/route.ts`
- Create: `app/api/analytics/imports/[id]/commit/route.ts`

**Interfaces:**
- Consumes Task 2 parser and mapping functions.
- Produces:
  - `createSalesImportFromFile(file: File): Promise<SalesImportPreview>`
  - `commitSalesImport(importId: string, mapping: SalesFieldMapping): Promise<SalesImportSummary>`
  - `listSalesImports(): Promise<SalesImportListItem[]>`
- APIs:
  - `POST /api/analytics/imports`
  - `GET /api/analytics/imports`
  - `POST /api/analytics/imports/:id/commit`

- [ ] **Step 1: Write failing import service tests**

Create `services/analytics/imports.test.ts` using mocked Prisma and storage, following existing service test style:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { commitSalesImport } from "@/services/analytics/imports";

vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(async () => Buffer.from("")),
}));

vi.mock("@/lib/db", () => ({
  prisma: {
    salesImport: {
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    salesRecord: {
      createMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(async (callback) =>
      callback({
        salesImport: {
          update: vi.fn(async (input) => ({ id: input.where.id, ...input.data })),
        },
        salesRecord: {
          deleteMany: vi.fn(),
          createMany: vi.fn(async (input) => ({ count: input.data.length })),
        },
      }),
    ),
  },
}));

vi.mock("@/services/analytics/parser", () => ({
  rowsFromWorkbook: vi.fn(() => [
    {
      "Invoice Date": "2026-01-02",
      "Customer Name": "Customer A",
      Item: "SKU-1",
      Quantity: "2",
      "Total Sales": "20",
    },
    {
      "Invoice Date": "bad",
      "Customer Name": "",
      Item: "SKU-2",
      Quantity: "x",
      "Total Sales": "30",
    },
  ]),
  normalizeSalesRow: vi.fn((row) =>
    row["Invoice Date"] === "bad"
      ? { ok: false, errors: ["Date is invalid."] }
      : {
          ok: true,
          record: {
            orderDate: new Date("2026-01-02T00:00:00"),
            customerName: "Customer A",
            sku: "SKU-1",
            quantity: 2,
            revenue: 20,
            unitPrice: 10,
          },
        },
  ),
}));

describe("commitSalesImport", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { prisma } = await import("@/lib/db");
    vi.mocked(prisma.salesImport.findUnique).mockResolvedValue({
      id: "import-1",
      storagePath: "storage/uploads/sales.xlsx",
      sheetName: "Sales Report by Period",
    } as never);
  });

  it("imports valid rows and counts rejected rows", async () => {
    const result = await commitSalesImport("import-1", {
      orderDate: "Invoice Date",
      customerName: "Customer Name",
      sku: "Item",
      quantity: "Quantity",
      revenue: "Total Sales",
    });

    expect(result).toMatchObject({
      importId: "import-1",
      totalRows: 2,
      importedRows: 1,
      rejectedRows: 1,
    });
  });
});
```

Run:

```powershell
npm run test -- --run services/analytics/imports.test.ts
```

Expected: FAIL because service does not exist.

- [ ] **Step 2: Implement import service**

Create `services/analytics/imports.ts` with:

```ts
import { readFile } from "node:fs/promises";
import { SalesImportSourceType, SalesImportStatus } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { saveUploadedFile } from "@/lib/storage";
import {
  salesFieldDefinitions,
  validateSalesMapping,
  type SalesFieldKey,
  type SalesFieldMapping,
} from "@/services/analytics/fields";
import {
  extractWorkbookPreview,
  normalizeSalesRow,
  rowsFromWorkbook,
} from "@/services/analytics/parser";

export const salesMappingSchema = z
  .object(
    Object.fromEntries(
      Object.keys(salesFieldDefinitions).map((field) => [
        field,
        z.string().trim().optional(),
      ]),
    ) as Record<SalesFieldKey, z.ZodOptional<z.ZodString>>,
  )
  .partial();

function sourceTypeFromFile(fileName: string) {
  return fileName.toLowerCase().endsWith(".csv")
    ? SalesImportSourceType.csv
    : SalesImportSourceType.excel;
}

export async function createSalesImportFromFile(file: File) {
  if (!/\.(xlsx|xls|csv)$/i.test(file.name)) {
    throw new Error("Upload an Excel or CSV file.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const preview = extractWorkbookPreview({
    buffer,
    fileName: file.name,
    mimeType: file.type,
  });
  const saved = await saveUploadedFile(file);
  const salesImport = await prisma.salesImport.create({
    data: {
      fileName: saved.originalName,
      storagePath: saved.storagePath,
      sourceType: sourceTypeFromFile(saved.originalName),
      sheetName: preview.sheetName,
      totalRows: preview.totalRows,
    },
  });

  return {
    importId: salesImport.id,
    fileName: salesImport.fileName,
    sheetName: preview.sheetName,
    headers: preview.headers,
    previewRows: preview.previewRows,
    totalRows: preview.totalRows,
  };
}

export async function listSalesImports() {
  return prisma.salesImport.findMany({
    orderBy: { createdAt: "desc" },
    take: 20,
  });
}

export async function commitSalesImport(importId: string, mapping: SalesFieldMapping) {
  const mappingResult = validateSalesMapping(mapping);
  if (!mappingResult.ok) {
    return {
      importId,
      totalRows: 0,
      importedRows: 0,
      rejectedRows: 0,
      errors: mappingResult.errors,
    };
  }

  const salesImport = await prisma.salesImport.findUnique({
    where: { id: importId },
  });
  if (!salesImport) {
    throw new Error("Sales import not found.");
  }

  const rows = rowsFromWorkbook(await readFile(salesImport.storagePath), salesImport.sheetName ?? undefined);
  const records = [];
  let rejectedRows = 0;

  for (const row of rows) {
    const normalized = normalizeSalesRow(row, mapping);
    if (!normalized.ok) {
      rejectedRows += 1;
      continue;
    }
    records.push({
      importId,
      ...normalized.record,
    });
  }

  await prisma.$transaction(async (tx) => {
    await tx.salesRecord.deleteMany({ where: { importId } });
    if (records.length > 0) {
      await tx.salesRecord.createMany({ data: records });
    }
    await tx.salesImport.update({
      where: { id: importId },
      data: {
        status: SalesImportStatus.imported,
        mapping,
        totalRows: rows.length,
        importedRows: records.length,
        rejectedRows,
        errorMessage: null,
      },
    });
  });

  return {
    importId,
    totalRows: rows.length,
    importedRows: records.length,
    rejectedRows,
    errors: [],
  };
}
```

Run:

```powershell
npm run test -- --run services/analytics/imports.test.ts
```

Expected: PASS.

- [ ] **Step 3: Implement upload/list API**

Create `app/api/analytics/imports/route.ts`:

```ts
import { ZodError } from "zod";
import {
  createSalesImportFromFile,
  listSalesImports,
} from "@/services/analytics/imports";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function errorResponse(message: string, status: number, details?: unknown) {
  return Response.json({ error: message, details }, { status });
}

function isFileEntry(value: FormDataEntryValue | null): value is File {
  return value instanceof File && value.size > 0;
}

export async function GET() {
  try {
    return Response.json({ imports: await listSalesImports() });
  } catch (error) {
    console.error("Failed to list sales imports", error);
    return errorResponse("Unable to load sales imports.", 503);
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!isFileEntry(file)) {
      return errorResponse("A sales file is required.", 400);
    }
    return Response.json({ import: await createSalesImportFromFile(file) }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return errorResponse("Sales import input is invalid.", 400, error.flatten());
    }
    const message = error instanceof Error ? error.message : "Unable to upload sales file.";
    console.error("Failed to create sales import", error);
    return errorResponse(message, 400);
  }
}
```

- [ ] **Step 4: Implement commit API**

Create `app/api/analytics/imports/[id]/commit/route.ts`:

```ts
import { ZodError } from "zod";
import {
  commitSalesImport,
  salesMappingSchema,
} from "@/services/analytics/imports";

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
    const body = await request.json();
    const mapping = salesMappingSchema.parse(body.mapping ?? body);
    const summary = await commitSalesImport(id, mapping);
    if (summary.errors.length > 0) {
      return errorResponse("Sales field mapping is invalid.", 400, summary.errors);
    }
    return Response.json({ summary });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return errorResponse("Request body must be valid JSON.", 400);
    }
    if (error instanceof ZodError) {
      return errorResponse("Sales field mapping is invalid.", 400, error.flatten());
    }
    const message = error instanceof Error ? error.message : "Unable to import sales rows.";
    console.error("Failed to commit sales import", error);
    return errorResponse(message, message.includes("not found") ? 404 : 503);
  }
}
```

- [ ] **Step 5: Verify**

Run:

```powershell
npm run test -- --run services/analytics/imports.test.ts services/analytics/parser.test.ts services/analytics/fields.test.ts
npm run lint
```

Expected: both commands exit 0.

- [ ] **Step 6: Commit**

```powershell
git add services/analytics app/api/analytics
git commit -m "feat: add sales import APIs"
```

---

### Task 4: Sales Analytics Aggregations

**Files:**
- Create: `services/analytics/metrics.ts`
- Create: `services/analytics/metrics.test.ts`
- Create: `app/api/analytics/sales/route.ts`

**Interfaces:**
- Consumes `SalesRecord`.
- Produces:
  - `type SalesAnalyticsFilters`
  - `salesAnalyticsFiltersSchema`
  - `calculateGrowth(current: number, previous: number | null | undefined): number | null`
  - `getSalesAnalytics(filters: SalesAnalyticsFilters): Promise<SalesAnalyticsOverview>`
  - `SalesAnalyticsOverview.filterOptions` with years, salespeople, customers, categories, SKUs, states, and members available in the loaded data window.
- API:
  - `GET /api/analytics/sales?year=2026&salesperson=Bella%20Cui&customerName=TRACTOR%20SUPPLY%20COMPANY`

- [ ] **Step 1: Write failing metric tests**

Create `services/analytics/metrics.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  calculateGrowth,
  summarizeSalesRowsForTest,
} from "@/services/analytics/metrics";

const rows = [
  { orderDate: new Date("2025-01-15"), customerName: "A", sku: "SKU-1", category: "L&G", salesperson: "Bella Cui", quantity: 50, revenue: 500 },
  { orderDate: new Date("2026-01-10"), customerName: "A", sku: "SKU-1", category: "L&G", salesperson: "Bella Cui", quantity: 100, revenue: 1200 },
  { orderDate: new Date("2026-02-10"), customerName: "B", sku: "SKU-2", category: "Tube", salesperson: "Allen Meng", quantity: 150, revenue: 1800 },
];

describe("sales metrics", () => {
  it("returns null growth when denominator is zero or missing", () => {
    expect(calculateGrowth(10, 0)).toBeNull();
    expect(calculateGrowth(10, null)).toBeNull();
  });

  it("calculates growth against a non-zero previous value", () => {
    expect(calculateGrowth(150, 100)).toBe(0.5);
  });

  it("summarizes ytd, monthly, top customers, and yoy", () => {
    const summary = summarizeSalesRowsForTest(rows, { year: 2026 });

    expect(summary.kpis.ytdQuantity).toBe(250);
    expect(summary.kpis.ytdRevenue).toBe(3000);
    expect(summary.monthly).toEqual([
      expect.objectContaining({ month: "2026-01", quantity: 100, revenue: 1200, yoyQuantityGrowth: 1 }),
      expect.objectContaining({ month: "2026-02", quantity: 150, revenue: 1800, momQuantityGrowth: 0.5 }),
    ]);
    expect(summary.topCustomers[0]).toMatchObject({ name: "B", quantity: 150 });
    expect(summary.filterOptions.salespeople).toEqual(["Allen Meng", "Bella Cui"]);
  });
});
```

Run:

```powershell
npm run test -- --run services/analytics/metrics.test.ts
```

Expected: FAIL because metrics module does not exist.

- [ ] **Step 2: Implement metric helpers**

Implement `services/analytics/metrics.ts` with in-memory helper for tests and DB-backed service:

```ts
import { z } from "zod";
import { prisma } from "@/lib/db";

export const salesAnalyticsFiltersSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  salesperson: z.string().trim().optional(),
  customerName: z.string().trim().optional(),
  category: z.string().trim().optional(),
  sku: z.string().trim().optional(),
  shipToState: z.string().trim().optional(),
  memberName: z.string().trim().optional(),
});

export type SalesAnalyticsFilters = z.infer<typeof salesAnalyticsFiltersSchema>;

type SalesMetricRow = {
  orderDate: Date;
  customerName: string;
  sku: string;
  category?: string | null;
  salesperson?: string | null;
  shipToState?: string | null;
  memberName?: string | null;
  quantity: number;
  revenue: number;
};

export function calculateGrowth(current: number, previous: number | null | undefined) {
  if (!previous) return null;
  return (current - previous) / previous;
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function addToRanking(map: Map<string, { quantity: number; revenue: number }>, key: string | null | undefined, quantity: number, revenue: number) {
  if (!key) return;
  const current = map.get(key) ?? { quantity: 0, revenue: 0 };
  current.quantity += quantity;
  current.revenue += revenue;
  map.set(key, current);
}

function ranking(map: Map<string, { quantity: number; revenue: number }>) {
  return [...map.entries()]
    .map(([name, values]) => ({ name, ...values }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 20);
}

export function summarizeSalesRowsForTest(rows: SalesMetricRow[], filters: SalesAnalyticsFilters) {
  const year = filters.year ?? new Date().getFullYear();
  const currentRows = rows.filter((row) => row.orderDate.getFullYear() === year);
  const priorRows = rows.filter((row) => row.orderDate.getFullYear() === year - 1);
  const monthlyMap = new Map<string, { quantity: number; revenue: number }>();
  const priorMonthlyMap = new Map<string, { quantity: number; revenue: number }>();
  const customers = new Map<string, { quantity: number; revenue: number }>();
  const categories = new Map<string, { quantity: number; revenue: number }>();
  const skus = new Map<string, { quantity: number; revenue: number }>();
  const salespeople = new Map<string, { quantity: number; revenue: number }>();
  const states = new Map<string, { quantity: number; revenue: number }>();

  const unique = (values: Array<string | null | undefined>) =>
    [...new Set(values.filter((value): value is string => Boolean(value)))]
      .sort((a, b) => a.localeCompare(b));

  for (const row of currentRows) {
    const key = monthKey(row.orderDate);
    const month = monthlyMap.get(key) ?? { quantity: 0, revenue: 0 };
    month.quantity += row.quantity;
    month.revenue += row.revenue;
    monthlyMap.set(key, month);
    addToRanking(customers, row.customerName, row.quantity, row.revenue);
    addToRanking(categories, row.category, row.quantity, row.revenue);
    addToRanking(skus, row.sku, row.quantity, row.revenue);
    addToRanking(salespeople, row.salesperson, row.quantity, row.revenue);
    addToRanking(states, row.shipToState, row.quantity, row.revenue);
  }

  for (const row of priorRows) {
    const key = `${year}-${String(row.orderDate.getMonth() + 1).padStart(2, "0")}`;
    const month = priorMonthlyMap.get(key) ?? { quantity: 0, revenue: 0 };
    month.quantity += row.quantity;
    month.revenue += row.revenue;
    priorMonthlyMap.set(key, month);
  }

  const monthly = [...monthlyMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, value], index, sorted) => {
      const previous = index > 0 ? sorted[index - 1][1] : null;
      const prior = priorMonthlyMap.get(month);
      return {
        month,
        quantity: value.quantity,
        revenue: value.revenue,
        momQuantityGrowth: calculateGrowth(value.quantity, previous?.quantity),
        momRevenueGrowth: calculateGrowth(value.revenue, previous?.revenue),
        yoyQuantityGrowth: calculateGrowth(value.quantity, prior?.quantity),
        yoyRevenueGrowth: calculateGrowth(value.revenue, prior?.revenue),
      };
    });

  const ytdQuantity = currentRows.reduce((sum, row) => sum + row.quantity, 0);
  const ytdRevenue = currentRows.reduce((sum, row) => sum + row.revenue, 0);

  return {
    kpis: {
      ytdQuantity,
      ytdRevenue,
      averageUnitPrice: ytdQuantity ? ytdRevenue / ytdQuantity : null,
      activeCustomers: new Set(currentRows.map((row) => row.customerName)).size,
    },
    monthly,
    topCustomers: ranking(customers),
    topCategories: ranking(categories),
    topSkus: ranking(skus),
    salespeople: ranking(salespeople),
    states: ranking(states),
    filterOptions: {
      years: unique(rows.map((row) => String(row.orderDate.getFullYear()))),
      salespeople: unique(rows.map((row) => row.salesperson)),
      customers: unique(rows.map((row) => row.customerName)),
      categories: unique(rows.map((row) => row.category)),
      skus: unique(rows.map((row) => row.sku)),
      states: unique(rows.map((row) => row.shipToState)),
      members: unique(rows.map((row) => row.memberName)),
    },
  };
}

export async function getSalesAnalytics(filters: SalesAnalyticsFilters) {
  const year = filters.year ?? new Date().getFullYear();
  const rows = await prisma.salesRecord.findMany({
    where: {
      orderDate: {
        gte: new Date(`${year - 1}-01-01T00:00:00`),
        lt: new Date(`${year + 1}-01-01T00:00:00`),
      },
      ...(filters.salesperson ? { salesperson: filters.salesperson } : {}),
      ...(filters.customerName ? { customerName: filters.customerName } : {}),
      ...(filters.category ? { category: filters.category } : {}),
      ...(filters.sku ? { sku: filters.sku } : {}),
      ...(filters.shipToState ? { shipToState: filters.shipToState } : {}),
      ...(filters.memberName ? { memberName: filters.memberName } : {}),
    },
    select: {
      orderDate: true,
      customerName: true,
      sku: true,
      category: true,
      salesperson: true,
      shipToState: true,
      memberName: true,
      quantity: true,
      revenue: true,
    },
  });

  return summarizeSalesRowsForTest(
    rows.map((row) => ({
      ...row,
      quantity: Number(row.quantity),
      revenue: Number(row.revenue),
    })),
    { ...filters, year },
  );
}
```

Run:

```powershell
npm run test -- --run services/analytics/metrics.test.ts
```

Expected: PASS.

- [ ] **Step 3: Implement analytics API**

Create `app/api/analytics/sales/route.ts`:

```ts
import { ZodError } from "zod";
import {
  getSalesAnalytics,
  salesAnalyticsFiltersSchema,
} from "@/services/analytics/metrics";

export const dynamic = "force-dynamic";

function errorResponse(message: string, status: number, details?: unknown) {
  return Response.json({ error: message, details }, { status });
}

export async function GET(request: Request) {
  try {
    const searchParams = Object.fromEntries(new URL(request.url).searchParams);
    const filters = salesAnalyticsFiltersSchema.parse(searchParams);
    return Response.json({ analytics: await getSalesAnalytics(filters) });
  } catch (error) {
    if (error instanceof ZodError) {
      return errorResponse("Sales analytics filters are invalid.", 400, error.flatten());
    }
    console.error("Failed to load sales analytics", error);
    return errorResponse("Unable to load sales analytics.", 503);
  }
}
```

- [ ] **Step 4: Verify**

Run:

```powershell
npm run test -- --run services/analytics/metrics.test.ts
npm run lint
```

Expected: both commands exit 0.

- [ ] **Step 5: Commit**

```powershell
git add services/analytics/metrics.ts services/analytics/metrics.test.ts app/api/analytics/sales/route.ts
git commit -m "feat: add sales analytics metrics"
```

---

### Task 5: Import And Mapping UI

**Files:**
- Create: `components/analytics/analytics-importer.tsx`
- Create: `app/analytics/import/page.tsx`
- Modify: `components/layout/sidebar.tsx`

**Interfaces:**
- Consumes APIs from Task 3.
- Produces user workflow:
  - upload file
  - preview headers/rows
  - map fields
  - commit import
  - show summary

- [ ] **Step 1: Implement import page shell**

Create `app/analytics/import/page.tsx`:

```tsx
import { AnalyticsImporter } from "@/components/analytics/analytics-importer";

export default function AnalyticsImportPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal text-zinc-950">
          Import Sales Data
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">
          Upload Excel or CSV sales detail, map your columns, and refresh the sales dashboard.
        </p>
      </div>
      <AnalyticsImporter />
    </div>
  );
}
```

- [ ] **Step 2: Implement importer component**

Create `components/analytics/analytics-importer.tsx` as a client component:

```tsx
"use client";

import Link from "next/link";
import { useState, type ChangeEvent, type FormEvent } from "react";
import { ArrowRight, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { salesFieldDefinitions, type SalesFieldKey, type SalesFieldMapping } from "@/services/analytics/fields";

type ImportPreview = {
  importId: string;
  fileName: string;
  sheetName: string;
  headers: string[];
  previewRows: Record<string, unknown>[];
  totalRows: number;
};

type ImportSummary = {
  totalRows: number;
  importedRows: number;
  rejectedRows: number;
};

const autoMap: Partial<Record<SalesFieldKey, string[]>> = {
  orderDate: ["Invoice Date", "Date", "Order Date"],
  customerName: ["Customer Name", "Customer"],
  sku: ["Item", "SKU", "Product"],
  productName: ["Description", "Product Name"],
  category: ["Item Group", "Category"],
  salesperson: ["Sales Person", "Salesperson"],
  quantity: ["Quantity", "Qty"],
  revenue: ["Total Sales", "Amount", "Revenue", "Sales"],
  shipToState: ["Ship-To State", "State"],
  shipToCity: ["Ship-To City", "City"],
};

function initialMapping(headers: string[]): SalesFieldMapping {
  return Object.fromEntries(
    Object.entries(autoMap).flatMap(([field, candidates]) => {
      const match = candidates.find((candidate) => headers.includes(candidate));
      return match ? [[field, match]] : [];
    }),
  ) as SalesFieldMapping;
}

export function AnalyticsImporter() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [mapping, setMapping] = useState<SalesFieldMapping>({});
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
    setPreview(null);
    setSummary(null);
    setError(null);
  }

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return;
    setIsUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/analytics/imports", { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to upload sales file.");
      setPreview(data.import);
      setMapping(initialMapping(data.import.headers));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload sales file.");
    } finally {
      setIsUploading(false);
    }
  }

  async function commit() {
    if (!preview) return;
    setIsCommitting(true);
    setError(null);
    try {
      const response = await fetch(`/api/analytics/imports/${preview.importId}/commit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mapping }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to import sales rows.");
      setSummary(data.summary);
    } catch (commitError) {
      setError(commitError instanceof Error ? commitError.message : "Unable to import sales rows.");
    } finally {
      setIsCommitting(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Upload</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={upload} className="flex flex-col gap-3">
            <input type="file" accept=".xlsx,.xls,.csv" onChange={chooseFile} />
            <Button type="submit" disabled={!file || isUploading}>
              <UploadCloud className="size-4" aria-hidden="true" />
              {isUploading ? "Uploading" : "Upload Sales File"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Field Mapping</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {!preview ? (
            <p className="text-sm text-zinc-500">Upload a file to map fields.</p>
          ) : (
            <>
              <p className="text-sm text-zinc-500">
                {preview.fileName} · {preview.sheetName} · {preview.totalRows.toLocaleString()} rows
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {(Object.keys(salesFieldDefinitions) as SalesFieldKey[]).map((field) => (
                  <label key={field} className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
                    {salesFieldDefinitions[field].label}
                    {salesFieldDefinitions[field].required ? " *" : ""}
                    <select
                      value={mapping[field] ?? ""}
                      onChange={(event) =>
                        setMapping((current) => ({
                          ...current,
                          [field]: event.target.value || undefined,
                        }))
                      }
                      className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm font-normal text-zinc-950"
                    >
                      <option value="">Unmapped</option>
                      {preview.headers.map((header) => (
                        <option key={header} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              <Button onClick={commit} disabled={isCommitting}>
                <ArrowRight className="size-4" aria-hidden="true" />
                {isCommitting ? "Importing" : "Import Rows"}
              </Button>
            </>
          )}
          {summary ? (
            <div role="status" className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800">
              Imported {summary.importedRows.toLocaleString()} of {summary.totalRows.toLocaleString()} rows. Rejected {summary.rejectedRows.toLocaleString()}.
              <Link href="/analytics" className="ml-2 font-medium underline">Open dashboard</Link>
            </div>
          ) : null}
          {error ? (
            <p role="status" aria-live="polite" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Verify page compiles**

Run:

```powershell
npm run lint
```

Expected: exits 0.

- [ ] **Step 4: Commit**

```powershell
git add app/analytics/import components/analytics components/layout/sidebar.tsx
git commit -m "feat: add sales import workflow"
```

---

### Task 6: Sales Dashboard UI And Charts

**Files:**
- Create: `app/analytics/page.tsx`
- Create: `components/analytics/analytics-dashboard.tsx`
- Create: `components/analytics/chart-card.tsx`
- Create: `components/analytics/kpi-card.tsx`
- Create: `components/analytics/monthly-trend-chart.tsx`
- Create: `components/analytics/ranking-bars.tsx`
- Create: `components/analytics/sales-filters.tsx`
- Modify: `components/layout/sidebar.tsx`

**Interfaces:**
- Consumes `GET /api/analytics/sales`.
- Displays KPI cards and charts from Task 4 response.

- [ ] **Step 1: Add Analytics nav item**

Modify `components/layout/sidebar.tsx`:

```tsx
import {
  BarChart3,
  Bot,
  CalendarDays,
  CheckSquare,
  FileText,
  FolderKanban,
  Inbox,
  LayoutDashboard,
  Search,
  Settings,
  StickyNote,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Mail", href: "/mail", icon: Inbox },
  { label: "Files", href: "/files", icon: FileText },
  { label: "Notes", href: "/notes", icon: StickyNote },
  { label: "Tasks", href: "/tasks", icon: CheckSquare },
  { label: "Daily Log", href: "/daily-log", icon: CalendarDays },
  { label: "Search", href: "/search", icon: Search },
  { label: "Agent", href: "/agent", icon: Bot },
  { label: "Settings", href: "/settings", icon: Settings },
];
```

- [ ] **Step 2: Create dashboard page**

Create `app/analytics/page.tsx`:

```tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";

export default function AnalyticsPage() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-zinc-950">
            Sales Analytics
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">
            Track YTD quantity, revenue, monthly trends, customers, categories, SKUs, and salesperson performance.
          </p>
        </div>
        <Button asChild>
          <Link href="/analytics/import">Import Sales Data</Link>
        </Button>
      </div>
      <AnalyticsDashboard />
    </div>
  );
}
```

- [ ] **Step 3: Implement chart primitives**

Create `components/analytics/kpi-card.tsx`:

```tsx
import { Card, CardContent } from "@/components/ui/card";

export function KpiCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase tracking-normal text-zinc-500">{label}</p>
        <p className="mt-2 text-2xl font-semibold text-zinc-950">{value}</p>
        {detail ? <p className="mt-1 text-xs text-zinc-500">{detail}</p> : null}
      </CardContent>
    </Card>
  );
}
```

Create `components/analytics/chart-card.tsx`:

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
```

Create `components/analytics/monthly-trend-chart.tsx` using Recharts:

```tsx
"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type MonthlyPoint = {
  month: string;
  quantity: number;
  revenue: number;
};

export function MonthlyTrendChart({ data }: { data: MonthlyPoint[] }) {
  if (data.length === 0) {
    return <p className="py-12 text-center text-sm text-zinc-500">No monthly sales data yet.</p>;
  }

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data}>
          <CartesianGrid stroke="#e4e4e7" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
          <Tooltip />
          <Bar yAxisId="right" dataKey="revenue" fill="#71717a" name="Revenue" />
          <Line yAxisId="left" type="monotone" dataKey="quantity" stroke="#18181b" strokeWidth={2} name="Quantity" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
```

Create `components/analytics/ranking-bars.tsx`:

```tsx
"use client";

type RankingItem = {
  name: string;
  quantity: number;
  revenue: number;
};

export function RankingBars({ data }: { data: RankingItem[] }) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-zinc-500">No ranking data yet.</p>;
  }
  const max = Math.max(...data.map((item) => item.quantity), 1);
  return (
    <div className="flex flex-col gap-3">
      {data.slice(0, 10).map((item) => (
        <div key={item.name}>
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="truncate font-medium text-zinc-800">{item.name}</span>
            <span className="shrink-0 text-zinc-500">{item.quantity.toLocaleString()}</span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-zinc-100">
            <div className="h-2 rounded-full bg-zinc-900" style={{ width: `${Math.max((item.quantity / max) * 100, 2)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Implement sales filters component**

Create `components/analytics/sales-filters.tsx`:

```tsx
"use client";

import { Button } from "@/components/ui/button";

export type SalesDashboardFilters = {
  year: string;
  salesperson: string;
  customerName: string;
  category: string;
  sku: string;
  shipToState: string;
  memberName: string;
};

export type SalesFilterOptions = {
  years: string[];
  salespeople: string[];
  customers: string[];
  categories: string[];
  skus: string[];
  states: string[];
  members: string[];
};

function SelectFilter({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-zinc-600">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm font-normal text-zinc-950"
      >
        <option value="">All</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export function SalesFilters({
  filters,
  options,
  onChange,
  onReset,
}: {
  filters: SalesDashboardFilters;
  options: SalesFilterOptions;
  onChange: (filters: SalesDashboardFilters) => void;
  onReset: () => void;
}) {
  function setFilter(key: keyof SalesDashboardFilters, value: string) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <div className="grid gap-3 rounded-md border border-zinc-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-4">
      <SelectFilter label="Year" value={filters.year} options={options.years} onChange={(value) => setFilter("year", value)} />
      <SelectFilter label="Salesperson" value={filters.salesperson} options={options.salespeople} onChange={(value) => setFilter("salesperson", value)} />
      <SelectFilter label="Customer" value={filters.customerName} options={options.customers} onChange={(value) => setFilter("customerName", value)} />
      <SelectFilter label="Category" value={filters.category} options={options.categories} onChange={(value) => setFilter("category", value)} />
      <SelectFilter label="SKU" value={filters.sku} options={options.skus} onChange={(value) => setFilter("sku", value)} />
      <SelectFilter label="State" value={filters.shipToState} options={options.states} onChange={(value) => setFilter("shipToState", value)} />
      <SelectFilter label="Member" value={filters.memberName} options={options.members} onChange={(value) => setFilter("memberName", value)} />
      <div className="flex items-end">
        <Button type="button" variant="secondary" onClick={onReset}>
          Reset
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Implement dashboard component**

Create `components/analytics/analytics-dashboard.tsx`:

```tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { ChartCard } from "@/components/analytics/chart-card";
import { KpiCard } from "@/components/analytics/kpi-card";
import { MonthlyTrendChart } from "@/components/analytics/monthly-trend-chart";
import { RankingBars } from "@/components/analytics/ranking-bars";
import {
  SalesFilters,
  type SalesDashboardFilters,
  type SalesFilterOptions,
} from "@/components/analytics/sales-filters";
import { Button } from "@/components/ui/button";

type SalesAnalytics = {
  kpis: {
    ytdQuantity: number;
    ytdRevenue: number;
    averageUnitPrice: number | null;
    activeCustomers: number;
  };
  monthly: Array<{ month: string; quantity: number; revenue: number; momQuantityGrowth: number | null; yoyQuantityGrowth: number | null }>;
  topCustomers: Array<{ name: string; quantity: number; revenue: number }>;
  topCategories: Array<{ name: string; quantity: number; revenue: number }>;
  topSkus: Array<{ name: string; quantity: number; revenue: number }>;
  salespeople: Array<{ name: string; quantity: number; revenue: number }>;
  filterOptions: SalesFilterOptions;
};

function money(value: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function number(value: number) {
  return new Intl.NumberFormat().format(value);
}

function percent(value: number | null) {
  return value === null ? "N/A" : new Intl.NumberFormat(undefined, { style: "percent", maximumFractionDigits: 1 }).format(value);
}

export function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<SalesAnalytics | null>(null);
  const [filters, setFilters] = useState<SalesDashboardFilters>({
    year: String(new Date().getFullYear()),
    salesperson: "",
    customerName: "",
    category: "",
    sku: "",
    shipToState: "",
    memberName: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const latestMonth = analytics?.monthly.at(-1);

  async function loadAnalytics() {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(filters)) {
        if (value) params.set(key, value);
      }
      const response = await fetch(`/api/analytics/sales?${params.toString()}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Unable to load sales analytics.");
      setAnalytics(data.analytics);
    } catch (loadError) {
      setAnalytics(null);
      setError(loadError instanceof Error ? loadError.message : "Unable to load sales analytics.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadAnalytics();
  }, [filters]);

  const fallbackFilterOptions = useMemo<SalesFilterOptions>(
    () => ({
      years: [String(new Date().getFullYear()), String(new Date().getFullYear() - 1)],
      salespeople: [],
      customers: [],
      categories: [],
      skus: [],
      states: [],
      members: [],
    }),
    [],
  );

  function resetFilters() {
    setFilters({
      year: String(new Date().getFullYear()),
      salesperson: "",
      customerName: "",
      category: "",
      sku: "",
      shipToState: "",
      memberName: "",
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <SalesFilters
          filters={filters}
          options={analytics?.filterOptions ?? fallbackFilterOptions}
          onChange={setFilters}
          onReset={resetFilters}
        />
        <div>
          <Button variant="secondary" onClick={loadAnalytics}>Refresh</Button>
        </div>
      </div>

      {isLoading ? <p className="text-sm text-zinc-500">Loading sales analytics</p> : null}
      {error ? <p role="status" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

      {analytics ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <KpiCard label="YTD Quantity" value={number(analytics.kpis.ytdQuantity)} />
            <KpiCard label="YTD Sales" value={money(analytics.kpis.ytdRevenue)} />
            <KpiCard label="MoM Qty" value={percent(latestMonth?.momQuantityGrowth ?? null)} detail="Latest month" />
            <KpiCard label="Active Customers" value={number(analytics.kpis.activeCustomers)} />
          </div>

          <ChartCard title="Monthly Quantity and Sales">
            <MonthlyTrendChart data={analytics.monthly} />
          </ChartCard>

          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard title="Top Customers"><RankingBars data={analytics.topCustomers} /></ChartCard>
            <ChartCard title="Top Categories"><RankingBars data={analytics.topCategories} /></ChartCard>
            <ChartCard title="Top SKUs / Products"><RankingBars data={analytics.topSkus} /></ChartCard>
            <ChartCard title="Salesperson Split"><RankingBars data={analytics.salespeople} /></ChartCard>
          </div>
        </>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 6: Verify UI**

Run:

```powershell
npm run lint
npm run build
```

Expected:

- lint exits 0.
- build exits 0. If OneDrive locks `.next`, remove only project-local `.next` and rerun.

- [ ] **Step 7: Commit**

```powershell
git add app/analytics components/analytics components/layout/sidebar.tsx
git commit -m "feat: add sales analytics dashboard"
```

---

### Task 7: Agent Context And E2E Smoke Coverage

**Files:**
- Modify: `services/agent/context-builder.ts`
- Modify: `services/agent/context-builder.test.ts`
- Modify: `tests/e2e/smoke.spec.ts`

**Interfaces:**
- Consumes `getSalesAnalytics`.
- Produces Agent context section for sales summary.

- [ ] **Step 1: Write failing Agent context test**

Modify `services/agent/context-builder.test.ts` to mock sales analytics and assert context includes Sales Analytics:

```ts
vi.mock("@/services/analytics/metrics", () => ({
  getSalesAnalytics: vi.fn(async () => ({
    kpis: {
      ytdQuantity: 711090,
      ytdRevenue: 21365036,
      averageUnitPrice: 30.04,
      activeCustomers: 27,
    },
    monthly: [],
    topCustomers: [{ name: "TRACTOR SUPPLY COMPANY", quantity: 375957, revenue: 0 }],
    topCategories: [{ name: "L&G Tires", quantity: 164237, revenue: 0 }],
    topSkus: [{ name: "WD1030", quantity: 23571, revenue: 0 }],
    salespeople: [
      { name: "Bella Cui", quantity: 500000, revenue: 0 },
      { name: "Allen Meng", quantity: 200000, revenue: 0 },
    ],
    states: [],
  })),
}));

expect(context).toContain("Sales Analytics");
expect(context).toContain("YTD Quantity: 711,090");
expect(context).toContain("Top Customer: TRACTOR SUPPLY COMPANY");
```

Run:

```powershell
npm run test -- --run services/agent/context-builder.test.ts
```

Expected: FAIL until context builder includes analytics.

- [ ] **Step 2: Implement sales context**

Modify `services/agent/context-builder.ts` to add a compact read-only summary:

```ts
import { getSalesAnalytics } from "@/services/analytics/metrics";

async function buildSalesAnalyticsContext() {
  try {
    const analytics = await getSalesAnalytics({ year: new Date().getFullYear() });
    return [
      "Sales Analytics",
      `YTD Quantity: ${analytics.kpis.ytdQuantity.toLocaleString()}`,
      `YTD Revenue: ${analytics.kpis.ytdRevenue.toLocaleString()}`,
      `Top Customer: ${analytics.topCustomers[0]?.name ?? "N/A"}`,
      `Top Category: ${analytics.topCategories[0]?.name ?? "N/A"}`,
      `Top SKU: ${analytics.topSkus[0]?.name ?? "N/A"}`,
    ].join("\n");
  } catch {
    return "Sales Analytics\nUnavailable.";
  }
}
```

Add it to the existing context assembly without giving Agent mutation tools for sales records.

Run:

```powershell
npm run test -- --run services/agent/context-builder.test.ts
```

Expected: PASS.

- [ ] **Step 3: Update E2E smoke**

Modify `tests/e2e/smoke.spec.ts` to include:

```ts
{
  name: "Analytics",
  heading: "Sales Analytics",
  finalStates: (page: Page) => [
    page.getByText("YTD Quantity"),
    page.getByText("Unable to load sales analytics"),
    page.getByText("No monthly sales data yet"),
  ],
},
```

Add direct navigation to `/analytics/import` and assert heading:

```ts
await page.goto("/analytics/import");
await expect(page.getByRole("heading", { name: "Import Sales Data", level: 1 })).toBeVisible();
```

Run:

```powershell
npm run test:e2e
```

Expected: PASS.

- [ ] **Step 4: Verify**

Run:

```powershell
npm run test
npm run lint
```

Expected: both commands exit 0.

- [ ] **Step 5: Commit**

```powershell
git add services/agent tests/e2e/smoke.spec.ts
git commit -m "feat: add sales analytics agent context"
```

---

### Task 8: Final Verification And Sample Import

**Files:**
- Modify only if verification exposes defects.

**Interfaces:**
- Verifies the full Sales Analytics flow with the user's workbook:
  - `C:\Users\RichardYu\Downloads\Sales Report by Period 2026-01-01 to 2026-07-07.xlsx`

- [ ] **Step 1: Apply migration locally**

Run:

```powershell
npm run prisma:migrate
```

Expected:

- Migration applies to `ai_work_os`.
- Database is in sync.

- [ ] **Step 2: Run full automated verification**

Run:

```powershell
npm run test
npm run lint
npm run build
npm run test:e2e
```

Expected:

- Unit/service/component tests pass.
- lint exits 0.
- build exits 0. Known Turbopack tracing warning from file upload route may still appear.
- E2E smoke passes.

- [ ] **Step 3: Manual sample import**

With dev server running:

```powershell
npm run dev -- --hostname 127.0.0.1
```

Open:

```text
http://127.0.0.1:3000/analytics/import
```

Upload:

```text
C:\Users\RichardYu\Downloads\Sales Report by Period 2026-01-01 to 2026-07-07.xlsx
```

Expected auto-mapping:

- Date: `Invoice Date`
- Customer: `Customer Name`
- SKU / Item: `Item`
- Product Name: `Description`
- Category: `Item Group`
- Salesperson: `Sales Person`
- Quantity: `Quantity`
- Revenue: `Total Sales`
- Ship-To State: `Ship-To State`
- Ship-To City: `Ship-To City`

Click Import Rows.

Expected summary:

- Total rows: about 46,312.
- Imported rows: close to total rows.
- Rejected rows: 0 or a small number if source rows are malformed.

- [ ] **Step 4: Verify dashboard data**

Open:

```text
http://127.0.0.1:3000/analytics
```

Expected:

- YTD Quantity is around `711,090` for the 2026 sample.
- YTD Sales is around `$21,365,036`.
- Monthly chart shows January through July 2026.
- Salesperson Split includes `Bella Cui` and `Allen Meng`.
- Top Customers includes `TRACTOR SUPPLY COMPANY`.
- Top Categories includes `L&G Tires`.
- Top SKUs includes `WD1030`.

- [ ] **Step 5: Final git check**

Run:

```powershell
git status --short --ignored
```

Expected:

- No uncommitted tracked files.
- Ignored local runtime files may appear, such as `.env`, `.next/`, `node_modules/`, `test-results/`, `dev-server.log`, and local uploads.

- [ ] **Step 6: Commit fixes if needed**

If any verification fix was required:

```powershell
git add <changed-files>
git commit -m "fix: stabilize sales analytics import"
```

If no fixes were required, do not create an empty commit.
