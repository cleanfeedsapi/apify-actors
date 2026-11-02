import { Actor } from "apify";
import { fetchPackages } from "./packages.js";

await Actor.init();
const {
  packages = ["requests", "numpy", "django", "flask", "pandas", "urllib3"],
  ecosystem = "both",
  includeDownloads = true,
} = (await Actor.getInput()) ?? {};
if (!packages.length) throw new Error("input.packages is empty");

let rows = await fetchPackages({ packages, ecosystem, includeDownloads });

// PPE: one "package" event per returned row. Outside pay-per-event nothing is charged or trimmed.
if (Actor.getChargingManager().getPricingInfo().isPayPerEvent) {
  const { chargedCount, eventChargeLimitReached } = await Actor.charge({
    eventName: "package",
    count: rows.length,
  });
  rows = rows.slice(0, chargedCount);
  if (eventChargeLimitReached) console.warn("max charge reached, trimmed rows");
}

await Actor.pushData(rows);
await Actor.setValue("SUMMARY", {
  packages: packages.length,
  ecosystem,
  rows: rows.length,
});
console.log(`${rows.length} package rows (ecosystem=${ecosystem})`);
await Actor.exit();
