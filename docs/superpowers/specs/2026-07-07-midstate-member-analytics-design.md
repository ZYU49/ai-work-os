# Midstate Member Analytics Design

## Goal

Build a dedicated Midstate analytics module for monthly member sell-through files such as `1001718 May 2026.xlsx`.

The module must keep Midstate member shipment data separate from the existing Sales Analytics records. Existing `SalesRecord` data represents sell-in: Sutong sales to customers. Midstate monthly files represent sell-through or downstream member shipment activity. Mixing both in one table would make total sales and growth metrics misleading.

The first version focuses on quantity. `Cost Ext` is imported and shown as a secondary amount metric, but quantity is the primary dashboard measure.

## Source Data

The confirmed Midstate file has these sheets:

- `RAW DATA`
- `PIVOTS`
- `Sheet1`

The import should use `RAW DATA` as the source of truth.

Confirmed columns:

- `Vendor Name`
- `MS Item Number`
- `Description`
- `VIN`
- `Member Name`
- `Member Number`
- `Vendor Number`
- `Order Class`
- `Qty Shipped`
- `Post Date`
- `Cost`
- `Cost Ext`

`VIN` is the SKU field used for our analytics. `Order Class` separates `Warehouse` and `Direct`.

Confirmed May 2026 validation:

- Total Midstate file quantity: `14,757`
- Warehouse quantity: `14,615`
- Direct quantity: `142`
- Existing system Mid-States May 2026 sales quantity: `4,221`
- Existing system Olney, IL direct-ship quantity: `142`
- Direct SKU-level comparison against system data: `27` matching SKUs, `0` mismatches

This confirms the file is a valid separate sell-through dataset.

## Approaches Considered

### Option A: Reuse `SalesRecord`

Import Midstate member rows into the existing sales table using `customerName = Midstate`.

Pros:

- Fastest to implement.
- Existing Sales Analytics dashboard can query the rows immediately.

Cons:

- Pollutes sell-in reporting with sell-through data.
- YTD quantity and customer ranking become misleading.
- `Cost Ext` is not the same as Sutong invoice revenue.

Decision: reject.

### Option B: Add Optional Member Fields to `SalesRecord`

Keep `SalesRecord` as the core table and add more member fields.

Pros:

- Reuses part of the current import flow.
- Simple schema change.

Cons:

- Still mixes business meanings.
- Filters become fragile because users must remember which source type is being viewed.
- Future Midstate-specific charts become harder to reason about.

Decision: reject for first version.

### Option C: Dedicated Midstate Data Source

Create dedicated Midstate import and sell-through tables, plus a dedicated `/analytics/midstate` page.

Pros:

- Sell-in and sell-through stay cleanly separated.
- Member-level analysis becomes natural.
- Allows Midstate-specific metrics such as Warehouse vs Direct, member heatmap, and member SKU mix.
- Future monthly imports can be handled predictably.

Cons:

- Requires new schema, import service, API routes, and page.

Decision: recommended.

## Data Model

Add `MidstateImport`:

- `id`
- `fileName`
- `storagePath`
- `sheetName`
- `status`
- `totalRows`
- `importedRows`
- `rejectedRows`
- `errorMessage`
- `periodYear`
- `periodMonth`
- `createdAt`
- `updatedAt`

Add `MidstateSellThroughRecord`:

- `id`
- `importId`
- `postDate`
- `vendorName`
- `vendorNumber`
- `memberNumber`
- `memberName`
- `msItemNumber`
- `sku`
- `description`
- `orderClass`
- `quantity`
- `cost`
- `costExt`
- `category`
- `createdAt`

Indexes:

- `postDate`
- `memberNumber`
- `memberName`
- `sku`
- `orderClass`
- `category`
- `importId`

Unique/deduplication behavior:

- First version treats each imported file as a monthly replaceable batch.
- When importing the same `periodYear`, `periodMonth`, and `vendorNumber`, the app should warn that the period already exists.
- The first version allows explicit replacement by deleting records for the matching import period before inserting the new batch.

## Import Flow

Add `/analytics/midstate/import`.

Workflow:

1. User uploads the Midstate `.xlsx` monthly file.
2. System detects the `RAW DATA` sheet.
3. System validates required headers.
4. System previews key metrics before import:
   - Date range
   - Total rows
   - Total quantity
   - Warehouse quantity
   - Direct quantity
   - Member count
   - SKU count
5. User confirms import.
6. System saves rows to `MidstateSellThroughRecord`.
7. System shows import summary and link to the Midstate dashboard.

No manual field mapping is required in the first version because the Midstate monthly file has a known format.

## Dashboard Page

Add `/analytics/midstate`.

