import assert from "node:assert/strict";
import { fetchSource } from "./sources.js";

const KEYS = ["source", "title", "company", "location", "remote", "tags", "salary", "url", "source_url", "posted_at", "id"];

for (const name of ["remoteok", "arbeitnow"]) {
  const rows = await fetchSource(name, { maxJobs: 40 });
  assert.ok(rows.length > 10, `${name}: too few rows (${rows.length})`);
  for (const r of rows.slice(0, 5)) {
    assert.deepEqual(Object.keys(r), KEYS, `${name}: schema drift`);
    assert.ok(r.title && r.url?.startsWith("http"), `${name}: bad row`);
    assert.equal(typeof r.remote, "boolean", `${name}: remote not bool`);
    assert.ok(Array.isArray(r.tags), `${name}: tags not array`);
    assert.ok(r.id, `${name}: missing id`);
    assert.ok(r.source_url?.startsWith("http"), `${name}: bad source_url`);
  }
  console.log(`ok ${name} ${rows.length}`);
}
await assert.rejects(fetchSource("nope"), /bad source/);
console.log("selftest ok");
