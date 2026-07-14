import { listMidstateItemMaster } from "@/services/midstate/item-master";

export const dynamic = "force-dynamic";

function includes(value: string | number | null, query: string) {
  return String(value ?? "").toLowerCase().includes(query);
}

export function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const query = (searchParams.get("q") ?? "").trim().toLowerCase();
  const itemGroup = (searchParams.get("itemGroup") ?? "").trim();
  const allItems = listMidstateItemMaster();

  const filteredItems = allItems.filter((item) => {
    if (itemGroup && item.itemGroup !== itemGroup) {
      return false;
    }

    if (!query) {
      return true;
    }

    return [
      item.itemNumber,
      item.description,
      item.itemGroup,
      item.size,
      item.brand,
    ].some((value) => includes(value, query));
  });

  const itemGroups = [
    ...new Set(
      allItems
        .map((item) => item.itemGroup)
        .filter((value): value is string => Boolean(value)),
    ),
  ].sort((a, b) => a.localeCompare(b));

  return Response.json({
    items: filteredItems,
    itemGroups,
    total: allItems.length,
  });
}
