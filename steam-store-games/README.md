# Steam Store Games API: details, search, listings | $2/1K

**Quick start**

- Steam games API as a dataset: one JSON row per app with name, price, discount, release date, developers, publishers, genres, categories, platforms, Metacritic score and store URL, from store search, a listing, or app IDs you pass.
- Minimal input: `{"listing": "topsellers", "maxApps": 50}`
- Run it from the Console, the API, or the Apify MCP server; export JSON, CSV or Excel.

Pull **Steam storefront** data into one JSON dataset: app details, store search, and topsellers / new / specials listings. Uses the same **public JSON** the Steam store website loads (`store.steampowered.com/api/...`). No HTML scraping, no login, no proxies, no API key for these storefront endpoints.

Pass app IDs, a search term, and/or a listing. You get one row per app: name, type, free flag, price, discount, release date, developers, publishers, genres, categories, platforms, metacritic, recommendations, header image, store URL.

## Why this instead of scraping or the vendor API

- Storefront JSON, not store HTML. `storesearch` resolves a term to app IDs, `featuredcategories` and `search/results?json=1` give the listings, and `appdetails` gives one app's full record. These are the calls the store page makes; the Actor chains them so you do not have to.
- No Steam Web API key. The storefront endpoints are unauthenticated. The official `ISteamApps/GetAppList/v2` is not used because it returned HTTP 404 "Method not found" when checked on 2026-11-02.
- Steam's rate limits are built into the pacing: two workers, a 1.5 second pause after every `appdetails` call, and a backoff sleep of 2, 4, 6, 8, 10 seconds on 429 or 403 before an app is given up.
- Prices come back per store region. Set `cc` to `us`, `pl`, `de`, `gb` and `price_cents` and `currency` reflect that storefront, which is how you compare regional pricing or discounts.
- Rows missing a name, type or URL are dropped before charging, so an app that Steam returns as `success: false` (delisted, region-locked) never costs you a row.

## What you get

| Source | Endpoint | Notes |
|---|---|---|
| App details | `/api/appdetails?appids=` | One app per call; paced (~200/5 min), concurrency 2 |
| Store search | `/api/storesearch/?term=` | Resolves search to app IDs |
| Featured / listing | `/api/featuredcategories` + `/search/results/?json=1` | topsellers, new, specials |
| Official GetAppList | `api.steampowered.com/ISteamApps/GetAppList/v2` | **Unavailable** as of 2026-11-02 (HTTP 404 Method not found) |

## Input examples

```json
{ "listing": "topsellers", "maxApps": 50, "cc": "us" }
```

```json
{ "appIds": ["730", "570", "620"], "search": "portal", "listing": "", "maxApps": 20 }
```

| Field | Type | Default | Notes |
|---|---|---|---|
| `appIds` | string list | `[]` | Steam app IDs |
| `search` | string | `""` | store search term |
| `listing` | enum | `topsellers` | `topsellers` / `new` / `specials` / `""` |
| `maxApps` | integer | `100` | cap after ID resolve |
| `cc` | string | `us` | store country / currency |

IDs are collected in this order: `appIds` first, then `search` hits, then the `listing`, deduplicated, until `maxApps` is reached. If all three are empty the Actor falls back to the featured topsellers.

## Output example

```json
{ "app_id": 620, "name": "Portal 2", "type": "game", "is_free": false,
  "price_cents": 999, "currency": "USD", "discount_percent": 0,
  "release_date": "Apr 18, 2011", "developers": ["Valve"], "publishers": ["Valve"],
  "genres": ["Action", "Adventure"], "categories": ["Single-player", "Co-op"],
  "platforms": { "windows": true, "mac": true, "linux": true },
  "metacritic": 95, "recommendations": 350000, "header_image": "https://...",
  "url": "https://store.steampowered.com/app/620/" }
```

Incomplete detail responses are dropped before charging.

## How much does it cost?

Pay per event: **$2.00 per 1,000 app rows** (`app` event, $0.002 each) plus Apify Actor-start. Set a max charge in Console; the Actor stops at the limit.

## Use cases

- **Price / discount monitors** for a watchlist of app IDs.
- **Market snapshots**: topsellers or specials into a sheet / warehouse.
- **AI agents / MCP**: "what is on sale in topsellers" without a browser.
- **Catalog enrichment**: genres, platforms, metacritic for known IDs.

## Integrations

- **Apify API**: `POST https://api.apify.com/v2/acts/cleanfeedsapi~steam-store-games/run-sync-get-dataset-items?token=<APIFY_TOKEN>` with the input JSON as the body. The response is the dataset, ready to parse. Keep `maxApps` modest for sync calls, since details are paced at about 1.5 seconds per app per worker.
- **Scheduling**: open the Actor in the Apify Console, click Schedule, pick a cron (for example daily at 08:00) and the saved input runs on its own. Each run keeps its own dataset.
- **n8n, Make, Zapier**: use the Apify integration in each tool, choose this Actor and pass the same input JSON. No per-Actor setup, no custom code.
- **Apify MCP server for AI agents**: connect the Apify MCP server to Claude, Cursor or any MCP client and ask the agent to run `cleanfeedsapi/steam-store-games` with these inputs.

## Related Actors by CleanFeeds

- [app-store-reviews](https://apify.com/cleanfeedsapi/app-store-reviews): Apple App Store customer reviews via the public RSS JSON.
- [github-repo-search](https://apify.com/cleanfeedsapi/github-repo-search): new and trending repositories by topic, language or date.
- [shopify-products-feed](https://apify.com/cleanfeedsapi/shopify-products-feed): Shopify storefront `products.json` with a change filter.
- [hn-who-is-hiring](https://apify.com/cleanfeedsapi/hn-who-is-hiring): monthly Hacker News hiring thread as structured rows.

More feeds at [cleanfeeds.dev](https://cleanfeeds.dev).

## FAQ

**Do I need a Steam Web API key?** Not for these storefront JSON endpoints. (Official `GetAppList` currently 404s without a usable method.)

**Is this HTML scraping?** No. Only public JSON used by the store UI. `robots.txt` does not Disallow `/api/`.

**Rate limits?** Calls are paced (~1.5s) at concurrency 2; 429/403 trigger backoff sleep.

**Why is price null?** Free apps or missing `price_overview`: `price_cents` is `0` for free apps and `null` when Steam sends no price block; fields are never invented.

**How do I detect new and closed items between runs?** `app_id` is Steam's own identifier and never changes. For a listing such as `topsellers` or `specials`, keep each run's dataset and compare `app_id` sets: new ids entered the listing, missing ids left it. For a fixed `appIds` watchlist, compare `price_cents` and `discount_percent` per `app_id` instead.

**What happens when a source fails?** There are no error rows in this Actor. An `appdetails` call that fails, returns `success: false`, or yields an incomplete row is logged with a warning and skipped, so the dataset holds only complete apps and only those are charged. If `featuredcategories` fails the Actor falls back to `search/results?json=1` for the listing. If `storesearch` or that fallback fails after the backoff retries, the run fails with the HTTP status in the message and nothing is charged.

Steam store API, Steam appdetails, Steam topsellers JSON, Steam price API, Steam store search API, Steam game metadata.
