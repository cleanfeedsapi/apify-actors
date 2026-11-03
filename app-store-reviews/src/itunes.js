// Public iTunes / App Store JSON only. No HTML scraping, no proxies.
const UA = "app-store-reviews/0.1 (Apify Actor)";
const MAX_PAGES = 10; // Apple RSS hard cap: 10 pages × ~50 reviews = 500 per app per country

const label = (v) => {
  if (v == null) return null;
  if (typeof v === "string" || typeof v === "number") return String(v);
  if (typeof v === "object" && v.label != null) return String(v.label);
  return null;
};

const get = async (url) => {
  const r = await fetch(url, { headers: { "user-agent": UA, accept: "application/json" } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
};

/** Parse https://apps.apple.com/{cc}/app/<slug>/id{digits} → { appId, country }. */
export function parseAppUrl(url) {
  const s = String(url).trim();
  const m = s.match(/^https?:\/\/apps\.apple\.com\/([a-z]{2})\/app\/[^/]+\/id(\d+)/i)
    || s.match(/^https?:\/\/apps\.apple\.com\/([a-z]{2})\/app\/id(\d+)/i)
    || s.match(/^https?:\/\/itunes\.apple\.com\/([a-z]{2})\/app\/[^/]+\/id(\d+)/i);
  if (!m) throw new Error(`unrecognized App Store URL "${url}"`);
  return { country: m[1].toLowerCase(), appId: Number(m[2]) };
}

export async function lookupApp(appId, country = "us") {
  const d = await get(`https://itunes.apple.com/lookup?id=${encodeURIComponent(appId)}&country=${encodeURIComponent(country)}`);
  const r = (d.results || [])[0];
  if (!r) throw new Error(`lookup empty for id=${appId} cc=${country}`);
  return {
    app_id: Number(r.trackId ?? appId),
    app_name: r.trackName ?? null,
    bundle_id: r.bundleId ?? null,
    country: String(country).toLowerCase(),
    seller: r.sellerName ?? null,
    average_rating: r.averageUserRating ?? null,
    rating_count: r.userRatingCount ?? null,
    version: r.version ?? null,
    price: r.price ?? null,
    currency: r.currency ?? null,
    url: r.trackViewUrl ?? null,
    genres: r.genres ?? [],
    content_rating: r.contentAdvisoryRating ?? null,
    release_date: r.releaseDate ?? null,
  };
}

export async function searchApps(term, country = "us", limit = 25) {
  const u = new URL("https://itunes.apple.com/search");
  u.searchParams.set("term", term);
  u.searchParams.set("entity", "software");
  u.searchParams.set("country", country);
  u.searchParams.set("limit", String(Math.min(200, Math.max(1, limit))));
  const d = await get(u.toString());
  return (d.results || []).map((r) => ({
    app_id: Number(r.trackId),
    app_name: r.trackName ?? null,
    bundle_id: r.bundleId ?? null,
    country: String(country).toLowerCase(),
    seller: r.sellerName ?? null,
    average_rating: r.averageUserRating ?? null,
    rating_count: r.userRatingCount ?? null,
    version: r.version ?? null,
    price: r.price ?? null,
    currency: r.currency ?? null,
    url: r.trackViewUrl ?? null,
    genres: r.genres ?? [],
    content_rating: r.contentAdvisoryRating ?? null,
    release_date: r.releaseDate ?? null,
  })).filter((a) => a.app_id);
}

function mapReview(entry, { appId, appName, country }) {
  const reviewId = label(entry.id);
  const rating = Number(label(entry["im:rating"]));
  const updated = label(entry.updated);
  let updated_at = null;
  if (updated) {
    const t = new Date(updated);
    updated_at = Number.isNaN(t.getTime()) ? updated : t.toISOString();
  }
  const href = entry.link?.attributes?.href ?? null;
  return {
    app_id: Number(appId),
    app_name: appName ?? null,
    country: String(country).toLowerCase(),
    review_id: reviewId,
    title: label(entry.title),
    rating: Number.isFinite(rating) ? rating : null,
    version: label(entry["im:version"]),
    updated_at,
    content: label(entry.content),
    vote_sum: Number(label(entry["im:voteSum"]) || 0),
    vote_count: Number(label(entry["im:voteCount"]) || 0),
    url: href || `https://apps.apple.com/${country}/app/id${appId}`,
  };
}

/** Fetch up to maxPages (≤10) of reviews for one app/country. Cap = 500. */
export async function fetchReviews(appId, country = "us", { maxPages = 10, appName = null } = {}) {
  const pages = Math.min(MAX_PAGES, Math.max(1, Number(maxPages) || 1));
  const rows = [];
  const seen = new Set();
  for (let page = 1; page <= pages; page++) {
    const url = `https://itunes.apple.com/rss/customerreviews/page=${page}/id=${encodeURIComponent(appId)}/sortby=mostrecent/json?cc=${encodeURIComponent(country)}`;
    let d;
    try {
      d = await get(url);
    } catch (e) {
      if (page === 1) throw e;
      break; // later pages 400 when exhausted
    }
    const entries = d?.feed?.entry;
    const list = Array.isArray(entries) ? entries : entries ? [entries] : [];
    let added = 0;
    for (const entry of list) {
      if (!entry || entry["im:rating"] == null) continue; // skip non-review feed noise
      const row = mapReview(entry, { appId, appName, country });
      if (!row.review_id || row.rating == null) continue;
      if (seen.has(row.review_id)) continue;
      seen.add(row.review_id);
      rows.push(row);
      added += 1;
    }
    if (!added) break;
  }
  return rows;
}

export { MAX_PAGES };
