# HN Who Is Hiring Jobs API | $2/1K


Data comes from the **official HN Firebase API** (`hacker-news.firebaseio.com`) — the same JSON the site itself uses. No HTML scraping, no login, no proxies, no API keys.

## What you get

| Field | Meaning |
|---|---|
| `source` | always `hn` |
| `thread_id` | monthly thread item id |
| `comment_id` | top-level comment id (stable across runs) |
| `company`, `title`, `location` | parsed from the conventional first line (`Company \| Role \| Location \| …`) when present; otherwise best-effort / `null` |
| `remote` | `true` if the header/text mentions remote |
| `salary` | salary-looking substring or `null` (never invented) |
| `url` | `https://news.ycombinator.com/item?id=…` |
| `links` | `http(s)` hrefs found in the comment |
| `posted_at` | ISO 8601 from HN `time` |
| `text` | HTML-decoded comment body |

Deleted / dead comments are skipped. Only **top-level** kids of the thread are returned (replies are ignored on purpose).

## Input examples

```json
{ "kind": "hiring", "thread": "latest" }
```

```json
{ "kind": "hiring", "thread": "49922569", "maxComments": 100, "query": "remote" }
```

```json
```

| Field | Type | Default | Notes |
|---|---|---|---|
| `thread` | string | `latest` | `latest` resolves via the `whoishiring` user, or pass a numeric item id |
| `maxComments` | integer | `0` | `0` = all top-level comments |
| `query` | string | `""` | case-insensitive substring filter on `text` |

Empty input works: latest Who is hiring? thread, all comments, no filter.

## Output example

```json
{
  "source": "hn",
  "thread_id": "49922569",
  "comment_id": "49926618",
  "company": "FUTO",
  "title": "https://futo.tech/",
  "location": "Austin, TX | REMOTE(Worldwide) or ONSITE | Full Time",
  "remote": true,
  "salary": null,
  "url": "https://news.ycombinator.com/item?id=49926618",
  "links": ["https://futo.tech/"],
  "posted_at": "2026-10-01T15:12:03.000Z",
  "text": "FUTO | https://futo.tech/ | Austin, TX | REMOTE(Worldwide) or ONSITE | Full Time\nFUTO is an organization…"
}
```

**Not included, by design:** nested reply threads, LLM classification of roles, a global company graph. This Actor is a cheap, reproducible feed of the monthly thread.

## How much does it cost?

Pay per event: **$2.00 per 1,000 job rows** (`job` event, $0.002 each) plus Apify's small Actor-start event. Platform compute is on us, not on you. Set a maximum charge per run in the Console and the Actor stops at the limit. The Apify free plan is enough to try the latest thread.

## Use cases

- **Hiring-intent dashboards**: snapshot each month's Who is hiring? and diff `comment_id`s.
- **Talent CRM / outbound research**: filter `query` for stack keywords (`rust`, `postgres`, `remote`).
- **AI agents and MCP**: "what is HN hiring for this month?" without a browser.

## Monitoring new posts

Schedule the Actor on the 1st (and mid-month) after dang posts the thread. Keep datasets per run and compare `comment_id` sets, or push new rows to Slack / a sheet via Apify's n8n / Make / Zapier nodes.

## FAQ

**Do I need an HN API key?** No. The public Firebase endpoints are unauthenticated.

**Is this HTML scraping?** No. Comments are JSON from `hacker-news.firebaseio.com`. We only decode entities / strip tags to parse the conventional first line.

**Why is `company` or `title` null / weird?** Many comments ignore the `Company | Role | Location` convention. Fields are never guessed beyond that boring split; full `text` is always there.


**Rate limits?** Item fetches run with concurrency ≤ 10 against Firebase.

