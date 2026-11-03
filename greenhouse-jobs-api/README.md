# Greenhouse Jobs API | $1.50/1K

**Quick start**

- Greenhouse jobs API in one run: one JSON row per open job on every board you list, with title, location, department, apply URL, dates and a stable id.
- Minimal input: `{"boards": ["greenhouse:stripe"]}`
- Run it from the Console, the API, or the Apify MCP server; export JSON, CSV or Excel.

Pull live job openings from **Greenhouse** career boards into one clean JSON dataset, read through the official Greenhouse Job Board API (boards-api.greenhouse.io). No HTML scraping, no login, no proxies, no API key.

Pass board slugs (`greenhouse:stripe`) or **just paste the careers URL** (`boards.greenhouse.io/<board>`). You get one row per job: title, location, department, apply URL, dates, stable id. Bonus: the same run also accepts Greenhouse, Lever, Ashby, Workday, SmartRecruiters and Recruitee boards, so one target-account list covers six ATS platforms.

## Why this instead of scraping or the vendor API

- The board JSON at `boards-api.greenhouse.io/v1/boards/<board>/jobs` is the same data the careers page itself loads. Nothing to render, nothing that breaks when the company changes its page theme.
- No key and no account. The Job Board API is public and unauthenticated. You do not need Harvest API access or a Greenhouse login.
- Pasted URLs work. Both `boards.greenhouse.io/<board>` and `job-boards.greenhouse.io/<board>` are recognized and turned into `greenhouse:<board>`.
- One normalized schema across six ATSs. Mix Greenhouse boards with `lever:`, `ashby:`, `workday:`, `smartrecruiters:` and `recruitee:` in the same list and every row has the same fields.
- Postings without a title or URL are dropped before charging, so a malformed entry never costs you a row.

## Input example

```json
{"boards": ["greenhouse:stripe", "https://boards.greenhouse.io/airbnb", "greenhouse:discord"], "maxJobsPerBoard": 0}
```

| Field | Type | Default | Notes |
|---|---|---|---|
| `boards` | string list | three sample Greenhouse boards | `greenhouse:<slug>`, a careers URL, or any other ATS as `source:slug` |
| `maxJobsPerBoard` | integer | `0` | `0` = everything the board returns |

## Output example

```json
{ "source": "greenhouse", "company": "stripe", "title": "Software Engineer", "location": "Remote",
  "department": null, "url": "https://...", "posted_at": "2026-10-21T09:12:00.000Z", "updated_at": null, "id": "123456" }
```

| Field | Meaning |
|---|---|
| `source` | `greenhouse` (or another ATS if you mixed boards) |
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

- **Apify API**: `POST https://api.apify.com/v2/acts/cleanfeedsapi~greenhouse-jobs-api/run-sync-get-dataset-items?token=<APIFY_TOKEN>` with the input JSON as the body. The response is the dataset, ready to parse.
- **Scheduling**: open the Actor in the Apify Console, click Schedule, pick a cron (for example daily at 06:00) and the saved input runs on its own. Each run keeps its own dataset.
- **n8n, Make, Zapier**: use the Apify integration in each tool, choose this Actor and pass the same input JSON. No per-Actor setup, no custom code.
- **Apify MCP server for AI agents**: connect the Apify MCP server to Claude, Cursor or any MCP client and ask the agent to run `cleanfeedsapi/greenhouse-jobs-api` with these inputs.

## Related Actors by CleanFeeds

- [ats-jobs-feed](https://apify.com/cleanfeedsapi/ats-jobs-feed): all six ATS platforms in one Actor, same schema.
- [lever-jobs-api](https://apify.com/cleanfeedsapi/lever-jobs-api): Lever postings via api.lever.co.
- [ashby-jobs-api](https://apify.com/cleanfeedsapi/ashby-jobs-api): Ashby job boards via the posting API.
- [workday-jobs-api](https://apify.com/cleanfeedsapi/workday-jobs-api): Workday career sites via the public CXS JSON.
- [hn-who-is-hiring](https://apify.com/cleanfeedsapi/hn-who-is-hiring): monthly Hacker News hiring thread as structured rows.

Free sample dataset: [cleanfeeds/tech-jobs-daily on Hugging Face](https://huggingface.co/datasets/cleanfeeds/tech-jobs-daily). More feeds at [cleanfeeds.dev](https://cleanfeeds.dev).

## FAQ

**Do I need a Greenhouse API key?** No. The endpoint is public and unauthenticated.

**Is this HTML scraping?** No. It reads the official Greenhouse Job Board API (boards-api.greenhouse.io), the same data the careers page itself loads.

**Where do I find the slug?** It is the token in the careers URL. Or paste the URL itself.

**Can I mix ATS platforms in one run?** Yes: `greenhouse:`, `lever:`, `ashby:`, `workday:`, `smartrecruiters:`, `recruitee:` all work in the same `boards` list.

**How do I detect new and closed items between runs?** `id` is the Greenhouse job id and does not change between runs. Keep each run's dataset and compare `id` sets per `company`: ids present today but not yesterday are new roles, ids present yesterday but not today are closed. Schedule the Actor daily and the diff is a few lines in n8n, Make or a script.

**What happens when a source fails?** A board that returns an HTTP error, an unknown slug or an unrecognized URL does not stop the run. The Actor logs the failure, pushes one row with `source`, `company` and `error` (the message), and continues with the next board. Error rows are not charged. Filter on `error` to find them.

**Does Greenhouse include job descriptions?** Not here. The Actor calls the list endpoint with `content=false` to keep rows small. Full descriptions are out of scope by design.

greenhouse jobs api, greenhouse job scraper, greenhouse job board, boards.greenhouse.io feed, greenhouse postings, career site jobs feed, ATS jobs API.
