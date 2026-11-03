import assert from "node:assert/strict";
import { checkDomain, toDomain, mapPool, DEFAULT_DOMAINS, ROW_KEYS, isChargeable } from "./dns.js";
import { DISPOSABLE } from "./disposable.js";

assert.ok(DISPOSABLE.size >= 200, "disposable list too small");
assert.equal(toDomain("Alice@Mailinator.com", true), "mailinator.com");
assert.equal(toDomain("https://www.GitHub.com/path", true), "github.com");
assert.equal(toDomain("user@x.com", false), null);

const sample = [
  "google.com", "github.com", "cloudflare.com", "example.com", "ietf.org",
  "mailinator.com", "yopmail.com",
  "nonexistent-mx-preflight-test-aaa.invalid",
  "dead-check-bbb.invalid",
  "no-such-host-ccc.invalid",
  "stripe.com", "apify.com",
];
const rows = await mapPool(sample, 6, (d) => checkDomain(d, true));
assert.ok(rows.length > 10, `too few rows (${rows.length})`);
for (const r of rows) {
  assert.deepEqual(Object.keys(r), ROW_KEYS, `schema drift ${r.domain}`);
  assert.ok(isChargeable(r), `not chargeable ${r.domain}`);
  assert.ok(!String(r.input).includes("@"), "local-part leaked in input");
}
const g = rows.find((r) => r.domain === "google.com");
assert.equal(g.has_mx, true);
assert.equal(g.verdict, "ok");
const d = rows.find((r) => r.domain === "mailinator.com");
assert.equal(d.is_disposable, true);
assert.equal(d.verdict, "disposable");
const dead = rows.find((r) => r.domain.endsWith(".invalid"));
assert.ok(dead);
assert.equal(dead.has_mx, false);
assert.ok(["dead", "no_mx"].includes(dead.verdict), dead.verdict);
assert.ok(DEFAULT_DOMAINS.length >= 23);
console.log(`ok ${rows.length} rows`);
console.log("selftest ok");
