import { Card, CardContent } from "@/components/ui/card";

export function KpiCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase tracking-normal text-zinc-500">
          {label}
        </p>
        <p className="mt-2 text-2xl font-semibold text-zinc-950">{value}</p>
        {detail ? <p className="mt-1 text-xs text-zinc-500">{detail}</p> : null}
      </CardContent>
    </Card>
  );
}
