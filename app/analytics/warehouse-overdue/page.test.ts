import { describe, expect, test } from "vitest";
import WarehouseOverduePage from "./page";

describe("retired Warehouse Overdue page", () => {
  test("redirects old bookmarks to Sales Analytics", () => {
    expect(() => WarehouseOverduePage()).toThrow(
      expect.objectContaining({ digest: "NEXT_REDIRECT;replace;/analytics;307;" }),
    );
  });
});
