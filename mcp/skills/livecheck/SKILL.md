---
name: livecheck
description: |
  Primary use: clean a batch of job URLs before apply or outreach. Live status of a specific job posting, product page, or listing, read from the page itself right now, via x402. $0.01 per posting, no account or API key. Returns live / closed / unknown plus title and signals (in-stock, sold-out, apply form present, http_404). Also one-shot condition checks and 30-day URL watchers.

  USE FOR:
  - Cleaning a batch of job URLs before apply or outreach (ghost jobs, stale board rows, scraped lists)
  - Click-time check that a job posting is still open before tailoring a resume, applying, or spending the user's credits
  - The same live / closed / unknown check across Greenhouse, Lever, Workday, Ashby, SmartRecruiters, and iCIMS
  - Checking whether a product page, eBay item, or Shopify listing is still available before recommending or buying it
  - Confirming a search result (Google Shopping, job board, scraper output) isn't stale
  - Checking whether a price crossed a threshold or a keyword appeared on a page, once
  - Watching a URL for 30 days and getting a signed webhook when it changes

  TRIGGERS:
  - "clean this list", "which of these jobs are still open", "before I reach out", "ghost job"
  - "is this job still open", "position filled", "still accepting applications", "sold out"
  - "is this still available", "still live", "still in stock"
  - "posting closed", "still hiring"
  - "dead link", "404", "check these URLs", "which of these are live"
  - "before I apply", "before I buy", "before scraping"
  - "watch this page", "tell me when", "price drops below", "back in stock"

  Use agentcash.fetch for livecheck.fly.dev endpoints. Job and listing checks are $0.01 per URL; generic verify is $0.01; one-shot checks $0.02; watchers $2.50 for 30 days.

  On HTTP 503, wait for the Retry-After header (seconds) and retry. For a list of URLs, send up to 8 verifies at a time (server concurrency default is 8; a short queue may absorb brief bursts).
mcp:
  - agentcash
metadata:
  version: 3
---

# Livecheck: live status of listings, products, and job postings

Version 3. The primary use is list cleaning: a batch of job URLs, checked before apply or outreach. $0.01 per posting, x402 on Base, no account or API key. Base URL: `https://livecheck.fly.dev`.

Livecheck fetches the specific URL you already have and tells you, from the page itself, whether it's live right now. It is not a search engine: bring a URL from search, a scraper, a job board, or the user. Google Shopping, job boards, and scraped datasets are snapshots. Listings sell, postings close, and pages 404 between the crawl and your action. Livecheck reads the page at call time.

For a job posting, call `POST /v1/verify/job`. For a product page (eBay, Shopify, or other HTML product page), call `POST /v1/verify/listing`. `POST /v1/verify` is the same handler for any other specific URL.

## When to use Livecheck instead of checking it yourself

You already have a specific URL. Call Livecheck when the next step is apply, outreach, or a recommendation, and the page might already be closed.

- **List cleaning (start here).** A batch of job URLs from search, a scraper, a board, or an outreach sheet. Clean it before apply or outreach. One `POST /v1/verify/job` per posting, up to 8 at a time. Keep `live`. Drop `closed`. Flag `unknown`.
- **Ghost jobs and stale rows.** Search results, boards, and scrapes keep postings that are filled, expired, or removed. The URL still looks usable in the list. Livecheck reads that page at call time. `closed` means drop it. That is availability, not a legitimacy or fraud score.
- **Click-time verify.** The user is about to apply, or you are about to tailor a resume or send outreach. Check the posting URL at that moment.
- **Multi-ATS consistency.** Greenhouse, Lever, Workday, Ashby, SmartRecruiters, and iCIMS do not share one HTML shape. Job verify returns the same `live` / `closed` / `unknown` for each, so you do not write a separate parser for each ATS.
- **Save credits before apply.** Tailoring a resume, submitting an application, or starting outreach costs more than a $0.01 check. Verify the posting first.

Fetch the page yourself when you need the posting body (requirements, salary, location) to tailor or quote. Livecheck returns status, title, and signals. It does not log in, submit forms, or replace the job description. After a real form submit or checkout, Confirm is a separate call. Livecheck reads HTML and HTTP status and does not run JavaScript, so a JavaScript-only page may be `unknown`. Report `unknown`. Do not guess.

## Capacity

`POST /v1/verify`, `POST /v1/verify/job`, and `POST /v1/verify/listing` return HTTP 503 with a `Retry-After` header (seconds) when the check queue is full, a queued check waited too long, or the payment processor times out or errors. On 503, wait for `Retry-After` and retry. You were not charged. Do not treat 503 as `closed` or `unknown`.

For a list of URLs, send up to 8 verifies at a time. Server concurrency default is 8; a short queue may absorb brief bursts.

## Setup

See [rules/getting-started.md](rules/getting-started.md) for installation and wallet setup.

## Quick Reference

