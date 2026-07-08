import { MIDSTATE_ITEM_MASTER } from "@/services/midstate/item-master.generated";

export type MidstateItemMetadata = {
  description: string | null;
  itemGroup: string | null;
  category: string | null;
};

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
    category: entry.itemGroup,
  };
}
