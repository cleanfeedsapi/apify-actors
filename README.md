# CleanFeeds Apify Actors

Clean JSON feeds from **official or clearly public JSON endpoints**, packaged as pay-per-event Apify Actors. No HTML scraping, no proxies, no login. Every Actor ships with a self-test (`node src/selftest.js`) against live sources.

| Actor | What it returns | Try it |
|---|---|---|
| [ats-jobs-feed](ats-jobs-feed/) | Jobs from Greenhouse, Lever, Ashby, Workday, SmartRecruiters, Recruitee boards in one feed | [apify.com/cleanfeedsapi/ats-jobs-feed](https://apify.com/cleanfeedsapi/ats-jobs-feed) |
| [greenhouse-jobs-api](greenhouse-jobs-api/) | Every job from any Greenhouse board | [apify.com/cleanfeedsapi/greenhouse-jobs-api](https://apify.com/cleanfeedsapi/greenhouse-jobs-api) |
| [lever-jobs-api](lever-jobs-api/) | Every posting from any Lever board (jobs.lever.co) | [apify.com/cleanfeedsapi/lever-jobs-api](https://apify.com/cleanfeedsapi/lever-jobs-api) |
| [ashby-jobs-api](ashby-jobs-api/) | Every open role from any Ashby board (jobs.ashbyhq.com) | [apify.com/cleanfeedsapi/ashby-jobs-api](https://apify.com/cleanfeedsapi/ashby-jobs-api) |
| [workday-jobs-api](workday-jobs-api/) | Every posting from any Workday career site (myworkdayjobs.com) | [apify.com/cleanfeedsapi/workday-jobs-api](https://apify.com/cleanfeedsapi/workday-jobs-api) |
| [remote-jobs-feed](remote-jobs-feed/) | Remote jobs from RemoteOK and Arbeitnow public APIs | [apify.com/cleanfeedsapi/remote-jobs-feed](https://apify.com/cleanfeedsapi/remote-jobs-feed) |
| [hn-who-is-hiring](hn-who-is-hiring/) | Hacker News "Who is hiring?" threads as structured jobs (official HN API) | [apify.com/cleanfeedsapi/hn-who-is-hiring](https://apify.com/cleanfeedsapi/hn-who-is-hiring) |
| [github-repo-search](github-repo-search/) | Repositories by topic, language, stars, date (official GitHub Search API) | [apify.com/cleanfeedsapi/github-repo-search](https://apify.com/cleanfeedsapi/github-repo-search) |
| [steam-store-games](steam-store-games/) | Steam store app details, top sellers, new releases, specials | [apify.com/cleanfeedsapi/steam-store-games](https://apify.com/cleanfeedsapi/steam-store-games) |
| [app-store-reviews](app-store-reviews/) | Apple App Store reviews per app and country (public RSS) | [apify.com/cleanfeedsapi/app-store-reviews](https://apify.com/cleanfeedsapi/app-store-reviews) |
| [shopify-products-feed](shopify-products-feed/) | Full public catalog of any Shopify store (products.json) | [apify.com/cleanfeedsapi/shopify-products-feed](https://apify.com/cleanfeedsapi/shopify-products-feed) |
| [domain-mx-preflight](domain-mx-preflight/) | MX, SPF, DMARC and mail-provider checks for domain lists (DNS over HTTPS) | [apify.com/cleanfeedsapi/domain-mx-preflight](https://apify.com/cleanfeedsapi/domain-mx-preflight) |
| [pypi-package-intel](pypi-package-intel/) | PyPI and npm package metadata with weekly downloads | [apify.com/cleanfeedsapi/pypi-package-intel](https://apify.com/cleanfeedsapi/pypi-package-intel) |

Pricing is $2 per 1,000 rows ($1.50 on the single-ATS job Actors). Source rules we follow: if a host's `robots.txt` disallows the JSON path we do not use it, and we never sell personal data of individuals.

## Run locally

```bash
cd ats-jobs-feed && npm install && node src/selftest.js
```

MIT License.

Brand site with all feeds: https://cleanfeeds.dev · Free daily sample of the job feeds: https://huggingface.co/datasets/cleanfeeds/tech-jobs-daily
