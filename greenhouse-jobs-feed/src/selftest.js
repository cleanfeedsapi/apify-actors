import assert from "node:assert/strict";
import { fetchBoard, normalizeSpec, applyFilters, postedOnToDate } from "./ats.js";
const KEYS = ["source","company","title","location","department","url","posted_at","updated_at","id"];
for (const spec of ["greenhouse:stripe", "ashby:ramp", "lever:spotify", "workday:adobe.wd5/external_experienced", "smartrecruiters:InPost", "recruitee:prisma"]) {
  const rows = await fetchBoard(spec);
  assert.ok(rows.length > 10, `${spec}: too few rows (${rows.length})`);
  for (const r of rows.slice(0, 5)) {
    assert.deepEqual(Object.keys(r), KEYS, `${spec}: schema drift`);
    assert.ok(r.title && r.url.startsWith("http"), `${spec}: bad row`);
  }
  console.log(`ok ${spec} ${rows.length}`);
}
await assert.rejects(fetchBoard("nope:x"), /bad board spec/);
assert.equal(normalizeSpec("https://boards.greenhouse.io/stripe/jobs/123"), "greenhouse:stripe");
assert.equal(normalizeSpec("https://jobs.lever.co/spotify?team=x"), "lever:spotify");
assert.equal(normalizeSpec("https://jobs.ashbyhq.com/ramp"), "ashby:ramp");
assert.equal(normalizeSpec("https://adobe.wd5.myworkdayjobs.com/en-US/external_experienced"), "workday:adobe.wd5/external_experienced");
assert.equal(normalizeSpec("https://jobs.smartrecruiters.com/InPost"), "smartrecruiters:InPost");
assert.equal(normalizeSpec("https://prisma.recruitee.com/o/some-job"), "recruitee:prisma");
assert.throws(() => normalizeSpec("https://example.com/jobs"), /unrecognized/);
// filters (pure, no network)
const now = new Date("2026-11-04T12:00:00Z");
assert.equal(postedOnToDate("Posted Today", now), "2026-11-04T00:00:00.000Z");
assert.equal(postedOnToDate("Posted Yesterday", now), "2026-11-03T00:00:00.000Z");
assert.equal(postedOnToDate("Posted 8 Days Ago", now), "2026-10-27T00:00:00.000Z");
assert.equal(postedOnToDate("Posted 30+ Days Ago", now), null);
const R = [
  { title: "Senior Engineer", posted_at: "2026-11-04T01:00:00Z" },
  { title: "Engineering Intern", posted_at: "2026-11-03T01:00:00Z" },
  { title: "Sales Lead", posted_at: null },
  { source: "lever", company: "x", error: "boom" },
];
assert.deepEqual(applyFilters(R, { postedAfter: "24h" }, now).map((r) => r.title ?? "err"), ["Senior Engineer", "err"]);
assert.deepEqual(applyFilters(R, { postedAfter: "2026-11-03" }, now).map((r) => r.title ?? "err"), ["Senior Engineer", "Engineering Intern", "err"]);
assert.deepEqual(applyFilters(R, { titleIncludes: ["engineer"], titleExcludes: ["intern"] }).map((r) => r.title ?? "err"), ["Senior Engineer", "err"]);
assert.equal(applyFilters(R, {}).length, 4);
assert.throws(() => applyFilters(R, { postedAfter: "soon" }), /bad postedAfter/);
console.log("selftest ok");
