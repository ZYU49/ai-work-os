"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type YoYComparisonPoint = {
  monthLabel: string;
  currentYear: number;
  priorYear: number;
  currentQuantity: number;
  priorQuantity: number | null;
  quantityGrowth: number | null;
};

type TooltipPayload = {
  name?: string | number;
  value?: string | number;
  payload?: YoYComparisonPoint;
};

const currentYearColor = "#18181b";
const priorYearColor = "#2563eb";

function number(value: number) {
  return new Intl.NumberFormat().format(value);
}

function percent(value: number | null | undefined) {
  return value == null
    ? "N/A"
    : new Intl.NumberFormat(undefined, {
        style: "percent",
        maximumFractionDigits: 1,
      }).format(value);
}

function YoYTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string | number;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  const point = payload[0]?.payload;
  if (!point) {
    return null;
  }

  return (
    <div className="rounded-md border border-zinc-200 bg-white p-3 text-xs shadow-sm">
      <p className="mb-2 font-medium text-zinc-950">{label}</p>
      <div className="space-y-1 text-zinc-600">
        <p>
          {point.currentYear}: {number(point.currentQuantity)}
        </p>
        <p>
          {point.priorYear}:{" "}
          {point.priorQuantity === null ? "N/A" : number(point.priorQuantity)}
        </p>
        <p>YoY: {percent(point.quantityGrowth)}</p>
      </div>
    </div>
  );
}

export function YoYComparisonChart({ data }: { data: YoYComparisonPoint[] }) {
  if (data.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-zinc-500">
        No YoY comparison data yet.
      </p>
    );
  }

  const currentYear = data[0]?.currentYear;
  const priorYear = data[0]?.priorYear;

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap gap-4 text-xs font-medium text-zinc-600">
        <span className="inline-flex items-center gap-2">
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: currentYearColor }}
          />
          {currentYear} Qty
        </span>
        <span className="inline-flex items-center gap-2">
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: priorYearColor }}
          />
          {priorYear} Qty
        </span>
      </div>
      <div className="h-72 w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 4, right: 8, left: -12, bottom: 0 }}
          >
            <CartesianGrid stroke="#e4e4e7" vertical={false} />
            <XAxis dataKey="monthLabel" tick={{ fontSize: 12 }} tickLine={false} />
            <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
            <Tooltip content={<YoYTooltip />} />
            <Bar
              dataKey="currentQuantity"
              fill={currentYearColor}
              name={`${currentYear} Qty`}
              radius={[3, 3, 0, 0]}
            />
            <Bar
              dataKey="priorQuantity"
              fill={priorYearColor}
              name={`${priorYear} Qty`}
              radius={[3, 3, 0, 0]}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
