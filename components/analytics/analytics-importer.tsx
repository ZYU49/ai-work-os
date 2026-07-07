"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { ArrowRight, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  salesFieldDefinitions,
  validateSalesMapping,
  type SalesFieldKey,
  type SalesFieldMapping,
} from "@/services/analytics/fields";

type ImportPreview = {
  importId: string;
  fileName: string;
  sheetName: string;
  headers: string[];
  previewRows: Record<string, unknown>[];
  totalRows: number;
};

type ImportSummary = {
  totalRows: number;
  importedRows: number;
  rejectedRows: number;
};

const autoMap: Partial<Record<SalesFieldKey, string[]>> = {
  orderDate: ["Invoice Date", "Date", "Order Date"],
  customerName: ["Customer Name", "Customer"],
  sku: ["Item", "SKU", "Product"],
  productName: ["Description", "Product Name"],
  category: ["Item Group", "Category"],
  salesperson: ["Sales Person", "Salesperson"],
  quantity: ["Quantity", "Qty"],
  revenue: ["Total Sales", "Amount", "Revenue", "Sales"],
  shipToState: ["Ship-To State", "State"],
  shipToCity: ["Ship-To City", "City"],
};

function initialMapping(headers: string[]): SalesFieldMapping {
  return Object.fromEntries(
    Object.entries(autoMap).flatMap(([field, candidates]) => {
      const match = candidates.find((candidate) => headers.includes(candidate));
      return match ? [[field, match]] : [];
    }),
  ) as SalesFieldMapping;
}

async function readJson(response: Response) {
  return (await response.json().catch(() => ({}))) as {
    error?: string;
    import?: ImportPreview;
    summary?: ImportSummary;
    details?: unknown;
  };
}

function formatCellValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (typeof value === "number") {
    return value.toLocaleString();
  }

  return String(value);
}

export function AnalyticsImporter() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [mapping, setMapping] = useState<SalesFieldMapping>({});
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
    setPreview(null);
    setMapping({});
    setSummary(null);
    setError(null);
  }

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      setError("Choose a file to upload.");
      return;
    }

    setIsUploading(true);
    setError(null);
    setSummary(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/analytics/imports", {
        method: "POST",
        body: formData,
      });
      const data = await readJson(response);

      if (!response.ok || !data.import) {
        throw new Error(data.error ?? "Unable to upload sales file.");
      }

      setPreview(data.import);
      setMapping(initialMapping(data.import.headers));
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Unable to upload sales file.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  async function commit() {
    if (!preview) {
      return;
    }

    const mappingResult = validateSalesMapping(mapping);
    if (!mappingResult.ok) {
      setError(mappingResult.errors[0] ?? "Sales field mapping is invalid.");
      return;
    }

    setIsCommitting(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/analytics/imports/${preview.importId}/commit`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mapping }),
        },
      );
      const data = await readJson(response);

      if (!response.ok || !data.summary) {
        throw new Error(data.error ?? "Unable to import sales rows.");
      }

      setSummary(data.summary);
    } catch (commitError) {
      setError(
        commitError instanceof Error
          ? commitError.message
          : "Unable to import sales rows.",
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
              Sales data file
              <Input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={chooseFile}
                className="cursor-pointer px-2 py-1 file:mr-3 file:rounded-md file:border-0 file:bg-zinc-950 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-zinc-800"
              />
            </label>
            <p className="text-xs leading-5 text-zinc-500">
              Upload Excel or CSV sales detail, map your columns, and refresh
              the sales dashboard.
            </p>
            <Button type="submit" disabled={!file || isUploading}>
              <UploadCloud className="size-4" aria-hidden="true" />
              {isUploading ? "Uploading" : "Upload Sales File"}
            </Button>
          </form>

          {preview ? (
            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
              <p className="font-medium text-zinc-950">{preview.fileName}</p>
              <p className="mt-1">
                {preview.sheetName} · {preview.totalRows.toLocaleString()} rows
              </p>
            </div>
          ) : null}

          {summary ? (
            <div
              role="status"
              className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-800"
            >
              Imported {summary.importedRows.toLocaleString()} of{" "}
              {summary.totalRows.toLocaleString()} rows. Rejected{" "}
              {summary.rejectedRows.toLocaleString()}.
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
          <CardTitle>Field Mapping</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {!preview ? (
            <p className="text-sm text-zinc-500">Upload a file to map fields.</p>
          ) : (
            <>
              <div className="flex flex-col gap-1">
                <p className="text-sm text-zinc-500">
                  {preview.fileName} · {preview.sheetName} ·{" "}
                  {preview.totalRows.toLocaleString()} rows
                </p>
                <p className="text-xs leading-5 text-zinc-500">
                  Required fields should be mapped before importing. Suggested
                  matches are preselected when column names line up.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {(Object.keys(salesFieldDefinitions) as SalesFieldKey[]).map(
                  (field) => (
                    <label
                      key={field}
                      className="flex flex-col gap-1 text-sm font-medium text-zinc-700"
                    >
                      {salesFieldDefinitions[field].label}
                      {salesFieldDefinitions[field].required ? " *" : ""}
                      <select
                        value={mapping[field] ?? ""}
                        onChange={(event) =>
                          setMapping((current) => ({
                            ...current,
                            [field]: event.target.value || undefined,
                          }))
                        }
                        className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm font-normal text-zinc-950 shadow-sm outline-none transition-colors focus:border-zinc-400 focus:ring-4 focus:ring-zinc-200/70"
                      >
                        <option value="">Unmapped</option>
                        {preview.headers.map((header) => (
                          <option key={header} value={header}>
                            {header}
                          </option>
                        ))}
                      </select>
                    </label>
                  ),
                )}
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
                        {preview.headers.map((header) => (
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
                      {preview.previewRows.map((row, rowIndex) => (
                        <tr key={`${preview.importId}-${rowIndex}`}>
                          {preview.headers.map((header) => (
                            <td
                              key={`${rowIndex}-${header}`}
                              className="whitespace-nowrap px-3 py-2 text-zinc-700"
                            >
                              {formatCellValue(row[header])}
                            </td>
                          ))}
                        </tr>
                      ))}
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
