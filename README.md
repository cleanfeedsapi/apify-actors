# CleanFeeds Apify Actors

Clean JSON feeds from **the JSON endpoints the sources' own pages load** (some officially documented, some public but undocumented; each README says which), packaged as pay-per-event Apify Actors. No HTML scraping, no proxies, no login. Every Actor ships with a self-test (`node src/selftest.js`) against live sources.

| Actor | What it returns | Try it |
|---|---|---|
| [ats-jobs-feed](ats-jobs-feed/) | Jobs from Greenhouse, Lever, Ashby, Workday, SmartRecruiters, Recruitee boards in one feed | [apify.com/cleanfeedsapi/ats-jobs-feed](https://apify.com/cleanfeedsapi/ats-jobs-feed) |
| [greenhouse-jobs-feed](greenhouse-jobs-feed/) | Every job from any Greenhouse board (Greenhouse only) | [apify.com/cleanfeedsapi/greenhouse-jobs-feed](https://apify.com/cleanfeedsapi/greenhouse-jobs-feed) |
| [lever-jobs-feed](lever-jobs-feed/) | Every posting from any Lever board (Lever only) | [apify.com/cleanfeedsapi/lever-jobs-feed](https://apify.com/cleanfeedsapi/lever-jobs-feed) |
| [ashby-jobs-feed](ashby-jobs-feed/) | Every open role from any Ashby board (Ashby only) | [apify.com/cleanfeedsapi/ashby-jobs-feed](https://apify.com/cleanfeedsapi/ashby-jobs-feed) |
| [workday-jobs-feed](workday-jobs-feed/) | Every posting from any Workday career site (Workday only) | [apify.com/cleanfeedsapi/workday-jobs-feed](https://apify.com/cleanfeedsapi/workday-jobs-feed) |
| [remote-jobs-feed](remote-jobs-feed/) | Remote jobs from RemoteOK and Arbeitnow public APIs | [apify.com/cleanfeedsapi/remote-jobs-feed](https://apify.com/cleanfeedsapi/remote-jobs-feed) |
| [hn-who-is-hiring](hn-who-is-hiring/) | Hacker News "Who is hiring?" threads as structured jobs (official HN API) | [apify.com/cleanfeedsapi/hn-who-is-hiring](https://apify.com/cleanfeedsapi/hn-who-is-hiring) |
| [github-repo-search](github-repo-search/) | Repositories by topic, language, stars, date (official GitHub Search API) | [apify.com/cleanfeedsapi/github-repo-search](https://apify.com/cleanfeedsapi/github-repo-search) |
| [steam-store-games](steam-store-games/) | Steam store app details, top sellers, new releases, specials (undocumented storefront endpoints) | [apify.com/cleanfeedsapi/steam-store-games](https://apify.com/cleanfeedsapi/steam-store-games) |
| [app-store-reviews](app-store-reviews/) | Apple App Store reviews per app and country (undocumented RSS JSON) | [apify.com/cleanfeedsapi/app-store-reviews](https://apify.com/cleanfeedsapi/app-store-reviews) |
| [shopify-products-feed](shopify-products-feed/) | Public products.json of a Shopify storefront, where exposed | [apify.com/cleanfeedsapi/shopify-products-feed](https://apify.com/cleanfeedsapi/shopify-products-feed) |
| [domain-mx-preflight](domain-mx-preflight/) | MX, A record, HTTPS reachability and disposable-domain checks for domain lists | [apify.com/cleanfeedsapi/domain-mx-preflight](https://apify.com/cleanfeedsapi/domain-mx-preflight) |

Pricing per 1,000 rows: $2 on the job, GitHub and Steam feeds, $1.50 on the single-ATS job Actors and App Store reviews, $1 on the Shopify products feed, $0.50 on MX preflight. Apify Silver and Gold plans get 25% and 50% off. Source rules we follow: if a host's `robots.txt` disallows the JSON path we do not use it, and we do not build feeds from job-seeker or other person-centric threads; where posts carry contact e-mails (Hacker News hiring posts) the Actor offers redaction.

## Run locally

```bash
cd ats-jobs-feed && npm install && node src/selftest.js
```

MIT License.

Brand site with all feeds: https://cleanfeeds.dev · Free daily sample of the job feeds: https://huggingface.co/datasets/cleanfeeds/tech-jobs-daily