| Task | Endpoint | Price | Returns |
|------|----------|-------|---------|
| Is this job posting still open? Check one specific job URL before applying ($0.01) | `POST https://livecheck.fly.dev/v1/verify/job` | $0.01 | live / closed / unknown, title, signals, confidence |
| Is this product listing still available or sold out? Check one eBay, Shopify, or product page URL ($0.01) | `POST https://livecheck.fly.dev/v1/verify/listing` | $0.01 | live / closed / unknown, title, signals, confidence |
| Is this URL live? | `POST https://livecheck.fly.dev/v1/verify` | $0.01 | live / closed / unknown, title, signals, confidence |
| One-shot condition check | `https://livecheck.fly.dev/v1/check` | $0.02 | fired true/false for a keyword, price threshold, text change, or status change |
| Watch a URL for 30 days | `https://livecheck.fly.dev/v1/watch` | $2.50 | watcher id; signed webhook when the condition fires |
| Confirm a form submission landed | `https://livecheck.fly.dev/v1/confirm` | $0.10 | confirmed / failed / unknown, with a signed receipt |
| Confirm an order exists | `https://livecheck.fly.dev/v1/confirm/order` | $0.25 | confirmed / failed / unknown, with a signed receipt |

Call `agentcash.check_endpoint_schema(url=...)` before the first call to any endpoint to get the exact request schema.

## Examples

### Clean a batch of job URLs before apply or outreach

Primary use. You already have the posting URLs (search, a scraper, a board export, an outreach sheet).

- [ ] `POST /v1/verify/job` once per URL
- [ ] Send up to 8 verifies at a time. Server concurrency default is 8; a short queue may absorb brief bursts.
- [ ] On HTTP 503, wait for the `Retry-After` header (seconds) and retry. You were not charged. Do not treat 503 as `closed` or `unknown`.
- [ ] Skip `closed` (position filled, no longer accepting applications, expired, 404)
- [ ] Flag `unknown` for the user
- [ ] Tailor, apply, or reach out only on `live`

```mcp
agentcash.fetch(
  url="https://livecheck.fly.dev/v1/verify/job",
  method="POST",
  body={
    "url": "https://jobs.example.com/careers/12345"
  }
)
```

### Check a product listing before recommending

- [ ] Get candidate product URLs (eBay, Shopify, or other HTML product pages)
- [ ] Check the top 3–5 with `POST /v1/verify/listing`
- [ ] Recommend only `live` items; mention any that were `closed`

```mcp
agentcash.fetch(
  url="https://livecheck.fly.dev/v1/verify/listing",
  method="POST",
  body={
    "url": "https://merchant.example.com/p/12345"
  }
)
```

### Clean a mixed URL list

- [ ] Job postings: `POST /v1/verify/job`. Product pages: `POST /v1/verify/listing`. Other specific URLs: `POST /v1/verify`. One call per URL.
- [ ] Send up to 8 verifies at a time. Server concurrency default is 8; a short queue may absorb brief bursts.
- [ ] On HTTP 503, wait for the `Retry-After` header (seconds) and retry. You were not charged. Do not treat 503 as `closed` or `unknown`.
- [ ] Return three groups: live, closed, unknown

## Job: is this posting still open?

```mcp
agentcash.fetch(
  url="https://livecheck.fly.dev/v1/verify/job",
  method="POST",
  body={
    "url": "https://jobs.example.com/careers/12345"
  }
)
```

POST `{"url"}` for one specific job posting page. Works on company careers pages and applicant tracking systems such as Greenhouse, Lever, Workday, Ashby, SmartRecruiters, and iCIMS. Use it before tailoring a resume, before submitting an application, and to remove stale postings from job search results. Not a job search: bring the posting URL. Reads HTML only.

## Listing: is this product still available or sold out?

```mcp
agentcash.fetch(
  url="https://livecheck.fly.dev/v1/verify/listing",
  method="POST",
  body={
    "url": "https://www.ebay.com/itm/256789012345"
  }
)
```

POST `{"url"}` for one specific product page or marketplace listing. Works on eBay item pages, Shopify product pages, and standard HTML product pages. Use it before recommending a product, before adding to cart or buying, and to remove sold-out or deleted items from shopping results. Not a product search: bring the item URL. Reads HTML only. Availability only, not legitimacy or fraud risk.

## Verify: any specific URL

`POST /v1/verify` uses the same handler and response as `/v1/verify/job` and `/v1/verify/listing`. Prefer job or listing when the page is a posting or a product. Use verify for any other specific URL.

```mcp
agentcash.fetch(
  url="https://livecheck.fly.dev/v1/verify",
  method="POST",
  body={
    "url": "https://example.com/item/12345"
  }
)
```

**Parameters (job, listing, and verify):**
- `url` - Absolute http(s) URL of one specific item page (required). Not a search-results page, category page, or homepage.

