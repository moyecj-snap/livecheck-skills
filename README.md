# Livecheck Skills

Version 3. Agent skills for [Livecheck](https://livecheck.fly.dev): live status of listings, product pages, and job postings, read from the page at call time. $0.01 per posting, paid in USDC on Base via x402. No account, no API key. Wallet: [agentcash](https://agentcash.dev).

## When to use Livecheck instead of checking it yourself

You already have a specific URL. Call Livecheck when the next step is apply, outreach, or a recommendation, and the page might already be closed.

- **List cleaning (start here).** A batch of job URLs from search, a scraper, a board, or an outreach sheet. Clean it before apply or outreach. One `POST /v1/verify/job` per posting, up to 8 at a time. Keep `live`. Drop `closed`. Flag `unknown`.
- **Ghost jobs and stale rows.** Search results, boards, and scrapes keep postings that are filled, expired, or removed. The URL still looks usable in the list. Livecheck reads that page at call time. `closed` means drop it. That is availability, not a legitimacy or fraud score.
- **Click-time verify.** The user is about to apply, or you are about to tailor a resume or send outreach. Check the posting URL at that moment.
- **Multi-ATS consistency.** Greenhouse, Lever, Workday, Ashby, SmartRecruiters, and iCIMS do not share one HTML shape. Job verify returns the same `live` / `closed` / `unknown` for each, so you do not write a separate parser for each ATS.
- **Save credits before apply.** Tailoring a resume, submitting an application, or starting outreach costs more than a $0.01 check. Verify the posting first.

Fetch the page yourself when you need the posting body (requirements, salary, location) to tailor or quote. Livecheck returns status, title, and signals. It does not log in, submit forms, or replace the job description. Bring one specific item URL; it is not a job search. After a real form submit or checkout, Confirm is a separate call.

On HTTP 503, wait for the `Retry-After` header (seconds) and retry. You were not charged. Do not treat 503 as closed or unknown. For a list of URLs, send up to 8 verifies at a time (server concurrency default is 8; a short queue may absorb brief bursts).

## Examples

### Clean a batch of job URLs before apply or outreach

Primary use. One call per posting URL. Send up to 8 verifies at a time. On HTTP 503, wait for `Retry-After` and retry.

```bash
npx agentcash@latest fetch https://livecheck.fly.dev/v1/verify/job -m POST -b '{"url": "https://jobs.example.com/careers/12345"}'
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
npx agentcash@latest install -y
npx skills add moyecj-snap/livecheck-skills/mcp --all --yes
```

Or add the origin directly to your agentcash wallet:

```bash
npx agentcash@latest add https://livecheck.fly.dev
```

## What it does

| Endpoint | Price | Use |
|---|---|---|
| `POST /v1/verify/job` | $0.01 | Is this job posting still open? |
| `POST /v1/verify/listing` | $0.01 | Is this product listing still available or sold out? |
| `POST /v1/verify` | $0.01 | Is this other specific URL still live? |
| `POST /v1/check` | $0.02 | One-shot keyword, price-threshold, or change check |
| `POST /v1/watch` | $2.50 | 30-day URL watcher with signed webhook |
| `POST /v1/confirm` | $0.10 | Did the form submission land? |
| `POST /v1/confirm/order` | $0.25 | Does the order exist? |

On HTTP 503 from verify, wait for the `Retry-After` header (seconds) and retry. You were not charged. Do not treat 503 as closed or unknown. For a list of URLs, send up to 8 verifies at a time (server concurrency default is 8; a short queue may absorb brief bursts).

Full schema: https://livecheck.fly.dev/openapi.json · Agent guide: https://livecheck.fly.dev/llms.txt · Live stats: https://livecheck.fly.dev/stats
