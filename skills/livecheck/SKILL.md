---
name: livecheck
description: |
  Live status of a specific listing, product page, or job posting, read from the page itself right now, via x402. Returns live / closed / unknown plus title and signals (in-stock, sold-out, apply form, 404). Also one-shot condition checks and 30-day URL watchers.

  USE FOR:
  - Checking whether a product page, eBay item, or Shopify listing is still available before recommending or buying it
  - Checking whether a job posting is still open before tailoring a resume or applying
  - Cleaning a list of URLs (leads, listings, jobs) down to the ones that are still live
  - Confirming a search result (Google Shopping, job board, scraper output) isn't stale
  - Checking whether a price crossed a threshold or a keyword appeared on a page, once
  - Watching a URL for 30 days and getting a signed webhook when it changes

  TRIGGERS:
  - "is this still available", "still live", "still in stock", "sold out"
  - "is this job still open", "posting closed", "still hiring"
  - "dead link", "404", "check these URLs", "which of these are live"
  - "before I apply", "before I buy", "before scraping"
  - "watch this page", "tell me when", "price drops below", "back in stock"

  Use `npx agentcash@latest fetch` for livecheck.fly.dev endpoints. Verify is $0.01 per URL; one-shot checks $0.02; watchers $2.50 for 30 days.
metadata:
  version: 1
---

# Livecheck: live status of listings, products, and job postings

Livecheck fetches the specific URL you already have and tells you, from the page itself, whether it's live right now. It is not a search engine: bring a URL from search, a scraper, a job board, or the user.

Why use it instead of trusting search results: Google Shopping, job boards, and scraped datasets are snapshots. Listings sell, postings close, and pages 404 between the crawl and your action. Livecheck reads the page at call time.

## Setup

See [rules/getting-started.md](rules/getting-started.md) for installation and wallet setup.

## Quick Reference

| Task | Endpoint | Price | Returns |
|------|----------|-------|---------|
| Is this URL live? | `https://livecheck.fly.dev/v1/verify` | $0.01 | live / closed / unknown, title, signals, confidence |
| One-shot condition check | `https://livecheck.fly.dev/v1/check` | $0.02 | fired true/false for a keyword, price threshold, text change, or status change |
| Watch a URL for 30 days | `https://livecheck.fly.dev/v1/watch` | $2.50 | watcher id; signed webhook when the condition fires |
| Confirm a form submission landed | `https://livecheck.fly.dev/v1/confirm` | $0.10 | confirmed / failed / unknown, with a signed receipt |
| Confirm an order exists | `https://livecheck.fly.dev/v1/confirm/order` | $0.25 | confirmed / failed / unknown, with a signed receipt |

Run `npx agentcash@latest check <url>` before the first call to any endpoint to get the exact request schema.

## Verify: is this listing / product / job still live?

```bash
npx agentcash@latest fetch https://livecheck.fly.dev/v1/verify -m POST -b '{"url": "https://www.ebay.com/itm/256789012345"}'
```

**Parameters:**
- `url` - Absolute http(s) URL of one specific item page (required). Not a search-results page, category page, or homepage.

**Returns:**
- `status` - `live`, `closed`, or `unknown`
- `title` - Page title of the item
- `signals` - Evidence behind the status, e.g. `in_stock`, `sold_out`, `apply_form`, `ended_banner`, `http_404`
- `http_status`, `canonical_url`, `checked_at`
- `confidence` - 0 to 1

**How to act on it:**
- `live` → proceed (recommend, apply, add to cart)
- `closed` → drop it and tell the user it's no longer available
- `unknown` → the page couldn't be read reliably (login wall, heavy JavaScript, bot block). Say so; don't guess

Livecheck reads HTML and HTTP status. It does not execute JavaScript, so single-page apps may return `unknown`. Status means availability only, not legitimacy or fraud risk.

## Check: one-shot condition on a page

```bash
npx agentcash@latest fetch https://livecheck.fly.dev/v1/check -m POST -b '{
  "target": {"type": "url", "url": "https://shop.example.com/products/widget"},
  "condition": {"detector": "numeric_threshold", "params": {"selector": ".price", "op": "lt", "value": 120}}
}'
```

**Detectors:**
- `status_change` - live/closed/HTTP class changed vs. a previous `baseline_hash`
- `keyword` - `params.any` / `all` / `none` string arrays, optional `selector`
- `text_diff` - `params.selector` strongly recommended; `params.min_change_ratio` default 0.02
- `numeric_threshold` - `params.selector`, `params.op` (`lt`, `lte`, `gt`, `gte`, `eq`, `change_pct`), `params.value`

Save `observation.hash` from the response and pass it as `baseline_hash` next time to compare.

## Watch: 30-day watcher with webhook

```bash
npx agentcash@latest fetch https://livecheck.fly.dev/v1/watch -m POST -b '{
  "target": {"type": "url", "url": "https://www.ebay.com/itm/256789012345"},
  "condition": {"detector": "status_change"},
  "callback": {"url": "https://your-agent.example.com/hooks/livecheck", "secret": "choose-a-secret"},
  "interval_s": 900
}'
```

Requires a public HTTPS callback URL. The response returns an `owner_token` once; store it. Read history later with `GET /v1/watch/{id}/events` and header `X-Livecheck-Owner-Token`. If you don't have a public HTTPS endpoint, use `/v1/check` on a schedule instead.

## Confirm: did the form or order actually go through?

Use after an agent submits a lead/contact/application form or completes a checkout. Pass the thank-you or order-status page URL.

```bash
npx agentcash@latest fetch https://livecheck.fly.dev/v1/confirm -m POST -b '{"url": "https://example.com/thank-you?ref=A1B2C3", "intent": "lead_submit"}'
npx agentcash@latest fetch https://livecheck.fly.dev/v1/confirm/order -m POST -b '{"url": "https://shop.example.com/orders/48213", "intent": "order_placed"}'
```

`confirmed` requires a durable confirmation / ref / order id on the page. A thank-you message alone returns `unknown`. Every response includes a signed receipt verifiable at `GET /v1/receipt/{id}`.

## Workflows

### Check search results before recommending

- [ ] Get candidate product/listing URLs (e.g., Google Shopping via news-shopping skill)
- [ ] Verify the top 3–5 URLs
- [ ] Recommend only `live` items; mention any that were `closed`

```bash
npx agentcash@latest fetch https://livecheck.fly.dev/v1/verify -m POST -b '{"url": "https://merchant.example.com/p/12345"}'
```

### Clean a job list before applying

- [ ] Verify each posting URL
- [ ] Skip `closed`; flag `unknown` for the user
- [ ] Tailor and apply only to `live` postings

### Clean a URL list

- [ ] Verify each URL (one call per URL)
- [ ] Return three groups: live, closed, unknown

## Cost Estimation

| Task | Calls | Cost |
|------|-------|------|
| Check one listing or job | 1 | $0.01 |
| Check top 5 shopping results | 5 | $0.05 |
| Clean a list of 100 URLs | 100 | $1.00 |
| One-shot price or keyword check | 1 | $0.02 |
| Watch one URL for 30 days | 1 | $2.50 |
| Confirm a form submission | 1 | $0.10 |
| Confirm an order | 1 | $0.25 |
