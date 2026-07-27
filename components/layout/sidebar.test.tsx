// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { Sidebar } from "@/components/layout/sidebar";

const { usePathnameMock } = vi.hoisted(() => ({
  usePathnameMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: usePathnameMock,
}));

describe("Sidebar", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    usePathnameMock.mockReset();
  });

  test("shows analytics in navigation and marks it active for analytics routes", () => {
    usePathnameMock.mockReturnValue("/analytics/import");

    render(<Sidebar />);

    const link = screen.getByRole("link", { name: /analytics/i });
    expect(link).toHaveAttribute("href", "/analytics");
    expect(link).toHaveAttribute("aria-current", "page");
    expect(
      screen.queryByRole("link", { name: /sales import/i }),
    ).not.toBeInTheDocument();
  });

  test("shows knowledge in navigation and marks it active for knowledge routes", () => {
    usePathnameMock.mockReturnValue("/knowledge");

    render(<Sidebar />);

    const link = screen.getByRole("link", { name: /knowledge/i });
    expect(link).toHaveAttribute("href", "/knowledge");
    expect(link).toHaveAttribute("aria-current", "page");
  });

  test("places the SalesDesk briefing entry inside the sidebar", () => {
    usePathnameMock.mockReturnValue("/dashboard");

    render(<Sidebar />);

    const sidebar = screen.getByRole("complementary");
    expect(
      within(sidebar).getByRole("button", { name: "Open briefing calendar" }),
    ).toBeVisible();
    expect(within(sidebar).getAllByText("SalesDesk Briefing").length).toBeGreaterThan(
      0,
    );
  });

  test("keeps the desktop sidebar constrained to the viewport", () => {
    usePathnameMock.mockReturnValue("/dashboard");

    render(<Sidebar />);

    expect(screen.getByRole("complementary")).toHaveClass(
      "md:sticky",
      "md:top-0",
      "md:h-screen",
    );
  });
});
