# Midstate Item Ranking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Midstate rolling 12-month item ranking tab below the rolling table, with category filtering and ranked item quantity totals.

**Architecture:** Extend the existing Midstate analytics overview payload with `itemRankings`, computed from the same rolling 12-month window used by the charts. Render a two-tab section in the Midstate dashboard so the existing rolling table and the new category-filtered ranking table sit together.

**Tech Stack:** Next.js App Router, TypeScript, React, Prisma, Vitest, Testing Library, TailwindCSS.

## Global Constraints

- Ranking quantity uses the latest available Midstate rolling 12-month window.
- Ranking rows display `ranking`, `item number`, `description`, `category`, and `Qty`.
- Category filter defaults to `All Categories`.
- Do not include cost in this table.
- Preserve existing member filter behavior.

---

### Task 1: Metrics Payload

**Files:**
- Modify: `services/midstate/metrics.ts`
- Test: `services/midstate/metrics.test.ts`

**Interfaces:**
- Produces: `MidstateAnalyticsOverview["itemRankings"]`
- Row type: `{ rank: number; itemNumber: string; description: string | null; category: string | null; quantity: number }`

- [ ] **Step 1: Write the failing test**

Add a test that builds rows across 13 months, calls `summarizeMidstateRowsForTest(rows, {})`, and expects `itemRankings` to include only the latest rolling 12 months, aggregate duplicate SKUs, rank by quantity descending, and preserve category and description.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- services/midstate/metrics.test.ts`
Expected: FAIL because `itemRankings` does not exist.

- [ ] **Step 3: Write minimal implementation**

Add `itemRankings` to `MidstateAnalyticsOverview`; compute it from `filterOptionRows` constrained to the same `rollingKeys`, aggregated by SKU, category, and description.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- services/midstate/metrics.test.ts`
Expected: PASS.

### Task 2: Dashboard Tab UI

**Files:**
- Modify: `components/analytics/midstate/midstate-dashboard.tsx`
- Test: `components/analytics/midstate/midstate-dashboard.test.tsx`

**Interfaces:**
- Consumes: `analytics.itemRankings`
- UI state: active lower tab, selected item category

- [ ] **Step 1: Write the failing test**

Extend the Midstate dashboard render test so the response includes `itemRankings`, then click `Item Ranking by Category`, verify the category select appears, change it to a category, and assert the matching item row is shown with ranking, item number, description, category, and quantity.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- components/analytics/midstate/midstate-dashboard.test.tsx`
Expected: FAIL because the tab and category filter do not exist.

- [ ] **Step 3: Write minimal implementation**

Create the lower two-tab section below the charts: `Rolling 12-Month Table` and `Item Ranking by Category`. Move the current rolling table into the first tab and add a category filter plus ranking table in the second tab.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- components/analytics/midstate/midstate-dashboard.test.tsx`
Expected: PASS.

### Task 3: Verification

**Files:**
- Verify only.

- [ ] **Step 1: Run focused tests**

Run: `npm run test -- services/midstate/metrics.test.ts components/analytics/midstate/midstate-dashboard.test.tsx`
Expected: PASS.

- [ ] **Step 2: Run full verification**

Run: `npm run test`
Expected: PASS.

Run: `npm run lint`
Expected: PASS.

Run: `npm run build`
Expected: PASS, allowing the existing Turbopack trace warning if present.

- [ ] **Step 3: Commit**

Run:

```bash
git add docs/superpowers/plans/2026-07-08-midstate-item-ranking.md services/midstate/metrics.ts services/midstate/metrics.test.ts components/analytics/midstate/midstate-dashboard.tsx components/analytics/midstate/midstate-dashboard.test.tsx
git commit -m "feat: add midstate item ranking"
```
