# Getting Started

Version 3. $0.01 per posting, x402 on Base, no account or API key. Base URL: `https://livecheck.fly.dev`.

## When to use Livecheck instead of checking it yourself

You already have a specific URL. Call Livecheck instead of fetching the posting page and deciding yourself:

- **List cleaning (start here).** A batch of job URLs before apply or outreach. `POST /v1/verify/job` once per URL, up to 8 at a time. Keep `live`. Drop `closed`. Flag `unknown`.
- **Ghost jobs and stale rows.** The link is still in a board or scrape after the role was filled, expired, or removed. Livecheck reads the page at call time. Availability only, not a legitimacy score.
- **Click-time verify.** Check the posting when the user is about to apply, or when you are about to tailor a resume or send outreach.
- **Multi-ATS consistency.** Greenhouse, Lever, Workday, Ashby, SmartRecruiters, and iCIMS return the same `live` / `closed` / `unknown`, so you do not write a separate parser for each ATS.
- **Save credits before apply.** A $0.01 check before a tailored resume, an application, or outreach.

Fetch the page yourself when you need the posting body to tailor or quote. Livecheck returns status, title, and signals. It does not log in or submit forms. After a real submit, Confirm is a separate call.

## Clean a batch of job URLs before apply or outreach

Primary use. One call per posting. Send up to 8 verifies at a time. On HTTP 503, wait for the `Retry-After` header (seconds) and retry. You were not charged. Do not treat 503 as closed or unknown.

```mcp
agentcash.fetch(
  url="https://livecheck.fly.dev/v1/verify/job",
  method="POST",
  body={
    "url": "https://jobs.example.com/careers/12345"
  }
)
```

For a product page, use `POST /v1/verify/listing`. For any other specific URL, use `POST /v1/verify`.

## Setup

1. **Install the agentcash MCP:**
   ```bash
   npx agentcash@latest install --client claude-code -y
   ```

2. **Check wallet:**
   ```mcp
   agentcash.get_balance()
   ```

3. **Fund wallet** (if needed):
   - Redeem invite: `agentcash.redeem_invite(code="YOUR_CODE")`
   - Or call `agentcash.list_accounts()` to get Base deposit links and wallet addresses

4. **Confirm the schema before the first call:**
   ```mcp
   agentcash.check_endpoint_schema(url="https://livecheck.fly.dev/v1/verify")
   ```

Livecheck settles in USDC on Base.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "MCP tool not found" | Run install command, restart your client |
| "Insufficient balance" | Fund wallet with USDC on Base |
| "Payment failed" | Check balance, retry (transient errors) |
| 400 `invalid_url` | Use one specific item URL, not a search or category page |
| `status: unknown` | Page is login-walled, JavaScript-only, or blocked. Report it as unknown; don't retry in a loop |
| HTTP 503 | Wait for the `Retry-After` header (seconds) and retry. You were not charged. Do not treat 503 as closed or unknown |
| A list of URLs | Send up to 8 verifies at a time. Server concurrency default is 8; a short queue may absorb brief bursts |
| 400 `unsupported_intent` on confirm | `order_placed` goes to `/v1/confirm/order`; `lead_submit` and `listing_published` go to `/v1/confirm` |
