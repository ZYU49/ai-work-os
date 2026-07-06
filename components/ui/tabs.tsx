import type { ButtonHTMLAttributes, HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type TabsProps = HTMLAttributes<HTMLDivElement>;

type TabsTriggerProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
};

type TabsPanelProps = HTMLAttributes<HTMLDivElement> & {
  active?: boolean;
};

export function Tabs({ className, ...props }: TabsProps) {
  return <div className={cn("w-full", className)} {...props} />;
}

export function TabsList({ className, ...props }: TabsProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-zinc-50 p-1",
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({
  active = false,
  className,
  type = "button",
  ...props
}: TabsTriggerProps) {
  return (
    <button
      type={type}
      className={cn(
        "h-7 rounded px-2.5 text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-500",
        active && "bg-white text-zinc-950 shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

export function TabsPanel({
  active = true,
  className,
  ...props
}: TabsPanelProps) {
  return (
    <div
      hidden={!active}
      className={cn("mt-4", className)}
      {...props}
    />
  );
}
