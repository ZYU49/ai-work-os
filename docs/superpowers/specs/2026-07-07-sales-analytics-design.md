# Sales Analytics Design

## Goal

Build a Sales Analytics module inside AI Work OS that accepts Excel and CSV sales detail files, maps source columns to standard sales fields, imports rows into PostgreSQL, and generates a sales dashboard focused on YTD quantity, YTD revenue, monthly trends, YoY, MoM, top customers, top categories, and top SKUs/products.

The first version is import-based only. It does not connect to ERP, QuickBooks, Outlook, Gmail, or external reporting systems.

## Source Data

The first real sample file is:

`Sales Report by Period 2026-01-01 to 2026-07-07.xlsx`

Observed sheet:

- `Sales Report by Period`

Observed columns:

- `Invoice#`
- `Invoice Date`
- `Customer Code`
- `Customer Name`
- `Customer PO#`
- `Ship-To Address`
- `Ship-To City`
- `Ship-To State`
- `Item`
- `Description`
- `Item Group`
- `Warehouse`
- `Quantity`
- `Total Sales`
- `Shipment#/SHR#`
- `Sales Person`
- `U_STG_STPriceCode`
- `SlpCode`
- `Ship-To Code`

Observed data shape:

- Date range: 2026-01-02 through 2026-07-07
- Rows: about 46,000
- Salespeople: Allen Meng and Bella Cui
- Customers: about 27
- SKUs: about 500
- Item groups/categories: about 23

This sample supports YTD, monthly trends, MoM, top customers, top categories, top SKUs, salesperson comparisons, and state-level views. YoY requires matching 2025 data.

## Standard Fields

Required mapped fields:

- `orderDate`: source date column, usually `Invoice Date`
- `customerName`: source customer column, usually `Customer Name`
- `sku`: source SKU/item column, usually `Item`
- `quantity`: source quantity column, usually `Quantity`
- `revenue`: source amount column, usually `Total Sales`

Optional mapped fields:

- `invoiceNumber`: usually `Invoice#`
- `customerCode`: usually `Customer Code`
- `customerPo`: usually `Customer PO#`
- `productName`: usually `Description`
- `category`: usually `Item Group`
- `salesperson`: usually `Sales Person`
- `shipToState`: usually `Ship-To State`
- `shipToCity`: usually `Ship-To City`
- `warehouse`: usually `Warehouse`
- `shipmentNumber`: usually `Shipment#/SHR#`
- `shipToCode`: usually `Ship-To Code`

First version behavior:

- Required fields must be mapped before import.
- Optional fields may be left unmapped.
- Empty optional values are stored as `null`.
- Quantities and revenue are parsed as numbers.
- Dates are parsed into real dates.
- Rows with missing required values are rejected and counted in the import summary.

## Data Model

Add `SalesImport`:

- `id`
- `fileName`
- `sourceType`: `excel` or `csv`
- `sheetName`
- `status`: `uploaded`, `mapped`, `imported`, `failed`
- `mapping`: JSON object storing source-to-standard field mapping
- `totalRows`
- `importedRows`
- `rejectedRows`
- `errorMessage`
- `createdAt`
- `updatedAt`

Add `SalesRecord`:

- `id`
- `importId`
- `orderDate`
- `invoiceNumber`
- `customerCode`
- `customerName`
- `customerPo`
- `sku`
- `productName`
- `category`
- `salesperson`
- `shipToState`
- `shipToCity`
- `warehouse`
- `shipmentNumber`
- `shipToCode`
- `quantity`
- `revenue`
- `unitPrice`
- `createdAt`

`unitPrice` is calculated during import as `revenue / quantity` when quantity is non-zero; otherwise it is `null`.

## Mid-States Member Support

Mid-States is currently represented as a customer in sales data. The user expects Mid-States to later break down into 21 members.

First version support:

- Add a `memberName` optional field to `SalesRecord`.
- If a future source file includes member-level data, the user can map that column into `memberName`.
- If no member column exists, Mid-States rows remain at customer level.

Future enhancement:

- Add a customer/member mapping table so member names can be derived from `Ship-To Code`, `Ship-To Address`, or another business key.

## Analytics Metrics

Dashboard metrics:

- YTD Quantity: sum of `quantity` from Jan 1 of selected year through selected end date.
- YTD Revenue: sum of `revenue` from Jan 1 of selected year through selected end date.
- Average Unit Price: `YTD Revenue / YTD Quantity`, displayed only when quantity is non-zero.
- Active Customers: count of distinct customers in the selected period.
- Monthly Quantity: quantity grouped by month.
- Monthly Revenue: revenue grouped by month.
- MoM Quantity Growth: `(current month quantity - previous month quantity) / previous month quantity`.
- MoM Revenue Growth: `(current month revenue - previous month revenue) / previous month revenue`.
- YoY Quantity Growth: `(current year month quantity - prior year same month quantity) / prior year same month quantity`.
- YoY Revenue Growth: `(current year month revenue - prior year same month revenue) / prior year same month revenue`.

