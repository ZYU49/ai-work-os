// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
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
});
