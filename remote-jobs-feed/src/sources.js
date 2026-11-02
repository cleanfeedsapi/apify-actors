// Official / public unauthenticated job-board JSON. No HTML, no proxies, no login.
const UA = "remote-jobs-feed/0.1 (Apify Actor)";
const get = async (url) => {
  const r = await fetch(url, { headers: { "user-agent": UA, accept: "application/json" } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
};
const iso = (v) => {
  if (v == null || v === "") return null;
  if (typeof v === "number") return new Date(v * (v < 1e12 ? 1000 : 1)).toISOString();
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};
const salaryRok = (j) => {
  const lo = Number(j.salary_min) || 0;
  const hi = Number(j.salary_max) || 0;
  if (lo <= 0 && hi <= 0) return null;
  if (lo > 0 && hi > 0 && lo !== hi) return `$${lo}–$${hi}`;
  return `$${lo || hi}`;
};
const match = (row, q) => {
  if (!q) return true;
  const s = q.toLowerCase();
  const hay = [row.title, row.company, row.location, ...(row.tags || [])].join(" ").toLowerCase();
  return hay.includes(s);
};

export const SOURCES = {
  remoteok: async ({ search = "", maxJobs = 0 } = {}) => {
    const d = await get("https://remoteok.com/api");
    // element 0 is legal/attribution notice
    const jobs = Array.isArray(d) ? d.slice(1) : [];
    const rows = [];
    for (const j of jobs) {
      if (!j || typeof j !== "object" || j.legal) continue;
      const url = j.url || j.apply_url || null;
      const row = {
        source: "remoteok",
        title: j.position ?? null,
        company: j.company ?? null,
        location: j.location ?? null,
        remote: true,
        tags: Array.isArray(j.tags) ? j.tags.map(String) : [],
        salary: salaryRok(j),
        url,
        source_url: url,
        posted_at: iso(j.date),
        id: j.id != null ? String(j.id) : String(j.slug ?? ""),
      };
      if (!match(row, search)) continue;
      rows.push(row);
      if (maxJobs > 0 && rows.length >= maxJobs) break;
    }
    return rows;
  },

  arbeitnow: async ({ search = "", maxJobs = 0 } = {}) => {
    const rows = [];
    let page = 1;
    for (;;) {
      const d = await get(`https://www.arbeitnow.com/api/job-board-api?page=${page}`);
      const jobs = d.data ?? [];
      if (!jobs.length) break;
      for (const j of jobs) {
        const jobUrl = j.url ?? null;
        const row = {
          source: "arbeitnow",
          title: j.title ?? null,
          company: j.company_name ?? null,
          location: j.location ?? null,
          remote: Boolean(j.remote),
          tags: Array.isArray(j.tags) ? j.tags.map(String) : [],
          salary: null,
          url: jobUrl,
          source_url: jobUrl,
          posted_at: iso(j.created_at),
          id: j.slug != null ? String(j.slug) : "",
        };
        if (!match(row, search)) continue;
        rows.push(row);
        if (maxJobs > 0 && rows.length >= maxJobs) return rows;
      }
      const next = d.links?.next;
      if (!next) break;
      page += 1;
      // safety: don't walk forever if API lies about next
      if (page > 50) break;
    }
    return rows;
  },
};

export async function fetchSource(name, opts) {
  const fn = SOURCES[name];
  if (!fn) throw new Error(`bad source "${name}" (use ${Object.keys(SOURCES).join("|")})`);
  return fn(opts);
}
