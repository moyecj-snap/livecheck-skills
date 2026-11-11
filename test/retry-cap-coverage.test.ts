import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createServer, type IncomingMessage } from "node:http";
import type { AddressInfo } from "node:net";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import {
  MCP_COMPAT_TOOLS,
  MCP_PAID_TOOLS,
  MCP_WATCH_PAID_FOLLOWUP_TOOLS,
  createLivecheckMcp,
} from "../src/mcp-server.js";

/**
 * Follow-up to PR #12. Every paid tool (not only verify) can get an x402
 * payment_status_unknown 503, so every paid tool must: make one request and
 * never retry on its own, send the caller's credential unchanged, pass the 503
 * through as-is, and carry the "at most 2 retries" cap in its description.
 * Every doc line with payment_status_unknown or payment-retry guidance must
 * carry the cap too.
 */

const CAP_SENTENCE =
  "After payment_status_unknown, retry at most 2 times (each after Retry-After), reusing the same payment credential; then stop and report the payment_status_unknown error to the user instead of retrying again.";

const STATUS_UNKNOWN_BODY = {
  error: "payment_status_unknown",
  message:
    "Payment status unknown. Don't retry for 60 seconds. If you were charged and got no answer, we'll refund it.",
};

type Hit = { method: string; url: string; headers: IncomingMessage["headers"]; body: string };

const PAID_TOOLS = [...MCP_COMPAT_TOOLS, ...MCP_PAID_TOOLS, ...MCP_WATCH_PAID_FOLLOWUP_TOOLS];

const TARGET = { type: "url", url: "https://shop.example.com/products/widget" };
const CONDITION = { detector: "status_change", params: {} };

/** Minimal valid arguments and the route each paid tool must hit. */
const CALLS: Record<string, { args: Record<string, unknown>; path: string }> = {
  verify: { args: { url: "https://jobs.example.com/careers/1" }, path: "/v1/verify" },
  verify_listing: { args: { url: "https://jobs.example.com/careers/1" }, path: "/v1/verify" },
  check: { args: { target: TARGET, condition: CONDITION }, path: "/v1/check" },
  confirm: { args: { url: "https://example.com/thank-you", intent: "lead_submit" }, path: "/v1/confirm" },
  watch: {
    args: { target: TARGET, condition: CONDITION, callback: { url: "https://hooks.example.com/lc", secret: "s" } },
    path: "/v1/watch",
  },
  watch_chain_topup: { args: { id: "wtc_1", owner_token: "owt_1" }, path: "/v1/watch/wtc_1/chain/topup" },
  watch_renew: { args: { id: "wtc_1", owner_token: "owt_1" }, path: "/v1/watch/renew" },
};

