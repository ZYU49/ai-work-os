import Link from "next/link";
import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";

const primaryLinkClass =
  "inline-flex h-9 items-center justify-center rounded-md bg-zinc-950 px-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950";

const secondaryLinkClass =
  "inline-flex h-9 items-center justify-center rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-900 shadow-sm transition-colors hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500";

export default function AnalyticsPage() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-zinc-950">
            Sales Analytics
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">
            Track YTD quantity, revenue, monthly trends, customers, categories,
            SKUs, and salesperson performance.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/analytics/midstate" className={secondaryLinkClass}>
            Midstate Analytics
          </Link>
          <Link href="/analytics/midstate/import" className={secondaryLinkClass}>
            Import Midstate
          </Link>
          <Link href="/analytics/import" className={primaryLinkClass}>
            Import Sales Data
          </Link>
        </div>
      </div>
      <AnalyticsDashboard />
    </div>
  );
}
