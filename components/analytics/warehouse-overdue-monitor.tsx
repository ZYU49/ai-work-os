"use client";

import { ClipboardCopy, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  analyzeWarehouseOverdueReport,
  type WarehouseOverdueAnalysis,
  type WarehouseOverdueRow,
  type WarehouseOverdueSalesPersonSummary,
} from "@/services/warehouse-overdue/monitor";
import { readWarehouseOverdueFile } from "@/services/warehouse-overdue/file-reader";

function number(value: number) {
  return new Intl.NumberFormat().format(value);
}

function delayTone(days: number) {
  if (days >= 7) return "red";
  if (days >= 4) return "yellow";
  return "neutral";
}

function SummaryMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="min-w-0 rounded-md border border-zinc-100 bg-zinc-50 p-3">
      <p className="text-xs font-medium uppercase tracking-normal text-zinc-500">
        {label}
      </p>
      <p className="mt-1 break-words text-2xl font-semibold leading-8 text-zinc-950">
        {value}
      </p>
      {detail ? <p className="mt-1 text-xs text-zinc-500">{detail}</p> : null}
    </div>
  );
}

function SalesPersonPanel({ person }: { person: WarehouseOverdueSalesPersonSummary }) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>{person.salesPerson}</CardTitle>
          <p className="mt-1 text-sm text-zinc-500">
            {number(person.totalOpenQty)} open qty - {number(person.orderCount)} orders -
            max delay {number(person.maxDelayedDays)} days
          </p>
        </div>
        <Badge tone={person.totalOpenQty > 1000 ? "yellow" : "neutral"}>
          Open Qty {number(person.totalOpenQty)}
        </Badge>
      </CardHeader>
      <CardContent>
        {person.topCustomers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-xs font-medium uppercase tracking-normal text-zinc-500">
                  <th className="py-2 pr-4">Customer</th>
                  <th className="px-4 py-2 text-right">Orders</th>
                  <th className="px-4 py-2 text-right">Open Qty</th>
                  <th className="py-2 pl-4 text-right">Max Delay</th>
                </tr>
              </thead>
              <tbody>
                {person.topCustomers.map((customer) => (
                  <tr
                    key={customer.customer}
                    className="border-b border-zinc-100 last:border-0"
                  >
                    <td className="py-2 pr-4 font-medium text-zinc-950">
                      {customer.customer}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-zinc-700">
                      {number(customer.orderCount)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-zinc-700">
                      {number(customer.totalOpenQty)}
                    </td>
                    <td className="py-2 pl-4 text-right">
                      <Badge tone={delayTone(customer.maxDelayedDays)}>
                        {number(customer.maxDelayedDays)} days
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-zinc-500">
            No overdue orders for this sales person.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function UrgentOrderCard({ row }: { row: WarehouseOverdueRow }) {
  return (
    <div className="rounded-md border border-zinc-200 bg-white p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-950">{row.customer}</p>
          <p className="mt-1 text-sm text-zinc-500">
            SO {row.so} - {row.salesPerson} - {row.warehouse}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge tone={delayTone(row.delayedDays)}>
            {number(row.delayedDays)} days late
          </Badge>
          <Badge tone={row.shrCreated ? "green" : "red"}>
            SHR {row.shrCreated ? "YES" : "NO"}
          </Badge>
        </div>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <SummaryMetric label="Open Qty" value={number(row.totalOpenQty)} />
        <SummaryMetric label="Requested" value={row.requestedDeliveryDate} />
        <SummaryMetric
          label="Reason"
          value={row.lateShipReason ?? "Missing"}
        />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <Card>
      <CardContent className="py-14 text-center">
        <p className="text-sm font-medium text-zinc-950">
          Paste an OA overdue report to start.
        </p>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-zinc-500">
          The monitor will ignore other salespeople and summarize only Allen and
          Bella orders, urgent exceptions, missing SHR, and missing late ship
          reasons.
        </p>
      </CardContent>
    </Card>
  );
}

export function WarehouseOverdueMonitor() {
  const [text, setText] = useState("");
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "loaded" | "failed"
  >("idle");
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">(
    "idle",
  );
  const analysis = useMemo<WarehouseOverdueAnalysis | null>(() => {
    if (!text.trim()) {
      return null;
    }

    return analyzeWarehouseOverdueReport(text);
  }, [text]);

  async function copyFollowUpSummary() {
    if (!analysis) return;

    try {
      await navigator.clipboard.writeText(analysis.followUpSummary);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }
  }

  async function uploadReportFile(file: File | undefined) {
    if (!file) return;

    try {
      const fileText = await readWarehouseOverdueFile(file);
      setText(fileText);
      setUploadStatus("loaded");
      setCopyStatus("idle");
    } catch {
      setUploadStatus("failed");
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(320px,420px)_1fr]">
      <Card className="xl:sticky xl:top-6 xl:self-start">
        <CardHeader>
          <CardTitle>Paste Report</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              id="warehouse-overdue-file"
              aria-label="Upload report file"
              type="file"
              accept=".msg,.txt,.csv,text/plain"
              className="sr-only"
              onChange={(event) => {
                void uploadReportFile(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            <label
              htmlFor="warehouse-overdue-file"
              className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-900 shadow-sm transition-colors hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500"
            >
              <Upload className="h-4 w-4" aria-hidden="true" />
              Upload .msg / text
            </label>
            {uploadStatus === "loaded" ? (
              <Badge tone="green">Loaded</Badge>
            ) : null}
            {uploadStatus === "failed" ? (
              <Badge tone="red">Upload failed</Badge>
            ) : null}
          </div>
          <label
            htmlFor="warehouse-overdue-report"
            className="text-sm font-medium text-zinc-700"
          >
            Paste OA overdue report
          </label>
          <Textarea
            id="warehouse-overdue-report"
            value={text}
            onChange={(event) => {
              setText(event.target.value);
              setUploadStatus("idle");
              setCopyStatus("idle");
            }}
            className="min-h-[360px] font-mono text-xs leading-5"
            placeholder="Paste the OA Warehouse Orders Overdue email body here..."
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={copyFollowUpSummary}
              disabled={!analysis || analysis.rows.length === 0}
            >
              <ClipboardCopy className="h-4 w-4" aria-hidden="true" />
              Copy Follow-up Summary
            </Button>
            {copyStatus === "copied" ? (
              <Badge tone="green">Copied</Badge>
            ) : null}
            {copyStatus === "failed" ? (
              <Badge tone="red">Copy failed</Badge>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="flex min-w-0 flex-col gap-6">
        {analysis ? (
          <>
            <Card>
              <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Today Summary</CardTitle>
                  <p className="mt-1 text-sm text-zinc-500">
                    {analysis.warehouse ?? "Warehouse"} - Latest report{" "}
                    {analysis.reportDate ?? "date unavailable"}
                  </p>
                </div>
                <Badge tone="blue">Allen + Bella only</Badge>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <SummaryMetric
                  label="Open Qty"
                  value={number(analysis.summary.totalOpenQty)}
                />
                <SummaryMetric
                  label="Orders"
                  value={number(analysis.summary.orderCount)}
                />
                <SummaryMetric
                  label="Urgent"
                  value={number(analysis.summary.urgentOrderCount)}
                  detail="Delay >= 7 days or SHR NO"
                />
                <SummaryMetric
                  label="SHR NO"
                  value={number(analysis.summary.noShrCount)}
                />
                <SummaryMetric
                  label="Missing Reason"
                  value={number(analysis.summary.missingReasonCount)}
                />
              </CardContent>
            </Card>

            <div className="grid gap-6 xl:grid-cols-2">
              {analysis.bySalesPerson.map((person) => (
                <SalesPersonPanel key={person.salesPerson} person={person} />
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Needs Attention</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  aria-label="Needs attention"
                  className="grid gap-3"
                >
                  {analysis.urgentOrders.length > 0 ? (
                    analysis.urgentOrders.map((row) => (
                      <UrgentOrderCard key={row.so} row={row} />
                    ))
                  ) : (
                    <p className="py-8 text-center text-sm text-zinc-500">
                      No urgent Allen/Bella orders found.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Follow-up Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="whitespace-pre-wrap rounded-md bg-zinc-50 p-3 text-sm leading-6 text-zinc-700">
                  {analysis.followUpSummary}
                </pre>
              </CardContent>
            </Card>
          </>
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}
