import Link from "next/link";
import { MidstateImporter } from "@/components/analytics/midstate/midstate-importer";

export default function MidstateImportPage() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <div>
        <Link
          href="/analytics/midstate"
          className="text-sm font-medium text-zinc-500 hover:text-zinc-950"
        >
          Back to Midstate Analytics
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-normal text-zinc-950">
          Import Midstate File
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">
          Upload the monthly Midstate workbook. The RAW DATA sheet is imported
          as member sell-through data.
        </p>
      </div>
      <MidstateImporter />
    </div>
  );
}
