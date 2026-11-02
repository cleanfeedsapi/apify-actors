// Official PyPI JSON API + npm registry / downloads API. No HTML, no proxies, no login.
// UA: descriptive + contact placeholder per PyPI API etiquette.
const UA = "pypi-package-intel/0.1 (+https://example.com/actor-contact; Apify Actor; research)";
const get = async (url) => {
  const r = await fetch(url, { headers: { "user-agent": UA, accept: "application/json" } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const iso = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};

const KEYS = [
  "ecosystem", "name", "version", "summary", "license", "homepage", "repository",
  "author", "requires_python", "engines", "keywords", "dependencies_count",
  "release_date", "first_release_date", "releases_count", "downloads_last_week", "url",
];

export const ROW_KEYS = KEYS;

const row = ( partial ) => {
  const out = {};
  for (const k of KEYS) out[k] = partial[k] ?? null;
  if (!Array.isArray(out.keywords)) out.keywords = [];
  return out;
};

const isComplete = (r) =>
  r && r.ecosystem && r.name && r.version && r.url && typeof r.dependencies_count === "number";

function pickRepo(urls = {}) {
  const entries = Object.entries(urls);
  const hit = entries.find(([k, v]) => /source|repository|github|gitlab|code/i.test(k) && /^https?:/i.test(v));
  return hit ? hit[1] : null;
}

function pickHomepage(info, urls = {}) {
  if (info.home_page && /^https?:/i.test(info.home_page)) return info.home_page;
  const hit = Object.entries(urls).find(([k, v]) => /home|homepage|docs|documentation|website/i.test(k) && /^https?:/i.test(v));
  return hit ? hit[1] : (info.project_url && /^https?:/i.test(info.project_url) ? info.project_url : null);
}

async function pypiDownloads(name) {
  try {
    const d = await get(`https://pypistats.org/api/packages/${encodeURIComponent(name)}/recent`);
    const n = d?.data?.last_week;
    return typeof n === "number" ? n : null;
  } catch {
    return null;
  }
}

async function npmDownloads(name) {
  try {
    const d = await get(`https://api.npmjs.org/downloads/point/last-week/${encodeURIComponent(name)}`);
    return typeof d?.downloads === "number" ? d.downloads : null;
  } catch {
    return null;
  }
}

export async function fetchPypi(name, { includeDownloads = true } = {}) {
  const d = await get(`https://pypi.org/pypi/${encodeURIComponent(name)}/json`);
  const info = d.info || {};
  const releases = d.releases || {};
  const versions = Object.keys(releases);
  let first = null;
  let latestUpload = null;
  for (const ver of versions) {
    for (const file of releases[ver] || []) {
      const t = file.upload_time_iso_8601 || file.upload_time;
      if (!t) continue;
      if (!first || t < first) first = t;
      if (!latestUpload || t > latestUpload) latestUpload = t;
    }
  }
  const urls = info.project_urls || {};
  const requires = info.requires_dist || [];
  const keywords = String(info.keywords || "")
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  let downloads = null;
  if (includeDownloads) {
    await sleep(150);
    downloads = await pypiDownloads(name);
  }

  return row({
    ecosystem: "pypi",
    name: info.name || name,
    version: info.version || null,
    summary: info.summary || null,
    license: info.license || info.license_expression || null,
    homepage: pickHomepage(info, urls),
    repository: pickRepo(urls),
    author: info.author || info.author_email || null,
    requires_python: info.requires_python || null,
    engines: null,
    keywords,
    dependencies_count: requires.length,
    release_date: iso(info.urls?.[0]?.upload_time_iso_8601) || iso(latestUpload),
    first_release_date: iso(first),
    releases_count: versions.length,
    downloads_last_week: downloads,
    url: `https://pypi.org/project/${encodeURIComponent(info.name || name)}/`,
  });
}

export async function fetchNpm(name, { includeDownloads = true } = {}) {
  const d = await get(`https://registry.npmjs.org/${encodeURIComponent(name)}`);
  const version = d["dist-tags"]?.latest;
  if (!version) throw new Error(`npm ${name}: no latest tag`);
  const meta = d.versions?.[version] || {};
  const times = d.time || {};
  const deps = { ...(meta.dependencies || {}), ...(meta.peerDependencies || {}) };
  const keywords = Array.isArray(meta.keywords) ? meta.keywords : (Array.isArray(d.keywords) ? d.keywords : []);
  const repo =
    typeof meta.repository === "string"
      ? meta.repository
      : meta.repository?.url?.replace(/^git\+/, "").replace(/\.git$/, "") || null;
  const author =
    typeof meta.author === "string" ? meta.author : meta.author?.name || d.author?.name || null;
  const engines = meta.engines && typeof meta.engines === "object" ? JSON.stringify(meta.engines) : (meta.engines || null);

  let downloads = null;
  if (includeDownloads) {
    await sleep(50);
    downloads = await npmDownloads(name);
  }

  return row({
    ecosystem: "npm",
    name: d.name || name,
    version,
    summary: meta.description || d.description || null,
    license: meta.license || (typeof d.license === "string" ? d.license : null),
    homepage: meta.homepage || d.homepage || null,
    repository: repo,
    author,
    requires_python: null,
    engines,
    keywords,
    dependencies_count: Object.keys(deps).length,
    release_date: iso(times[version]),
    first_release_date: iso(times.created),
    releases_count: Object.keys(d.versions || {}).length,
    downloads_last_week: downloads,
    url: `https://www.npmjs.com/package/${encodeURIComponent(d.name || name)}`,
  });
}

export async function fetchPackages({
  packages = [],
  ecosystem = "both",
  includeDownloads = true,
} = {}) {
  if (!packages.length) throw new Error("input.packages is empty");
  const ecos =
    ecosystem === "pypi" ? ["pypi"] : ecosystem === "npm" ? ["npm"] : ["pypi", "npm"];
  const rows = [];
  for (const raw of packages) {
    const name = String(raw || "").trim();
    if (!name) continue;
    for (const eco of ecos) {
      try {
        const r = eco === "pypi"
          ? await fetchPypi(name, { includeDownloads })
          : await fetchNpm(name, { includeDownloads });
        if (isComplete(r)) rows.push(r);
        else console.warn(`${eco}:${name}: skipped incomplete row`);
      } catch (e) {
        console.warn(`${eco}:${name}: FAILED ${e.message}`);
      }
      await sleep(100);
    }
  }
  return rows;
}
