#!/usr/bin/env node
// Bun-free build for the caveman plugin.
//
// Replaces the original Bun.build step so Windows machines without bun can
// produce dist/:
//   1. bundle src/index.ts to dist/index.js with esbuild (ESM, node target)
//   2. emit .d.ts declarations with the repo's TypeScript compiler
//
// Run with: npm run build

import { spawnSync } from "node:child_process";
import { readFileSync, rmSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");

function fail(message) {
  console.error(`[build] ${message}`);
  process.exit(1);
}

// Resolve a package's JS entrypoint so no .cmd shim / shell is needed on Windows.
function cliBin(pkgName, commandName) {
  const pkgDir = join(root, "node_modules", ...pkgName.split("/"));
  let pkg;
  try {
    pkg = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8"));
  } catch {
    fail(`cannot read ${pkgName}; run npm install first`);
  }
  const binField = pkg.bin;
  const entry =
    typeof binField === "string"
      ? binField
      : binField?.[commandName] ?? binField?.[pkgName.split("/").pop()];
  if (!entry) fail(`cannot resolve "${commandName}" entrypoint in ${pkgName}`);
  return join(pkgDir, entry);
}

// 1. Clean output.
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

// 2. Bundle with esbuild.
const esbuild = await import("esbuild");
await esbuild.build({
  entryPoints: [join(root, "src", "index.ts")],
  outfile: join(dist, "index.js"),
  bundle: true,
  format: "esm",
  platform: "node",
  target: "node20",
  minify: false,
  sourcemap: false,
  logLevel: "warning",
});
console.log("[build] bundled dist/index.js");

// 3. Type declarations.
const tsc = cliBin("typescript", "tsc");
const result = spawnSync(process.execPath, [tsc, "--emitDeclarationOnly"], {
  cwd: root,
  stdio: "inherit",
});
if (result.error) fail(String(result.error));
if (result.status !== 0) fail(`tsc --emitDeclarationOnly failed (${result.status})`);
console.log("[build] emitted declarations into dist/");
console.log("[build] done");
