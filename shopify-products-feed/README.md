# Shopify Products.json Feed + Delta | $1/1K

**Quick start**

- Shopify products JSON as a dataset: one row per product from each storefront you list, with id, handle, title, vendor, type, tags, URL, timestamps, variant count, min and max price, availability, image and first SKU.
- Minimal input: `{"shops": ["https://www.allbirds.com"]}`
- Run it from the Console, the API, or the Apify MCP server; export JSON, CSV or Excel.

Pull live catalog rows from a Shopify storefront's **public `products.json`** (the same unauthenticated JSON many themes load) into one dataset. Optional collection scope and `updated_at` delta for price/stock change watches.

No HTML scraping, no login, no proxies, no Storefront API token.

## Why this instead of scraping or the vendor API

- `https://<shop>/products.json` and `/collections/<handle>/products.json` are JSON endpoints Shopify serves for every storefront. The Actor reads them in pages of 250, not the rendered product pages.
- No Admin API, no Storefront API token, no app install. Those need the merchant's consent and credentials; this reads what the shop already publishes to the public.
- The delta is built in. Pass `onlyChangedSince` with an ISO timestamp and only products whose `updated_at` is strictly after it are kept, which turns a daily schedule into a change feed for price and stock moves.
- Collection scope cuts the catalog to what you care about. With `collections` set, only those handles are read, applied to every shop in the list.
- Polite by default: two shops in parallel, 500 ms between pages, and a 40-product default cap so an empty-input run finishes in minutes. Rows missing id, handle, title or URL are dropped before charging.

## What you get

| Field | Meaning |
|---|---|
| `shop` | hostname (e.g. `www.allbirds.com`) |
| `product_id`, `handle`, `title` | Shopify product id + handle + title |
| `vendor`, `product_type` | as published |
| `tags` | string array |
| `url` | `{origin}/products/{handle}` |
| `created_at`, `updated_at`, `published_at` | ISO strings from the storefront |
| `variants_count` | number of variants |
| `min_price`, `max_price` | numeric min/max of variant `price` |
| `currency` | always `null` here; `products.json` does not include a currency code |
| `available` | `true` if any variant has `available: true` |
| `image` | first product image URL when present |
| `first_variant_sku` | SKU of the first variant, or `null` |

Incomplete product rows are **dropped before charging**. A shop that 401/403/404s yields **one** row with `error` and the run continues.

## Input examples

```json
{ "shops": ["https://www.allbirds.com"], "maxProductsPerShop": 1000 }
```

```json
{
  "shops": ["gymshark.com"],
  "collections": ["mens"],
  "maxProductsPerShop": 250,
  "onlyChangedSince": "2026-10-01T00:00:00.000Z"
}
```

| Field | Type | Default | Notes |
|---|---|---|---|
| `shops` | string list | allbirds + gymshark.com | URL or bare domain |
| `collections` | string list | `[]` | if set, use `/collections/{handle}/products.json` only |
| `maxProductsPerShop` | integer | `40` | `0` = no cap (can be large) |
| `onlyChangedSince` | string | `""` | ISO timestamp; empty = no delta filter |

Empty input works: two sample shops, 40 products each, no delta.

## Output example

```json
{
  "shop": "www.allbirds.com",
  "product_id": "7340901859408",
  "handle": "womens-allbirds-flip-flop-dusty-pink",
  "title": "Women's Allbirds Flip Flop - Dusty Pink",
  "vendor": "Allbirds",
  "product_type": "",
  "tags": ["shoprunner"],
  "url": "https://www.allbirds.com/products/womens-allbirds-flip-flop-dusty-pink",
  "created_at": "2024-01-01T00:00:00-07:00",
  "updated_at": "2026-10-15T12:00:00-07:00",
  "published_at": "2024-01-02T00:00:00-07:00",
  "variants_count": 5,
  "min_price": 50,
  "max_price": 50,
  "currency": null,
  "available": false,
  "image": "https://cdn.shopify.com/...",
  "first_variant_sku": "A12513W050"
}
```

