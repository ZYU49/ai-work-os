import { NextRequest } from "next/server";
import { afterEach, describe, expect, test } from "vitest";
import { proxy } from "@/proxy";

const originalAccessEnabled = process.env.APP_ACCESS_ENABLED;
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
  });

  test("allows pages without credentials when access gate is not explicitly enabled", async () => {
    delete process.env.APP_ACCESS_ENABLED;
    process.env.APP_ACCESS_PASSWORD = "1234";

    const response = await proxy(request("/analytics"));

    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  test("redirects pages to login when access gate is explicitly enabled", async () => {
    process.env.APP_ACCESS_ENABLED = "true";
    process.env.APP_ACCESS_PASSWORD = "1234";

    const response = await proxy(request("/analytics"));

    expect(response.headers.get("location")).toBe(
      "https://salesdesk.test/login?next=%2Fanalytics",
    );
  });
});
