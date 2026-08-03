import { afterEach, describe, expect, test } from "vitest";
import { POST } from "@/app/api/auth/login/route";

const originalAccessUsername = process.env.APP_ACCESS_USERNAME;
const originalAccessPassword = process.env.APP_ACCESS_PASSWORD;

function loginRequest(form: Record<string, string>) {
  const body = new FormData();
  for (const [key, value] of Object.entries(form)) {
    body.set(key, value);
  }

  return new Request("https://salesdesk.test/api/auth/login", {
    method: "POST",
    body,
  });
}

describe("auth login route", () => {
  afterEach(() => {
    if (originalAccessUsername === undefined) {
      delete process.env.APP_ACCESS_USERNAME;
    } else {
      process.env.APP_ACCESS_USERNAME = originalAccessUsername;
    }

    if (originalAccessPassword === undefined) {
      delete process.env.APP_ACCESS_PASSWORD;
    } else {
      process.env.APP_ACCESS_PASSWORD = originalAccessPassword;
    }
  });

  test("uses a see-other redirect after successful form login", async () => {
    process.env.APP_ACCESS_USERNAME = "allen";
    process.env.APP_ACCESS_PASSWORD = "1234";

    const response = await POST(
      loginRequest({
        username: "allen",
        password: "1234",
        next: "/dashboard",
      }),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://salesdesk.test/dashboard",
    );
    expect(response.headers.get("set-cookie")).toContain("ai_work_os_session=");
  });

  test("uses a see-other redirect after failed form login", async () => {
    process.env.APP_ACCESS_USERNAME = "allen";
    process.env.APP_ACCESS_PASSWORD = "1234";

    const response = await POST(
      loginRequest({
        username: "allen",
        password: "wrong",
        next: "/analytics",
      }),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://salesdesk.test/login?next=%2Fanalytics&error=1",
    );
  });
});
