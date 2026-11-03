# GitHub Repo Search: Topic / Language / Date | $2/1K

**Quick start**

- GitHub repo search API as a dataset: one JSON row per public repository matching each query, with stars, forks, language, topics, license, timestamps and owner.
- Minimal input: `{"queries": ["topic:mcp stars:>50"]}`
- Run it from the Console, the API, or the Apify MCP server; export JSON, CSV or Excel.

Find **new and trending public GitHub repositories** by topic, language, or date window via the **official GitHub REST Search API**. No HTML scraping, no login wall, no proxies. Pass the same query syntax you use on github.com/search (`topic:mcp`, `language:Rust`, `created:>2026-10-01`).

You get one dataset row per repo: full name, URL, description, language, stars, forks, open issues, topics, license, created/updated/pushed timestamps, archived flag, owner.

## Why this instead of scraping or the vendor API

- It is the vendor API, with the plumbing done. The Actor calls `GET https://api.github.com/search/repositories` with `per_page=100` and pages through the results, so you get a flat dataset instead of writing pagination and rate-limit code.
- The Search API caps every query at 1,000 results (10 pages of 100). The Actor stops there and says so. To cover more, split one broad query into several narrow ones (`stars:>500`, `stars:100..500`, monthly `created:` windows) and pass them all in `queries`.
- Rate limits are respected, not fought. Unauthenticated search allows 10 requests per minute, 30 with a token. The Actor reads `X-RateLimit-Remaining` and `X-RateLimit-Reset` and sleeps until reset when the budget hits zero, then continues.
- Optional token, never required. Pass a personal access token in the secret `token` field only when you run many pages or many queries.
- The github.com trending page has no API and changes daily with no history. A scheduled run of `created:>` or `pushed:>` queries gives you a reproducible dataset per day.

## What you get

| Field | Meaning |
|---|---|
| `query` | the search string that produced this row |
| `full_name` | `owner/repo` |
| `url` | `https://github.com/owner/repo` |
| `description` | repo description (or `null`) |
| `language` | primary language (or `null`) |
| `stars`, `forks`, `open_issues` | counts from the Search API |
| `topics` | string array of topic tags |
| `license` | SPDX id when GitHub knows it (else `null`) |
| `created_at`, `updated_at`, `pushed_at` | ISO 8601 |
| `archived` | boolean |
| `owner`, `owner_type` | login + `User` / `Organization` |

A query that fails (bad syntax, HTTP error) does **not** abort the run: it yields one row with `query` and `error`, and other queries continue.

**Not included, by design:** profile / follower scraping, private repos, code search, commit contents, README bodies. This Actor is a narrow **repo discovery feed** for topic/language/date windows.

## Input examples

```json
{ "queries": ["topic:mcp stars:>50"], "sort": "stars", "maxReposPerQuery": 200 }
```

```json
{
  "queries": [
    "created:>2026-10-01 language:Rust",
    "topic:llm stars:>100 pushed:>2026-09-01"
  ],
  "sort": "updated",
  "maxReposPerQuery": 100
}
```

| Field | Type | Default | Notes |
|---|---|---|---|
| `queries` | string list | `topic:mcp stars:>50` | GitHub search syntax |
| `sort` | enum | `stars` | `stars` \| `updated` \| `forks` |
| `maxReposPerQuery` | integer | `200` | hard-capped at **1000** (GitHub Search API limit); `0` = 1000 |
| `token` | secret string | empty | optional PAT; raises Search rate limit 10 to 30 req/min |

## Output example

```json
{
  "query": "topic:mcp stars:>50",
  "full_name": "modelcontextprotocol/servers",
  "url": "https://github.com/modelcontextprotocol/servers",
  "description": "Model Context Protocol Servers",
  "language": "TypeScript",
  "stars": 12000,
  "forks": 1500,
  "open_issues": 80,
  "topics": ["mcp", "ai"],
  "license": "MIT",
  "created_at": "2024-11-19T00:00:00Z",
  "updated_at": "2026-11-01T12:00:00Z",
  "pushed_at": "2026-11-01T11:30:00Z",
  "archived": false,
  "owner": "modelcontextprotocol",
  "owner_type": "Organization"
}
```

