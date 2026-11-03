import assert from "node:assert/strict";
import { fetchReviews, lookupApp, parseAppUrl, searchApps, MAX_PAGES } from "./itunes.js";

const KEYS = [
  "app_id", "app_name", "country", "review_id", "title", "rating", 
  "version", "updated_at", "content", "vote_sum", "vote_count", "url",
];

assert.equal(MAX_PAGES, 10);
const p = parseAppUrl("https://apps.apple.com/us/app/facebook/id284882215");
assert.deepEqual(p, { country: "us", appId: 284882215 });
assert.throws(() => parseAppUrl("https://example.com/x"), /unrecognized/);

const detail = await lookupApp(284882215, "us");
assert.equal(detail.app_id, 284882215);
assert.ok(detail.app_name);

const hits = await searchApps("facebook", "us", 5);
assert.ok(hits.length >= 1);
assert.ok(hits[0].app_id);

const rows = await fetchReviews(284882215, "us", { maxPages: 1, appName: detail.app_name });
assert.ok(rows.length > 10, `too few rows (${rows.length})`);
for (const r of rows.slice(0, 5)) {
  assert.deepEqual(Object.keys(r), KEYS, "schema drift");
  assert.equal(r.app_id, 284882215);
  assert.equal(r.country, "us");
  assert.ok(r.review_id);
  assert.equal(typeof r.rating, "number");
  assert.ok(r.updated_at == null || r.updated_at.includes("T"));
}
console.log(`ok facebook/us ${rows.length}`);
console.log("selftest ok");
