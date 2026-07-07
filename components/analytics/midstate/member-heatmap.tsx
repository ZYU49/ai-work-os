"use client";

type MemberHeatmapRow = {
  memberNumber: string;
  memberName: string;
  months: Record<string, number>;
};

function number(value: number) {
  return new Intl.NumberFormat().format(value);
}

export function MemberHeatmap({ data }: { data: MemberHeatmapRow[] }) {
  if (data.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-zinc-500">
        No member heatmap data yet.
      </p>
    );
  }

  const months = [...new Set(data.flatMap((row) => Object.keys(row.months)))].sort();
  const max = Math.max(
    ...data.flatMap((row) => months.map((month) => row.months[month] ?? 0)),
    1,
  );

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-zinc-200 text-sm">
        <thead>
          <tr>
            <th className="whitespace-nowrap px-3 py-2 text-left font-medium text-zinc-600">
              Member
            </th>
            {months.map((month) => (
              <th
                key={month}
                className="whitespace-nowrap px-3 py-2 text-right font-medium text-zinc-600"
              >
                {month}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {data.slice(0, 12).map((row) => (
            <tr key={row.memberNumber}>
              <td className="max-w-64 whitespace-nowrap px-3 py-2 font-medium text-zinc-800">
                <span className="block truncate">{row.memberName}</span>
                <span className="text-xs font-normal text-zinc-500">
                  {row.memberNumber}
                </span>
              </td>
              {months.map((month) => {
                const value = row.months[month] ?? 0;
                const opacity = Math.max(value / max, 0.08);

                return (
                  <td key={month} className="px-3 py-2 text-right">
                    <span
                      className="inline-flex min-w-16 justify-end rounded px-2 py-1 font-medium text-zinc-950"
                      style={{
                        backgroundColor: `rgba(37, 99, 235, ${opacity})`,
                      }}
                    >
                      {number(value)}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
