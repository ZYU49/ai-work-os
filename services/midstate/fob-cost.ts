import { MIDSTATE_FOB_COSTS } from "@/services/midstate/fob-cost.generated";

export type MidstateFobCost = {
  itemNumber: string;
  sourceSheet: string;
  midstatesSku: string | null;
  size: string | null;
  currentFob: number | null;
  increase: number | null;
  effectiveFob: number | null;
  effectiveDate: string;
  containerQty40: number | null;
  containerQty20: number | null;
};

export function getMidstateFobCost(itemNumber: string): MidstateFobCost | null {
  const key = itemNumber.trim().toUpperCase();
  const entry = MIDSTATE_FOB_COSTS[key as keyof typeof MIDSTATE_FOB_COSTS];

  if (!entry) {
    return null;
  }

  return {
    itemNumber: key,
    sourceSheet: entry.sourceSheet,
    midstatesSku: entry.midstatesSku,
    size: entry.size,
    currentFob: entry.currentFob,
    increase: entry.increase,
    effectiveFob: entry.effectiveFob,
    effectiveDate: entry.effectiveDate,
    containerQty40: entry.containerQty40,
    containerQty20: entry.containerQty20,
  };
}

export function listMidstateFobCosts(): MidstateFobCost[] {
  return Object.keys(MIDSTATE_FOB_COSTS).map((itemNumber) => {
    const cost = getMidstateFobCost(itemNumber);

    if (!cost) {
      throw new Error(`Missing FOB cost for ${itemNumber}`);
    }

    return cost;
  });
}
