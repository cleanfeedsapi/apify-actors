// Official HN Firebase API. No HTML scraping, no proxies, no login.
const UA = "hn-who-is-hiring/0.1 (Apify Actor)";
const BASE = "https://hacker-news.firebaseio.com/v0";
const CONCURRENCY = 10;

const KIND_PREFIX = {
  hiring: "Ask HN: Who is hiring?",
};

const get = async (url) => {
  const r = await fetch(url, { headers: { "user-agent": UA, accept: "application/json" } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
};

const item = (id) => get(`${BASE}/item/${id}.json`);

const decodeHtml = (s) =>
  String(s ?? "")
    .replace(/<p>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");

const stripTags = (s) => s.replace(/<[^>]+>/g, "");

const extractLinks = (html) => {
  const out = [];
  const re = /href="([^"]+)"/gi;
  let m;
  while ((m = re.exec(html ?? ""))) {
    const u = m[1];
    if (u.startsWith("http") && !out.includes(u)) out.push(u);
  }
  return out;
};

const looksRemote = (s) => /\bremote\b/i.test(s ?? "");
const salaryHint = (s) => {
  const m = String(s ?? "").match(
    /(\$[\d,.]+(?:\s*[-–]\s*\$?[\d,.]+)?(?:\s*[kK])?(?:\s*(?:\/\s*(?:yr|year|mo|month|hr|hour)|base|\/year)?)?(?:\s*\+\s*[^|\n]+)?)|(\b\d{2,3}\s*[-–]\s*\d{2,3}\s*[kK]\b)|(\b€[\d,.]+\b)|(\b£[\d,.]+\b)/,
  );
  return m ? m[0].trim() : null;
};

/** Boring first-line split on " | " → company, role, location, salary. */
export function parseComment(rawHtml, { threadId, commentId, postedAt }) {
  const links = extractLinks(rawHtml);
  const text = decodeHtml(rawHtml).replace(/\r/g, "").trim();
  const firstLine = stripTags(text.split("\n").find((l) => l.trim()) ?? "").trim();
  const parts = firstLine.split(/\s*\|\s*/).map((p) => p.trim()).filter(Boolean);

  let company = parts[0] || null;
  let title = parts[1] || null;
  let location = null;
  let salary = null;
  const rest = parts.slice(2);

  for (const p of rest) {
    if (!salary && salaryHint(p)) salary = salaryHint(p);
    else if (!location) location = p;
    else location = `${location} | ${p}`;
  }
  if (!salary) salary = salaryHint(firstLine) || salaryHint(text);
  if (!location && parts.length === 1) location = null;

  // Single-segment headers ("Company (Remote US) — Role — Stack") — keep company, put rest in title.
  if (parts.length === 1 && firstLine) {
    const dash = firstLine.split(/\s+[—–-]\s+/);
    if (dash.length >= 2) {
      company = dash[0].trim();
      title = dash.slice(1).join(" — ").trim();
    }
  }

  const remote = looksRemote(firstLine) || looksRemote(location) || looksRemote(text.slice(0, 280));

  return {
    source: "hn",
    thread_id: String(threadId),
    comment_id: String(commentId),
    company,
    title,
    location,
    remote: Boolean(remote),
    salary,
    url: `https://news.ycombinator.com/item?id=${commentId}`,
    links,
    posted_at: postedAt,
    text,
  };
}

async function mapPool(ids, limit, fn) {
  const out = [];
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, ids.length) }, async () => {
    while (i < ids.length) {
      const idx = i++;
      out[idx] = await fn(ids[idx], idx);
    }
  });
  await Promise.all(workers);
  return out;
}

export async function resolveThread({ kind = "hiring", thread = "latest" } = {}) {
  if (thread && thread !== "latest") {
    const id = Number(thread);
    if (!Number.isFinite(id)) throw new Error(`bad thread id "${thread}"`);
    const it = await item(id);
    if (!it || it.deleted || it.dead) throw new Error(`thread ${id} missing`);
    return it;
  }
  const prefix = KIND_PREFIX[kind];
  if (!prefix) throw new Error(`bad kind "${kind}" (use ${Object.keys(KIND_PREFIX).join("|")})`);
  const user = await get(`${BASE}/user/whoishiring.json`);
  for (const id of user.submitted ?? []) {
    const it = await item(id);
    if (!it || it.deleted || it.dead) continue;
    const title = it.title ?? "";
    if (title.startsWith(prefix)) return it;
  }
  throw new Error(`no recent "${prefix}" thread on whoishiring`);
}

export async function fetchThreadJobs({
  kind = "hiring",
  thread = "latest",
  maxComments = 0,
  query = "",
} = {}) {
  const root = await resolveThread({ kind, thread });
  let kids = root.kids ?? [];
  if (maxComments > 0) kids = kids.slice(0, maxComments);
  const q = String(query || "").trim().toLowerCase();

  const rows = [];
  const parsed = await mapPool(kids, CONCURRENCY, async (id) => {
    const c = await item(id);
    if (!c || c.deleted || c.dead || !c.text) return null;
    const posted = c.time ? new Date(c.time * 1000).toISOString() : null;
    return parseComment(c.text, { threadId: root.id, commentId: c.id, postedAt: posted });
  });

  for (const row of parsed) {
    if (!row) continue;
    if (q && !row.text.toLowerCase().includes(q)) continue;
    rows.push(row);
  }
  return { thread: root, rows };
}