Top filters:

- Year
- Month range
- Member
- SKU
- Category
- Order Class: All, Warehouse, Direct
- Metric toggle: Quantity first, Cost Ext secondary

KPI cards:

- YTD Sell-through Qty
- Current Month Qty
- YTD Cost Ext
- YoY Quantity %
- MoM Quantity %
- Active Members
- Top Member
- Top SKU

Core charts:

- Monthly Sell-through Trend: line chart.
- YoY Monthly Comparison: grouped or multi-line chart with one color per year.
- Warehouse vs Direct: stacked bar chart by month.
- Top Members: horizontal bar chart.
- Top SKUs: horizontal bar chart.
- Member Heatmap: member x month quantity heatmap.
- SKU by Member: selected SKU distribution across members.

Detail tables:

- Member table: member number, member name, YTD quantity, current month quantity, YoY, MoM, top SKU.
- SKU table: SKU, description, YTD quantity, current month quantity, YoY, MoM, top member.

## Metric Definitions

YTD Sell-through Qty:

- Sum of `quantity` from January 1 through the selected period end date.

Current Month Qty:

- Sum of `quantity` for the selected latest month.

YTD Cost Ext:

- Sum of `costExt` for the selected YTD period.

MoM Quantity Growth:

- `(current month quantity - previous month quantity) / previous month quantity`.

YoY Quantity Growth:

- `(current year month quantity - prior year same month quantity) / prior year same month quantity`.

Zero denominator handling:

- If the previous or prior-year value is zero or missing, growth is `null`.
- UI displays `N/A`.

Order Class handling:

- `Warehouse` and `Direct` are imported as source values.
- Filters default to `All`.
- Dashboard shows Warehouse vs Direct split so the user can see whether movement is Midstate warehouse/member activity or direct-ship activity.

## Category Handling

First version:

- `category` is nullable.
- Category can be populated later by SKU mapping rules.
- If no category exists, charts group those rows under `Uncategorized`.

Future version:

- Add a SKU master table with SKU, description, category, product family, and tire type.
- Automatically assign category during import.

## Agent Support

First version exposes read-only Midstate context to the Agent:

- YTD Midstate sell-through quantity.
- Latest month total quantity.
- Top members.
- Top SKUs.
- Warehouse vs Direct split.
- Members with sharp decline.
- SKUs with sharp decline.

Example questions:

- "How is Midstate May sell-through?"
- "What are Bomgaars' best-selling SKUs recently?"
- "Which Midstate members declined the most?"
- "Which members are strongest for WD1030?"

Agent should not mutate Midstate records in the first version.

## Error Handling

Import validation errors:

- Missing `RAW DATA` sheet.
- Missing required headers.
- Invalid date values in `Post Date`.
- Invalid quantity values in `Qty Shipped`.
- Invalid amount values in `Cost` or `Cost Ext`.

Partial import behavior:

- Rows with invalid required fields are rejected.
- Valid rows are imported.
- Import summary shows imported and rejected counts.

Duplicate period behavior:

- If the same vendor number, year, and month already exist, the app warns the user.
- Replacement should be explicit.

## Testing

Service tests:

- Parser detects `RAW DATA` and required headers.
- Parser extracts May 2026 totals from a fixture.
- Import service saves normalized rows.
- Duplicate period detection works.
- Metrics service computes YTD, MoM, YoY, top members, top SKUs, and Warehouse vs Direct.

API tests:

- Upload route rejects invalid files.
- Commit route imports valid rows.
- Dashboard API respects filters.

Component tests:

- Dashboard renders KPI cards.
- Dashboard renders top member and top SKU charts.
- Filters update API requests.
- Import page shows validation and import summary.

## First Version Scope

In scope:

- Dedicated Midstate schema.
- Midstate Excel import from `RAW DATA`.
- `/analytics/midstate/import`.
- `/analytics/midstate`.
- Quantity-first dashboard.
- Cost Ext as secondary amount metric.
- Member, SKU, month, and order class filters.
- YoY and MoM quantity comparison.
- Warehouse vs Direct split.

Out of scope:

- ERP integration.
- QuickBooks integration.
- Automatic email ingestion.
- Automatic category master management.
- Forecasting.
- Inventory reconciliation.
- Editing imported rows in the UI.

## Success Criteria

- User can upload a Midstate monthly workbook.
- May 2026 file imports as `14,757` total quantity.
- Direct quantity imports as `142`.
- Warehouse quantity imports as `14,615`.
- Dashboard can show Top Members and Top SKUs for May 2026.
- Dashboard can filter by member, SKU, and order class.
- Existing Sales Analytics totals do not change after Midstate import.
