# Remote Jobs API: RemoteOK, Arbeitnow | $2/1K

**Quick start**

- Remote jobs API from two public boards: one JSON row per listing on RemoteOK and Arbeitnow, with title, company, location, remote flag, tags, salary, URL, posted date and a stable id.
- Minimal input: `{"sources": ["remoteok", "arbeitnow"]}`
- Run it from the Console, the API, or the Apify MCP server; export JSON, CSV or Excel.

Pull live **remote / hybrid job openings** from two public boards into **one JSON dataset**. Each source is the board's **own public JSON API**: no HTML scraping, no login, no proxies, no API keys.

## Why this instead of scraping or the vendor API

- Both boards publish a JSON endpoint on purpose. RemoteOK serves its whole feed at `remoteok.com/api`; Arbeitnow serves a paginated feed at `arbeitnow.com/api/job-board-api`. No HTML parsing, no browser.
- No keys and no rate-limit dance. Both endpoints are unauthenticated. The Actor reads RemoteOK in one request and walks Arbeitnow page by page (up to 50 pages) until `links.next` is empty.
- Two boards, one schema. RemoteOK's `position` and Arbeitnow's `title`, `company` and `company_name`, `date` and `created_at` all land in the same columns.
- Attribution is built in. RemoteOK's API terms require naming Remote OK and linking back; every row carries `source_url` and the first array element (the legal notice) is dropped, not sold as a job.
- Filter on the way in. `search` is matched against title, company, location and tags before rows are counted or charged.

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
{ "sources": ["remoteok"], "search": "react", "maxJobsPerSource": 100 }
```

| Field | Type | Default | Notes |
|---|---|---|---|
| `sources` | string list | `remoteok`, `arbeitnow` | any subset of the two |
| `search` | string | `""` | case-insensitive substring filter on title, company, location and tags |
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
| `source` | `remoteok` or `arbeitnow` |
| `title`, `company`, `location` | as the board reports them |
| `remote` | always `true` for RemoteOK; Arbeitnow's own `remote` flag (hybrid and on-site listings exist there) |
| `tags` | string array |
| `salary` | RemoteOK `salary_min` / `salary_max` as `$lo–$hi`, or `null`; Arbeitnow does not publish one, so always `null` |
| `url` | public job / apply page |
| `source_url` | same listing URL for attribution / follow-link back |
| `posted_at` | ISO 8601 when available |
| `id` | board-side id (RemoteOK numeric id, Arbeitnow slug), stable across runs |

A source that fails does **not** abort the run: one row with `error`, others continue.

## How much does it cost?

Pay per event: **$2.00 per 1,000 job rows** (`job` event, $0.002 each) plus Apify's small Actor-start event. Platform compute is on us. Set a maximum charge per run in the Console. Free plan is enough to try the default sources.

## Use cases

- **Remote-job aggregators**: nightly refresh without scraping HTML.
- **AI agents / MCP**: "list remote React roles" via Apify MCP.
- **Hiring-intent / alerts**: diff `id` sets day over day.
- **Talent CRM enrichment**: tags + salary when present.

## Integrations

- **Apify API**: `POST https://api.apify.com/v2/acts/cleanfeedsapi~remote-jobs-feed/run-sync-get-dataset-items?token=<APIFY_TOKEN>` with the input JSON as the body. The response is the dataset, ready to parse.
- **Scheduling**: open the Actor in the Apify Console, click Schedule, pick a cron (for example daily at 06:00) and the saved input runs on its own. Each run keeps its own dataset.
- **n8n, Make, Zapier**: use the Apify integration in each tool, choose this Actor and pass the same input JSON. No per-Actor setup, no custom code.
- **Apify MCP server for AI agents**: connect the Apify MCP server to Claude, Cursor or any MCP client and ask the agent to run `cleanfeedsapi/remote-jobs-feed` with these inputs.

## Related Actors by CleanFeeds

- [ats-jobs-feed](https://apify.com/cleanfeedsapi/ats-jobs-feed): Greenhouse, Lever, Ashby, Workday, SmartRecruiters and Recruitee boards in one schema.
- [hn-who-is-hiring](https://apify.com/cleanfeedsapi/hn-who-is-hiring): monthly Hacker News hiring thread as structured rows.
- [greenhouse-jobs-api](https://apify.com/cleanfeedsapi/greenhouse-jobs-api): Greenhouse boards via the official Job Board API.
- [lever-jobs-api](https://apify.com/cleanfeedsapi/lever-jobs-api): Lever postings via api.lever.co.
- [ashby-jobs-api](https://apify.com/cleanfeedsapi/ashby-jobs-api): Ashby job boards via the posting API.

Free sample dataset: [cleanfeeds/tech-jobs-daily on Hugging Face](https://huggingface.co/datasets/cleanfeeds/tech-jobs-daily). More feeds at [cleanfeeds.dev](https://cleanfeeds.dev).

## FAQ

**Do I need API keys?** No. Both endpoints are public JSON.

**Is this HTML scraping?** No. Only documented public JSON APIs.

**Why link back to Remote OK?** Their API ToS requires a follow-link and naming Remote OK as the source. This README and each row's `source_url` do that.

**One source 5xxs?** You get one `error` row for it; the run continues.

**How do I detect new and closed items between runs?** `id` is the board's own identifier (RemoteOK job id, Arbeitnow slug) and does not change between runs. Keep each run's dataset and compare `id` sets per `source`: ids present today but not yesterday are new listings, ids present yesterday but not today were removed. Schedule the Actor daily and the diff is a few lines in n8n, Make or a script.

**What happens when a source fails?** If a board returns an HTTP error or you pass a name other than `remoteok` or `arbeitnow`, the Actor logs it and pushes one row for that source with every field `null` (or `[]` / `false`) plus `error` holding the message. The other source still runs. Error rows are not charged. If the per-run charge limit is reached, the Actor stops after the source that hit it.

remote jobs API, RemoteOK API, Arbeitnow API, remote job board JSON, remote developer jobs feed, remote job scraper alternative, hybrid jobs dataset.
