import { describe, expect, test } from "vitest";
import {
  buildBasicAuthChallenge,
  isBasicAuthAuthorized,
} from "@/lib/auth/basic-auth";

function basicHeader(username: string, password: string) {
  return `Basic ${btoa(`${username}:${password}`)}`;
}

describe("basic auth", () => {
  test("allows requests when no password is configured", () => {
    expect(
      isBasicAuthAuthorized(null, {
        username: "allen",
        password: "",
      }),
    ).toBe(true);
  });

  test("rejects missing or invalid credentials when a password is configured", () => {
    const config = { username: "allen", password: "AIWORKOS2026!" };

    expect(isBasicAuthAuthorized(null, config)).toBe(false);
    expect(isBasicAuthAuthorized("Bearer token", config)).toBe(false);
    expect(isBasicAuthAuthorized(basicHeader("allen", "wrong"), config)).toBe(false);
    expect(
      isBasicAuthAuthorized(basicHeader("someone-else", "AIWORKOS2026!"), config),
    ).toBe(false);
  });

  test("allows matching credentials", () => {
    expect(
      isBasicAuthAuthorized(basicHeader("allen", "AIWORKOS2026!"), {
        username: "allen",
        password: "AIWORKOS2026!",
      }),
    ).toBe(true);
  });

  test("supports passwords containing colons", () => {
    expect(
      isBasicAuthAuthorized(basicHeader("allen", "AI:WORK:OS"), {
        username: "allen",
        password: "AI:WORK:OS",
      }),
    ).toBe(true);
  });

  test("builds the browser challenge header", () => {
    expect(buildBasicAuthChallenge("AI Work OS")).toBe(
      'Basic realm="AI Work OS", charset="UTF-8"',
    );
  });
});
