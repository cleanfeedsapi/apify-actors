
Pull live **remote / hybrid job openings** from three public boards into **one JSON dataset**. Each source is the board's **own public JSON API**: no HTML scraping, no login, no proxies, no API keys.



## What you get

| Source | Endpoint | Notes |
|---|---|---|
| RemoteOK | `https://remoteok.com/api` | First array element is a legal notice (dropped). Name Remote OK + link back. |
| Arbeitnow | `https://www.arbeitnow.com/api/job-board-api?page=` | Paginated; link back appreciated |

## Input examples

```json
{ "sources": ["remoteok", "arbeitnow"] }
```

```json
{ "sources": ["remoteok", ], "search": "react", "maxJobsPerSource": 100 }
```

| Field | Type | Default | Notes |
|---|---|---|---|
| `maxJobsPerSource` | integer | `0` | `0` = everything the board returns |

## Output example

```json
{ "source": "remoteok", "title": "Senior Backend Engineer", "company": "Acme", "location": "Worldwide",
  "remote": true, "tags": ["backend", "nodejs"], "salary": "$120000–$150000",
  "url": "https://remoteOK.com/remote-jobs/...", "source_url": "https://remoteOK.com/remote-jobs/...",
  "posted_at": "2026-11-01T08:00:12.000Z", "id": "1137611" }
```

| Field | Meaning |
|---|---|
| `title`, `company`, `location` | as the board reports them |
| `tags` | string array |
| `salary` | string or `null` when the board does not publish one |
| `url` | public job / apply page |
| `source_url` | same listing URL for attribution / follow-link back |
| `posted_at` | ISO 8601 when available |
| `id` | board-side id (or slug), stable across runs |

A source that fails does **not** abort the run: one row with `error`, others continue.

## How much does it cost?

Pay per event: **$2.00 per 1,000 job rows** (`job` event, $0.002 each) plus Apify's small Actor-start event. Platform compute is on us. Set a maximum charge per run in the Console. Free plan is enough to try the default sources.

## Use cases

- **Remote-job aggregators**: nightly refresh without scraping HTML.
- **AI agents / MCP**: "list remote React roles" via Apify MCP.
- **Hiring-intent / alerts**: diff `id` sets day over day.
- **Talent CRM enrichment**: tags + salary when present.

## FAQ

**Do I need API keys?** No. All three endpoints are public JSON.

**Is this HTML scraping?** No. Only documented public JSON APIs.

**Why link back to Remote OK?** Their API ToS requires a follow-link and naming Remote OK as the source. This README and each row's `source_url` do that.

**One source 5xxs?** You get one `error` row for it; the run continues.

