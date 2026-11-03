# ATS Jobs API: Greenhouse, Lever, Ashby, Workday, SmartRecruiters, Recruitee | $2/1K

**Quick start**

- One ATS jobs API for six platforms: one JSON row per open job on every career board you list, with title, location, department, apply URL, dates and a stable id, in one schema.
- Minimal input: `{"boards": ["greenhouse:stripe", "lever:spotify"]}`
- Run it from the Console, the API, or the Apify MCP server; export JSON, CSV or Excel.

Pull live job openings from company career boards into **one JSON dataset**. Six ATS platforms, one schema. Each source is read through the ATS's **own public job-board JSON** (the same data the career page itself loads): no HTML scraping, no login, no proxies, no API keys.

You pass boards (`greenhouse:stripe`, `lever:spotify`, `ashby:ramp`, `workday:adobe.wd5/external_experienced`, `smartrecruiters:InPost`, `recruitee:prisma`) **or just paste the careers URL**. You get one row per job: title, location, department, apply URL, dates, stable id.

## Supported ATS

| Source | What you pass | Endpoint used |
|---|---|---|
| Greenhouse | `greenhouse:<board>` or `https://boards.greenhouse.io/<board>` | boards-api.greenhouse.io (official) |
| Lever | `lever:<company>` or `https://jobs.lever.co/<company>` | api.lever.co/v0/postings (official) |
| Ashby | `ashby:<company>` or `https://jobs.ashbyhq.com/<company>` | api.ashbyhq.com/posting-api (official) |
| Workday | `workday:<tenant>.<wdN>/<site>` or `https://<tenant>.<wdN>.myworkdayjobs.com/<site>` | career-site CXS jobs JSON (public, paginated) |
| SmartRecruiters | `smartrecruiters:<CompanyIdentifier>` or `https://jobs.smartrecruiters.com/<Company>` | api.smartrecruiters.com/v1 postings (documented Posting API) |
| Recruitee | `recruitee:<subdomain>` or `https://<subdomain>.recruitee.com` | `<subdomain>.recruitee.com/api/offers` (public) |

## Why this instead of scraping or the vendor API

- Every source is the JSON the career page itself loads. Greenhouse, Lever and Ashby publish official job-board APIs, SmartRecruiters documents a public Posting API; Workday and Recruitee are public JSON endpoints the source's own pages load. No browser, no rendering, nothing to fix when a theme changes.
- No keys. All six endpoints are unauthenticated. You never need Harvest, Lever Data API, Workday tenant credentials or a SmartRecruiters token.
- One schema instead of six. Each ATS names and nests fields differently; the Actor maps all of them to the same nine columns so a target-account list with mixed ATSs produces one flat table.
- Pasted URLs are recognized for all six, including `job-boards.greenhouse.io` and localized Workday paths like `/en-US/<site>`.
- Pagination is handled where the ATS needs it: Workday in pages of 20 (up to 2,000 per site), SmartRecruiters in pages of 100. Postings without a title or URL are dropped before charging.

## Input examples

```json
{ "boards": ["greenhouse:stripe", "lever:spotify", "ashby:ramp"] }
```

```json
{ "boards": ["https://adobe.wd5.myworkdayjobs.com/external_experienced", "https://jobs.smartrecruiters.com/InPost", "https://prisma.recruitee.com"], "maxJobsPerBoard": 500 }
```

| Field | Type | Default | Notes |
|---|---|---|---|
| `boards` | string list | three sample boards | `source:slug` or careers URL, any mix |
| `maxJobsPerBoard` | integer | `0` | `0` = everything the board returns |

## Output example

```json
{ "source": "greenhouse", "company": "stripe", "title": "Backend Engineer", "location": "Dublin",
  "department": "Engineering", "url": "https://stripe.com/jobs/search?gh_jid=8172487",
  "posted_at": "2026-09-03T17:30:34.000Z", "updated_at": "2026-10-29T14:42:09.000Z", "id": "8172487" }
```

| Field | Meaning |
|---|---|
| `source` | `greenhouse` / `lever` / `ashby` / `workday` / `smartrecruiters` / `recruitee` |
| `company` | the slug you passed |
| `title`, `location`, `department` | as the ATS reports them (`department` is `null` where the ATS does not expose it, e.g. Workday) |
| `url` | public job / apply page |
| `posted_at` | ISO 8601 when the ATS provides it (Workday list payload does not, so `null`) |
| `updated_at` | ISO 8601 (Greenhouse and Recruitee only) |
| `id` | ATS-side job id, stable across runs, use it to diff new vs. closed jobs |

