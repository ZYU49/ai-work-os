## Summary

Implemented sales analytics aggregation support for Task 4 by adding an in-memory metrics summarizer for test coverage, a DB-backed `getSalesAnalytics` service, and a new `GET /api/analytics/sales` route with Zod-validated filters and structured error responses.

## Files Changed

- `services/analytics/metrics.test.ts`
- `services/analytics/metrics.ts`
- `app/api/analytics/sales/route.ts`

## Commands Run

### Red

1. `npm run test -- --run services/analytics/metrics.test.ts`
   - Result: FAIL
   - Evidence: `Cannot find package '@/services/analytics/metrics' imported from .../services/analytics/metrics.test.ts`

### Green

1. `npm run test -- --run services/analytics/metrics.test.ts`
   - Result: PASS
   - Evidence: `Test Files  1 passed (1)` and `Tests  3 passed (3)`
2. `npm run test -- --run services/analytics/metrics.test.ts`
   - Result: PASS
   - Evidence: `Test Files  1 passed (1)` and `Tests  3 passed (3)`
3. `npm run lint`
   - Result: PASS
   - Evidence: exit code `0`

## Self-Review

- Followed the brief’s TDD sequence: added the failing metrics test first, observed the expected missing-module failure, then implemented the minimum production code to satisfy the behavior.
- Kept the metrics surface scoped to the requested filter schema, KPI/monthly/ranking outputs, and filter options derived from the loaded data window.
- Used a lazy `@/lib/db` import inside `getSalesAnalytics` so the pure unit tests do not require Prisma client initialization just to import the metrics module.
- Added `runtime = "nodejs"` on the analytics route so the Prisma-backed route stays on the Node runtime.

## Concerns

None.

## Review Fixes

### Summary

Addressed two review findings in the sales metrics layer:

- Month-over-month growth now compares against the immediately preceding calendar month, so gaps like January to March yield `null` MoM growth instead of comparing against January.
- `filterOptions` now come from the full loaded year/prior-year data window even when the KPI and rankings are based on a categorically filtered subset.

### Files Changed

- `services/analytics/metrics.test.ts`
- `services/analytics/metrics.ts`
- `.superpowers/sdd/task-4-report.md`

### Commands Run

#### Red

1. `npm run test -- --run services/analytics/metrics.test.ts`
   - Result: FAIL
   - Evidence: March incorrectly reported `momQuantityGrowth: 0.5` / `momRevenueGrowth: 0.5` with no February data, and `filterOptions.salespeople` collapsed to `["Bella Cui"]` instead of preserving `["Allen Meng", "Bella Cui"]`.

#### Green

1. `npm run test -- --run services/analytics/metrics.test.ts`
   - Result: PASS
   - Evidence: `Test Files  1 passed (1)` and `Tests  5 passed (5)`
2. `npm run test -- --run services/analytics/metrics.test.ts`
   - Result: PASS
   - Evidence: `Test Files  1 passed (1)` and `Tests  5 passed (5)`
3. `npm run lint`
   - Result: PASS
   - Evidence: exit code `0`

### Self-Review

- Added focused regression coverage for the missing-February MoM case and for stable filter options under categorical filtering.
- Kept existing Task 4 behavior intact while extending the pure summarizer with an optional base-row source for filter-option derivation.
- Updated the DB-backed service to load the filtered analytic rows and the unfiltered window rows separately, then normalize both through the same summarizer path.

### Concerns

None.
