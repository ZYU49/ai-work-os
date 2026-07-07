"use client";

type DetailRow = Record<string, string | number | null>;

function number(value: number) {
  return new Intl.NumberFormat().format(value);
}

function money(value: number) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatValue(key: string, value: string | number | null) {
  if (value === null || value === "") {
    return "N/A";
  }

  if (typeof value === "number") {
    return key.toLowerCase().includes("cost") ? money(value) : number(value);
  }

  return value;
}

export function MidstateDetailTable({
  columns,
  rows,
}: {
  columns: Array<{ key: string; label: string; align?: "left" | "right" }>;
  rows: DetailRow[];
}) {
  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-zinc-500">
        No detail rows yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-zinc-200 text-sm">
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={
                  column.align === "right"
                    ? "whitespace-nowrap px-3 py-2 text-right font-medium text-zinc-600"
                    : "whitespace-nowrap px-3 py-2 text-left font-medium text-zinc-600"
                }
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {rows.slice(0, 25).map((row, index) => (
            <tr key={`${row.memberNumber ?? row.sku ?? index}`}>
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={
                    column.align === "right"
                      ? "whitespace-nowrap px-3 py-2 text-right text-zinc-700"
                      : "max-w-72 whitespace-nowrap px-3 py-2 text-zinc-700"
                  }
                >
                  <span className="block truncate">
                    {formatValue(column.key, row[column.key])}
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
