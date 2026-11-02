import assert from "node:assert/strict";
import { fetchThreadJobs, parseComment } from "./hn.js";

const KEYS = [
  "source", "thread_id", "comment_id", "company", "title", "location",
  "remote", "salary", "url", "links", "posted_at", "text",
];

const { thread, rows } = await fetchThreadJobs({ kind: "hiring", thread: "latest", maxComments: 40 });
assert.ok(rows.length > 10, `too few rows (${rows.length})`);
assert.ok(String(thread.title).startsWith("Ask HN: Who is hiring?"), `bad thread title: ${thread.title}`);
for (const r of rows.slice(0, 5)) {
  assert.deepEqual(Object.keys(r), KEYS, "schema drift");
  assert.equal(r.source, "hn");
  assert.ok(r.comment_id && r.url.startsWith("https://news.ycombinator.com/item?id="), "bad url");
  assert.equal(typeof r.remote, "boolean");
  assert.ok(Array.isArray(r.links));
  assert.ok(r.text && r.text.length > 0, "empty text");
}
console.log(`ok hiring ${thread.id} ${rows.length}`);


const filtered = await fetchThreadJobs({ kind: "hiring", thread: String(thread.id), maxComments: 40, query: "remote" });
assert.ok(filtered.rows.every((r) => r.text.toLowerCase().includes("remote")));
console.log(`ok query filter ${filtered.rows.length}`);

const sample = parseComment(
  'Acme Corp | Senior Engineer | Remote (US) | $180k base<p>We build widgets. <a href="https://example.com/jobs" rel="nofollow">https://example.com/jobs</a>',
  { threadId: 1, commentId: 2, postedAt: "2026-10-01T00:00:00.000Z" },
);
assert.equal(sample.company, "Acme Corp");
assert.equal(sample.title, "Senior Engineer");
assert.equal(sample.remote, true);
assert.ok(sample.salary && sample.salary.includes("180"));
assert.deepEqual(sample.links, ["https://example.com/jobs"]);
assert.deepEqual(Object.keys(sample), KEYS);
console.log("ok parseComment");

console.log("selftest ok");

await assert.rejects(fetchThreadJobs({ kind: "wants_to_be_hired" }), /bad kind/);
