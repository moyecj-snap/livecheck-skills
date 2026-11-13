# Livecheck Skills

[![graded A](https://graded.sh/badge/bz_79e142b97a14.svg)](https://graded.sh/s/bz_79e142b97a14)

x402 payment setup, API description and 30-day uptime, probed every 6 hours by graded.sh. It doesn't test result quality.

Try it free in a browser: https://livecheck.fly.dev/job?ref=clawhub

Version 4.1.2. Agent skills for [Livecheck](https://livecheck.fly.dev): live status of listings, product pages, and job postings, read from the page at call time. Verify is exactly $0.01, paid with x402 (Base USDC) or MPP (Tempo USDC.e, chain 4217, method `tempo/charge`; Stripe pays gas). Check, watch, and confirm stay x402 on Base. Wallet calls need no account or API key. Wallet: [agentcash](https://agentcash.dev).

No wallet yet? Sign in with GitHub at https://livecheck.fly.dev/keys. 200 free checks over 30 days, no wallet needed. A starter key covers `POST /v1/verify`, `/v1/verify/job`, and `/v1/verify/listing`; send it as `Authorization: Bearer <key>`. Check, watch, and confirm stay on a wallet. When the checks run out, call the same route without the key to pay with a wallet.

With MPP (Tempo): Paid answers, including the checked link, are kept for 24 hours so retries are safe, then deleted. Retries are still capped: After payment_status_unknown, retry at most 2 times (each after Retry-After), reusing the same payment credential; then stop and report the payment_status_unknown error to the user instead of retrying again.

## When to use Livecheck instead of checking it yourself

You already have a specific URL. Call Livecheck when the next step is apply, outreach, or a recommendation, and the page might already be closed.

- **List cleaning (start here).** A batch of job URLs from search, a scraper, a board, or an outreach sheet. Clean it before apply or outreach. One `POST /v1/verify/job` per posting, up to 8 at a time. Keep `live`. Drop `closed`. Flag `unknown`.
- **Ghost jobs and stale rows.** Search results, boards, and scrapes keep postings that are filled, expired, or removed. The URL still looks usable in the list. Livecheck reads that page at call time. `closed` means drop it. That is availability, not a legitimacy or fraud score.
- **Click-time verify.** The user is about to apply, or you are about to tailor a resume or send outreach. Check the posting URL at that moment.
- **Multi-ATS consistency.** Greenhouse, Lever, Workday, Ashby, SmartRecruiters, and iCIMS do not share one HTML shape. Job verify returns the same `live` / `closed` / `unknown` for each, so you do not write a separate parser for each ATS.
- **Save credits before apply.** Tailoring a resume, submitting an application, or starting outreach costs more than a $0.01 check. Verify the posting first.

Fetch the page yourself when you need the posting body (requirements, salary, location) to tailor or quote. Livecheck returns status, title, and signals. It does not log in, submit forms, or replace the job description. Bring one specific item URL; it is not a job search. After a real form submit or checkout, Confirm is a separate call.

On HTTP 503, read `error` and wait for that response's `Retry-After` header (seconds). Do not treat 503 as `closed` or `unknown`. A busy 503 (`error` `over_capacity` or x402 `processor_unavailable`) keeps "You were not charged." in `message` and its own `Retry-After`; wait that long and retry. An x402 503 with `error` `payment_status_unknown` means the settle ran past 5 seconds. `message` is "Payment status unknown. Don't retry for 60 seconds. If you were charged and got no answer, we'll refund it." `Retry-After` is 60. Do not retry with a new payment for 60 seconds. Retry with the same credential, not a new payment. After payment_status_unknown, retry at most 2 times (each after Retry-After), reusing the same payment credential; then stop and report the payment_status_unknown error to the user instead of retrying again. A late settle is a refund candidate that Craig approves manually. An MPP 503 with `error` `payment_unconfirmed` means the payment could not be confirmed: a possible charge is logged for refund. Retry with the same credential, not a new payment. For a list of URLs, send up to 8 verifies at a time (server concurrency default is 8; a short queue may absorb brief bursts).

## Examples

### Clean a batch of job URLs before apply or outreach

Primary use. One call per posting URL. Send up to 8 verifies at a time. On HTTP 503, read `error` and wait for that response's `Retry-After` header (seconds). Do not treat 503 as `closed` or `unknown`. A busy 503 (`error` `over_capacity` or x402 `processor_unavailable`) keeps "You were not charged." in `message` and its own `Retry-After`; wait that long and retry. An x402 503 with `error` `payment_status_unknown` means the settle ran past 5 seconds. `message` is "Payment status unknown. Don't retry for 60 seconds. If you were charged and got no answer, we'll refund it." `Retry-After` is 60. Do not retry with a new payment for 60 seconds. Retry with the same credential, not a new payment. After payment_status_unknown, retry at most 2 times (each after Retry-After), reusing the same payment credential; then stop and report the payment_status_unknown error to the user instead of retrying again. A late settle is a refund candidate that Craig approves manually. An MPP 503 with `error` `payment_unconfirmed` means the payment could not be confirmed: a possible charge is logged for refund. Retry with the same credential, not a new payment.

```bash
npx agentcash@0.17.1 fetch https://livecheck.fly.dev/v1/verify/job -m POST -b '{"url": "https://jobs.example.com/careers/12345"}'
```

Tailor, apply, or reach out only where `status` is `live`.

### Other checks

- One product page, before you recommend or buy: `POST /v1/verify/listing` ($0.01).
- Any other specific URL: `POST /v1/verify` ($0.01).
- One-shot keyword or price check: `POST /v1/check` ($0.02). Watch for 30 days: `POST /v1/watch` ($2.50).
- After a form or checkout: `POST /v1/confirm` ($0.10) or `POST /v1/confirm/order` ($0.25).

For a job posting, call `/v1/verify/job`. For a product page (eBay, Shopify, or other HTML product page), call `/v1/verify/listing`. Use `/v1/verify` for any other specific URL.

## Install

### CLI mode

```bash
npx skills add moyecj-snap/livecheck-skills --all --yes
```

### MCP mode

```bash
npx agentcash@0.17.1 install -y
npx skills add moyecj-snap/livecheck-skills/mcp --all --yes
```

### Cursor plugin

Cursor Marketplace installs this repository as a plugin. The manifest is `.cursor-plugin/plugin.json` and its `logo` is `.cursor-plugin/logo.svg`. Root [`mcp.json`](https://github.com/moyecj-snap/livecheck-skills/blob/main/mcp.json) is the file Stripe Directory's MCP action should link. It starts the stdio client with `${CURSOR_PLUGIN_ROOT}`:

```json
"args": ["-y", "tsx", "${CURSOR_PLUGIN_ROOT}/src/mcp.ts"]
```

The client calls `https://livecheck.fly.dev`. Unpaid calls return HTTP 402. From a checkout of this repo: `npm install`, then `npm test`.

Or add the origin directly to your agentcash wallet:

```bash
npx agentcash@0.17.1 add https://livecheck.fly.dev
```

## What it does

| Endpoint | Price | Use |
|---|---|---|
| `POST /v1/verify/job` | $0.01 exactly (x402 or MPP) | Is this job posting still open? |
| `POST /v1/verify/listing` | $0.01 exactly (x402 or MPP) | Is this product listing still available or sold out? |
| `POST /v1/verify` | $0.01 exactly (x402 or MPP) | Is this other specific URL still live? |
| `POST /v1/check` | $0.02 | One-shot keyword, price-threshold, or change check |
| `POST /v1/watch` | $2.50 | 30-day URL watcher with signed webhook |
| `POST /v1/confirm` | $0.10 | Did the form submission land? |
| `POST /v1/confirm/order` | $0.25 | Does the order exist? |

On HTTP 503, read `error` and wait for that response's `Retry-After` header (seconds). Do not treat 503 as `closed` or `unknown`. A busy 503 (`error` `over_capacity` or x402 `processor_unavailable`) keeps "You were not charged." in `message` and its own `Retry-After`; wait that long and retry. An x402 503 with `error` `payment_status_unknown` means the settle ran past 5 seconds. `message` is "Payment status unknown. Don't retry for 60 seconds. If you were charged and got no answer, we'll refund it." `Retry-After` is 60. Do not retry with a new payment for 60 seconds. Retry with the same credential, not a new payment. After payment_status_unknown, retry at most 2 times (each after Retry-After), reusing the same payment credential; then stop and report the payment_status_unknown error to the user instead of retrying again. A late settle is a refund candidate that Craig approves manually. An MPP 503 with `error` `payment_unconfirmed` means the payment could not be confirmed: a possible charge is logged for refund. Retry with the same credential, not a new payment. For a list of URLs, send up to 8 verifies at a time (server concurrency default is 8; a short queue may absorb brief bursts).

Full schema: https://livecheck.fly.dev/openapi.json · Agent guide: https://livecheck.fly.dev/llms.txt · Live stats: https://livecheck.fly.dev/stats

## License

MIT. See [LICENSE](LICENSE).
