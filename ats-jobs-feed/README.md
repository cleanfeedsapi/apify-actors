# ATS Jobs API: Greenhouse, Lever, Ashby, Workday, SmartRecruiters, Recruitee | $2/1K

Pull live job openings from company career boards into **one JSON dataset**. Six ATS platforms, one schema. Each source is read through the ATS's **own public job-board JSON** (the same data the career page itself loads): no HTML scraping, no login, no proxies, no API keys.

You pass boards (`greenhouse:stripe`, `lever:spotify`, `ashby:ramp`, `workday:adobe.wd5/external_experienced`, `smartrecruiters:InPost`, `recruitee:prisma`) **or just paste the careers URL**. You get one row per job: title, location, department, apply URL, dates, stable id.

## Supported ATS

| Source | What you pass | Endpoint used |
|---|---|---|
| Greenhouse | `greenhouse:<board>` or `https://boards.greenhouse.io/<board>` | boards-api.greenhouse.io (official) |
| Lever | `lever:<company>` or `https://jobs.lever.co/<company>` | api.lever.co/v0/postings (official) |
| Ashby | `ashby:<company>` or `https://jobs.ashbyhq.com/<company>` | api.ashbyhq.com/posting-api (official) |
| Workday | `workday:<tenant>.<wdN>/<site>` or `https://<tenant>.<wdN>.myworkdayjobs.com/<site>` | career-site CXS jobs JSON (public, paginated) |
| SmartRecruiters | `smartrecruiters:<CompanyIdentifier>` or `https://jobs.smartrecruiters.com/<Company>` | api.smartrecruiters.com/v1 postings (official) |
| Recruitee | `recruitee:<subdomain>` or `https://<subdomain>.recruitee.com` | `<subdomain>.recruitee.com/api/offers` (public) |

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

## FAQ

**Do I need an ATS API key?** No. Every source is a public, unauthenticated endpoint.

**Is this HTML scraping?** No. Greenhouse, Lever, Ashby and SmartRecruiters publish official job-board APIs; Workday and Recruitee career sites load their job lists from public JSON endpoints that this Actor reads directly.

**Why is `department` or `posted_at` empty for some rows?** The ATS does not return it in its list payload. Fields are never guessed.

**One company 404s, what happens?** You get one `error` row for it and the rest of the run completes.

**Where do I find the slug?** It is the token in the careers URL. Or paste the URL itself.

Greenhouse jobs API, Lever jobs API, Ashby jobs API, Workday jobs API, SmartRecruiters jobs API, Recruitee jobs API, ATS job scraper alternative, career site jobs feed.
