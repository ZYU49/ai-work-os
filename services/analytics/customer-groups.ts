const ffhTvGroup = {
  name: "Family Farm & Home / TV",
  customers: ["FAMILY FARM & HOME, INC.", "TV HARDWARE DISTRIBUTION LLC"],
};

// Analytical grouping only: retain the invoiced customer on every source record.
export function analyticsCustomerName(customerName: string): string {
  return ffhTvGroup.customers.includes(customerName) || customerName === ffhTvGroup.name
    ? ffhTvGroup.name
    : customerName;
}

export function analyticsCustomerFilter(customerName: string): string | { in: string[] } {
  return analyticsCustomerName(customerName) === ffhTvGroup.name
    ? { in: [...ffhTvGroup.customers] }
    : customerName;
}
