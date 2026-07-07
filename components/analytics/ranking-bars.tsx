"use client";

type RankingItem = {
  name: string;
  quantity: number;
  revenue: number;
};

export function RankingBars({ data }: { data: RankingItem[] }) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-zinc-500">No ranking data yet.</p>;
  }

  const max = Math.max(...data.map((item) => item.quantity), 1);

  return (
    <div className="flex flex-col gap-3">
      {data.slice(0, 10).map((item) => (
        <div key={item.name} className="min-w-0">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="truncate font-medium text-zinc-800">
              {item.name}
            </span>
            <span className="shrink-0 text-zinc-500">
              {item.quantity.toLocaleString()}
            </span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-zinc-100">
            <div
              className="h-2 rounded-full bg-zinc-900"
              style={{ width: `${Math.max((item.quantity / max) * 100, 2)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
