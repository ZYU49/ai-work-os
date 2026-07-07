import { expect, type Locator, type Page, test } from "@playwright/test";

const pages = [
  {
    name: "Projects",
    heading: "Projects",
    loadingText: ["Loading projects"],
    finalStates: (page: Page) => [
      page.getByRole("heading", { name: "Projects are unavailable" }),
      page.getByRole("heading", { name: "No projects yet" }),
      page.getByRole("columnheader", { name: "Last activity" }),
    ],
  },
  {
    name: "Mail",
    heading: "Mail",
    loadingText: ["Loading mail"],
    finalStates: (page: Page) => [
      page.getByRole("heading", { name: "Mail is unavailable" }),
      page.getByRole("heading", { name: "No pasted mail" }),
      page.getByText(/^(new|analyzed|replied|archived)$/).first(),
    ],
  },
  {
    name: "Files",
    heading: "Files",
    loadingText: ["Loading files"],
    finalStates: (page: Page) => [
      page.getByRole("heading", { name: "Files are unavailable" }),
      page.getByRole("heading", { name: "No files found" }),
      page.getByRole("columnheader", { name: "Filename" }),
    ],
  },
  {
    name: "Notes",
    heading: "Notes",
    loadingText: ["Loading notes"],
    finalStates: (page: Page) => [
      page.getByRole("heading", { name: "Notes are unavailable" }),
      page.getByRole("heading", { name: "No notes found" }),
      page
        .locator("main h2")
        .filter({ hasNotText: /Notes are unavailable|No notes found/ })
        .first(),
    ],
  },
  {
    name: "Tasks",
    heading: "Tasks",
    loadingText: ["Loading tasks"],
    finalStates: (page: Page) => [
      page.getByRole("heading", { name: "Tasks are unavailable" }),
      page.getByRole("heading", { name: "No tasks found" }),
      page.getByRole("columnheader", { name: "Task" }),
    ],
  },
  {
    name: "Daily Log",
    heading: "Daily Log",
    loadingText: ["Loading", "Loading report"],
    finalStates: (page: Page) => [
      page.getByRole("heading", { name: "Daily log unavailable" }),
      page.getByText("No records found.").first(),
      page.getByRole("heading", { name: "No report generated" }),
      page.getByText(/source records included/).first(),
    ],
  },
  {
    name: "Search",
    heading: "Search",
    finalStates: (page: Page) => [
      page.getByRole("heading", { name: "Start with a keyword" }),
    ],
  },
  {
    name: "Agent",
    heading: "Agent",
    finalStates: (page: Page) => [
      page.getByText(/Ask about today, a project, due tasks/),
    ],
  },
];

async function waitForLoadingToFinish(page: Page, loadingText: string[] = []) {
  for (const text of loadingText) {
    await expect(page.getByText(text, { exact: true })).toHaveCount(0, {
      timeout: 30_000,
    });
  }
}

async function expectAnyFinalState(label: string, states: Locator[]) {
  await expect
    .poll(
      async () => {
        for (const state of states) {
          if (await state.isVisible().catch(() => false)) {
            return true;
          }
        }

        return false;
      },
      { message: `${label} reached unavailable, empty, or populated state` },
    )
    .toBe(true);
}

test("core MVP pages render from the app shell", async ({ page }) => {
  const unavailableApiRoutes = [
    "**/api/projects**",
    "**/api/mail**",
    "**/api/files**",
    "**/api/notes**",
    "**/api/tasks**",
    "**/api/daily-log**",
    "**/api/analytics/sales**",
  ];

  for (const url of unavailableApiRoutes) {
    await page.route(url, async (route) => {
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Database unavailable during smoke test.",
        }),
      });
    });
  }

  await page.goto("/dashboard");

  await expect(page.getByText("AI Work OS")).toBeVisible();
  await expect(page.getByText("Workspace", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Dashboard", level: 1 }),
  ).toBeVisible();
  await expectAnyFinalState("Dashboard", [
    page.getByRole("heading", { name: "Dashboard data is unavailable" }),
    page.getByText("Today Tasks"),
  ]);

  for (const appPage of pages) {
    await page.getByRole("link", { name: appPage.name }).click();

    await expect(
      page.getByRole("heading", { name: appPage.heading, level: 1 }),
    ).toBeVisible();
    await waitForLoadingToFinish(page, appPage.loadingText);
    await expectAnyFinalState(appPage.name, appPage.finalStates(page));
  }

  await page.goto("/analytics");
  await expect(
    page.getByRole("heading", { name: "Sales Analytics", level: 1 }),
  ).toBeVisible();
  await waitForLoadingToFinish(page, ["Loading sales analytics"]);
  await expectAnyFinalState("Analytics", [
    page.getByText("YTD Quantity"),
    page.getByText("Unable to load sales analytics"),
    page.getByText("No monthly sales data yet"),
  ]);

  await page.goto("/analytics/import");
  await expect(
    page.getByRole("heading", { name: "Import Sales Data", level: 1 }),
  ).toBeVisible();
});
