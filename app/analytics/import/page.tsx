import { AnalyticsImporter } from "@/components/analytics/analytics-importer";

export default function AnalyticsImportPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal text-zinc-950">
          Import Sales Data
        </h1>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">
          Upload Excel or CSV sales detail, map your columns, and refresh the
          sales dashboard.
        </p>
      </div>
      <AnalyticsImporter />
    </div>
  );
}
