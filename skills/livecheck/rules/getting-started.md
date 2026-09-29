# Getting Started

## Setup

1. **Install the agentcash CLI:**
   ```bash
   npm install -g agentcash
   ```

2. **Check wallet:**
   ```bash
   npx agentcash@latest balance
   ```

3. **Fund wallet** (if needed):
   - Redeem invite: `npx agentcash@latest redeem YOUR_CODE`
   - Or run `npx agentcash@latest accounts` to get Base deposit links and wallet addresses

4. **Confirm the schema before the first call:**
   ```bash
   npx agentcash@latest check https://livecheck.fly.dev/v1/verify
   ```

Livecheck settles in USDC on Base.

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "Command not found" | Run `npm install -g agentcash` |
| "Insufficient balance" | Fund wallet with USDC on Base |
| "Payment failed" | Check balance, retry (transient errors) |
| 400 `invalid_url` | Use one specific item URL, not a search or category page |
| `status: unknown` | Page is login-walled, JavaScript-only, or blocked. Report it as unknown; don't retry in a loop |
| 400 `unsupported_intent` on confirm | `order_placed` goes to `/v1/confirm/order`; `lead_submit` and `listing_published` go to `/v1/confirm` |
