import { AnalyticsSectionSwitcher } from "@/components/analytics/analytics-section-switcher";
import { WarehouseOverdueMonitor } from "@/components/analytics/warehouse-overdue-monitor";

export default function WarehouseOverduePage() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-zinc-950">
            Warehouse Overdue Monitor
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">
            Paste the OA warehouse overdue report and review Allen/Bella open
            orders, urgent exceptions, and follow-up notes.
          </p>
        </div>
      </div>

      <AnalyticsSectionSwitcher current="warehouse-overdue" />
      <WarehouseOverdueMonitor />
    </div>
  );
}
