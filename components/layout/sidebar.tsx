"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  CalendarDays,
  CheckSquare,
  FileText,
  FolderKanban,
  Inbox,
  LayoutDashboard,
  Search,
  Settings,
  StickyNote,
  UploadCloud,
} from "lucide-react";
import { cn } from "@/lib/cn";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Projects", href: "/projects", icon: FolderKanban },
  { label: "Mail", href: "/mail", icon: Inbox },
  { label: "Files", href: "/files", icon: FileText },
  { label: "Notes", href: "/notes", icon: StickyNote },
  { label: "Tasks", href: "/tasks", icon: CheckSquare },
  { label: "Daily Log", href: "/daily-log", icon: CalendarDays },
  { label: "Search", href: "/search", icon: Search },
  { label: "Sales Import", href: "/analytics/import", icon: UploadCloud },
  { label: "Agent", href: "/agent", icon: Bot },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex border-b border-zinc-200 bg-white md:min-h-screen md:w-64 md:flex-col md:border-b-0 md:border-r">
      <div className="flex h-14 shrink-0 items-center gap-3 border-r border-zinc-200 px-4 md:h-16 md:border-r-0 md:border-b">
        <div className="flex size-8 items-center justify-center rounded-md bg-zinc-950 text-sm font-semibold text-white">
          AI
        </div>
        <div className="hidden min-w-0 md:block">
          <p className="truncate text-sm font-semibold text-zinc-950">
            AI Work OS
          </p>
          <p className="truncate text-xs text-zinc-500">MVP workspace</p>
        </div>
      </div>

      <nav
        aria-label="Primary"
        className="flex flex-1 gap-1 overflow-x-auto p-2 md:flex-col md:overflow-x-visible"
      >
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex h-9 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950 md:w-full",
                isActive && "bg-zinc-100 text-zinc-950",
              )}
            >
              <Icon className="size-4" aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
