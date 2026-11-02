import assert from "node:assert/strict";
import { resolveAppIds, fetchAppRows, isComplete } from "./steam.js";

const KEYS = [
  "app_id", "name", "type", "is_free", "price_cents", "currency", "discount_percent",
  "release_date", "developers", "publishers", "genres", "categories", "platforms",
  "metacritic", "recommendations", "header_image", "url",
];

const ids = await resolveAppIds({ listing: "topsellers", maxApps: 14, cc: "us" });
assert.ok(ids.length > 10, `too few ids (${ids.length})`);
const rows = await fetchAppRows(ids.slice(0, 14), { cc: "us" });
assert.ok(rows.length > 10, `too few rows (${rows.length})`);
for (const r of rows.slice(0, 5)) {
  assert.deepEqual(Object.keys(r), KEYS, "schema drift");
  assert.ok(isComplete(r), "incomplete row");
  assert.ok(r.url.startsWith("https://store.steampowered.com/app/"), "bad url");
  assert.equal(typeof r.platforms.windows, "boolean");
  assert.ok(Array.isArray(r.developers) && Array.isArray(r.genres));
}
console.log(`ok steam ${rows.length} rows from ${ids.length} ids`);
console.log("selftest ok");
