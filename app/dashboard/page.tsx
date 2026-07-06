import { connection } from "next/server";
import { AlertCircle } from "lucide-react";
import { DashboardGrid } from "@/components/dashboard/dashboard-grid";
import { EmptyState } from "@/components/ui/empty-state";
import {
  getDashboardOverview,
  type DashboardOverview,
} from "@/services/dashboard";

export default async function DashboardPage() {
  await connection();

  let overview: DashboardOverview | null = null;
  let error: string | null = null;

  try {
    overview = await getDashboardOverview();
  } catch (dashboardError) {
    console.error("Failed to load dashboard overview", dashboardError);
    error =
      "Dashboard data is unavailable. Check the PostgreSQL connection and refresh when the database is running.";
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal text-zinc-950">
          Dashboard
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">
          A focused workspace for today&apos;s tasks, mail, files, project
          activity, and follow-ups.
        </p>
      </div>

      {error || !overview ? (
        <EmptyState
          title="Dashboard data is unavailable"
          description={error ?? "Unable to load dashboard data."}
          icon={<AlertCircle className="size-6" aria-hidden="true" />}
        />
      ) : (
        <DashboardGrid overview={overview} />
      )}
    </div>
  );
}
