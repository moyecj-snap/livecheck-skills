#!/usr/bin/env node
/**
 * Rebuild the MCP bundle and fail if dist/mcp.js does not match the source build.
 */
import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const committed = path.join(root, "dist/mcp.js");
const tmpDir = await mkdtemp(path.join(os.tmpdir(), "livecheck-mcp-bundle-"));
const rebuilt = path.join(tmpDir, "mcp.js");

try {
  const result = spawnSync(process.execPath, [path.join(root, "scripts/build-mcp.mjs"), rebuilt], {
    cwd: root,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
  const expected = await readFile(rebuilt);
  let actual;
  try {
    actual = await readFile(committed);
  } catch {
    console.error("Committed dist/mcp.js is missing. Run npm run build:mcp and commit the file.");
    process.exit(1);
  }
  if (!actual.equals(expected)) {
    console.error(
      "Committed dist/mcp.js is stale. Run npm run build:mcp and commit the rebuilt file.",
    );
    process.exit(1);
  }
  console.error("dist/mcp.js matches a fresh source build.");
} finally {
  await rm(tmpDir, { recursive: true, force: true });
}
