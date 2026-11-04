# Greenhouse Jobs Feed: every job from any Greenhouse board | $1.50/1K

**Quick start**

- Greenhouse jobs API in one run: one JSON row per open job on every board you list, with title, location, department, apply URL, dates and a stable id.
- Minimal input: `{"boards": ["greenhouse:stripe"]}`
- Run it from the Console, the API, or the Apify MCP server; export JSON, CSV or Excel.

Pull live job openings from **Greenhouse** career boards into one clean JSON dataset, read through the official Greenhouse Job Board API (boards-api.greenhouse.io). No HTML scraping, no login, no proxies, no API key.

Pass board slugs (`greenhouse:stripe`) or **just paste the careers URL** (`boards.greenhouse.io/<board>`). You get one row per job: title, location, department, apply URL, dates, stable id.

Raw board data, nine normalized fields, no enrichment; cheaper than multi-ATS and enrichment feeds. This Actor accepts only Greenhouse boards (`greenhouse:<slug>` or a pasted Greenhouse URL). Entries for other platforms are returned as one error row each and skipped. For a mixed list across six ATS platforms use [ats-jobs-feed](https://apify.com/cleanfeedsapi/ats-jobs-feed) ($2 per 1,000).

## Why this instead of scraping or the vendor API

- The board JSON at `boards-api.greenhouse.io/v1/boards/<board>/jobs` is the same data the careers page itself loads. Nothing to render, nothing that breaks when the company changes its page theme.
- No key and no account. The Job Board API is public and unauthenticated. You do not need Harvest API access or a Greenhouse login.
- Pasted URLs work. Both `boards.greenhouse.io/<board>` and `job-boards.greenhouse.io/<board>` are recognized and turned into `greenhouse:<board>`.
- Same nine-column schema as the other CleanFeeds ATS feeds, so rows from this Actor and ats-jobs-feed fit one table.
- Postings without a title or URL are dropped before charging, so a malformed entry never costs you a row.

## Input example

```json
{"boards": ["greenhouse:stripe", "https://boards.greenhouse.io/airbnb", "greenhouse:discord"], "maxJobsPerBoard": 0}
```

| Field | Type | Default | Notes |
|---|---|---|---|
| `boards` | string list | three sample Greenhouse boards | `greenhouse:<slug>` or a Greenhouse careers URL |
| `maxJobsPerBoard` | integer | `0` | `0` = everything the board returns |

## Filters are applied before billing

`postedAfter` (ISO date or `24h` / `7d`), `titleIncludes` (keep if the title contains any term) and `titleExcludes` (drop if it contains any term) are applied to the rows read from the ATS **before** the pay-per-event charge, so you never pay for jobs you filtered out. Matching is case-insensitive substring; there is no fuzzy or AI matching, so what you see is what was matched. Dates come from the ATS itself (`first_published`, `createdAt`, `publishedAt`, `releasedDate`, `published_at`), not from when we indexed the job; Workday only publishes "Posted N Days Ago", so its `posted_at` has day precision and "30+ days ago" postings have no date and are excluded when `postedAfter` is set.

```json
{ "boards": ["greenhouse:stripe", "lever:spotify"], "postedAfter": "24h", "titleIncludes": ["engineer", "developer"], "titleExcludes": ["intern", "staffing"] }
```

## Output example

```json
{ "source": "greenhouse", "company": "stripe", "title": "Software Engineer", "location": "Remote",
  "department": null, "url": "https://job-boards.greenhouse.io/stripe/jobs/6847532002", "posted_at": "2026-10-21T09:12:00.000Z", "updated_at": "2026-10-28T14:02:11.000Z", "id": "6847532002" }
```

| Field | Meaning |
|---|---|
| `source` | always `greenhouse` |
| `company` | the slug you passed |
| `title`, `location`, `department` | as the ATS reports them, `null` where the ATS does not expose a field |
| `url` | public job / apply page |
| `posted_at`, `updated_at` | ISO 8601 when the ATS provides them (Greenhouse gives both: `first_published` and `updated_at`) |
| `id` | ATS-side job id, stable across runs, diff it to detect new and closed roles |

A board that fails (bad slug, HTTP error) yields one row with `error` and the other boards continue.

## How much does it cost?

Pay per event: **$1.50 per 1,000 job rows** plus Apify's small Actor-start event. Compute is included. Set a maximum charge per run in the Console and the Actor stops at the limit. The Apify free plan is enough to try it on the sample boards.

## Use cases

- **Recruiting SaaS and talent CRMs**: nightly sync of target accounts' Greenhouse boards.
- **Hiring-intent signals**: diff today's `id`s against yesterday's dataset.
- **AI agents and MCP**: "list open roles at these companies" through the Apify MCP server.
- **Market maps**: location and department mix per company over time.

## Integrations

- **Apify API**: `POST https://api.apify.com/v2/acts/cleanfeedsapi~greenhouse-jobs-feed/run-sync-get-dataset-items?token=<APIFY_TOKEN>` with the input JSON as the body. The response is the dataset, ready to parse.
- **Scheduling**: open the Actor in the Apify Console, click Schedule, pick a cron (for example daily at 06:00) and the saved input runs on its own. Each run keeps its own dataset.
- **n8n, Make, Zapier**: use the Apify integration in each tool, choose this Actor and pass the same input JSON. No per-Actor setup, no custom code.
- **Apify MCP server for AI agents**: connect the Apify MCP server to Claude, Cursor or any MCP client and ask the agent to run `cleanfeedsapi/greenhouse-jobs-feed` with these inputs.

## Related Actors by CleanFeeds

- [ats-jobs-feed](https://apify.com/cleanfeedsapi/ats-jobs-feed): all six ATS platforms in one Actor, same schema.
- [lever-jobs-feed](https://apify.com/cleanfeedsapi/lever-jobs-feed): Lever postings via api.lever.co.
- [ashby-jobs-feed](https://apify.com/cleanfeedsapi/ashby-jobs-feed): Ashby job boards via the posting API.
- [workday-jobs-feed](https://apify.com/cleanfeedsapi/workday-jobs-feed): Workday career sites via the public CXS JSON.
- [hn-who-is-hiring](https://apify.com/cleanfeedsapi/hn-who-is-hiring): monthly Hacker News hiring thread as structured rows.

Free sample dataset: [cleanfeeds/tech-jobs-daily on Hugging Face](https://huggingface.co/datasets/cleanfeeds/tech-jobs-daily). More feeds at [cleanfeeds.dev](https://cleanfeeds.dev).

## FAQ

**Do I need a Greenhouse API key?** No. The endpoint is public and unauthenticated.

**Is this HTML scraping?** No. It reads the official Greenhouse Job Board API (boards-api.greenhouse.io), the same data the careers page itself loads.

**Where do I find the slug?** It is the token in the careers URL. Or paste the URL itself.

**Can I mix ATS platforms in one run?** No. This Actor accepts only Greenhouse boards (`greenhouse:<slug>` or a pasted Greenhouse URL). Entries for other platforms are returned as one error row each and skipped. For a mixed list across six ATS platforms use [ats-jobs-feed](https://apify.com/cleanfeedsapi/ats-jobs-feed) ($2 per 1,000).

**How do I detect new and closed items between runs?** `id` is the Greenhouse job id and does not change between runs. Keep each run's dataset and compare `id` sets per `company`: ids present today but not yesterday are new roles, ids present yesterday but not today are closed. Schedule the Actor daily and the diff is a few lines in n8n, Make or a script.

**What happens when a source fails?** A board that returns an HTTP error, an unknown slug or an unrecognized URL does not stop the run. The Actor logs the failure, pushes one row with `source`, `company` and `error` (the message), and continues with the next board. Error rows are not charged. Filter on `error` to find them.

**Does Greenhouse include job descriptions?** Not here. The Actor calls the list endpoint with `content=false` to keep rows small. Full descriptions are out of scope by design.
