# Livecheck Skills

Agent skills for [Livecheck](https://livecheck.fly.dev): live status of listings, product pages, and job postings, read from the page at call time. Pay per call in USDC on Base via x402, using the [agentcash](https://agentcash.dev) wallet.

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
| `POST /v1/verify` | $0.01 | Is this listing / product / job still live? |
| `POST /v1/check` | $0.02 | One-shot keyword, price-threshold, or change check |
| `POST /v1/watch` | $2.50 | 30-day URL watcher with signed webhook |
| `POST /v1/confirm` | $0.10 | Did the form submission land? |
| `POST /v1/confirm/order` | $0.25 | Does the order exist? |

Full schema: https://livecheck.fly.dev/openapi.json · Agent guide: https://livecheck.fly.dev/llms.txt · Live stats: https://livecheck.fly.dev/stats
