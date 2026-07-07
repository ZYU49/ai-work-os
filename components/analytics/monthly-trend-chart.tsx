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

type MonthlyPoint = {
  month: string;
  quantity: number;
  revenue: number;
};

function money(value: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function MonthlyTrendChart({ data }: { data: MonthlyPoint[] }) {
  if (data.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-zinc-500">
        No monthly sales data yet.
      </p>
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
            yAxisId="left"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value: number) => money(value)}
          />
          <Tooltip
            formatter={(value, name) =>
              name === "Revenue"
                ? money(Number(value ?? 0))
                : Number(value ?? 0).toLocaleString()
            }
          />
          <Bar yAxisId="right" dataKey="revenue" fill="#71717a" name="Revenue" />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="quantity"
            stroke="#18181b"
            strokeWidth={2}
            dot={false}
            name="Quantity"
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
