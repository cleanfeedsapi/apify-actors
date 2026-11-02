# CleanFeeds Apify Actors

Clean JSON feeds from **official or clearly public JSON endpoints**, packaged as pay-per-event Apify Actors. No HTML scraping, no proxies, no login. Every Actor ships with a self-test (`node src/selftest.js`) against live sources.

| Actor | What it returns | Try it |
|---|---|---|
| [ats-jobs-feed](ats-jobs-feed/) | Jobs from Greenhouse, Lever, Ashby, Workday, SmartRecruiters, Recruitee boards | [apify.com/cleanfeedsapi/ats-jobs-feed](https://apify.com/cleanfeedsapi/ats-jobs-feed) |
| [remote-jobs-feed](remote-jobs-feed/) | Remote jobs from RemoteOK and Arbeitnow public APIs | [apify.com/cleanfeedsapi/remote-jobs-feed](https://apify.com/cleanfeedsapi/remote-jobs-feed) |
| [hn-who-is-hiring](hn-who-is-hiring/) | Hacker News "Who is hiring?" threads as structured jobs (official HN API) | [apify.com/cleanfeedsapi/hn-who-is-hiring](https://apify.com/cleanfeedsapi/hn-who-is-hiring) |
| [github-repo-search](github-repo-search/) | New or trending repositories by topic, language, date (official GitHub Search API) | [apify.com/cleanfeedsapi/github-repo-search](https://apify.com/cleanfeedsapi/github-repo-search) |
| [steam-store-games](steam-store-games/) | Steam store app details, top sellers, new releases | [apify.com/cleanfeedsapi/steam-store-games](https://apify.com/cleanfeedsapi/steam-store-games) |
| [pypi-package-intel](pypi-package-intel/) | PyPI and npm package metadata with weekly downloads | [apify.com/cleanfeedsapi/pypi-package-intel](https://apify.com/cleanfeedsapi/pypi-package-intel) |

Pricing is $2 per 1,000 rows on every Actor. Source rules we follow: if a host's `robots.txt` disallows the JSON path we do not use it, and we never sell personal data of individuals.

## Run locally

```bash
cd ats-jobs-feed && npm install && node src/selftest.js
```

MIT License.
