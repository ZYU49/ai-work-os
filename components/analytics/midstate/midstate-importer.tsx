"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { ArrowRight, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type MidstateImportPreview = {
  importId: string;
  fileName: string;
  sheetName: string;
  totalRows: number;
  totalQuantity: number;
  warehouseQuantity: number;
  directQuantity: number;
  memberCount: number;
  skuCount: number;
  dateRange: { start: string | null; end: string | null };
  periodYear: number | null;
  periodMonth: number | null;
  vendorNumber: string | null;
  headers: string[];
  previewRows: Record<string, unknown>[];
};

type MidstateImportSummary = {
  totalRows: number;
  importedRows: number;
  rejectedRows: number;
  replacedImports: number;
};

async function readJson(response: Response) {
  return (await response.json().catch(() => ({}))) as {
    error?: string;
    import?: MidstateImportPreview;
    summary?: MidstateImportSummary;
  };
}

function number(value: number) {
  return new Intl.NumberFormat().format(value);
}

function dateRangeLabel(range: MidstateImportPreview["dateRange"]) {
  if (!range.start || !range.end) {
    return "N/A";
  }

  return `${range.start} to ${range.end}`;
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
      <p className="text-xs font-medium uppercase tracking-normal text-zinc-500">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-zinc-950">{value}</p>
    </div>
  );
}

export function MidstateImporter() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<MidstateImportPreview | null>(null);
  const [summary, setSummary] = useState<MidstateImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [showReplaceExisting, setShowReplaceExisting] = useState(false);

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
    setPreview(null);
    setSummary(null);
    setError(null);
    setReplaceExisting(false);
    setShowReplaceExisting(false);
  }

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setError("Choose a Midstate workbook to upload.");
      return;
    }

    setIsUploading(true);
    setError(null);
    setSummary(null);
    setShowReplaceExisting(false);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/analytics/midstate/imports", {
        method: "POST",
        body: formData,
      });
      const data = await readJson(response);

      if (!response.ok || !data.import) {
        throw new Error(data.error ?? "Unable to upload Midstate file.");
      }

      setPreview(data.import);
    } catch (uploadError) {
      setPreview(null);
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Unable to upload Midstate file.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  async function commit() {
    if (!preview) {
      return;
    }

    setIsCommitting(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/analytics/midstate/imports/${preview.importId}/commit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ replaceExisting }),
        },
      );
      const data = await readJson(response);

      if (response.status === 409) {
        setShowReplaceExisting(true);
        throw new Error(
          data.error ??
            "This Midstate period already exists. Confirm replacement to continue.",
        );
      }

      if (!response.ok || !data.summary) {
        throw new Error(data.error ?? "Unable to import Midstate rows.");
      }

      setSummary(data.summary);
      setShowReplaceExisting(false);
    } catch (commitError) {
      setError(
        commitError instanceof Error
          ? commitError.message
          : "Unable to import Midstate rows.",
      );
    } finally {
      setIsCommitting(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Upload</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <form onSubmit={upload} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm font-medium text-zinc-700">
              Midstate monthly file
              <Input
                type="file"
                accept=".xlsx,.xls"
                onChange={chooseFile}
                className="cursor-pointer px-2 py-1 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-950 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-zinc-800"
              />
            </label>
            <p className="text-xs leading-5 text-zinc-500">
              Upload the monthly Midstate Excel workbook and review the RAW DATA
              preview before importing.
            </p>
            <Button type="submit" disabled={!file || isUploading}>
              <UploadCloud className="size-4" aria-hidden="true" />
              {isUploading ? "Uploading" : "Upload Midstate File"}
            </Button>
          </form>

          {preview ? (
            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
              <p className="font-medium text-zinc-950">{preview.fileName}</p>
              <p className="mt-1">
                {preview.sheetName} - {number(preview.totalRows)} rows
              </p>
              <p className="mt-1">
                Period: {preview.periodYear ?? "N/A"}-
                {preview.periodMonth
                  ? String(preview.periodMonth).padStart(2, "0")
                  : "N/A"}
              </p>
            </div>
          ) : null}

          {showReplaceExisting ? (
            <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
              <input
                type="checkbox"
                checked={replaceExisting}
                onChange={(event) => setReplaceExisting(event.target.checked)}
                className="size-4 rounded border-zinc-300 text-zinc-950"
              />
              Replace existing period
            </label>
          ) : null}

          {summary ? (
            <div
              role="status"
              className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800"
            >
              Imported {number(summary.importedRows)} of {number(summary.totalRows)} rows.
              Rejected {number(summary.rejectedRows)}. Replaced{" "}
              {number(summary.replacedImports)}.
            </div>
          ) : null}

          {error ? (
            <p
              role="status"
              aria-live="polite"
              className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {error}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Import Preview</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {!preview ? (
            <p className="text-sm text-zinc-500">
              Upload a Midstate workbook to preview monthly sell-through totals.
            </p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <PreviewMetric
                  label="Total Quantity"
                  value={number(preview.totalQuantity)}
                />
                <PreviewMetric
                  label="Warehouse"
                  value={number(preview.warehouseQuantity)}
                />
                <PreviewMetric label="Direct" value={number(preview.directQuantity)} />
                <PreviewMetric label="Members" value={number(preview.memberCount)} />
                <PreviewMetric label="SKUs" value={number(preview.skuCount)} />
                <PreviewMetric
                  label="Date Range"
                  value={dateRangeLabel(preview.dateRange)}
                />
              </div>

              <div className="overflow-hidden rounded-md border border-zinc-200">
                <div className="border-b border-zinc-200 bg-zinc-50 px-3 py-2">
                  <h2 className="text-sm font-semibold text-zinc-950">
                    Preview Rows
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-zinc-200 text-sm">
                    <thead className="bg-white">
                      <tr>
                        {preview.headers.slice(0, 8).map((header) => (
                          <th
                            key={header}
                            scope="col"
                            className="whitespace-nowrap px-3 py-2 text-left font-medium text-zinc-600"
                          >
                            {header}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 bg-white">
                      {preview.previewRows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={Math.max(preview.headers.slice(0, 8).length, 1)}
                            className="px-3 py-8 text-center text-zinc-500"
                          >
                            No preview rows available.
                          </td>
                        </tr>
                      ) : (
                        preview.previewRows.slice(0, 5).map((row, rowIndex) => (
                          <tr key={`${preview.importId}-${rowIndex}`}>
                            {preview.headers.slice(0, 8).map((header) => (
                              <td
                                key={`${rowIndex}-${header}`}
                                className="whitespace-nowrap px-3 py-2 text-zinc-700"
                              >
                                {String(row[header] ?? "") || "N/A"}
                              </td>
                            ))}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={commit} disabled={isCommitting}>
                  <ArrowRight className="size-4" aria-hidden="true" />
                  {isCommitting ? "Importing" : "Import Rows"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
