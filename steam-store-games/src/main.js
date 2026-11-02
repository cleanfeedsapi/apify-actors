import { Actor } from "apify";
import { resolveAppIds, fetchAppRows } from "./steam.js";

await Actor.init();
const {
  appIds = [],
  search = "",
  listing = "topsellers",
  maxApps = 100,
  cc = "us",
} = (await Actor.getInput()) ?? {};

const ids = await resolveAppIds({ appIds, search, listing: listing || "", maxApps, cc });
console.log(`resolved ${ids.length} app ids`);
let rows = await fetchAppRows(ids, { cc });

let limit = false;
if (Actor.getChargingManager().getPricingInfo().isPayPerEvent) {
  const { chargedCount, eventChargeLimitReached } = await Actor.charge({ eventName: "app", count: rows.length });
  rows = rows.slice(0, chargedCount);
  limit = eventChargeLimitReached;
}
await Actor.pushData(rows);
if (limit) console.warn("max charge reached");
await Actor.setValue("SUMMARY", { apps: rows.length, ids: ids.length, search, listing, cc });
await Actor.exit();
