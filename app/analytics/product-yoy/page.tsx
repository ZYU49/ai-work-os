import Link from "next/link";
import { AnalyticsSectionSwitcher } from "@/components/analytics/analytics-section-switcher";
import { ProductYoYDashboard } from "@/components/analytics/product-yoy-dashboard";

const secondaryLinkClass =
  "inline-flex h-9 items-center justify-center rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-900 shadow-sm transition-colors hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500";

export default function ProductYoYPage() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-zinc-950">
            Product YoY
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">
            Compare each SKU by current-year quantity against the same months
            last year.
          </p>
        </div>
        <Link href="/analytics" className={secondaryLinkClass}>
          Back to Sales Analytics
        </Link>
      </div>
      <AnalyticsSectionSwitcher current="sales" />
      <ProductYoYDashboard />
    </div>
  );
}
