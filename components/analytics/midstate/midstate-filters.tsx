"use client";

import { Button } from "@/components/ui/button";

export type MidstateDashboardFilters = {
  year: string;
  startMonth: string;
  endMonth: string;
  memberNumber: string;
  sku: string;
  category: string;
  orderClass: string;
};

export type MidstateFilterOptions = {
  years: string[];
  members: Array<{ value: string; label: string }>;
  skus: string[];
  categories: string[];
  orderClasses: string[];
};

const monthOptions = [
  ["1", "Jan"],
  ["2", "Feb"],
  ["3", "Mar"],
  ["4", "Apr"],
  ["5", "May"],
  ["6", "Jun"],
  ["7", "Jul"],
  ["8", "Aug"],
  ["9", "Sep"],
  ["10", "Oct"],
  ["11", "Nov"],
  ["12", "Dec"],
] as const;

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
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <SelectField
          label="Year"
          value={filters.year}
          onChange={(value) => update("year", value)}
        >
          {options.years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Start"
          value={filters.startMonth}
          onChange={(value) => update("startMonth", value)}
        >
          <option value="">Jan</option>
          {monthOptions.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="End"
          value={filters.endMonth}
          onChange={(value) => update("endMonth", value)}
        >
          <option value="">Dec</option>
          {monthOptions.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </SelectField>
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
        <SelectField
          label="SKU"
          value={filters.sku}
          onChange={(value) => update("sku", value)}
        >
          <option value="">All SKUs</option>
          {options.skus.map((sku) => (
            <option key={sku} value={sku}>
              {sku}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Category"
          value={filters.category}
          onChange={(value) => update("category", value)}
        >
          <option value="">All categories</option>
          {options.categories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Order Class"
          value={filters.orderClass}
          onChange={(value) => update("orderClass", value)}
        >
          <option value="">All classes</option>
          {options.orderClasses.map((orderClass) => (
            <option key={orderClass} value={orderClass}>
              {orderClass}
            </option>
          ))}
        </SelectField>
      </div>
      <div className="mt-3 flex justify-end">
        <Button variant="secondary" onClick={onReset}>
          Reset Filters
        </Button>
      </div>
    </div>
  );
}
