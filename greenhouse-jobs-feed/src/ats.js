// Official, unauthenticated job-board APIs. No HTML scraping, no proxies.
const UA = "ats-jobs-feed/0.1 (Apify Actor)";
const get = async (url) => {
  const r = await fetch(url, { headers: { "user-agent": UA, accept: "application/json" } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
};
const iso = (v) => (v ? new Date(v).toISOString() : null);
const post = async (url, body) => {
  const r = await fetch(url, { method: "POST", headers: { "user-agent": UA, accept: "application/json", "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
};


// Workday public CXS jobs API (same JSON the career site itself loads). Slug: "tenant.wdN/site".
async function workday(slug, maxJobs = Infinity) {
  const m = String(slug).trim().match(/^([^/]+)\.([^/]+)\/(.+)$/);
  if (!m) throw new Error(`bad workday slug "${slug}" (use tenant.wdN/site, e.g. adobe.wd5/external_experienced)`);
  const [, tenant, wdN, site] = m;
  const host = `${tenant}.${wdN}.myworkdayjobs.com`;
  const endpoint = `https://${host}/wday/cxs/${tenant}/${site}/jobs`;
  const rows = [];
  let offset = 0;
  const seen = new Set();
  // `total` is unreliable and offsets past the end return the LAST PAGE AGAIN (NVIDIA: every offset >= 2000),
  // so stop when a page brings no new posting. Workday serves at most 2,000 postings per query.
  while (rows.length < maxJobs && offset < 20000) {
    const d = await post(endpoint, { appliedFacets: {}, limit: 20, offset, searchText: "" });
    const page = (d.jobPostings ?? []).filter((j) => { const k = j.externalPath ?? j.title; if (seen.has(k)) return false; seen.add(k); return true; });
    if (!page.length) break;
    for (const j of page) {
      if (rows.length >= maxJobs) break;
      rows.push({
        title: j.title ?? null, location: j.locationsText ?? null, department: null,
        url: j.externalPath ? `https://${host}/${site}${j.externalPath}` : null,
        posted_at: null, updated_at: null, // list payload only carries relative "postedOn" text
        id: j.bulletFields?.[0] != null ? String(j.bulletFields[0]) : j.externalPath,
      });
    }
    offset += page.length;
  }
  return rows;
}

// SmartRecruiters official Posting API (public, no auth). Slug = companyIdentifier.
async function smartrecruiters(slug, maxJobs = 2000) {
  const rows = [];
  for (let offset = 0; rows.length < maxJobs; offset += 100) {
    const d = await get(`https://api.smartrecruiters.com/v1/companies/${slug}/postings?limit=100&offset=${offset}`);
    for (const j of d.content ?? []) rows.push({
      title: j.name, location: j.location?.fullLocation?.replace(/,\s*,/g, ",") ?? j.location?.city ?? null,
      department: j.department?.label ?? j.function?.label ?? null,
      url: `https://jobs.smartrecruiters.com/${j.company?.identifier ?? slug}/${j.id}`,
      posted_at: iso(j.releasedDate), updated_at: null, id: String(j.id),
    });
    if (!d.content?.length || offset + 100 >= (d.totalFound ?? 0)) break;
  }
  return rows.slice(0, maxJobs);
}

// Recruitee public career-site JSON. Slug = subdomain of <slug>.recruitee.com.
async function recruitee(slug) {
  const d = await get(`https://${slug}.recruitee.com/api/offers/`);
  return (d.offers ?? []).map((j) => ({
    title: j.title, location: j.location ?? null, department: j.department ?? null,
    url: j.careers_url, posted_at: iso(j.published_at), updated_at: iso(j.updated_at), id: String(j.id),
  }));
}

export const SOURCES = {
  workday, smartrecruiters, recruitee,
  greenhouse: async (slug) => {
    const d = await get(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=false`);
    return d.jobs.map((j) => ({
      title: j.title, location: j.location?.name ?? null,
      department: j.departments?.[0]?.name ?? null, url: j.absolute_url,
      posted_at: iso(j.first_published), updated_at: iso(j.updated_at), id: String(j.id),
    }));
  },
  lever: async (slug) => {
    const d = await get(`https://api.lever.co/v0/postings/${slug}?mode=json`);
    return d.map((j) => ({
      title: j.text, location: j.categories?.location ?? null,
      department: j.categories?.team ?? j.categories?.department ?? null, url: j.hostedUrl,
      posted_at: iso(j.createdAt), updated_at: null, id: j.id,
    }));
  },
  ashby: async (slug) => {
    const d = await get(`https://api.ashbyhq.com/posting-api/job-board/${slug}`);
    return d.jobs.map((j) => ({
      title: j.title, location: j.location ?? null, department: j.department ?? null,
      url: j.jobUrl, posted_at: iso(j.publishedAt), updated_at: null, id: j.id,
    }));
  },
};

// Accept a pasted careers URL and turn it into "source:slug".
const URL_RULES = [
  [/^https?:\/\/(?:boards|job-boards)\.greenhouse\.io\/([^/?#]+)/i, "greenhouse"],
  [/^https?:\/\/jobs\.lever\.co\/([^/?#]+)/i, "lever"],
  [/^https?:\/\/jobs\.ashbyhq\.com\/([^/?#]+)/i, "ashby"],
  [/^https?:\/\/([^.]+)\.(wd\d+)\.myworkdayjobs\.com\/(?:[a-z]{2}-[A-Z]{2}\/)?([^/?#]+)/i, (m) => `workday:${m[1]}.${m[2]}/${m[3]}`],
  [/^https?:\/\/(?:jobs|careers)\.smartrecruiters\.com\/([^/?#]+)/i, "smartrecruiters"],
  [/^https?:\/\/([^.]+)\.recruitee\.com/i, "recruitee"],
];
export function normalizeSpec(spec) {
  spec = String(spec).trim();
  if (!/^https?:\/\//i.test(spec)) return spec;
  for (const [re, src] of URL_RULES) {
    const m = spec.match(re);
    if (m) return typeof src === "function" ? src(m) : `${src}:${m[1]}`;
  }
  throw new Error(`unrecognized careers URL "${spec}"`);
}

// "greenhouse:stripe" (or a careers URL) -> rows tagged with source/company
export async function fetchBoard(spec, maxJobs = 0) {
  spec = normalizeSpec(spec);
  const k = spec.indexOf(":");
  const source = spec.slice(0, k), slug = spec.slice(k + 1);
  const fn = SOURCES[source];
  if (!fn || !slug) throw new Error(`bad board spec "${spec}" (use source:slug, source in ${Object.keys(SOURCES)})`);
  const rows = await fn(slug.trim(), maxJobs > 0 ? maxJobs : Infinity);
  // Drop malformed postings (no title or URL) so dataset schema validation never rejects a push after charging.
  return rows.filter((r) => r.title && r.url).map((r) => ({ source, company: slug.trim(), ...r }));
}
