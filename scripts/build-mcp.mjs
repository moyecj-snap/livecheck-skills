#!/usr/bin/env node
/**
 * Deterministic Node bundle of src/mcp.ts, including runtime dependencies.
 * Usage: node scripts/build-mcp.mjs [outfile]
 */
import { build } from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outfile = path.resolve(process.argv[2] ?? path.join(root, "dist/mcp.js"));

await build({
  absWorkingDir: root,
  entryPoints: ["src/mcp.ts"],
  outfile,
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  legalComments: "none",
  sourcemap: false,
  sourcesContent: false,
  minify: false,
  charset: "utf8",
  logLevel: "warning",
});
