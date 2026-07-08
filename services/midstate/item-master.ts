import { MIDSTATE_ITEM_MASTER } from "@/services/midstate/item-master.generated";

export type MidstateItemMetadata = {
  description: string | null;
  itemGroup: string | null;
  category: string | null;
};

function broadCategoryFromItemGroup(itemGroup: string | null) {
  const normalized = itemGroup?.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  if (
    normalized.includes("l&g") ||
    normalized.includes("golf") ||
    normalized.includes("tube") ||
    normalized.includes("atv") ||
    normalized.includes("wheelbarrow") ||
    normalized.includes("wheel barrow") ||
    normalized.includes("tool wheelbarrow")
  ) {
    return "Lawn & Garden";
  }

  if (
    normalized.includes("std") ||
    normalized.includes("bias") ||
    normalized.includes("bt assembly") ||
    normalized.includes("boat trailer") ||
    normalized.includes("mobile home")
  ) {
    return "ST Bias";
  }

  if (
    normalized.includes("str") ||
    normalized.includes("radial") ||
    normalized.includes("tbr")
  ) {
    return "ST Radial";
  }

  return null;
}

export function getMidstateItemMetadata(
  itemNumber: string,
): MidstateItemMetadata | null {
  const key = itemNumber.trim().toUpperCase();
  const entry = MIDSTATE_ITEM_MASTER[
    key as keyof typeof MIDSTATE_ITEM_MASTER
  ];

  if (!entry) {
    return null;
  }

  return {
    description: entry.description,
    itemGroup: entry.itemGroup,
    category: broadCategoryFromItemGroup(entry.itemGroup),
  };
}
