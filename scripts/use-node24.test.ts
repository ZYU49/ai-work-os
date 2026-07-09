import { spawnSync } from "node:child_process";
import path from "node:path";
import { describe, expect, test } from "vitest";

describe("use-node24 launcher", () => {
  test("falls back to the current Node binary when the bundled runtime is unavailable", () => {
    const result = spawnSync(
      process.execPath,
      ["scripts/use-node24.cjs", "tsx", "--version"],
      {
        cwd: path.resolve(__dirname, ".."),
        encoding: "utf8",
        env: {
          ...process.env,
          USERPROFILE: path.join(process.cwd(), ".missing-user-profile"),
        },
      },
    );

    expect(result.status).toBe(0);
    expect(result.stdout + result.stderr).toContain("tsx");
  });
});
