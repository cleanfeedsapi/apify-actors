import { Actor } from "apify";
import { fetchReviews, lookupApp, parseAppUrl, searchApps, MAX_PAGES } from "./itunes.js";

await Actor.init();
const {
  appIds = [284882215],
  appUrls = [],
  search = "",
  countries = ["us"],
  maxPages = 10,
  includeAppDetails = true,
} = (await Actor.getInput()) ?? {};

const pages = Math.min(MAX_PAGES, Math.max(1, Number(maxPages) || 1));
const ccs = (countries?.length ? countries : ["us"]).map((c) => String(c).toLowerCase());

// Resolve targets: numeric ids + URLs (+ optional search hits).
const targets = []; // { appId, countryHint? }
for (const id of appIds || []) {
  const n = Number(id);
  if (Number.isFinite(n) && n > 0) targets.push({ appId: n });
}
for (const u of appUrls || []) {
  try {
    const p = parseAppUrl(u);
    targets.push({ appId: p.appId, countryHint: p.country });
  } catch (e) {
    await Actor.pushData([{ app_id: null, country: null, error: e.message, url: String(u) }]);
  }
}
if (String(search || "").trim()) {
  try {
    const hits = await searchApps(String(search).trim(), ccs[0], 25);
    for (const h of hits) targets.push({ appId: h.app_id });
    if (includeAppDetails && hits.length) {
      await Actor.setValue("APPS_SEARCH", hits);
    }
  } catch (e) {
    await Actor.pushData([{ app_id: null, country: ccs[0], error: `search: ${e.message}` }]);
  }
}

// Dedupe by appId
const seenApp = new Set();
const apps = [];
for (const t of targets) {
  if (seenApp.has(t.appId)) continue;
  seenApp.add(t.appId);
  apps.push(t);
}
if (!apps.length) throw new Error("no appIds / appUrls / search results to fetch");

const appDetails = [];
let total = 0;
let stop = false;

for (const t of apps) {
  if (stop) break;
  const countriesForApp = t.countryHint && !ccs.includes(t.countryHint)
    ? [t.countryHint, ...ccs]
    : ccs;

  for (const cc of countriesForApp) {
    if (stop) break;
    let appName = null;
    try {
      if (includeAppDetails) {
        const detail = await lookupApp(t.appId, cc);
        appName = detail.app_name;
        appDetails.push(detail);
      }
    } catch (e) {
      console.warn(`lookup ${t.appId}/${cc}: ${e.message}`);
    }

    try {
      let rows = await fetchReviews(t.appId, cc, { maxPages: pages, appName });
      // Drop incomplete rows before charging.
      rows = rows.filter((r) => r.app_id && r.review_id && r.rating != null);
      let limit = false;
      if (Actor.getChargingManager().getPricingInfo().isPayPerEvent) {
        const { chargedCount, eventChargeLimitReached } = await Actor.charge({
          eventName: "review",
          count: rows.length,
        });
        rows = rows.slice(0, chargedCount);
        limit = eventChargeLimitReached;
      }
      await Actor.pushData(rows);
      total += rows.length;
      console.log(`${t.appId}/${cc}: ${rows.length} reviews`);
      if (limit) { console.warn("max charge reached, stopping"); stop = true; }
    } catch (e) {
      console.warn(`${t.appId}/${cc}: FAILED ${e.message}`);
      await Actor.pushData([{ app_id: t.appId, country: cc, error: e.message }]);
    }
  }
}

if (includeAppDetails && appDetails.length) {
  await Actor.setValue("APPS", appDetails);
}
await Actor.setValue("SUMMARY", {
  apps: apps.length,
  countries: ccs,
  reviews: total,
  cap_per_app_country: pages * 50,
  note: "App details stored in key-value record APPS (not the default dataset).",
});
await Actor.exit();
