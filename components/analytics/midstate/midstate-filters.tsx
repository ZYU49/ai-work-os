"use client";

import { Button } from "@/components/ui/button";

export type MidstateDashboardFilters = {
  memberNumber: string;
};

export type MidstateFilterOptions = {
  members: Array<{ value: string; label: string }>;
};

function SelectField({
  label,
  value,
  children,
  onChange,
}: {
  label: string;
  value: string;
  children: React.ReactNode;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-sm font-medium text-zinc-700">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm font-normal text-zinc-950 shadow-sm outline-none transition-colors focus:border-zinc-400 focus:ring-4 focus:ring-zinc-200/70"
      >
        {children}
      </select>
    </label>
  );
}

export function MidstateFilters({
  filters,
  options,
  onChange,
  onReset,
}: {
  filters: MidstateDashboardFilters;
  options: MidstateFilterOptions;
  onChange: (filters: MidstateDashboardFilters) => void;
  onReset: () => void;
}) {
  function update(key: keyof MidstateDashboardFilters, value: string) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <SelectField
          label="Member"
          value={filters.memberNumber}
          onChange={(value) => update("memberNumber", value)}
        >
          <option value="">All members</option>
          {options.members.map((member) => (
            <option key={member.value} value={member.value}>
              {member.label}
            </option>
          ))}
        </SelectField>
        <Button variant="secondary" onClick={onReset}>
          Reset Filters
        </Button>
      </div>
    </div>
  );
}
