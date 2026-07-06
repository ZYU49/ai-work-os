// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { ProjectSelect } from "@/components/projects/project-select";

const projectsResponse = {
  projects: [
    {
      id: "project-1",
      name: "Retail Portal",
      companyName: "Acme Tire",
    },
    {
      id: "project-2",
      name: "EDI Cleanup",
      companyName: null,
    },
  ],
};

describe("ProjectSelect", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test("loads projects and preserves an unassigned option", async () => {
    const onChange = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => projectsResponse,
      }),
    );

    render(<ProjectSelect value="" onChange={onChange} />);

    const select = screen.getByLabelText("Project");
    expect(select).toBeDisabled();
    expect(screen.getByRole("option", { name: "Loading projects..." })).toBeInTheDocument();

    await waitFor(() => expect(select).not.toBeDisabled());

    expect(
      screen.getByRole("option", { name: "Unassigned" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Retail Portal - Acme Tire" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "EDI Cleanup" }),
    ).toBeInTheDocument();

    fireEvent.change(select, { target: { value: "project-1" } });

    expect(onChange).toHaveBeenCalledWith("project-1");
  });

  test("keeps association optional when projects cannot load", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "Database unavailable." }),
      }),
    );

    render(<ProjectSelect value="" onChange={vi.fn()} />);

    await screen.findByText("Projects unavailable. Save without a project or try again later.");

    expect(screen.getByRole("status")).toHaveTextContent(
      "Projects unavailable. Save without a project or try again later.",
    );
    expect(screen.getByLabelText("Project")).not.toBeDisabled();
    expect(
      screen.getByRole("option", { name: "Unassigned" }),
    ).toBeInTheDocument();
  });

  test("clears a selected project when it is missing from loaded projects", async () => {
    const onChange = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => projectsResponse,
      }),
    );

    render(<ProjectSelect value="stale-project" onChange={onChange} />);

    await waitFor(() => expect(onChange).toHaveBeenCalledWith(""));
  });

  test("clears a selected project when projects cannot load", async () => {
    const onChange = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "Database unavailable." }),
      }),
    );

    render(<ProjectSelect value="stale-project" onChange={onChange} />);

    await waitFor(() => expect(onChange).toHaveBeenCalledWith(""));
  });
});