**Returns:**
- `status` - `live`, `closed`, or `unknown`
- `title` - Page title of the item
- `signals` - Evidence strings from production (not snake_case kit names). Examples: `http_404`, `http_410`, `close_language:<phrase>`, `redirected_to_board`, `ats_empty_state`, `ats_api_missing`, `ats_api_listed`, `challenge_page`, `loginwalled`, `not_a_specific_posting`, `careers_homepage`, `collection_or_category`, `apply form present`, `no closure banner`, `sold-out`, `in-stock`, `ambiguous_html`. eBay adapter may add `ebay-ended`, `ebay-in-stock`, `ebay_availability_unknown`. There is no `invalid_url` code; errors are `{ "error": "<message>" }` (400 for bad URL/JSON, 502 fetch fail, 503 over capacity or payment processor, 504 timeout). On 503, wait for the `Retry-After` header (seconds) and retry. You were not charged. Do not treat 503 as `closed` or `unknown`.
- `http_status`, `canonical_url`, `checked_at`
- `confidence` - 0 to 1
- `price_usd` - Fixed price for this call (0.01 for verify routes)
- `route` - API path after `/v1/` with no leading slash: `verify`, `verify/job`, or `verify/listing` (matches production Fly responses)
- `watch` - Present on paid 200 only: `{ "suggest": "/v1/watch", "detector": "status_change", "price_usd": 2.5 }`

**How to act on it:**
- `live` → proceed (recommend, apply, add to cart)
- `closed` → drop it and tell the user it's no longer available
- `unknown` → the page couldn't be read reliably (login wall, heavy JavaScript, bot block). Say so; don't guess
- HTTP 503 → wait for the `Retry-After` header (seconds) and retry. You were not charged. Do not treat 503 as `closed` or `unknown`

Livecheck reads HTML and HTTP status. It does not execute JavaScript, so single-page apps may return `unknown`. Status means availability only, not legitimacy or fraud risk.

## Check: one-shot condition on a page

```mcp
agentcash.fetch(
  url="https://livecheck.fly.dev/v1/check",
  method="POST",
  body={
    "target": {
      "type": "url",
      "url": "https://shop.example.com/products/widget"
    },
    "condition": {
      "detector": "numeric_threshold",
      "params": {
        "selector": ".price",
        "op": "lt",
        "value": 120
      }
    }
  }
)
```

**Detectors:**
- `status_change` - live/closed/HTTP class changed vs. a previous `baseline_hash`
- `keyword` - `params.any` / `all` / `none` string arrays, optional `selector`
- `text_diff` - `params.selector` strongly recommended; `params.min_change_ratio` default 0.02
- `numeric_threshold` - `params.selector`, `params.op` (`lt`, `lte`, `gt`, `gte`, `eq`, `change_pct`), `params.value`

Save `observation.hash` from the response and pass it as `baseline_hash` next time to compare.

## Watch: 30-day watcher with webhook

```mcp
agentcash.fetch(
  url="https://livecheck.fly.dev/v1/watch",
  method="POST",
  body={
    "target": {
      "type": "url",
      "url": "https://www.ebay.com/itm/256789012345"
    },
    "condition": {
      "detector": "status_change"
    },
    "callback": {
      "url": "https://your-agent.example.com/hooks/livecheck",
      "secret": "choose-a-secret"
    },
    "interval_s": 900
  }
)
```

Callback is optional. If you have a public HTTPS endpoint, pass `callback.url` + `secret` and Livecheck HMAC-posts when the condition fires. If you omit `callback`, pull history with `GET /v1/watch/{id}/events` and header `X-Livecheck-Owner-Token`. The response returns an `owner_token` once; store it. If you only need a one-shot check, use `/v1/check` instead of a watcher.

## Confirm: did the form or order actually go through?

Use after an agent submits a lead/contact/application form or completes a checkout. Pass the thank-you or order-status page URL.

```mcp
agentcash.fetch(
  url="https://livecheck.fly.dev/v1/confirm",
  method="POST",
  body={
    "url": "https://example.com/thank-you?ref=A1B2C3",
    "intent": "lead_submit"
  }
)

agentcash.fetch(
  url="https://livecheck.fly.dev/v1/confirm/order",
  method="POST",
  body={
    "url": "https://shop.example.com/orders/48213",
    "intent": "order_placed"
  }
)
```

`confirmed` requires a durable confirmation / ref / order id on the page. A thank-you message alone returns `unknown`. Every response includes a signed receipt verifiable at `GET /v1/receipt/{id}`.

## Cost Estimation

| Task | Calls | Cost |
|------|-------|------|
| Clean a batch of 100 job URLs before apply or outreach | 100 | $1.00 |
| Check one job posting | 1 | $0.01 |
| Check one product listing | 1 | $0.01 |
| Check top 5 shopping results | 5 | $0.05 |
| One-shot price or keyword check | 1 | $0.02 |
| Watch one URL for 30 days | 1 | $2.50 |
| Confirm a form submission | 1 | $0.10 |
| Confirm an order | 1 | $0.25 |
