// Official GitHub REST Search API. No HTML scraping, no proxies.
const UA = "github-repo-search/0.1 (Apify Actor)";
const API = "https://api.github.com/search/repositories";
const GITHUB_CAP = 1000; // Search API hard cap of results per query
const SORTS = new Set(["stars", "updated", "forks"]);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function headers(token) {
  const h = {
    "user-agent": UA,
    accept: "application/vnd.github+json",
    "x-github-api-version": "2022-11-28",
  };
  if (token) h.authorization = `Bearer ${token}`;
  return h;
}

async function getPage(query, sort, page, perPage, token) {
  const u = new URL(API);
  u.searchParams.set("q", query);
  u.searchParams.set("sort", sort);
  u.searchParams.set("order", "desc");
  u.searchParams.set("per_page", String(perPage));
  u.searchParams.set("page", String(page));
  for (;;) {
    const r = await fetch(u, { headers: headers(token) });
    const remaining = Number(r.headers.get("x-ratelimit-remaining") ?? "1");
    const reset = Number(r.headers.get("x-ratelimit-reset") ?? "0");
    if (r.status === 403 && remaining === 0 && reset) {
      const waitMs = Math.max(0, reset * 1000 - Date.now()) + 500;
      console.warn(`rate limit hit, sleeping ${Math.ceil(waitMs / 1000)}s`);
      await sleep(waitMs);
      continue;
    }
    if (!r.ok) {
      const body = await r.text().catch(() => "");
      throw new Error(`${r.status} ${u} ${body.slice(0, 200)}`);
    }
    if (remaining === 0 && reset) {
      const waitMs = Math.max(0, reset * 1000 - Date.now()) + 500;
      const data = await r.json();
      await sleep(waitMs);
      return data;
    }
    return r.json();
  }
}

function mapItem(query, item) {
  return {
    query,
    full_name: item.full_name ?? null,
    url: item.html_url ?? null,
    description: item.description ?? null,
    language: item.language ?? null,
    stars: Number(item.stargazers_count ?? 0),
    forks: Number(item.forks_count ?? item.forks ?? 0),
    open_issues: Number(item.open_issues_count ?? item.open_issues ?? 0),
    topics: Array.isArray(item.topics) ? item.topics : [],
    license: item.license?.spdx_id ?? item.license?.key ?? null,
    created_at: item.created_at ?? null,
    updated_at: item.updated_at ?? null,
    pushed_at: item.pushed_at ?? null,
    archived: Boolean(item.archived),
    owner: item.owner?.login ?? null,
    owner_type: item.owner?.type ?? null,
  };
}

/** Search one GitHub query; paginate up to min(maxRepos, 1000). */
export async function searchRepos(query, { sort = "stars", maxRepos = 200, token = "" } = {}) {
  query = String(query).trim();
  if (!query) throw new Error("empty query");
  if (!SORTS.has(sort)) throw new Error(`bad sort "${sort}" (use stars|updated|forks)`);
  const want = Math.min(Math.max(0, Number(maxRepos) || 0), GITHUB_CAP) || GITHUB_CAP;
  const perPage = 100;
  const rows = [];
  let page = 1;
  let total = Infinity;
  while (rows.length < want && (page - 1) * perPage < GITHUB_CAP) {
    const d = await getPage(query, sort, page, perPage, token || undefined);
    if (page === 1) total = Number(d.total_count ?? 0);
    const items = d.items ?? [];
    if (!items.length) break;
    for (const item of items) {
      if (rows.length >= want) break;
      rows.push(mapItem(query, item));
    }
    if (rows.length >= want || rows.length >= total || items.length < perPage) break;
    page += 1;
  }
  return rows;
}
