export type SalesReportingPeriod = {
  currentYear: number;
  priorYear: number;
  startMonth: number;
  endMonth: number;
  months: number[];
  kind: "month" | "ytd" | "period";
  availableCurrentMonths: number[];
  availablePriorMonths: number[];
  missingCurrentMonths: number[];
  missingPriorMonths: number[];
};

export function resolveSalesReportingPeriod(
  globalRows: ReadonlyArray<{ orderDate: Date }>,
  filters: { year?: number; startMonth?: number; endMonth?: number },
): SalesReportingPeriod {
  const currentYear = filters.year ?? new Date().getFullYear();
  const priorYear = currentYear - 1;
  // A source row establishes month availability, not import completeness.
  const availableMonths = (year: number) =>
    [...new Set(globalRows
      .filter((row) => row.orderDate.getFullYear() === year)
      .map((row) => row.orderDate.getMonth() + 1))].sort((a, b) => a - b);
  const globalCurrentMonths = availableMonths(currentYear);
  const globalPriorMonths = availableMonths(priorYear);
  const startMonth = filters.startMonth ?? 1;
  const endMonth = filters.endMonth ?? globalCurrentMonths.at(-1) ?? 0;
  const months = Array.from(
    { length: Math.max(0, endMonth - startMonth + 1) },
    (_, index) => startMonth + index,
  );
  // Coverage arrays describe only the selected window, never off-screen months.
  const availableCurrentMonths = months.filter((month) => globalCurrentMonths.includes(month));
  const availablePriorMonths = months.filter((month) => globalPriorMonths.includes(month));

  return {
    currentYear,
    priorYear,
    startMonth,
    endMonth,
    months,
    kind: months.length === 1 ? "month" : startMonth === 1 ? "ytd" : "period",
    availableCurrentMonths,
    availablePriorMonths,
    missingCurrentMonths: months.filter((month) => !availableCurrentMonths.includes(month)),
    missingPriorMonths: months.filter((month) => !availablePriorMonths.includes(month)),
  };
}
