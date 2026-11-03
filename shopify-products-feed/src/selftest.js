import assert from "node:assert/strict";
import { fetchShops, fetchShop, normalizeShop, ROW_KEYS, isComplete } from "./shopify.js";

assert.equal(normalizeShop("www.allbirds.com"), "https://www.allbirds.com");
assert.equal(normalizeShop("https://gymshark.com/collections/mens"), "https://gymshark.com");

const rows = await fetchShops({
  shops: ["https://www.allbirds.com", "https://gymshark.com"],
  maxProductsPerShop: 15,
});
const products = rows.filter((r) => !r.error);
assert.ok(products.length > 10, `too few products (${products.length})`);
for (const r of products.slice(0, 5)) {
  assert.deepEqual(Object.keys(r), ROW_KEYS, "schema drift");
  assert.ok(isComplete(r), "incomplete row");
  assert.ok(r.url.startsWith("http"), "bad url");
  assert.ok(Array.isArray(r.tags));
  assert.equal(typeof r.available, "boolean");
  assert.equal(r.currency, null);
}
console.log(`ok products ${products.length}`);

const col = await fetchShop({
  shop: "https://www.allbirds.com",
  collections: ["mens"],
  maxProductsPerShop: 5,
});
assert.ok(col.length >= 1, "collection empty");
assert.deepEqual(Object.keys(col[0]), ROW_KEYS);
console.log(`ok collection ${col.length}`);

const since = "2099-01-01T00:00:00.000Z";
const delta = await fetchShop({
  shop: "https://www.allbirds.com",
  maxProductsPerShop: 20,
  onlyChangedSince: since,
});
assert.equal(delta.length, 0, "delta future should be empty");
console.log("ok delta filter");

const bad = await fetchShops({ shops: ["https://www.gymshark.com"], maxProductsPerShop: 5 });
assert.ok(bad.some((r) => r.error), "expected error row for www.gymshark.com");
console.log(`ok error row: ${bad.find((r) => r.error).error}`);

console.log("selftest ok");
