# GitHub Repo Search: Topic / Language / Date | $2/1K

Find **new and trending public GitHub repositories** by topic, language, or date window — via the **official GitHub REST Search API**. No HTML scraping, no login wall, no proxies. Pass the same query syntax you use on github.com/search (`topic:mcp`, `language:Rust`, `created:>2026-10-01`).

You get one dataset row per repo: full name, URL, description, language, stars, forks, open issues, topics, license, created/updated/pushed timestamps, archived flag, owner.

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
| `token` | secret string | empty | optional PAT; raises Search rate limit 10 → 30 req/min |

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

- **Trend / launch radar**: `created:>YYYY-MM-DD language:…` or `topic:…` daily — catch new repos in a niche.
- **Competitive / ecosystem maps**: dump top starred repos for a topic into a sheet.
- **AI agents / MCP**: "list hot Rust repos this month" without browser automation.
- **Monitoring**: schedule weekly, diff `full_name` sets for newcomers above a stars threshold.

## FAQ

**Do I need a GitHub token?** No. Unauthenticated works (10 Search req/min). Add a token only if you run many pages or many queries.

**Is this HTML scraping?** No. Only `GET https://api.github.com/search/repositories`.

**Can I get more than 1000 repos for one query?** No. That is GitHub's Search API ceiling. Narrow the query (`stars:>N`, date windows) instead.

**Why is `license` null?** GitHub did not detect a license file for that repo.

**One query 422s, what happens?** You get one `error` row for it; other queries still run.

GitHub repo search API, trending GitHub repositories, topic search, language:Rust created:>date, GitHub stars scraper alternative, new GitHub repos by topic.
