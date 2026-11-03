# Workday Jobs API | $1.50/1K

**Quick start**

- Workday jobs scraper alternative: one JSON row per open job on every Workday career site you list, with title, location, apply URL and a stable id, read from the site's own JSON instead of its HTML.
- Minimal input: `{"boards": ["workday:adobe.wd5/external_experienced"]}`
- Run it from the Console, the API, or the Apify MCP server; export JSON, CSV or Excel.

Pull live job openings from **Workday** career boards into one clean JSON dataset, read through the career site's own CXS jobs JSON (public, paginated). No HTML scraping, no login, no proxies, no API key.

Pass board slugs (`workday:adobe.wd5/external_experienced`) or **just paste the careers URL** (`<tenant>.<wdN>.myworkdayjobs.com/<site>`). You get one row per job: title, location, apply URL, stable id. Bonus: the same run also accepts Greenhouse, Lever, Ashby, Workday, SmartRecruiters and Recruitee boards, so one target-account list covers six ATS platforms.

## Why this instead of scraping or the vendor API

- Workday career sites are JavaScript apps. The job list comes from `https://<tenant>.<wdN>.myworkdayjobs.com/wday/cxs/<tenant>/<site>/jobs`, a POST endpoint the page itself calls. This Actor calls it directly and pages through it 20 postings at a time.
- No key, no tenant credentials. The CXS endpoint is public. Workday's REST and SOAP APIs need a customer account and are not needed here.
- Pasted URLs work, including localized ones. `https://<tenant>.<wdN>.myworkdayjobs.com/<site>` and `.../en-US/<site>` are turned into `workday:<tenant>.<wdN>/<site>`.
- One normalized schema across six ATSs. Mix Workday sites with `greenhouse:`, `lever:`, `ashby:`, `smartrecruiters:` and `recruitee:` in the same list and every row has the same fields.
- Postings without a title or URL are dropped before charging, so a malformed entry never costs you a row.

## Input example

```json
{"boards": ["workday:adobe.wd5/external_experienced", "https://nvidia.wd5.myworkdayjobs.com/NVIDIAExternalCareerSite"], "maxJobsPerBoard": 0}
```

| Field | Type | Default | Notes |
|---|---|---|---|
| `boards` | string list | two sample Workday boards | `workday:<tenant>.<wdN>/<site>`, a careers URL, or any other ATS as `source:slug` |
| `maxJobsPerBoard` | integer | `500` | `0` = everything the board returns (the Workday reader itself stops at 2,000 postings per site) |

## Output example

```json
{ "source": "workday", "company": "adobe.wd5/external_experienced", "title": "Software Engineer", "location": "San Jose, CA",
  "department": null, "url": "https://adobe.wd5.myworkdayjobs.com/external_experienced/job/...", "posted_at": null, "updated_at": null, "id": "R123456" }
```

| Field | Meaning |
|---|---|
| `source` | `workday` (or another ATS if you mixed boards) |
| `company` | the slug you passed |
| `title`, `location` | as the career site reports them (`locationsText`) |
| `department` | always `null` for Workday; the list payload does not carry it |
| `url` | public job page, built from the site origin and the posting's `externalPath` |
| `posted_at`, `updated_at` | `null` for Workday. The list payload only has a relative "Posted 3 days ago" text, which the Actor does not turn into a guessed date |
| `id` | requisition id from the posting's first bullet field (falls back to `externalPath`), stable across runs, diff it to detect new and closed roles |

A board that fails (bad slug, HTTP error) yields one row with `error` and the other boards continue.

## How much does it cost?

Pay per event: **$1.50 per 1,000 job rows** plus Apify's small Actor-start event. Compute is included. Set a maximum charge per run in the Console and the Actor stops at the limit. The Apify free plan is enough to try it on the sample boards.

## Use cases

- **Recruiting SaaS and talent CRMs**: nightly sync of target accounts' Workday boards.
- **Hiring-intent signals**: diff today's `id`s against yesterday's dataset.
- **AI agents and MCP**: "list open roles at these companies" through the Apify MCP server.
- **Market maps**: location mix per company over time.

## Integrations

- **Apify API**: `POST https://api.apify.com/v2/acts/cleanfeedsapi~workday-jobs-api/run-sync-get-dataset-items?token=<APIFY_TOKEN>` with the input JSON as the body. The response is the dataset, ready to parse.
- **Scheduling**: open the Actor in the Apify Console, click Schedule, pick a cron (for example daily at 06:00) and the saved input runs on its own. Each run keeps its own dataset.
- **n8n, Make, Zapier**: use the Apify integration in each tool, choose this Actor and pass the same input JSON. No per-Actor setup, no custom code.
- **Apify MCP server for AI agents**: connect the Apify MCP server to Claude, Cursor or any MCP client and ask the agent to run `cleanfeedsapi/workday-jobs-api` with these inputs.

## Related Actors by CleanFeeds

- [ats-jobs-feed](https://apify.com/cleanfeedsapi/ats-jobs-feed): all six ATS platforms in one Actor, same schema.
- [greenhouse-jobs-api](https://apify.com/cleanfeedsapi/greenhouse-jobs-api): Greenhouse boards via the official Job Board API.
- [lever-jobs-api](https://apify.com/cleanfeedsapi/lever-jobs-api): Lever postings via api.lever.co.
- [ashby-jobs-api](https://apify.com/cleanfeedsapi/ashby-jobs-api): Ashby job boards via the posting API.
- [remote-jobs-feed](https://apify.com/cleanfeedsapi/remote-jobs-feed): RemoteOK and Arbeitnow remote listings in one schema.

Free sample dataset: [cleanfeeds/tech-jobs-daily on Hugging Face](https://huggingface.co/datasets/cleanfeeds/tech-jobs-daily). More feeds at [cleanfeeds.dev](https://cleanfeeds.dev).

## FAQ

**Do I need a Workday API key?** No. The endpoint is public and unauthenticated.

**Is this HTML scraping?** No. It reads the career site's own CXS jobs JSON (public, paginated), the same data the careers page itself loads.

**Where do I find the slug?** Take the careers URL `https://adobe.wd5.myworkdayjobs.com/external_experienced`: tenant `adobe`, data center `wd5`, site `external_experienced`, so `workday:adobe.wd5/external_experienced`. Or paste the URL itself.

**Can I mix ATS platforms in one run?** Yes: `greenhouse:`, `lever:`, `ashby:`, `workday:`, `smartrecruiters:`, `recruitee:` all work in the same `boards` list.

**Why is `maxJobsPerBoard` 500 by default here?** Large Workday tenants publish thousands of postings and the endpoint returns 20 per request. The default keeps an empty-input run short. Set `0` to read everything (up to 2,000 per site).

**How do I detect new and closed items between runs?** `id` is the Workday requisition id (for example `R123456`) and does not change between runs. Keep each run's dataset and compare `id` sets per `company`: ids present today but not yesterday are new roles, ids present yesterday but not today are closed. Schedule the Actor daily and the diff is a few lines in n8n, Make or a script.

**What happens when a source fails?** A site that returns an HTTP error, a slug that does not match `tenant.wdN/site`, or an unrecognized URL does not stop the run. The Actor logs the failure, pushes one row with `source`, `company` and `error` (the message), and continues with the next board. Error rows are not charged. Filter on `error` to find them.

workday jobs api, workday job scraper, myworkdayjobs scraper, workday careers feed, workday postings, career site jobs feed, ATS jobs API.
