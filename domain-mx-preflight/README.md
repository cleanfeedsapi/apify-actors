# Domain MX Preflight: dead / no-MX / disposable filter | $0.50/1K

**Quick start**

- MX record check API for a list of domains: one JSON row per domain with MX hosts, A record, HTTPS status, disposable flag and a single `verdict` you can filter on before paying for enrichment.
- Minimal input: `{"domains": ["stripe.com", "mailinator.com"]}`
- Run it from the Console, the API, or the Apify MCP server; export JSON, CSV or Excel.

Filter a sheet of **domains** (or emails, reduced to **domain only**) **before** you burn Apollo / Clay / NeverBounce credits. Each row gets public DNS-over-HTTPS MX + A answers plus an HTTPS apex probe. No HTML scraping, no login, no proxies, no API keys.

**GDPR:** if you pass emails, the Actor strips the local part immediately and **never** writes it to the dataset. Only the domain is checked and stored.

## Why this instead of scraping or the vendor API

- DNS over HTTPS from two public resolvers. MX and A are read from `dns.google/resolve` as JSON, with `cloudflare-dns.com/dns-query` as the fallback when Google fails. No resolver library, no UDP, no key.
- Facts, not scores. Every row carries the raw answers (`mx_hosts`, `has_a`, `http_status`, `final_url`) next to the `verdict`, so you can apply your own rule instead of trusting an opaque deliverability score.
- One verdict for the filter step: `disposable`, `dead` (no MX and no A), `no_mx`, `redirects` (apex lands on another registrable domain) or `ok`, computed in that order.
- Emails never leave memory. `user@example.com` becomes `example.com` before any network call. Set `emailsAllowed: false` and email-shaped inputs are rejected as error rows instead.
- Cheap by design. At $0.50 per 1,000 rows and 10 parallel checks by default (up to 50), the preflight costs a fraction of one enrichment credit per contact.

## What you get

| Field | Meaning |
|---|---|
| `domain` | Normalized domain that was checked |
| `has_mx` / `mx_hosts` | DoH MX present + exchange hostnames |
| `has_a` | DoH A present |
| `http_status` / `final_url` | HTTPS probe of `https://{domain}` (8s timeout), after redirects |
| `redirect_to_other_domain` | Final host eTLD+1 differs from input domain |
| `is_disposable` | Hit on bundled ~300 disposable mailbox domains |
| `verdict` | `ok` \| `no_mx` \| `dead` \| `disposable` \| `redirects` |
| `checked_at` | ISO 8601 |

## How it resolves DNS

| Step | Endpoint |
|---|---|
| Primary DoH | `https://dns.google/resolve?name={domain}&type=MX\|A` (JSON) |
| Fallback DoH | `https://cloudflare-dns.com/dns-query?name={domain}&type=MX\|A` with `accept: application/dns-json` |
| Apex probe | `HEAD`/`GET` `https://{domain}` follow redirects, 8s timeout |

## Input examples

```json
{ "domains": ["stripe.com", "mailinator.com", "no-such-host-ccc.invalid"] }
```

```json
{ "domains": ["ops@example.com", "https://www.github.com"], "emailsAllowed": true, "concurrency": 10 }
```

| Field | Type | Default | Notes |
|---|---|---|---|
| `domains` | string list | 20 well-known + 3 `.invalid` dead samples | Empty Console run uses this default and finishes under 3 minutes |
| `emailsAllowed` | boolean | `true` | Strip `local@` immediately; never store it |
| `concurrency` | integer | `10` | Parallel checks, max 50 |

## Output example

```json
{ "input": "google.com", "domain": "google.com", "has_mx": true,
  "mx_hosts": ["smtp.google.com"], "has_a": true, "http_status": 200,
  "final_url": "https://www.google.com/", "redirect_to_other_domain": false,
  "is_disposable": false, "verdict": "ok", "checked_at": "2026-11-02T16:14:00.000Z" }
```

A bad item does **not** abort the run: it yields one row with `error`, and the rest continue. Only complete rows are charged.

**Not included, by design:** parked-IP heuristics, WHOIS, people enrichment, SMTP RCPT probes, HTML parsing.

## How much does it cost?

Pay per event: **$0.50 per 1,000 domain rows** (`domain` event, $0.0005 each) plus Apify's small Actor-start event. Platform compute is on us. Set a maximum charge per run in the Console and the Actor stops at the limit. The Apify free plan is enough to try the default sample list.

## Use cases

- **Outbound / agency sheets**: drop `verdict!=ok` before Clay / Apollo / Lusha.
- **n8n / Make**: Schedule, then this Actor, then Filter, then the paid enrich node.
- **AI agents**: cheap preflight tool over Apify MCP so the agent does not waste enrichment credits on dead domains.

## Integrations

- **Apify API**: `POST https://api.apify.com/v2/acts/cleanfeedsapi~domain-mx-preflight/run-sync-get-dataset-items?token=<APIFY_TOKEN>` with the input JSON as the body. The response is the dataset, ready to filter on `verdict`.
- **Scheduling**: open the Actor in the Apify Console, click Schedule, pick a cron (for example weekly) and the saved input runs on its own. Each run keeps its own dataset.
- **n8n, Make, Zapier**: use the Apify integration in each tool, choose this Actor and pass the same input JSON. No per-Actor setup, no custom code.
- **Apify MCP server for AI agents**: connect the Apify MCP server to Claude, Cursor or any MCP client and ask the agent to run `cleanfeedsapi/domain-mx-preflight` with these inputs.

## Related Actors by CleanFeeds

- [shopify-products-feed](https://apify.com/cleanfeedsapi/shopify-products-feed): Shopify storefront `products.json` with a change filter.
- [github-repo-search](https://apify.com/cleanfeedsapi/github-repo-search): new and trending repositories by topic, language or date.
- [ats-jobs-feed](https://apify.com/cleanfeedsapi/ats-jobs-feed): Greenhouse, Lever, Ashby, Workday, SmartRecruiters and Recruitee boards in one schema.
- [app-store-reviews](https://apify.com/cleanfeedsapi/app-store-reviews): Apple App Store customer reviews via the public RSS JSON.

More feeds at [cleanfeeds.dev](https://cleanfeeds.dev).

## FAQ

**Do I need a Google or Cloudflare API key?** No. Both DoH JSON endpoints are public and unauthenticated.

**Is this HTML scraping?** No. DNS is DoH JSON; the HTTP probe only records status and final URL.

**What if I pass an email?** With `emailsAllowed: true` (default) only the domain is kept. The local part is discarded in memory and never appears in the dataset.

**One domain fails, what happens?** One `error` row; other domains still complete.

**Parked domains?** Out of scope. We report MX/A/HTTP facts; we do not classify parking ranges.

**How do I detect new and closed items between runs?** `domain` is the normalized key (lowercase, scheme, path and `www.` removed). Re-run the same list on a schedule and compare `verdict` per `domain` against the previous dataset: a domain that moved from `ok` to `no_mx` or `dead` has lost mail or hosting since the last check, and `checked_at` tells you when each run observed it.

**What happens when a source fails?** Two layers. If an input is empty, malformed, or an email while `emailsAllowed` is `false`, the Actor pushes one row with `input: null`, `domain: null`, `error` and `checked_at`; that row is not charged and the rest continue. If the HTTPS probe times out or is refused, that is not an error: `http_status` and `final_url` are `null`, `redirect_to_other_domain` is `false`, and the DNS answers still decide the verdict. If both Google and Cloudflare DoH fail for a domain, that domain becomes an error row with the DoH status in the message.
