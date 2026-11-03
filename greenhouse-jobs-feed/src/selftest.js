import assert from "node:assert/strict";
import { fetchBoard, normalizeSpec } from "./ats.js";
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
console.log("selftest ok");