Zero denominator handling:

- If prior value is zero or missing, growth is `null`.
- UI displays `N/A` instead of `Infinity`, `-Infinity`, or misleading percentages.

## Pages

Add `/analytics`:

- Sales dashboard page.
- Shows KPI cards, trend charts, rankings, filters, and import entry point.

Add `/analytics/import`:

- Upload Excel or CSV.
- Reads workbook/sheet headers.
- Shows field mapping UI.
- Lets the user map source columns to standard fields.
- Imports data into PostgreSQL.
- Displays import summary.

First version may combine upload and mapping in one page if it keeps the workflow clear.

## Dashboard Layout

Top filter bar:

- Year
- Month range
- Salesperson: all, Allen, Bella, or any salesperson found in data
- Customer
- Category
- SKU
- State

Top KPI cards:

- YTD Quantity
- YTD Sales Amount
- MoM Quantity %
- Active Customers

Core charts:

- Monthly Quantity Trend: line chart
- Monthly Sales Amount Trend: column or line chart
- Allen vs Bella Monthly Quantity: grouped bar chart
- Top Customers by Quantity: horizontal bar chart
- Top Categories by Quantity: horizontal bar chart or treemap
- Top SKUs by Quantity: horizontal bar chart

Secondary drilldown-ready charts:

- Category Mix by Salesperson: 100% stacked bar chart
- Customer Category Mix: stacked bar chart
- State Sales Ranking: horizontal bar chart
- SKU Pareto: bar plus cumulative percentage line

## Chart Design Guidance

Use chart types based on the analytical question:

- Time trend: line chart.
- Quantity or revenue by month: line chart or column chart.
- Salesperson comparison by month: grouped bar chart.
- Share/mix by salesperson or customer: stacked bar chart.
- Top customers/categories/SKUs: horizontal bar chart.
- Member x month comparison: heatmap.
- SKU concentration: Pareto chart.
- Geography: state ranking first; US map later.

Avoid crowded charts:

- Default rankings show top 10 or top 20.
- Long SKU descriptions stay in tooltips or detail tables, not chart axes.
- Charts should use quantity as the primary metric and revenue as a toggle or companion metric.

## User Workflows

Import workflow:

1. User opens Analytics Import.
2. User uploads `.xlsx` or `.csv`.
3. System extracts headers and a small preview.
4. User maps required and optional fields.
5. System validates field mapping.
6. System imports valid rows and rejects invalid rows.
7. System shows import summary.
8. User opens dashboard and sees updated charts.

Analysis workflow:

1. User opens Analytics.
2. User selects year and optional filters.
3. Dashboard updates KPI cards and charts.
4. User can filter by Allen/Bella, customer, category, SKU, state, or future Mid-States member.

## Error Handling

Upload errors:

- Unsupported file type shows a clear error.
- Empty file shows a clear error.
- Workbook with no readable sheet shows a clear error.

Mapping errors:

- Missing required fields blocks import.
- Duplicate standard field mappings show a clear error.

Row import errors:

- Rows with invalid dates, missing customer, missing SKU, invalid quantity, or invalid revenue are rejected.
- Import summary reports total rows, imported rows, and rejected rows.
- Rejected row details can be summarized in first version; full rejected-row download can come later.

Database errors:

- API returns a friendly error and does not partially report success.
- If import fails before commit, imported rows are not persisted.

## AI Agent Integration

First version exposes read-only sales summaries to the Agent.

Supported questions after data import:

- What is YTD sales quantity?
- What are the top customers by quantity?
- Which categories are growing or declining?
- How are Allen and Bella performing this year?
- Which SKUs are the biggest drivers?
- What changed this month vs last month?

Agent should not mutate sales records in first version.

## Testing

Unit tests:

- CSV parsing.
- Excel row normalization.
- Field mapping validation.
- Date and number parsing.
- YTD aggregation.
- Monthly aggregation.
- MoM and YoY calculations, including zero denominator cases.
- Top customer/category/SKU ranking.

Service tests:

- Import creates `SalesImport` and `SalesRecord` rows.
- Invalid rows are rejected and counted.
- Filters apply correctly to analytics queries.

E2E smoke:

- Analytics page renders.
- Import page renders.
- Dashboard handles no-data state.

Manual verification:

- Import the 2026 sample workbook.
- Confirm dashboard shows records for 2026-01 through 2026-07.
- Confirm Allen/Bella filter exists.
- Confirm Top Customers includes large customers from sample data.

## Non-Goals

Not in first version:

- ERP integration.
- QuickBooks integration.
- Scheduled imports.
- Multi-currency conversion.
- Forecasting.
- Advanced AI data cleansing.
- User permission management.
- A full map visualization.
- Downloadable rejected-row workbook.

## Open Follow-Up Data Needed

For YoY:

- Need 2025 data with the same or mappable fields.

For Mid-States member view:

- Need a source column that identifies member, or a mapping file from member to a stable key such as ship-to code, customer code, or address.

