import { Actor } from "apify";
import { checkDomain, mapPool, DEFAULT_DOMAINS, isChargeable } from "./dns.js";

await Actor.init();
const {
  domains = DEFAULT_DOMAINS,
  emailsAllowed = true,
  concurrency = 10,
} = (await Actor.getInput()) ?? {};
if (!Array.isArray(domains) || !domains.length) throw new Error("input.domains is empty");

const raw = await mapPool(domains, Math.max(1, Math.min(50, Number(concurrency) || 10)), async (item) => {
  try {
    return await checkDomain(item, emailsAllowed);
  } catch (e) {
    return { input: null, domain: null, error: e.message, checked_at: new Date().toISOString() };
  }
});

let rows = raw.filter(isChargeable);
const errors = raw.filter((r) => r && r.error);

// PPE: one "domain" event per chargeable row. Outside pay-per-event nothing is charged or trimmed.
if (Actor.getChargingManager().getPricingInfo().isPayPerEvent) {
  const { chargedCount, eventChargeLimitReached } = await Actor.charge({ eventName: "domain", count: rows.length });
  rows = rows.slice(0, chargedCount);
  if (eventChargeLimitReached) console.warn("max charge reached, trimming");
}

await Actor.pushData([...rows, ...errors]);
await Actor.setValue("SUMMARY", {
  input: domains.length,
  ok: rows.length,
  errors: errors.length,
  verdicts: rows.reduce((a, r) => ((a[r.verdict] = (a[r.verdict] || 0) + 1), a), {}),
});
console.log(`domains=${domains.length} charged_rows=${rows.length} errors=${errors.length}`);
await Actor.exit();
