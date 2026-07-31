import { NextRequest } from "next/server";
import { afterEach, describe, expect, test } from "vitest";
import { proxy } from "@/proxy";

const originalAccessEnabled = process.env.APP_ACCESS_ENABLED;
const originalAccessUsername = process.env.APP_ACCESS_USERNAME;
const originalAccessPassword = process.env.APP_ACCESS_PASSWORD;

function request(pathname: string) {
  return new NextRequest(`https://salesdesk.test${pathname}`);
}

describe("proxy auth gate", () => {
  afterEach(() => {
    if (originalAccessEnabled === undefined) {
      delete process.env.APP_ACCESS_ENABLED;
    } else {
      process.env.APP_ACCESS_ENABLED = originalAccessEnabled;
    }

    if (originalAccessPassword === undefined) {
      delete process.env.APP_ACCESS_PASSWORD;
    } else {
      process.env.APP_ACCESS_PASSWORD = originalAccessPassword;
    }

    if (originalAccessUsername === undefined) {
      delete process.env.APP_ACCESS_USERNAME;
    } else {
      process.env.APP_ACCESS_USERNAME = originalAccessUsername;
    }
  });

  test("redirects protected pages to login by default", async () => {
    delete process.env.APP_ACCESS_ENABLED;
    delete process.env.APP_ACCESS_PASSWORD;

    const response = await proxy(request("/analytics"));

    expect(response.headers.get("location")).toBe(
      "https://salesdesk.test/login?next=%2Fanalytics",
    );
  });

  test("allows protected pages when access gate is explicitly disabled", async () => {
    process.env.APP_ACCESS_ENABLED = "false";
    delete process.env.APP_ACCESS_PASSWORD;

    const response = await proxy(request("/analytics"));

    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  test("leaves login and auth routes public", async () => {
    delete process.env.APP_ACCESS_ENABLED;
    delete process.env.APP_ACCESS_PASSWORD;

    await expect(proxy(request("/login"))).resolves.toHaveProperty(
      "headers",
      expect.objectContaining({
        get: expect.any(Function),
      }),
    );
    expect((await proxy(request("/login"))).headers.get("location")).toBeNull();
    expect((await proxy(request("/api/auth/login"))).headers.get("location")).toBeNull();
  });

  test("returns json auth errors for protected api routes", async () => {
    delete process.env.APP_ACCESS_ENABLED;
    delete process.env.APP_ACCESS_PASSWORD;

    const response = await proxy(request("/api/analytics/product-yoy"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: "Authentication required.",
    });
  });
});
