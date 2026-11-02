// Steam storefront public JSON (same endpoints the store website uses).
// Official ISteamApps/GetAppList/v2 returned 404 Method not found (2026-11-02) — not used.
const UA = "steam-store-games/0.1 (Apify Actor)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const get = async (url) => {
  for (let attempt = 0; attempt < 5; attempt++) {
    const r = await fetch(url, { headers: { "user-agent": UA, accept: "application/json" } });
    if (r.status === 429 || r.status === 403) {
      await sleep(2000 * (attempt + 1));
      continue;
    }
    if (!r.ok) throw new Error(`${r.status} ${url}`);
    return r.json();
  }
  throw new Error(`rate-limited ${url}`);
};

const LISTING_FILTER = {
  topsellers: "topsellers",
  new: "comingsoon", // search filter; also featuredcategories new_releases
  specials: "specials",
};

const FEATURED_KEY = {
  topsellers: "top_sellers",
  new: "new_releases",
  specials: "specials",
};

/** Extract Steam app id from capsule/logo URL path /apps/<id>/ */
const idFromLogo = (logo) => {
  const m = String(logo || "").match(/\/apps\/(\d+)\//);
  return m ? Number(m[1]) : null;
};

export async function resolveAppIds({ appIds = [], search = "", listing = "", maxApps = 100, cc = "us" } = {}) {
  const seen = new Set();
  const out = [];
  const push = (id) => {
    const n = Number(id);
    if (!Number.isFinite(n) || n <= 0 || seen.has(n)) return;
    seen.add(n);
    out.push(n);
  };

  for (const id of appIds) push(id);

  if (search && out.length < maxApps) {
    const q = encodeURIComponent(search);
    const d = await get(`https://store.steampowered.com/api/storesearch/?term=${q}&cc=${cc}&l=en`);
    for (const it of d.items || []) {
      if (it.type === "app" || it.id) push(it.id);
      if (out.length >= maxApps) break;
    }
  }

  if (listing && FEATURED_KEY[listing] && out.length < maxApps) {
    // Prefer featuredcategories (has numeric id); fall back to search/results?json=1
    try {
      const feat = await get(`https://store.steampowered.com/api/featuredcategories?cc=${cc}&l=en`);
      const bucket = feat[FEATURED_KEY[listing]];
      for (const it of bucket?.items || []) {
        push(it.id);
        if (out.length >= maxApps) break;
      }
    } catch {
      /* ignore, try listing JSON */
    }
  }

  if (listing && LISTING_FILTER[listing] && out.length < maxApps) {
    let start = 0;
    const count = 50;
    while (out.length < maxApps) {
      const filter = LISTING_FILTER[listing];
      const d = await get(
        `https://store.steampowered.com/search/results/?query&start=${start}&count=${count}&json=1&filter=${filter}&cc=${cc}&l=english`,
      );
      const items = d.items || [];
      if (!items.length) break;
      for (const it of items) {
        push(idFromLogo(it.logo));
        if (out.length >= maxApps) break;
      }
      start += items.length;
      if (items.length < count) break;
      await sleep(500);
    }
  }

  // Default when nothing selected: topsellers featured
  if (!out.length) {
    const feat = await get(`https://store.steampowered.com/api/featuredcategories?cc=${cc}&l=en`);
    for (const it of feat.top_sellers?.items || []) {
      push(it.id);
      if (out.length >= maxApps) break;
    }
  }

  return out.slice(0, maxApps);
}

const rowFromDetails = (appId, data) => {
  if (!data || !data.name) return null;
  const price = data.price_overview || null;
  const plats = data.platforms || {};
  return {
    app_id: Number(appId),
    name: data.name,
    type: data.type ?? null,
    is_free: Boolean(data.is_free),
    price_cents: price ? Number(price.final) : data.is_free ? 0 : null,
    currency: price?.currency ?? null,
    discount_percent: price ? Number(price.discount_percent) : 0,
    release_date: data.release_date?.date ?? null,
    developers: Array.isArray(data.developers) ? data.developers.map(String) : [],
    publishers: Array.isArray(data.publishers) ? data.publishers.map(String) : [],
    genres: Array.isArray(data.genres) ? data.genres.map((g) => String(g.description ?? g)) : [],
    categories: Array.isArray(data.categories) ? data.categories.map((c) => String(c.description ?? c)) : [],
    platforms: {
      windows: Boolean(plats.windows),
      mac: Boolean(plats.mac),
      linux: Boolean(plats.linux),
    },
    metacritic: data.metacritic?.score != null ? Number(data.metacritic.score) : null,
    recommendations: data.recommendations?.total != null ? Number(data.recommendations.total) : null,
    header_image: data.header_image ?? null,
    url: `https://store.steampowered.com/app/${appId}/`,
  };
};

const REQUIRED = ["app_id", "name", "type", "url"];

export const isComplete = (row) =>
  row && REQUIRED.every((k) => row[k] != null && row[k] !== "");

/** Concurrency 2; ~200 calls / 5 min ⇒ ~1.5s pacing per call. Sleeps on 429/403. */
export async function fetchAppRows(appIds, { cc = "us" } = {}) {
  const rows = [];
  let i = 0;
  const worker = async () => {
    while (true) {
      const idx = i++;
      if (idx >= appIds.length) break;
      const id = appIds[idx];
      try {
        const d = await get(`https://store.steampowered.com/api/appdetails?appids=${id}&cc=${cc}&l=en`);
        const entry = d[String(id)];
        if (entry?.success && entry.data) {
          const row = rowFromDetails(id, entry.data);
          if (isComplete(row)) rows.push(row);
          else console.warn(`app ${id}: incomplete row ${JSON.stringify(row).slice(0, 160)}`);
        } else console.warn(`app ${id}: no data (${JSON.stringify(d).slice(0, 120)})`);
      } catch (e) {
        console.warn(`app ${id}: ${e.message}`);
      }
      await sleep(1500);
    }
  };
  const n = Math.min(2, Math.max(1, appIds.length));
  await Promise.all(Array.from({ length: n }, () => worker()));
  return rows;
}
