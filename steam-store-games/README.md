# Steam Store Games API: details, search, listings | $2/1K

Pull **Steam storefront** data into one JSON dataset: app details, store search, and topsellers / new / specials listings. Uses the same **public JSON** the Steam store website loads (`store.steampowered.com/api/...`). No HTML scraping, no login, no proxies, no API key for these storefront endpoints.

Pass app IDs, a search term, and/or a listing. You get one row per app: name, type, free flag, price, discount, release date, developers, publishers, genres, categories, platforms, metacritic, recommendations, header image, store URL.

## What you get

| Source | Endpoint | Notes |
|---|---|---|
| App details | `/api/appdetails?appids=` | One app per call; paced (~200/5 min), concurrency 2 |
| Store search | `/api/storesearch/?term=` | Resolves search → app IDs |
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
- **AI agents / MCP**: “what’s on sale in topsellers” without a browser.
- **Catalog enrichment**: genres, platforms, metacritic for known IDs.

## FAQ

**Do I need a Steam Web API key?** Not for these storefront JSON endpoints. (Official `GetAppList` currently 404s without a usable method.)

**Is this HTML scraping?** No. Only public JSON used by the store UI. `robots.txt` does not Disallow `/api/`.

**Rate limits?** Calls are paced (~1.5s) at concurrency 2; 429/403 trigger backoff sleep.

**Why is price null?** Free apps or missing `price_overview` → `price_cents` 0 or null; fields are never invented.

Steam store API, Steam appdetails, Steam topsellers JSON, Steam price API, Steam store search API, Steam game metadata.
