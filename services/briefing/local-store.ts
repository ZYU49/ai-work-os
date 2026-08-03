export const SALES_DESK_BRIEFING_STORAGE_KEY = "salesdesk.briefings.v1";
export const SALES_DESK_BRIEFING_UPDATED_EVENT = "salesdesk:briefing-updated";

export type BriefingKind = "sales" | "midstate" | "warehouse" | "follow-up" | "system";

export type BriefingEvent = {
  id: string;
  kind: BriefingKind;
  title: string;
  message: string;
  createdAt: string;
  href?: string;
};

export type AddBriefingInput = Omit<BriefingEvent, "id"> & {
  id?: string;
};

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function createId(input: AddBriefingInput) {
  return `${input.kind}-${input.createdAt}-${input.title}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function defaultBriefing(now = new Date()): BriefingEvent {
  return {
    id: "system-default-briefing",
    kind: "sales",
    title: "Sales data uploaded",
    message:
      "New Jan-Jul sales data has been uploaded. Sales Analytics and Product YoY are ready to review.",
    createdAt: now.toISOString(),
    href: "/analytics",
  };
}

export function readBriefings(limit = 20) {
  if (!canUseLocalStorage()) {
    return [] as BriefingEvent[];
  }

  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(SALES_DESK_BRIEFING_STORAGE_KEY) ?? "[]",
    ) as BriefingEvent[];

    return parsed
      .filter((event) => event.title && event.message && event.createdAt)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  } catch {
    return [];
  }
}

export function addBriefing(input: AddBriefingInput) {
  const event: BriefingEvent = {
    ...input,
    id: input.id ?? createId(input),
  };

  if (!canUseLocalStorage()) {
    return event;
  }

  const existing = readBriefings(20).filter((item) => item.id !== event.id);
  window.localStorage.setItem(
    SALES_DESK_BRIEFING_STORAGE_KEY,
    JSON.stringify([event, ...existing].slice(0, 20)),
  );
  window.dispatchEvent(new CustomEvent(SALES_DESK_BRIEFING_UPDATED_EVENT));

  return event;
}
