# PyPI + npm Package Intel API | $2/1K

Pull live package metadata from the **official PyPI JSON API** and the **npm registry** into **one JSON dataset**. Pass package names and an ecosystem (`pypi`, `npm`, or `both`). Optional weekly download counts from pypistats.org (PyPI) and api.npmjs.org (npm).

No HTML scraping, no login, no proxies, no API keys.

## What you get

| Field | Meaning |
|---|---|
| `ecosystem` | `pypi` or `npm` |
| `name`, `version` | canonical name + latest version |
| `summary` | short description |
| `license` | as published (may be null) |
| `homepage`, `repository` | best-effort from project URLs |
| `author` | author / author_email / npm author name |
| `requires_python` | PyPI only; null on npm |
| `engines` | npm `engines` JSON string; null on PyPI |
| `keywords` | string array |
| `dependencies_count` | PyPI `requires_dist` length, or npm deps+peerDeps count |
| `release_date` | ISO time of latest release artifact when available |
| `first_release_date` | ISO time of earliest release seen |
| `releases_count` | number of published versions |
| `downloads_last_week` | int or `null` if disabled / unavailable |
| `url` | public project page on pypi.org or npmjs.com |

Incomplete lookups (missing name/version/url) are **dropped before charging**. A name that 404s in one ecosystem is skipped with a log line; the other packages continue.

## Input examples

```json
{ "packages": ["requests", "numpy"], "ecosystem": "pypi", "includeDownloads": true }
```

```json
{ "packages": ["lodash", "react", "express"], "ecosystem": "npm" }
```

```json
{ "packages": ["requests", "lodash"], "ecosystem": "both", "includeDownloads": false }
```

| Field | Type | Default | Notes |
|---|---|---|---|
| `packages` | string list | six sample PyPI names | queried in each selected ecosystem |
| `ecosystem` | enum | `both` | `pypi` \| `npm` \| `both` |
| `includeDownloads` | boolean | `true` | extra HTTP to pypistats / npm downloads |

## Output example

```json
{
  "ecosystem": "pypi",
  "name": "requests",
  "version": "2.34.2",
  "summary": "Python HTTP for Humans.",
  "license": "Apache-2.0",
  "homepage": "https://requests.readthedocs.io",
  "repository": "https://github.com/psf/requests",
  "author": "Kenneth Reitz <me@kennethreitz.org>",
  "requires_python": ">=3.10",
  "engines": null,
  "keywords": [],
  "dependencies_count": 5,
  "release_date": "2026-01-15T12:00:00.000Z",
  "first_release_date": "2011-02-14T00:00:00.000Z",
  "releases_count": 163,
  "downloads_last_week": 353421454,
  "url": "https://pypi.org/project/requests/"
}
```

**Not included, by design:** full file digests, vulnerability DBs, dependency trees beyond a count, scraping of project homepages.

## How much does it cost?

Pay per event: **$2.00 per 1,000 package rows** (`package` event, $0.002 each) plus Apify's small Actor-start event. Platform compute is on us. Set a maximum charge per run in the Console; the Actor trims to the charged count. The Apify free plan is enough to try the sample packages.

## Use cases

- **Supply-chain monitors**: nightly metadata + download pulse for a watchlist.
- **SBOM / inventory enrichment**: fill license, repo, and release age for known names.
- **AI agents and MCP**: "what is the latest requests / lodash?" without HTML.
- **Registry diffing**: compare `version` / `releases_count` across runs.

## FAQ

**Do I need a PyPI or npm API key?** No. All endpoints used are public JSON.

**Is this HTML scraping?** No. PyPI ` /pypi/<name>/json `, npm `registry.npmjs.org/<name>`, optional download APIs only.

**Why does PyPI `robots.txt` disallow `/pypi/*/json`?** That rule targets crawlers. This Actor uses the [documented JSON API](https://docs.pypi.org/api/json/) with a descriptive User-Agent and polite pacing — not a site-wide crawl of `/simple/` or `/packages/`.

**pypistats rate limits?** Stats update daily; cache results and avoid hammering the same package. We add small delays between calls. For bulk historical data, PyPI recommends BigQuery instead of pypistats.

**Name exists on PyPI but not npm (or vice versa)?** That ecosystem row is skipped; others still return.

PyPI JSON API, npm registry API, package metadata API, pypistats downloads, npm downloads last-week, Python package intel, npm package intel, supply chain package feed.
