import { Actor } from "apify";
import { fetchSource } from "./sources.js";

await Actor.init();
const {
  sources = ["remoteok", "arbeitnow"],
  search = "",
  maxJobsPerSource = 0,
} = (await Actor.getInput()) ?? {};
if (!sources.length) throw new Error("input.sources is empty");
let total = 0;
for (const name of sources) {
  try {
    let rows = await fetchSource(name, { search, maxJobs: maxJobsPerSource });
    let limit = false;
    if (Actor.getChargingManager().getPricingInfo().isPayPerEvent) {
      const { chargedCount, eventChargeLimitReached } = await Actor.charge({ eventName: "job", count: rows.length });
      rows = rows.slice(0, chargedCount);
      limit = eventChargeLimitReached;
    }
    await Actor.pushData(rows);
    total += rows.length;
    console.log(`${name}: ${rows.length} jobs`);
    if (limit) { console.warn("max charge reached, stopping"); break; }
  } catch (e) {
    console.warn(`${name}: FAILED ${e.message}`);
    await Actor.pushData([{ source: name, title: null, company: null, location: null, remote: false, tags: [], salary: null, url: null, source_url: null, posted_at: null, id: null, error: e.message }]);
  }
}
await Actor.setValue("SUMMARY", { sources: sources.length, jobs: total, search });
await Actor.exit();
