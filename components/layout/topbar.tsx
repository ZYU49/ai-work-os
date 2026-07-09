import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function Topbar() {
  return (
    <header className="sticky top-0 z-10 flex min-h-16 items-center justify-between gap-4 border-b border-zinc-200 bg-white/95 px-4 backdrop-blur md:px-6">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-zinc-950">Workspace</p>
        <p className="truncate text-xs text-zinc-500">
          Sales, customers, files, notes, and follow-up work
        </p>
      </div>

      <label className="relative hidden w-full max-w-md sm:block">
        <span className="sr-only">Quick search</span>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400"
          aria-hidden="true"
        />
        <Input
          className="pl-9"
          placeholder="Search workspace..."
          aria-label="Quick search"
        />
      </label>
    </header>
  );
}
