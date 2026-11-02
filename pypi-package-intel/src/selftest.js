import assert from "node:assert/strict";
import { fetchPackages, ROW_KEYS } from "./packages.js";

const PYPI = [
  "requests", "numpy", "django", "flask", "pandas", "urllib3",
  "scipy", "matplotlib", "pydantic", "httpx", "rich", "click",
];
const NPM = ["lodash", "react", "express", "axios", "typescript", "vue"];

const pypiRows = await fetchPackages({
  packages: PYPI,
  ecosystem: "pypi",
  includeDownloads: true,
});
assert.ok(pypiRows.length > 10, `pypi too few (${pypiRows.length})`);
for (const r of pypiRows.slice(0, 5)) {
  assert.deepEqual(Object.keys(r), ROW_KEYS, "schema drift");
  assert.equal(r.ecosystem, "pypi");
  assert.ok(r.name && r.version && r.url.startsWith("https://"), "bad pypi row");
  assert.ok(Array.isArray(r.keywords));
  assert.equal(typeof r.dependencies_count, "number");
}
assert.ok(pypiRows.some((r) => typeof r.downloads_last_week === "number"), "expected pypistats downloads");
console.log(`ok pypi ${pypiRows.length}`);

const npmRows = await fetchPackages({
  packages: NPM,
  ecosystem: "npm",
  includeDownloads: true,
});
assert.ok(npmRows.length > 5, `npm too few (${npmRows.length})`);
for (const r of npmRows.slice(0, 3)) {
  assert.deepEqual(Object.keys(r), ROW_KEYS, "npm schema drift");
  assert.equal(r.ecosystem, "npm");
  assert.ok(r.version && r.url.includes("npmjs.com"));
}
assert.ok(npmRows.some((r) => typeof r.downloads_last_week === "number"), "expected npm downloads");
console.log(`ok npm ${npmRows.length}`);

const both = await fetchPackages({
  packages: ["requests", "lodash"],
  ecosystem: "both",
  includeDownloads: false,
});
assert.ok(both.length >= 2, `both too few (${both.length})`);
assert.ok(both.every((r) => r.downloads_last_week === null));
console.log(`ok both ${both.length}`);

console.log("selftest ok");