**Not included, by design:** full variant matrices, checkout, customer data, authenticated Admin/Storefront GraphQL.

## How much does it cost?

Pay per event: **$1.00 per 1,000 product rows** (`product` event, $0.001 each) plus Apify's Actor-start event. Set a max charge in the Console; the Actor trims to `chargedCount`. Free plan is enough to try the sample shops.

## Use cases

- **Price / stock watchers**: schedule with `onlyChangedSince` = last run time.
- **Competitor catalog snapshots**: multi-shop input, one schema.
- **AI agents / MCP**: "list in-stock products on this Shopify brand" without a browser.
- **Collection-scoped feeds**: pass `collections` handles only.

## Integrations

- **Apify API**: `POST https://api.apify.com/v2/acts/cleanfeedsapi~shopify-products-feed/run-sync-get-dataset-items?token=<APIFY_TOKEN>` with the input JSON as the body. The response is the dataset, ready to parse.
- **Scheduling**: open the Actor in the Apify Console, click Schedule, pick a cron (for example daily at 05:00) and set `onlyChangedSince` to the previous run time to receive only changed products. Each run keeps its own dataset.
- **n8n, Make, Zapier**: use the Apify integration in each tool, choose this Actor and pass the same input JSON. No per-Actor setup, no custom code.
- **Apify MCP server for AI agents**: connect the Apify MCP server to Claude, Cursor or any MCP client and ask the agent to run `cleanfeedsapi/shopify-products-feed` with these inputs.

## Related Actors by CleanFeeds

- [steam-store-games](https://apify.com/cleanfeedsapi/steam-store-games): Steam storefront details, search and listings.
- [app-store-reviews](https://apify.com/cleanfeedsapi/app-store-reviews): Apple App Store customer reviews via the public RSS JSON.
- [domain-mx-preflight](https://apify.com/cleanfeedsapi/domain-mx-preflight): MX, A and HTTPS preflight for domain lists.
- [github-repo-search](https://apify.com/cleanfeedsapi/github-repo-search): new and trending repositories by topic, language or date.

More feeds at [cleanfeeds.dev](https://cleanfeeds.dev).

## FAQ

**Do I need a Shopify API key?** No for this Actor. It reads public storefront `products.json`.

**Is this HTML scraping?** No. JSON only.

**Why did one shop return an error row?** Some hosts block or remove `products.json` (e.g. `www.gymshark.com` returns 403 while `gymshark.com` returns 200). Others return HTML. The Actor records `error` and continues.

**robots.txt / ToS?** See Actor NOTES. Prefer merchant permission / official Storefront API for production commerce apps. Rate: **2 shops concurrent**, **500ms** between pages.

**Currency null?** Storefront `products.json` prices are bare numbers/strings without ISO currency.

**How do I detect new and closed items between runs?** `product_id` is Shopify's numeric product id and does not change, even when the handle is edited. Keep each run's dataset and compare `product_id` sets per `shop`: ids present today but not yesterday are new products, ids present yesterday but not today were unpublished or deleted. For price and stock changes on existing products, use `onlyChangedSince` instead of a full diff, or compare `min_price`, `max_price` and `available` per `product_id`.

**What happens when a source fails?** Shops are independent. If a shop's `products.json` returns a non-2xx status, returns something that is not JSON, or `onlyChangedSince` cannot be parsed, the Actor pushes one row for that shop with every product field `null` (or `[]`, `0`, `false`) plus `error` holding the message, and the other shops still complete. Error rows are not charged. A product that lacks an id, handle, title or URL is dropped silently rather than reported.

Shopify products.json API, Shopify storefront catalog feed, Shopify price monitor, Shopify stock availability JSON, collection products.json scraper alternative, Shopify public product feed.
