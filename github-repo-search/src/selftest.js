import assert from "node:assert/strict";
import { searchRepos } from "./github.js";

const KEYS = [
  "query", "full_name", "url", "description", "language", "stars", "forks",
  "open_issues", "topics", "license", "created_at", "updated_at", "pushed_at",
  "archived", "owner", "owner_type",
];

const q = "topic:mcp stars:>50";
const rows = await searchRepos(q, { sort: "stars", maxRepos: 30 });
assert.ok(rows.length > 10, `too few rows (${rows.length})`);
for (const r of rows.slice(0, 5)) {
  assert.deepEqual(Object.keys(r), KEYS, "schema drift");
  assert.equal(r.query, q);
  assert.ok(r.full_name && r.url.startsWith("https://github.com/"), "bad row");
  assert.ok(Array.isArray(r.topics), "topics not array");
  assert.equal(typeof r.stars, "number");
  assert.equal(typeof r.archived, "boolean");
}
console.log(`ok ${q} ${rows.length}`);

await assert.rejects(searchRepos("", { maxRepos: 5 }), /empty query/);
await assert.rejects(searchRepos("language:Rust", { sort: "nope", maxRepos: 5 }), /bad sort/);
console.log("selftest ok");
