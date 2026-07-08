import Link from "next/link";

type AnalyticsSection = "sales" | "midstate";

const sections: Array<{
  id: AnalyticsSection;
  label: string;
  href: string;
}> = [
  { id: "sales", label: "Sales Analytics", href: "/analytics" },
  {
    id: "midstate",
    label: "Midstate Member Analytics",
    href: "/analytics/midstate",
  },
];

export function AnalyticsSectionSwitcher({
  current,
}: {
  current: AnalyticsSection;
}) {
  return (
    <nav
      aria-label="Analytics sections"
      className="inline-flex w-full gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1 sm:w-auto"
    >
      {sections.map((section) => {
        const isCurrent = section.id === current;

        return (
          <Link
            key={section.id}
            href={section.href}
            aria-current={isCurrent ? "page" : undefined}
            className={`flex h-9 flex-1 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors sm:flex-none ${
              isCurrent
                ? "bg-white text-zinc-950 shadow-sm"
                : "text-zinc-600 hover:bg-white hover:text-zinc-950"
            }`}
          >
            {section.label}
          </Link>
        );
      })}
    </nav>
  );
}
