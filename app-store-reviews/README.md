# App Store Reviews + Lookup (iTunes JSON) | $1.50/1K

**Quick start**

- App Store reviews API as a dataset: the most recent customer reviews for each app and storefront you list, one JSON row per review with rating, title, text, version, date and a stable review id.
- Minimal input: `{"appIds": ["284882215"], "countries": ["us"]}`
- Run it from the Console, the API, or the Apify MCP server; export JSON, CSV or Excel.

Pull **Apple App Store customer reviews** and optional app metadata into a clean JSON dataset. Uses only Apple's **public iTunes JSON** endpoints (customer-reviews RSS, lookup, search). No HTML scraping, no login, no proxies.

**Honest ceiling:** Apple's reviews RSS returns at most **10 pages × ~50 reviews = ~500 reviews per app per country**. Page 11 returns HTTP 400. This Actor will not invent reviews beyond that. For more history you need App Store Connect (developer-owned apps) or another product, not this feed.

## Why this instead of scraping or the vendor API

- Apple's public RSS at `itunes.apple.com/rss/customerreviews/page=N/id=<app>/sortby=mostrecent/json` is an undocumented but long-stable RSS JSON endpoint, not the App Store web page. It needs no Apple ID, no developer account and no App Store Connect API key.
- The feed gives 10 pages of about 50 reviews per app per storefront. The Actor walks pages 1 to `maxPages`, deduplicates on `review_id`, and stops early when a page is empty or Apple returns 400, so you get the full window without over-fetching.
- Per-storefront, not just US. Pass any list of `countries` and each app is read per country. A pasted URL such as `https://apps.apple.com/gb/app/whatsapp-messenger/id310633997` adds its own country (`gb`) automatically.
- App metadata comes free from the same host. With `includeAppDetails` the `lookup` endpoint adds name, seller, average rating, rating count, price, genres and release date to the `APPS` record, and `search` resolves a term to app ids without you looking them up.
- Reviewer names are not collected. Rows hold text, rating, version, date and id only, which keeps the dataset free of personal data you would have to manage.

## What you get

Default dataset = one row per review:

| Field | Meaning |
|---|---|
| `app_id` | numeric track id |
| `app_name` | from lookup when enabled |
| `country` | storefront code (`us`, `gb`, ...) |
| `review_id` | stable id from the RSS feed |
| `title`, `content` | review text |
| `rating` | 1 to 5 integer |
| `version` | app version reviewed |
| `updated_at` | ISO 8601 |
| `vote_sum`, `vote_count` | helpfulness votes |
| `url` | review / app link from the feed |

**App details** (lookup) are written to key-value record **`APPS`**, not mixed into the reviews dataset. Search hits (if you pass `search`) go to **`APPS_SEARCH`**.

A failed app/country fetch yields one row with `error` and the run continues.

## Input examples

```json
{ "appIds": [284882215], "countries": ["us"], "maxPages": 10, "includeAppDetails": true }
```

```json
{
  "appUrls": ["https://apps.apple.com/gb/app/whatsapp-messenger/id310633997"],
  "countries": ["gb", "us"],
  "maxPages": 5
}
```

```json
{ "search": "notion", "countries": ["us"], "maxPages": 2 }
```

| Field | Type | Default | Notes |
|---|---|---|---|
| `appIds` | list | `284882215` | numeric ids |
| `appUrls` | list | `[]` | id and country parsed from URLs like `https://apps.apple.com/gb/app/whatsapp-messenger/id310633997` |
| `search` | string | empty | iTunes `entity=software` search, first 25 hits in the first listed country |
| `countries` | list | `us` | ISO alpha-2 storefronts |
| `maxPages` | 1 to 10 | `10` | hard-capped at 10 |
| `includeAppDetails` | bool | `true` | writes KV `APPS` |

## Output example

