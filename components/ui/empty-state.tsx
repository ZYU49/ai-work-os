import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: {
    label: string;
    onClick?: () => void;
  };
  className?: string;
};

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex min-h-64 flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-white px-6 py-10 text-center",
        className,
      )}
    >
      {icon ? <div className="mb-3 text-zinc-400">{icon}</div> : null}
      <h2 className="text-sm font-semibold text-zinc-950">{title}</h2>
      {description ? (
        <p className="mt-1 max-w-sm text-sm leading-6 text-zinc-500">
          {description}
        </p>
      ) : null}
      {action ? (
        <Button className="mt-4" onClick={action.onClick}>
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}
