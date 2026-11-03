// Public Shopify storefront products.json (same JSON the theme loads). No HTML, no proxies, no login.
const UA = "shopify-products-feed/0.1 (+https://cleanfeeds.dev; contact@cleanfeeds.dev; Apify Actor)";
const PAGE_LIMIT = 250;
const PAGE_GAP_MS = 500;
const SHOP_CONCURRENCY = 2;

const KEYS = [
  "shop", "product_id", "handle", "title", "vendor", "product_type", "tags",
  "url", "created_at", "updated_at", "published_at", "variants_count",
  "min_price", "max_price", "currency", "available", "image", "first_variant_sku",
];

export const ROW_KEYS = KEYS;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const getJson = async (url) => {
  const r = await fetch(url, { headers: { "user-agent": UA, accept: "application/json" }, redirect: "follow" });
  const text = await r.text();
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`non-json ${r.status} ${url}`);
  }
  return data;
};

/** "https://www.allbirds.com/foo" | "allbirds.com" -> https://www.allbirds.com */
export function normalizeShop(input) {
  let s = String(input || "").trim();
  if (!s) throw new Error("empty shop");
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  const u = new URL(s);
  if (!u.hostname) throw new Error(`bad shop "${input}"`);
  return `${u.protocol}//${u.host}`;
}

const tagsArr = (tags) => {
  if (Array.isArray(tags)) return tags.map(String);
  if (typeof tags === "string") return tags.split(",").map((t) => t.trim()).filter(Boolean);
  return [];
};

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

export function mapProduct(shopOrigin, p) {
  const variants = Array.isArray(p.variants) ? p.variants : [];
  const prices = variants.map((v) => num(v.price)).filter((x) => x !== null);
  const min_price = prices.length ? Math.min(...prices) : null;
  const max_price = prices.length ? Math.max(...prices) : null;
  const available = variants.some((v) => v.available === true);
  const image =
    p.images?.[0]?.src ||
    p.image?.src ||
    variants.find((v) => v.featured_image?.src)?.featured_image?.src ||
    null;
  const handle = p.handle ?? null;
  const product_id = p.id != null ? String(p.id) : null;
  const row = {
    shop: shopOrigin.replace(/^https?:\/\//, ""),
    product_id,
    handle,
    title: p.title ?? null,
    vendor: p.vendor ?? null,
    product_type: p.product_type ?? null,
    tags: tagsArr(p.tags),
    url: handle ? `${shopOrigin}/products/${handle}` : null,
    created_at: p.created_at ?? null,
    updated_at: p.updated_at ?? null,
    published_at: p.published_at ?? null,
    variants_count: variants.length,
    min_price,
    max_price,
    currency: null,
    available: Boolean(available),
    image,
    first_variant_sku: variants[0]?.sku != null && variants[0].sku !== "" ? String(variants[0].sku) : null,
  };
  return row;
}

export const isComplete = (r) =>
  r && r.shop && r.product_id && r.handle && r.title && r.url && typeof r.available === "boolean";

async function fetchPages(baseUrl, { maxProducts, shopOrigin }) {
  const rows = [];
  let page = 1;
  while (rows.length < maxProducts) {
    const url = `${baseUrl}${baseUrl.includes("?") ? "&" : "?"}limit=${PAGE_LIMIT}&page=${page}`;
    const data = await getJson(url);
    const products = data?.products;
    if (!Array.isArray(products) || products.length === 0) break;
    for (const p of products) {
      const row = mapProduct(shopOrigin, p);
      if (isComplete(row)) rows.push(row);
      if (rows.length >= maxProducts) break;
    }
    if (products.length < PAGE_LIMIT) break;
    page += 1;
    await sleep(PAGE_GAP_MS);
  }
  return rows;
}

export async function fetchShop({
  shop,
  collections = [],
  maxProductsPerShop = 50,
  onlyChangedSince = "",
} = {}) {
  const origin = normalizeShop(shop);
  const max = maxProductsPerShop > 0 ? maxProductsPerShop : Number.MAX_SAFE_INTEGER;
  let rows = [];

  if (collections.length) {
    for (const handle of collections) {
      const h = String(handle || "").trim().replace(/^\/+|\/+$/g, "");
      if (!h) continue;
      const part = await fetchPages(`${origin}/collections/${encodeURIComponent(h)}/products.json`, {
        maxProducts: max - rows.length,
        shopOrigin: origin,
      });
      rows = rows.concat(part);
      if (rows.length >= max) break;
      await sleep(PAGE_GAP_MS);
    }
  } else {
    rows = await fetchPages(`${origin}/products.json`, { maxProducts: max, shopOrigin: origin });
  }

  const since = String(onlyChangedSince || "").trim();
  if (since) {
    const t = Date.parse(since);
    if (!Number.isFinite(t)) throw new Error(`bad onlyChangedSince "${onlyChangedSince}"`);
    rows = rows.filter((r) => r.updated_at && Date.parse(r.updated_at) > t);
  }
  return rows;
}

async function mapPool(items, limit, fn) {
  const out = [];
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx], idx);
      }
    }),
  );
  return out;
}

export async function fetchShops({
  shops = [],
  collections = [],
  maxProductsPerShop = 50,
  onlyChangedSince = "",
} = {}) {
  if (!shops.length) throw new Error("input.shops is empty");
  const bundled = await mapPool(shops, SHOP_CONCURRENCY, async (shop) => {
    try {
      const rows = await fetchShop({ shop, collections, maxProductsPerShop, onlyChangedSince });
      return { shop, rows, error: null };
    } catch (e) {
      return {
        shop,
        rows: [],
        error: {
          shop: String(shop),
          product_id: null,
          handle: null,
          title: null,
          vendor: null,
          product_type: null,
          tags: [],
          url: null,
          created_at: null,
          updated_at: null,
          published_at: null,
          variants_count: 0,
          min_price: null,
          max_price: null,
          currency: null,
          available: false,
          image: null,
          first_variant_sku: null,
          error: e.message,
        },
      };
    }
  });

  const rows = [];
  for (const b of bundled) {
    if (b.error) rows.push(b.error);
    else rows.push(...b.rows);
  }
  return rows;
}
