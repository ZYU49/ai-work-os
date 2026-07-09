/* eslint-disable @typescript-eslint/no-require-imports */
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const bundledNode = path.join(
  process.env.USERPROFILE || "",
  ".cache",
  "codex-runtimes",
  "codex-primary-runtime",
  "dependencies",
  "node",
  "bin",
  "node.exe",
);

const bins = {
  next: "node_modules/next/dist/bin/next",
  eslint: "node_modules/eslint/bin/eslint.js",
  vitest: "node_modules/vitest/vitest.mjs",
  playwright: "node_modules/@playwright/test/cli.js",
  prisma: "node_modules/prisma/build/index.js",
  tsx: "node_modules/tsx/dist/cli.mjs",
};

const [command, ...args] = process.argv.slice(2);

if (!command || !bins[command]) {
  console.error(
    `Usage: node scripts/use-node24.cjs ${Object.keys(bins).join("|")} [...args]`,
  );
  process.exit(1);
}

const target = path.join(projectRoot, bins[command]);
const nodeBinary = fs.existsSync(bundledNode) ? bundledNode : process.execPath;
const env = {
  ...process.env,
  PATH: `${path.dirname(nodeBinary)}${path.delimiter}${process.env.PATH || ""}`,
};

const result = spawnSync(nodeBinary, [target, ...args], {
  cwd: projectRoot,
  env,
  stdio: "inherit",
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 0);
