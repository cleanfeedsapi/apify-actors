// Public DoH JSON + apex HTTPS probe. No HTML parse, no proxies, no login.
import { DISPOSABLE } from "./disposable.js";

const UA = "domain-mx-preflight/0.1 (Apify Actor)";

async function doh(name, type) {
  const q = `name=${encodeURIComponent(name)}&type=${type}`;
  try {
    const r = await fetch(`https://dns.google/resolve?${q}`, {
      headers: { "user-agent": UA, accept: "application/json" },
    });
    if (r.ok) return r.json();
  } catch (_) { /* fall through */ }
  const r2 = await fetch(`https://cloudflare-dns.com/dns-query?${q}`, {
    headers: { "user-agent": UA, accept: "application/dns-json" },
  });
  if (!r2.ok) throw new Error(`DoH ${r2.status} ${name} ${type}`);
  return r2.json();
}

function answers(d) {
  return (d?.Answer ?? []).filter((a) => a?.data).map((a) => String(a.data).replace(/\.$/, ""));
}

/** Strip local part immediately. Returns bare domain or null. */
export function toDomain(raw, emailsAllowed) {
  let s = String(raw ?? "").trim().toLowerCase();
  if (!s) return null;
  if (s.includes("@")) {
    if (!emailsAllowed) return null;
    s = s.split("@").pop();
  }
  s = s.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "");
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(s)) return null;
  return s;
}

function registrableHint(host) {
  if (!host) return null;
  const h = String(host).toLowerCase().replace(/\.$/, "").replace(/^www\./, "");
  const parts = h.split(".");
  if (parts.length <= 2) return h;
  // ponytail: naive eTLD+1, enough for redirect_to_other_domain flag
  return parts.slice(-2).join(".");
}

async function probeHttp(domain) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    let r = await fetch(`https://${domain}`, {
      method: "HEAD",
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "user-agent": UA },
    });
    // some hosts reject HEAD
    if (r.status === 405 || r.status === 501) {
      r = await fetch(`https://${domain}`, {
        method: "GET",
        redirect: "follow",
        signal: ctrl.signal,
        headers: { "user-agent": UA },
      });
    }
    const finalUrl = r.url || null;
    let finalHost = null;
    try { finalHost = finalUrl ? new URL(finalUrl).hostname : null; } catch (_) {}
    return {
      http_status: r.status,
      final_url: finalUrl,
      redirect_to_other_domain: registrableHint(finalHost) !== null && registrableHint(finalHost) !== registrableHint(domain),
    };
  } catch (_) {
    return { http_status: null, final_url: null, redirect_to_other_domain: false };
  } finally {
    clearTimeout(t);
  }
}

function verdictOf({ has_mx, has_a, is_disposable, redirect_to_other_domain, http_status }) {
  if (is_disposable) return "disposable";
  if (!has_mx && !has_a) return "dead";
  if (!has_mx) return "no_mx";
  if (redirect_to_other_domain) return "redirects";
  if (http_status == null && !has_a) return "dead";
  return "ok";
}

export async function checkDomain(input, emailsAllowed = true) {
  const domain = toDomain(input, emailsAllowed);
  if (!domain) throw new Error("invalid input (empty, malformed, or email while emailsAllowed=false)");
  const is_disposable = DISPOSABLE.has(domain);
  const [mxJ, aJ, http] = await Promise.all([doh(domain, "MX"), doh(domain, "A"), probeHttp(domain)]);
  const mx_hosts = answers(mxJ).map((d) => d.replace(/^\d+\s+/, "")).filter(Boolean);
  const has_mx = mx_hosts.length > 0;
  const has_a = answers(aJ).length > 0;
  const row = {
    input: String(input).includes("@") ? domain : String(input).trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, ""),
    domain,
    has_mx,
    mx_hosts,
    has_a,
    http_status: http.http_status,
    final_url: http.final_url,
    redirect_to_other_domain: http.redirect_to_other_domain,
    is_disposable,
    verdict: null,
    checked_at: new Date().toISOString(),
  };
  // GDPR: never keep local-part — input already domain-only when email was given
  row.input = domain;
  row.verdict = verdictOf(row);
  return row;
}

export async function mapPool(items, concurrency, fn) {
  const out = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) || 1 }, worker));
  return out;
}

export const DEFAULT_DOMAINS = [
  "google.com", "github.com", "microsoft.com", "apple.com", "amazon.com",
  "cloudflare.com", "wikipedia.org", "mozilla.org", "stripe.com", "openai.com",
  "apify.com", "n8n.io", "vercel.com", "netlify.com", "npmjs.com",
  "python.org", "debian.org", "ubuntu.com", "ietf.org", "example.com",
  "nonexistent-mx-preflight-test-aaa.invalid",
  "dead-check-bbb.invalid",
  "no-such-host-ccc.invalid",
];

export const ROW_KEYS = [
  "input", "domain", "has_mx", "mx_hosts", "has_a", "http_status",
  "final_url", "redirect_to_other_domain", "is_disposable", "verdict", "checked_at",
];

export function isChargeable(row) {
  if (!row || row.error) return false;
  return ROW_KEYS.every((k) => Object.prototype.hasOwnProperty.call(row, k))
    && typeof row.domain === "string" && row.domain
    && typeof row.verdict === "string" && row.verdict
    && typeof row.checked_at === "string" && row.checked_at;
}