async function withClient(fn: (client: Client, hits: Hit[]) => Promise<void>): Promise<void> {
  const hits: Hit[] = [];
  const server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => {
      hits.push({ method: req.method ?? "", url: req.url ?? "", headers: req.headers, body: Buffer.concat(chunks).toString("utf8") });
      res.writeHead(503, { "content-type": "application/json; charset=UTF-8", "retry-after": "60" });
      res.end(JSON.stringify(STATUS_UNKNOWN_BODY));
    });
  });
  await new Promise<void>((ok) => server.listen(0, "127.0.0.1", () => ok()));
  const previous = process.env.LIVECHECK_URL;
  const previousSig = process.env.LIVECHECK_PAYMENT_SIGNATURE;
  delete process.env.LIVECHECK_PAYMENT_SIGNATURE;
  process.env.LIVECHECK_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1/verify`;
  const mcp = createLivecheckMcp();
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "livecheck-retry-cap-test", version: "0.0.0" });
  try {
    await mcp.connect(serverTransport);
    await client.connect(clientTransport);
    await fn(client, hits);
  } finally {
    await client.close();
    await mcp.close();
    await new Promise<void>((ok) => server.close(() => ok()));
    if (previous === undefined) delete process.env.LIVECHECK_URL;
    else process.env.LIVECHECK_URL = previous;
    if (previousSig !== undefined) process.env.LIVECHECK_PAYMENT_SIGNATURE = previousSig;
  }
}

describe("payment_status_unknown retry cap on every paid tool", { concurrency: 1 }, () => {
  it("covers every paid tool the server registers", async () => {
    await withClient(async (client) => {
      const listed = (await client.listTools()).tools.map((t) => t.name);
      for (const name of PAID_TOOLS) assert.ok(listed.includes(name), name);
      assert.deepEqual(Object.keys(CALLS).sort(), [...PAID_TOOLS].sort());
    });
  });

  for (const name of PAID_TOOLS) {
    it(`${name}: one request, no retry of its own, same credential unchanged, 503 passed through as-is`, async () => {
      await withClient(async (client, hits) => {
        const { args, path } = CALLS[name]!;
        const signature = `sig-${name}-unchanged`;
        const started = Date.now();
        const first = await client.callTool({ name, arguments: { ...args, payment_signature: signature } });
        await new Promise((r) => setTimeout(r, 200));
        assert.equal(hits.length, 1, "exactly one request; the client never retries on its own");
        assert.ok(Date.now() - started < 5_000, "the client does not wait out Retry-After");
        assert.equal(hits[0]!.method, "POST");
        assert.equal(hits[0]!.url, path);

        // The caller's own retry (one of its 2) resends the same credential, byte for byte.
        await client.callTool({ name, arguments: { ...args, payment_signature: signature } });
        await new Promise((r) => setTimeout(r, 100));
        assert.equal(hits.length, 2, "one request per caller retry, never more");
        for (const hit of hits) {
          assert.equal(hit.headers["payment-signature"], signature);
          assert.equal(hit.headers["x-payment"], signature);
        }
        assert.equal(hits[0]!.body, hits[1]!.body, "same request body on the retry");

        // The 503 is passed through as-is: status, body, and Retry-After.
        assert.equal(first.isError, true);
        const content = first.content as Array<{ type: string; text?: string }>;
        const parsed = JSON.parse(content[0]!.text!) as { http?: number; body?: unknown; retryAfter?: string; status?: unknown };
        assert.equal(parsed.http, 503);
        assert.deepEqual(parsed.body, STATUS_UNKNOWN_BODY);
        assert.equal(parsed.retryAfter, "60");
        assert.equal(parsed.status, undefined, "not turned into closed or unknown");
      });
    });
  }

  it("every paid tool description carries the cap and the same-credential rule", async () => {
    await withClient(async (client) => {
      const tools = (await client.listTools()).tools;
      for (const name of PAID_TOOLS) {
        const d = tools.find((t) => t.name === name)?.description ?? "";
        assert.ok(d.includes(CAP_SENTENCE), `${name} description has the at-most-2 cap`);
        assert.ok(d.includes("retry with the same credential, not a new payment"), `${name} same credential`);
      }
    });
  });
});

describe("retry cap appears everywhere retry guidance appears in the docs", () => {
  const DOCS = [
    "README.md",
    "skills/livecheck/SKILL.md",
    "skills/livecheck/rules/getting-started.md",
    "mcp/skills/livecheck/SKILL.md",
    "mcp/skills/livecheck/rules/getting-started.md",
  ];
  // Lines that give payment-retry guidance: the 503 status-unknown guidance,
  // the "Payment failed ... retry" row, and the MPP "retries are safe" line.
  const RETRY_GUIDANCE = /payment_status_unknown|"Payment failed"|retries are safe/;

  for (const file of DOCS) {
    it(file, () => {
      const lines = readFileSync(resolve(import.meta.dirname, "..", file), "utf8").split("\n");
      const guidance = lines.filter((line) => RETRY_GUIDANCE.test(line));
      assert.ok(guidance.length > 0, `${file} has retry guidance`);
      for (const line of guidance) assert.ok(line.includes(CAP_SENTENCE), `${file}: missing cap in: ${line.slice(0, 120)}`);
    });
  }

  it("manifests carry no retry guidance without the cap", () => {
    for (const file of [".cursor-plugin/plugin.json", "mcp.json"]) {
      const text = readFileSync(resolve(import.meta.dirname, "..", file), "utf8");
      if (/retr(y|ies)/i.test(text)) assert.ok(text.includes("at most 2"), file);
    }
  });
});
