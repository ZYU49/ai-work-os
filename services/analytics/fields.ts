export const salesFieldDefinitions = {
  orderDate: { label: "Date", required: true },
  customerName: { label: "Customer", required: true },
  sku: { label: "SKU / Item", required: true },
  quantity: { label: "Quantity", required: true },
  revenue: { label: "Revenue", required: true },
  invoiceNumber: { label: "Invoice #", required: false },
  customerCode: { label: "Customer Code", required: false },
  customerPo: { label: "Customer PO #", required: false },
  productName: { label: "Product Name", required: false },
  category: { label: "Category", required: false },
  salesperson: { label: "Salesperson", required: false },
  shipToState: { label: "Ship-To State", required: false },
  shipToCity: { label: "Ship-To City", required: false },
  warehouse: { label: "Warehouse", required: false },
  shipmentNumber: { label: "Shipment # / SHR #", required: false },
  shipToCode: { label: "Ship-To Code", required: false },
  memberName: { label: "Member", required: false },
} as const;

export type SalesFieldKey = keyof typeof salesFieldDefinitions;
export type SalesFieldMapping = Partial<Record<SalesFieldKey, string>>;

export const requiredSalesFields = Object.entries(salesFieldDefinitions)
  .filter(([, definition]) => definition.required)
  .map(([field]) => field) as SalesFieldKey[];

export const optionalSalesFields = Object.entries(salesFieldDefinitions)
  .filter(([, definition]) => !definition.required)
  .map(([field]) => field) as SalesFieldKey[];

function requiredFieldError(field: SalesFieldKey) {
  if (field === "sku") {
    return "SKU is required.";
  }

  return `${salesFieldDefinitions[field].label} is required.`;
}

export function validateSalesMapping(mapping: SalesFieldMapping) {
  const errors: string[] = [];

  for (const field of requiredSalesFields) {
    if (!mapping[field]?.trim()) {
      errors.push(requiredFieldError(field));
    }
  }

  const sourceCounts = new Map<string, number>();
  for (const source of Object.values(mapping)) {
    if (!source?.trim()) {
      continue;
    }

    const normalizedSource = source.trim();
    sourceCounts.set(
      normalizedSource,
      (sourceCounts.get(normalizedSource) ?? 0) + 1,
    );
  }

  for (const [source, count] of sourceCounts.entries()) {
    if (count > 1) {
      errors.push(`Source column ${source} is mapped more than once.`);
    }
  }

  return errors.length > 0
    ? { ok: false as const, errors }
    : { ok: true as const };
}
