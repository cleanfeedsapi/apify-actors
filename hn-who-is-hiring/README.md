# HN Who Is Hiring Jobs API | $2/1K

**Quick start**

- Hacker News who is hiring thread as structured JSON: one row per top-level job comment with company, role, location, remote flag, salary hint, links, posted date and the full text.
- Minimal input: `{}` (latest thread, all comments) or `{"query": "rust"}`
- Run it from the Console, the API, or the Apify MCP server; export JSON, CSV or Excel.

Pull the monthly **Ask HN: Who is hiring?** thread into one clean JSON dataset. Data comes from the **official HN Firebase API** (`hacker-news.firebaseio.com`), the same JSON the site itself uses. No HTML scraping, no login, no proxies, no API keys.

## Why this instead of scraping or the vendor API

- The Firebase API is the official, documented HN data source. Every comment is a JSON item at `/v0/item/<id>.json`; nothing is parsed out of the HTML page.
- The latest thread is found automatically: the Actor reads the `whoishiring` user's submissions and picks the newest item whose title starts with "Ask HN: Who is hiring?". No need to look up the thread id each month, though you can pass one.
- The conventional first line `Company | Role | Location | ...` is split into fields, so you get `company`, `title`, `location` and a `salary` hint without an LLM. The raw `text` is always kept for anything the split misses.
- Only top-level comments are returned. Replies, deleted and dead comments are skipped, so rows are job posts and not discussion.
- Job-seeker threads ("Who wants to be hired?") are deliberately not supported: they contain personal data. `kind` only accepts `hiring`.

## What you get

| Field | Meaning |
|---|---|
| `source` | always `hn` |
| `thread_id` | monthly thread item id |
| `comment_id` | top-level comment id (stable across runs) |
| `company`, `title`, `location` | parsed from the conventional first line (`Company \| Role \| Location \| ...`) when present; otherwise best-effort / `null` |
| `remote` | `true` if the header, location or first 280 characters of text mention "remote" |
| `salary` | salary-looking substring or `null` (never invented) |
| `url` | `https://news.ycombinator.com/item?id=49926618` |
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

| Field | Type | Default | Notes |
|---|---|---|---|
| `kind` | enum | `hiring` | only `hiring` is accepted |
| `thread` | string | `latest` | `latest` resolves via the `whoishiring` user, or pass a numeric item id |
| `maxComments` | integer | `0` | `0` = all top-level comments |
| `query` | string | `""` | case-insensitive substring filter on `text` |
| `redactEmails` | boolean | `false` | replace e-mail addresses in `text` with `[email]` |

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
  "text": "FUTO | https://futo.tech/ | Austin, TX | REMOTE(Worldwide) or ONSITE | Full Time\nFUTO is an organization..."
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

Schedule the Actor on the 1st (and mid-month) after the thread is posted. Keep datasets per run and compare `comment_id` sets, or push new rows to Slack / a sheet via Apify's n8n / Make / Zapier nodes.

## Integrations

- **Apify API**: `POST https://api.apify.com/v2/acts/cleanfeedsapi~hn-who-is-hiring/run-sync-get-dataset-items?token=<APIFY_TOKEN>` with the input JSON as the body. The response is the dataset, ready to parse.
- **Scheduling**: open the Actor in the Apify Console, click Schedule, pick a cron (for example the 2nd of each month) and the saved input runs on its own. Each run keeps its own dataset.
- **n8n, Make, Zapier**: use the Apify integration in each tool, choose this Actor and pass the same input JSON. No per-Actor setup, no custom code.
- **Apify MCP server for AI agents**: connect the Apify MCP server to Claude, Cursor or any MCP client and ask the agent to run `cleanfeedsapi/hn-who-is-hiring` with these inputs.

## Related Actors by CleanFeeds

- [ats-jobs-feed](https://apify.com/cleanfeedsapi/ats-jobs-feed): Greenhouse, Lever, Ashby, Workday, SmartRecruiters and Recruitee boards in one schema.
- [remote-jobs-feed](https://apify.com/cleanfeedsapi/remote-jobs-feed): RemoteOK and Arbeitnow remote listings.
- [greenhouse-jobs-feed](https://apify.com/cleanfeedsapi/greenhouse-jobs-feed): Greenhouse boards via the official Job Board API.
- [github-repo-search](https://apify.com/cleanfeedsapi/github-repo-search): new and trending repositories by topic, language or date.

Free sample dataset: [cleanfeeds/tech-jobs-daily on Hugging Face](https://huggingface.co/datasets/cleanfeeds/tech-jobs-daily). More feeds at [cleanfeeds.dev](https://cleanfeeds.dev).

## FAQ

**Do I need an HN API key?** No. The public Firebase endpoints are unauthenticated.

**Is this HTML scraping?** No. Comments are JSON from `hacker-news.firebaseio.com`. We only decode entities / strip tags to parse the conventional first line.

**Why is `company` or `title` null / weird?** Many comments ignore the `Company | Role | Location` convention. Fields are never guessed beyond that boring split; full `text` is always there.

**Does the output contain personal data?** Company posts often include the e-mail address of the person hiring. The Actor returns the post text and links as published. If you store or redistribute rows you are the data controller for those addresses; set `redactEmails: true` to replace e-mail addresses in `text` with `[email]`.

**Rate limits?** Item fetches run with concurrency up to 10 against Firebase.

**How do I detect new and closed items between runs?** `comment_id` is the HN item id of the comment and never changes. Within one month, compare `comment_id` sets between runs of the same `thread_id`: new ids are new posts. A post that disappears was deleted or killed. Across months, group by `company` instead, since each month is a new thread with new ids.

**What happens when a source fails?** This Actor reads one thread, so there are no partial error rows. If the thread id is not numeric, the item is deleted or dead, or no recent "Who is hiring?" thread exists on the `whoishiring` account, the run fails with that message and nothing is charged. An individual comment that is deleted, dead or has no text is skipped silently.
