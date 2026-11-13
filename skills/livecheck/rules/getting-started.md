# Getting Started

Version 4.1.2. Verify is exactly $0.01, paid with Base USDC (x402) or MPP. Check, watch, and confirm stay x402 on Base. No account or API key. Base URL: `https://livecheck.fly.dev`.

No wallet yet? Sign in with GitHub at https://livecheck.fly.dev/keys. 200 free checks over 30 days, no wallet needed. A starter key covers `POST /v1/verify`, `/v1/verify/job`, and `/v1/verify/listing`; send it as `Authorization: Bearer <key>`. Check, watch, and confirm stay on a wallet. When the checks run out, call the same route without the key to pay with a wallet.

Try it free in a browser: https://livecheck.fly.dev/job?ref=clawhub

With MPP: Paid answers, including the checked link, are kept for 24 hours so retries are safe, then deleted. Retries are still capped: After payment_status_unknown, retry at most 2 times (each after Retry-After), reusing the same payment credential; then stop and report the payment_status_unknown error to the user instead of retrying again.

## When to use Livecheck instead of checking it yourself

You already have a specific URL. Call Livecheck instead of fetching the posting page and deciding yourself:

- **List cleaning (start here).** A batch of job URLs before apply or outreach. `POST /v1/verify/job` once per URL, up to 8 at a time. Keep `live`. Drop `closed`. Flag `unknown`.
- **Ghost jobs and stale rows.** The link is still in a board or scrape after the role was filled, expired, or removed. Livecheck reads the page at call time. Availability only, not a legitimacy score.
- **Click-time verify.** Check the posting when the user is about to apply, or when you are about to tailor a resume or send outreach.
- **Multi-ATS consistency.** Greenhouse, Lever, Workday, Ashby, SmartRecruiters, and iCIMS return the same `live` / `closed` / `unknown`, so you do not write a separate parser for each ATS.
- **Save credits before apply.** A $0.01 check before a tailored resume, an application, or outreach.

Fetch the page yourself when you need the posting body to tailor or quote. Livecheck returns status, title, and signals. It does not log in or submit forms. After a real submit, Confirm is a separate call.

## Clean a batch of job URLs before apply or outreach

Primary use. One call per posting. Send up to 8 verifies at a time. On HTTP 503, read `error` and wait for that response's `Retry-After` header (seconds). Do not treat 503 as `closed` or `unknown`. A busy 503 (`error` `over_capacity` or x402 `processor_unavailable`) keeps "You were not charged." in `message` and its own `Retry-After`; wait that long and retry. An x402 503 with `error` `payment_status_unknown` means the settle ran past 5 seconds. `message` is "Payment status unknown. Don't retry for 60 seconds. If you were charged and got no answer, we'll refund it." `Retry-After` is 60. Do not retry with a new payment for 60 seconds. Retry with the same credential, not a new payment. After payment_status_unknown, retry at most 2 times (each after Retry-After), reusing the same payment credential; then stop and report the payment_status_unknown error to the user instead of retrying again. A late settle is a refund candidate that Craig approves manually. An MPP 503 with `error` `payment_unconfirmed` means the payment could not be confirmed: a possible charge is logged for refund. Retry with the same credential, not a new payment.

```bash
npx agentcash@0.17.1 fetch https://livecheck.fly.dev/v1/verify/job -m POST -b '{"url": "https://jobs.example.com/careers/12345"}'
```

For a product page, use `POST /v1/verify/listing`. For any other specific URL, use `POST /v1/verify`.

## Setup

1. **Install the agentcash CLI:**
   ```bash
   npm install -g agentcash@0.17.1
   ```

2. **Check wallet:**
   ```bash
   npx agentcash@0.17.1 balance
   ```

3. **Fund wallet** (if needed):
   - Redeem invite: `npx agentcash@0.17.1 redeem YOUR_CODE`
   - Or run `npx agentcash@0.17.1 accounts` to get Base deposit links and wallet addresses

4. **Confirm the schema before the first call:**
   ```bash
   npx agentcash@0.17.1 check https://livecheck.fly.dev/v1/verify
   ```

Verify settles exactly $0.01 with Base USDC (x402) or MPP. Check, watch, and confirm stay x402 on Base.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Command not found" | Run `npm install -g agentcash@0.17.1` |
| "Insufficient balance" | Fund wallet with USDC on Base |
| "Payment failed" | Check balance, retry (transient errors). For an HTTP 503 `payment_status_unknown`, see the HTTP 503 row: After payment_status_unknown, retry at most 2 times (each after Retry-After), reusing the same payment credential; then stop and report the payment_status_unknown error to the user instead of retrying again. |
| 400 `invalid_url` | Use one specific item URL, not a search or category page |
| `status: unknown` | Page is login-walled, JavaScript-only, or blocked. Report it as unknown; don't retry in a loop |
| HTTP 503 | On HTTP 503, read `error` and wait for that response's `Retry-After` header (seconds). Do not treat 503 as `closed` or `unknown`. A busy 503 (`error` `over_capacity` or x402 `processor_unavailable`) keeps "You were not charged." in `message` and its own `Retry-After`; wait that long and retry. An x402 503 with `error` `payment_status_unknown` means the settle ran past 5 seconds. `message` is "Payment status unknown. Don't retry for 60 seconds. If you were charged and got no answer, we'll refund it." `Retry-After` is 60. Do not retry with a new payment for 60 seconds. Retry with the same credential, not a new payment. After payment_status_unknown, retry at most 2 times (each after Retry-After), reusing the same payment credential; then stop and report the payment_status_unknown error to the user instead of retrying again. A late settle is a refund candidate that Craig approves manually. An MPP 503 with `error` `payment_unconfirmed` means the payment could not be confirmed: a possible charge is logged for refund. Retry with the same credential, not a new payment. |
| A list of URLs | Send up to 8 verifies at a time. Server concurrency default is 8; a short queue may absorb brief bursts |
| 400 `unsupported_intent` on confirm | `order_placed` goes to `/v1/confirm/order`; `lead_submit` and `listing_published` go to `/v1/confirm` |
