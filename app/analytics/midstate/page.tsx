import Link from "next/link";
import { MidstateDashboard } from "@/components/analytics/midstate/midstate-dashboard";

export default function MidstateAnalyticsPage() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-zinc-950">
            Midstate Member Analytics
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
            Analyze Midstate sell-through by member, SKU, month, and order class.
          </p>
        </div>
        <Link
          href="/analytics/midstate/import"
          className="inline-flex h-9 items-center justify-center rounded-md bg-zinc-950 px-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-950"
        >
          Import Midstate File
        </Link>
      </div>
      <MidstateDashboard />
    </div>
  );
}
