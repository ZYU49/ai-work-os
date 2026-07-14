import { MIDSTATE_ITEM_MASTER } from "@/services/midstate/item-master.generated";

export type MidstateItemMetadata = {
  description: string | null;
  size: string | null;
  brand: string | null;
  itemGroup: string | null;
  category: string | null;
  status: string | null;
  uom: string | null;
  upc: string | null;
  length: number | null;
  width: number | null;
  height: number | null;
  weight: number | null;
  containerLoadQty: number | null;
  truckLoadQty: number | null;
  tariffCode: string | null;
  treadDepth: number | null;
  loadIndex: string | null;
  speedRating: string | null;
  od: number | null;
  sw: number | null;
  maxLoading: number | null;
  psi: number | null;
  utqg: string | null;
};

export type MidstateItemMasterRecord = MidstateItemMetadata & {
  itemNumber: string;
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
    size: entry.size,
    brand: entry.brand,
    itemGroup: entry.itemGroup,
    category: entry.itemGroup,
    status: entry.status,
    uom: entry.uom,
    upc: entry.upc,
    length: entry.length,
    width: entry.width,
    height: entry.height,
    weight: entry.weight,
    containerLoadQty: entry.containerLoadQty,
    truckLoadQty: entry.truckLoadQty,
    tariffCode: entry.tariffCode,
    treadDepth: entry.treadDepth,
    loadIndex: entry.loadIndex,
    speedRating: entry.speedRating,
    od: entry.od,
    sw: entry.sw,
    maxLoading: entry.maxLoading,
    psi: entry.psi,
    utqg: entry.utqg,
  };
}

export function listMidstateItemMaster(): MidstateItemMasterRecord[] {
  return Object.entries(MIDSTATE_ITEM_MASTER)
    .map(([itemNumber]) => ({
      itemNumber,
      ...getMidstateItemMetadata(itemNumber),
    }))
    .filter((entry): entry is MidstateItemMasterRecord => entry.description !== null);
}