A board that fails (bad slug, HTTP error) does **not** abort the run: it yields one row with `source`, `company` and `error`, and the other boards continue.

**Not included, by design:** full job descriptions, salary enrichment, LinkedIn data, a global company index. This Actor is a clean, cheap feed for boards you already know.

## How much does it cost?

Pay per event: **$2.00 per 1,000 job rows** (`job` event, $0.002 each) plus Apify's small Actor-start event. Platform compute is on us, not on you. Set a maximum charge per run in the Console and the Actor stops at the limit. The Apify free plan is enough to try it on the sample boards.

## Use cases

- **Recruiting SaaS, talent CRMs**: nightly sync of target accounts' career boards.
- **Hiring-intent signals**: diff today's `id`s against yesterday's dataset, new rows = new hiring.
- **AI agents and MCP**: "list open roles at these 20 companies" through the Apify MCP server, no browser automation.
- **Market maps**: location and department mix per company over time.

## Monitoring new jobs

Schedule the Actor daily, keep the dataset per run, and compare `id` sets. Or wire the Apify n8n / Make / Zapier node to push new rows to Slack or a sheet.

## Integrations

- **Apify API**: `POST https://api.apify.com/v2/acts/cleanfeedsapi~ats-jobs-feed/run-sync-get-dataset-items?token=<APIFY_TOKEN>` with the input JSON as the body. The response is the dataset, ready to parse.
- **Scheduling**: open the Actor in the Apify Console, click Schedule, pick a cron (for example daily at 06:00) and the saved input runs on its own. Each run keeps its own dataset.
- **n8n, Make, Zapier**: use the Apify integration in each tool, choose this Actor and pass the same input JSON. No per-Actor setup, no custom code.
- **Apify MCP server for AI agents**: connect the Apify MCP server to Claude, Cursor or any MCP client and ask the agent to run `cleanfeedsapi/ats-jobs-feed` with these inputs. Use this Actor when the list mixes ATS platforms; for one platform the single-platform feeds in the next section cost $1.50 per 1,000.

## Related Actors by CleanFeeds

This Actor mixes six ATS platforms in one run; the single-platform feeds below are cheaper when you only need one.

- [greenhouse-jobs-feed](https://apify.com/cleanfeedsapi/greenhouse-jobs-feed): Greenhouse only, $1.50 per 1,000 rows.
- [lever-jobs-feed](https://apify.com/cleanfeedsapi/lever-jobs-feed): Lever only, same schema.
- [ashby-jobs-feed](https://apify.com/cleanfeedsapi/ashby-jobs-feed): Ashby only, same schema.
- [workday-jobs-feed](https://apify.com/cleanfeedsapi/workday-jobs-feed): Workday only, with a 500-row default cap per site.
- [remote-jobs-feed](https://apify.com/cleanfeedsapi/remote-jobs-feed): RemoteOK and Arbeitnow remote listings in one schema.

Free sample dataset: [cleanfeeds/tech-jobs-daily on Hugging Face](https://huggingface.co/datasets/cleanfeeds/tech-jobs-daily). More feeds at [cleanfeeds.dev](https://cleanfeeds.dev).

## FAQ

**Do I need an ATS API key?** No. Every source is a public, unauthenticated endpoint.

**Is this HTML scraping?** No. Greenhouse, Lever and Ashby publish official job-board APIs, SmartRecruiters documents a public Posting API; Workday and Recruitee career sites load their job lists from public JSON endpoints that this Actor reads directly.

**Why is `department` or `posted_at` empty for some rows?** The ATS does not return it in its list payload. Fields are never guessed.

**One company 404s, what happens?** You get one `error` row for it and the rest of the run completes.

**Where do I find the slug?** It is the token in the careers URL. Or paste the URL itself.

**How do I detect new and closed items between runs?** `id` is the ATS-side job id (Greenhouse job id, Lever posting id, Ashby posting id, Workday requisition id, SmartRecruiters posting id, Recruitee offer id) and does not change between runs. Keep each run's dataset and compare `id` sets per `company`: ids present today but not yesterday are new roles, ids present yesterday but not today are closed.

**What happens when a source fails?** A board that returns an HTTP error, an unknown slug or an unrecognized URL does not stop the run. The Actor logs the failure, pushes one row with `source`, `company` and `error` (the message), and continues with the next board. Error rows are not charged. If the per-run charge limit is reached, the Actor stops after the board that hit it and the remaining boards are skipped.
