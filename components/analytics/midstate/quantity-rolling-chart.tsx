"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type QuantityChartMode = "line" | "bar";

type QuantityPoint = {
  month: string;
  quantity: number;
};

function quantity(value: number) {
  return new Intl.NumberFormat().format(value);
}

export function QuantityRollingChart({
  data,
  mode,
  emptyState,
}: {
  data: QuantityPoint[];
  mode: QuantityChartMode;
  emptyState: string;
}) {
  if (data.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-zinc-500">{emptyState}</p>
    );
  }

  return (
    <div className="h-72 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 4, right: 8, left: -12, bottom: 0 }}
        >
          <CartesianGrid stroke="#e4e4e7" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} />
          <YAxis
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value: number) => quantity(value)}
          />
          <Tooltip
            formatter={(value) => [`${quantity(Number(value ?? 0))} qty`, "Quantity"]}
          />
          {mode === "bar" ? (
            <Bar dataKey="quantity" fill="#18181b" name="Quantity" />
          ) : (
            <Line
              type="monotone"
              dataKey="quantity"
              stroke="#18181b"
              strokeWidth={2}
              dot={{ r: 3 }}
              name="Quantity"
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
