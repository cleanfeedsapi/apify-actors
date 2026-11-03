import { Actor } from "apify";
import { fetchThreadJobs } from "./hn.js";

await Actor.init();
const {
  kind = "hiring",
  thread = "latest",
  maxComments = 0,
  query = "",
  redactEmails = false,
} = (await Actor.getInput()) ?? {};

let { thread: root, rows } = await fetchThreadJobs({ kind, thread, maxComments, query });

// PPE: one "job" event per returned row. Outside pay-per-event (free/dev runs) nothing is charged or trimmed.
if (Actor.getChargingManager().getPricingInfo().isPayPerEvent) {
  const { chargedCount, eventChargeLimitReached } = await Actor.charge({ eventName: "job", count: rows.length });
  rows = rows.slice(0, chargedCount);
  if (eventChargeLimitReached) console.warn("max charge reached, trimmed rows");
}

if (redactEmails) for (const r of rows) for (const k of Object.keys(r)) if (typeof r[k] === "string") r[k] = r[k].replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, "[email]");
await Actor.pushData(rows);
await Actor.setValue("SUMMARY", {
  kind,
  thread_id: root.id,
  thread_title: root.title,
  jobs: rows.length,
});
console.log(`${root.title}: ${rows.length} jobs`);
await Actor.exit();
