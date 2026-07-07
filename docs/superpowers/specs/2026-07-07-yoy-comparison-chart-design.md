# YoY Comparison Chart Design

## Goal

Add a clear year-over-year quantity comparison to the Sales Analytics dashboard.

## Scope

- Add a dedicated `YoY Quantity Comparison` chart below the existing monthly trend chart.
- Compare the selected year against the prior year month by month.
- Use distinct colors for each year.
- Keep the existing KPI cards and monthly quantity/revenue chart.
- Keep the first version focused on quantity because quantity is the primary sales metric.

## Data Contract

The sales analytics API returns a `yoyComparison` array. Each point contains:

- `month`: `01` through `12` as a stable month key for chart ordering.
- `monthLabel`: short display label such as `Jan`.
- `currentYear` and `priorYear`.
- `currentQuantity` and `priorQuantity`.
- `quantityGrowth`, matching the existing YoY growth formula.
- `currentRevenue`, `priorRevenue`, and `revenueGrowth` for future UI extension.

## UI

The dashboard renders a new card titled `YoY Quantity Comparison`.

- Current selected year uses a dark line/bar color.
- Prior year uses a blue accent.
- Tooltip shows both years and YoY percent.
- Empty state appears if there is no monthly comparison data.

## Testing

- Metrics tests verify `yoyComparison` values and month-range behavior.
- Dashboard tests verify the new chart/card is rendered.
