"use client";

import { Button } from "@/components/ui/button";

export type SalesDashboardFilters = {
  year: string;
  startMonth: string;
  endMonth: string;
  salesperson: string;
  customerName: string;
  category: string;
  sku: string;
  shipToState: string;
  memberName: string;
};

export type SalesFilterOptions = {
  years: string[];
  salespeople: string[];
  customers: string[];
  categories: string[];
  skus: string[];
  states: string[];
  members: string[];
};

const monthOptions = [
  { value: "1", label: "Jan" },
  { value: "2", label: "Feb" },
  { value: "3", label: "Mar" },
  { value: "4", label: "Apr" },
  { value: "5", label: "May" },
  { value: "6", label: "Jun" },
  { value: "7", label: "Jul" },
  { value: "8", label: "Aug" },
  { value: "9", label: "Sep" },
  { value: "10", label: "Oct" },
  { value: "11", label: "Nov" },
  { value: "12", label: "Dec" },
] as const;

function SelectFilter({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<string | { value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-xs font-medium text-zinc-600">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm font-normal text-zinc-950 outline-none focus:border-zinc-400"
      >
        <option value="">All</option>
        {options.map((option) => (
          <option
            key={typeof option === "string" ? option : option.value}
            value={typeof option === "string" ? option : option.value}
          >
            {typeof option === "string" ? option : option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function SalesFilters({
  filters,
  options,
  onChange,
  onReset,
}: {
  filters: SalesDashboardFilters;
  options: SalesFilterOptions;
  onChange: (filters: SalesDashboardFilters) => void;
  onReset: () => void;
}) {
  function setFilter(key: keyof SalesDashboardFilters, value: string) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <div className="grid gap-3 rounded-md border border-zinc-200 bg-white p-3 sm:grid-cols-2 lg:grid-cols-4">
      <SelectFilter
        label="Year"
        value={filters.year}
        options={options.years}
        onChange={(value) => setFilter("year", value)}
      />
      <SelectFilter
        label="Start Month"
        value={filters.startMonth}
        options={monthOptions}
        onChange={(value) => setFilter("startMonth", value)}
      />
      <SelectFilter
        label="End Month"
        value={filters.endMonth}
        options={monthOptions}
        onChange={(value) => setFilter("endMonth", value)}
      />
      <SelectFilter
        label="Salesperson"
        value={filters.salesperson}
        options={options.salespeople}
        onChange={(value) => setFilter("salesperson", value)}
      />
      <SelectFilter
        label="Customer"
        value={filters.customerName}
        options={options.customers}
        onChange={(value) => setFilter("customerName", value)}
      />
      <SelectFilter
        label="Category"
        value={filters.category}
        options={options.categories}
        onChange={(value) => setFilter("category", value)}
      />
      <SelectFilter
        label="SKU"
        value={filters.sku}
        options={options.skus}
        onChange={(value) => setFilter("sku", value)}
      />
      <SelectFilter
        label="State"
        value={filters.shipToState}
        options={options.states}
        onChange={(value) => setFilter("shipToState", value)}
      />
      <SelectFilter
        label="Member"
        value={filters.memberName}
        options={options.members}
        onChange={(value) => setFilter("memberName", value)}
      />
      <div className="flex items-end">
        <Button type="button" variant="secondary" onClick={onReset}>
          Reset
        </Button>
      </div>
    </div>
  );
}
