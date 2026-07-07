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

  test("shows the sales import link and marks it active on the import route", () => {
    usePathnameMock.mockReturnValue("/analytics/import");

    render(<Sidebar />);

    const link = screen.getByRole("link", { name: /sales import/i });
    expect(link).toHaveAttribute("href", "/analytics/import");
    expect(link).toHaveAttribute("aria-current", "page");
  });
});
