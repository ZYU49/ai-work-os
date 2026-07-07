# YoY Comparison Chart Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dedicated year-over-year quantity comparison chart to the Sales Analytics dashboard.

**Architecture:** Extend the analytics service response with a `yoyComparison` array derived from the same current/prior monthly maps already used for YoY growth. Add one focused Recharts component and render it in the dashboard.

**Tech Stack:** Next.js, TypeScript, React, Recharts, Vitest, Testing Library.

## Global Constraints

- First version compares quantity by month.
- Use distinct colors for current year and prior year.
- Keep the dashboard clean, professional, and consistent with the existing Analytics UI.
- Do not change import behavior or database schema.

---

### Task 1: Analytics Data Contract

**Files:**
- Modify: `services/analytics/metrics.ts`
- Modify: `services/analytics/metrics.test.ts`

**Interfaces:**
- Produces: `SalesAnalyticsOverview["yoyComparison"]`

- [ ] Add a failing test that expects `yoyComparison` to include current/prior year quantities and growth.
- [ ] Implement `yoyComparison` from existing monthly aggregation maps.
- [ ] Run `npm run test -- services/analytics/metrics.test.ts`.

### Task 2: Dashboard Chart

**Files:**
- Create: `components/analytics/yoy-comparison-chart.tsx`
- Modify: `components/analytics/analytics-dashboard.tsx`
- Modify: `components/analytics/analytics-dashboard.test.tsx`

**Interfaces:**
- Consumes: `analytics.yoyComparison`

- [ ] Add a failing dashboard test for `YoY Quantity Comparison`.
- [ ] Build the chart component with two year-colored quantity series.
- [ ] Render the chart below `Monthly Quantity and Sales`.
- [ ] Run `npm run test -- components/analytics/analytics-dashboard.test.tsx`.

### Task 3: Verification

- [ ] Run `npm run test`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run build`.