## How much does it cost?

Pay per event: **$2.00 per 1,000 repo rows** (`repo` event, $0.002 each) plus Apify's small Actor-start event. Platform compute is on us. Set a maximum charge per run in the Console and the Actor stops at the limit. The Apify free plan is enough to try the sample query.

## Rate limits

GitHub Search API: **10 req/min** unauthenticated, **30 req/min** with a token. This Actor reads `X-RateLimit-Remaining` / `X-RateLimit-Reset` and sleeps until reset when remaining hits 0. Max **1000 results per query** (GitHub hard cap, 10 pages × 100).

## Use cases

- **Trend / launch radar**: `created:>YYYY-MM-DD language:...` or `topic:...` daily, catch new repos in a niche.
- **Competitive / ecosystem maps**: dump top starred repos for a topic into a sheet.
- **AI agents / MCP**: "list hot Rust repos this month" without browser automation.
- **Monitoring**: schedule weekly, diff `full_name` sets for newcomers above a stars threshold.

## Integrations

- **Apify API**: `POST https://api.apify.com/v2/acts/cleanfeedsapi~github-repo-search/run-sync-get-dataset-items?token=<APIFY_TOKEN>` with the input JSON as the body. The response is the dataset, ready to parse.
- **Scheduling**: open the Actor in the Apify Console, click Schedule, pick a cron (for example weekly on Monday) and the saved input runs on its own. Each run keeps its own dataset.
- **n8n, Make, Zapier**: use the Apify integration in each tool, choose this Actor and pass the same input JSON. No per-Actor setup, no custom code.
- **Apify MCP server for AI agents**: connect the Apify MCP server to Claude, Cursor or any MCP client and ask the agent to run `cleanfeedsapi/github-repo-search` with these inputs.

## Related Actors by CleanFeeds

- [hn-who-is-hiring](https://apify.com/cleanfeedsapi/hn-who-is-hiring): monthly Hacker News hiring thread as structured rows.
- [steam-store-games](https://apify.com/cleanfeedsapi/steam-store-games): Steam storefront details, search and listings.
- [app-store-reviews](https://apify.com/cleanfeedsapi/app-store-reviews): Apple App Store customer reviews via the public RSS JSON.
- [shopify-products-feed](https://apify.com/cleanfeedsapi/shopify-products-feed): Shopify storefront `products.json` with a change filter.
- [domain-mx-preflight](https://apify.com/cleanfeedsapi/domain-mx-preflight): MX, A and HTTPS preflight for domain lists.

More feeds at [cleanfeeds.dev](https://cleanfeeds.dev).

## FAQ

**Do I need a GitHub token?** No. Unauthenticated works (10 Search req/min). Add a token only if you run many pages or many queries.

**Is this HTML scraping?** No. Only `GET https://api.github.com/search/repositories`.

**Can I get more than 1000 repos for one query?** No. That is GitHub's Search API ceiling. Narrow the query (`stars:>N`, date windows) instead.

**Why is `license` null?** GitHub did not detect a license file for that repo.

**One query 422s, what happens?** You get one `error` row for it; other queries still run.

**How do I detect new and closed items between runs?** `full_name` (`owner/repo`) is the stable key. Keep each run's dataset and compare `full_name` sets per `query`: names present today but not last week are newcomers; names that dropped out were renamed, deleted, archived out of the filter, or fell below your `stars:` threshold. Check `archived` on the newer run before calling a repo gone.

**What happens when a source fails?** A query that GitHub rejects (422 for bad syntax, 5xx, or a rate-limit 403 without a reset header) does not stop the run. The Actor logs it, pushes one row with `query` and `error` (status, URL and the first 200 characters of GitHub's response), and moves to the next query. Error rows are not charged. A 403 with `X-RateLimit-Remaining: 0` is not an error: the Actor sleeps until reset and retries the same page.
