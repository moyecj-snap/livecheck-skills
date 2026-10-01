# Getting Started

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
