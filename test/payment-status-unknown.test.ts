import assert from "node:assert/strict";
import { createServer, type IncomingMessage } from "node:http";
import type { AddressInfo } from "node:net";
import { describe, it } from "node:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createLivecheckMcp } from "../src/mcp-server.js";

const PAGE = "https://jobs.example.com/careers/12345";
const STATUS_UNKNOWN_BODY = {
  error: "payment_status_unknown",
  message:
    "Payment status unknown. Don't retry for 60 seconds. If you were charged and got no answer, we'll refund it.",
};
const CAP_SENTENCE =
  "After payment_status_unknown, retry at most 2 times (each after Retry-After), reusing the same payment credential; then stop and report the payment_status_unknown error to the user instead of retrying again.";

type Hit = {
  method: string;
  url: string;
  headers: IncomingMessage["headers"];
  body: string;
};

type ToolText = {
  isError?: boolean;
  content: Array<{ type: string; text?: string }>;
};

function headerValue(hit: Hit, name: string): string {
  const value = hit.headers[name];
  assert.equal(typeof value, "string", `${name} header`);
  return value as string;
}

async function startStub(): Promise<{ url: string; hits: Hit[]; close: () => Promise<void> }> {
  const hits: Hit[] = [];
  const server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      hits.push({
        method: req.method ?? "",
        url: req.url ?? "",
        headers: req.headers,
        body: Buffer.concat(chunks).toString("utf8"),
      });
      res.writeHead(503, {
        "content-type": "application/json; charset=UTF-8",
        "retry-after": "60",
        "cache-control": "no-store",
      });
      res.end(JSON.stringify(STATUS_UNKNOWN_BODY));
    });
  });
  await new Promise<void>((resolve, reject) => {
    const onError = (error: Error) => reject(error);
    server.once("error", onError);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", onError);
      resolve();
    });
  });
  const address = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${address.port}/v1/verify`,
    hits,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

async function withVerifyClient(fn: (client: Client, hits: Hit[]) => Promise<void>): Promise<void> {
  const previous = process.env.LIVECHECK_URL;
  const stub = await startStub();
  process.env.LIVECHECK_URL = stub.url;
  const mcp = createLivecheckMcp();
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "livecheck-test", version: "0.0.0" });
  try {
    await mcp.connect(serverTransport);
    await client.connect(clientTransport);
    await fn(client, stub.hits);
  } finally {
    await client.close();
    await mcp.close();
    await stub.close();
    if (previous === undefined) delete process.env.LIVECHECK_URL;
    else process.env.LIVECHECK_URL = previous;
  }
}

async function callVerify(client: Client, name: "verify" | "verify_listing", signature: string): Promise<ToolText> {
  const result = await client.callTool({
    name,
    arguments: { url: PAGE, payment_signature: signature },
  });
  assert.ok("content" in result && Array.isArray(result.content));
  return { isError: result.isError === true, content: result.content };
}

describe("payment_status_unknown 503", { concurrency: 1 }, () => {
  it("a verify tool call makes exactly one request for payment_status_unknown and does not retry", async () => {
    await withVerifyClient(async (client, hits) => {
      const started = Date.now();
      await callVerify(client, "verify", "sig-one-request");
      assert.equal(hits.length, 1);
      assert.equal(hits[0]?.method, "POST");
      assert.equal(hits[0]?.url, "/v1/verify");
      await new Promise((resolve) => setTimeout(resolve, 200));
      assert.equal(hits.length, 1, "the client must not retry after Retry-After on its own");
      assert.ok(Date.now() - started < 5_000, "the client must not wait out Retry-After and try again");

      await callVerify(client, "verify_listing", "sig-one-request");
      assert.equal(hits.length, 2);
      await new Promise((resolve) => setTimeout(resolve, 200));
      assert.equal(hits.length, 2, "verify_listing is also one request and does not retry");
    });
  });

  it("a retry reuses the same payment credential and does not create a new payment", async () => {
    const signature = "sig-livecheck-same-credential";
    await withVerifyClient(async (client, hits) => {
      await callVerify(client, "verify", signature);
      await callVerify(client, "verify", signature);
      assert.equal(hits.length, 2);
      for (const hit of hits) {
        assert.equal(headerValue(hit, "payment-signature"), signature);
        assert.equal(headerValue(hit, "x-payment"), signature);
        assert.equal(hit.headers.authorization, undefined);
        assert.deepEqual(JSON.parse(hit.body), { url: PAGE });
      }
    });
  });

  it("a payment_status_unknown 503 is surfaced with error, message, and Retry-After, not closed or unknown", async () => {
    await withVerifyClient(async (client) => {
      const result = await callVerify(client, "verify", "sig-surface");
      assert.equal(result.isError, true);
      const text = result.content[0]?.text;
      assert.equal(typeof text, "string");
      const parsed = JSON.parse(text!) as {
        http?: number;
        body?: { error?: string; message?: string; status?: string };
        retryAfter?: string;
        status?: string;
      };
      assert.equal(parsed.http, 503);
      assert.deepEqual(parsed.body, STATUS_UNKNOWN_BODY);
      assert.equal(parsed.retryAfter, "60");
      assert.equal(parsed.status, undefined);
      assert.equal(JSON.stringify(parsed).includes('"closed"'), false);
      assert.equal(JSON.stringify(parsed).includes('"status"'), false);
    });
  });

  it("the verify tool description caps payment_status_unknown retries at 2 and requires the same credential", async () => {
    await withVerifyClient(async (client) => {
      const listed = await client.listTools();
      for (const name of ["verify", "verify_listing"]) {
        const tool = listed.tools.find((item) => item.name === name);
        assert.ok(tool, name);
        assert.equal(tool.description?.includes(CAP_SENTENCE), true, name);
        assert.equal(tool.description?.includes("retry with the same credential, not a new payment"), true, name);
        assert.equal(tool.description?.includes("never double-charges"), false, name);
      }
    });
  });
});
