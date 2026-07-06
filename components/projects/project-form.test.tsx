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
import { ProjectForm } from "@/components/projects/project-form";

describe("ProjectForm", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test("creates a project, clears fields, and refreshes the list", async () => {
    const onCreated = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ project: { id: "project-1" } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<ProjectForm onCreated={onCreated} />);

    fireEvent.change(screen.getByLabelText("Project name"), {
      target: { value: "Retail Portal" },
    });
    fireEvent.change(screen.getByLabelText("Company name"), {
      target: { value: "Acme Tire" },
    });
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Customer portal implementation" },
    });
    fireEvent.change(screen.getByLabelText("Priority"), {
      target: { value: "high" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create project/i }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));

    expect(fetchMock).toHaveBeenCalledWith("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Retail Portal",
        companyName: "Acme Tire",
        description: "Customer portal implementation",
        priority: "high",
        status: "active",
      }),
    });
    expect(screen.getByLabelText("Project name")).toHaveValue("");
    expect(screen.getByLabelText("Company name")).toHaveValue("");
    expect(screen.getByLabelText("Description")).toHaveValue("");
    expect(screen.getByLabelText("Priority")).toHaveValue("medium");
  });

  test("shows API errors without clearing the form", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: async () => ({ error: "Project name already exists." }),
      }),
    );

    render(<ProjectForm onCreated={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Project name"), {
      target: { value: "Retail Portal" },
    });
    fireEvent.click(screen.getByRole("button", { name: /create project/i }));

    expect(await screen.findByText("Project name already exists.")).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Project name already exists.",
    );
    expect(screen.getByLabelText("Project name")).toHaveValue("Retail Portal");
  });
});
