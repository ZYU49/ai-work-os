"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type OrderClassPoint = {
  month: string;
  Warehouse: number;
  Direct: number;
  Other: number;
};

export function OrderClassChart({ data }: { data: OrderClassPoint[] }) {
  if (data.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-zinc-500">
        No order class data yet.
      </p>
    );
  }

  return (
    <div className="h-72 w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid stroke="#e4e4e7" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} tickLine={false} />
          <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
          <Tooltip
            formatter={(value) => Number(value ?? 0).toLocaleString()}
          />
          <Legend />
          <Bar dataKey="Warehouse" stackId="quantity" fill="#18181b" />
          <Bar dataKey="Direct" stackId="quantity" fill="#2563eb" />
          <Bar dataKey="Other" stackId="quantity" fill="#a1a1aa" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