```json
{
  "app_id": 284882215,
  "app_name": "Facebook",
  "country": "us",
  "review_id": "14736650496",
  "title": "Great app",
  "rating": 5,
  "version": "585.0.0",
  "updated_at": "2026-11-01T07:07:58.000Z",
  "content": "Works well.",
  "vote_sum": 0,
  "vote_count": 0,
  "url": "https://itunes.apple.com/us/review?id=284882215&type=Purple%20Software"
}
```

## How much does it cost?

Pay per event: **$1.50 per 1,000 review rows** (`review` event @ $0.0015) plus Apify's Actor-start event. Lookup/search payloads in `APPS` are not charged as reviews. Set a max charge in the Console to stop early. Free plan is enough to try the default Facebook/US sample.

## Use cases

- Monitor your own or competitors' latest public reviews by country
- Sentiment / support triage for the newest 500 reviews per storefront
- Agent/MCP: "what are people saying about app X in US/GB this week?"
- Enrich with lookup fields (rating count, seller, genres) from `APPS`

## Privacy

Reviewer display names are intentionally not collected: rows carry the review text, rating, version, date and id only.

## Integrations

- **Apify API**: `POST https://api.apify.com/v2/acts/cleanfeedsapi~app-store-reviews/run-sync-get-dataset-items?token=<APIFY_TOKEN>` with the input JSON as the body. The response is the reviews dataset. Fetch the `APPS` record separately from the run's key-value store.
- **Scheduling**: open the Actor in the Apify Console, click Schedule, pick a cron (for example daily at 07:00) and the saved input runs on its own. Each run keeps its own dataset.
- **n8n, Make, Zapier**: use the Apify integration in each tool, choose this Actor and pass the same input JSON. No per-Actor setup, no custom code.
- **Apify MCP server for AI agents**: connect the Apify MCP server to Claude, Cursor or any MCP client and ask the agent to run `cleanfeedsapi/app-store-reviews` with these inputs.

## Related Actors by CleanFeeds

- [steam-store-games](https://apify.com/cleanfeedsapi/steam-store-games): Steam storefront details, search and listings.
- [shopify-products-feed](https://apify.com/cleanfeedsapi/shopify-products-feed): Shopify storefront `products.json` with a change filter.
- [github-repo-search](https://apify.com/cleanfeedsapi/github-repo-search): new and trending repositories by topic, language or date.
- [domain-mx-preflight](https://apify.com/cleanfeedsapi/domain-mx-preflight): MX, A and HTTPS preflight for domain lists.

More feeds at [cleanfeeds.dev](https://cleanfeeds.dev).

## FAQ

**Why only ~500 reviews?** That is Apple's public RSS ceiling (pages 1 to 10). This Actor states it instead of pretending otherwise.

**Do I need an Apple developer account?** No. These endpoints are unauthenticated public JSON.

**Is this HTML scraping?** No. RSS/lookup/search JSON only.

**Are there limits or terms on Apple's side?** Apple's Search/Lookup API is rate limited to roughly 20 calls per minute per IP and Apple's terms allow its content for promoting App Store content; the reviews feed may change without notice.

**Can I paste an App Store URL?** Yes. Country and id are parsed from the URL: `https://apps.apple.com/gb/app/whatsapp-messenger/id310633997` gives `gb` and `310633997`.

**Where are app details?** Key-value record `APPS` (and `APPS_SEARCH` when you use search).

**How do I detect new and closed items between runs?** `review_id` is Apple's id for the review and does not change. The feed is sorted by most recent, so schedule the Actor daily, keep each run's dataset and compare `review_id` sets per `app_id` and `country`: ids present today but not yesterday are new reviews. A review that disappears was removed by the user or by Apple. Rows are deduplicated on `review_id` within a run.

**What happens when a source fails?** Three cases, none of which stop the run. A pasted URL that does not match the App Store pattern yields a row with `url`, `app_id: null` and `error`. A failing `search` yields one row with `error` starting with `search:`. For an app and country pair, the Actor first tries `lookup`; if that fails it only logs a warning and `app_name` stays `null`. If the first RSS page fails, it pushes one row with `app_id`, `country` and `error` and moves on. If a later page fails, it keeps the reviews already collected. Error rows are not charged.
