import { Actor } from "apify";
import { fetchBoard, normalizeSpec, applyFilters } from "./ats.js";

await Actor.init();
const { boards = ["greenhouse:stripe", "ashby:ramp", "lever:spotify"], maxJobsPerBoard = 0, ...filters } = (await Actor.getInput()) ?? {};
if (!boards.length) throw new Error("input.boards is empty");
let total = 0;
for (const spec of boards) {
  try {
    let rows = await fetchBoard(spec, maxJobsPerBoard);
    if (maxJobsPerBoard > 0) rows = rows.slice(0, maxJobsPerBoard);
    const fetched = rows.length;
    rows = applyFilters(rows, filters);
    // PPE: one "job" event per returned row. Outside pay-per-event (free/dev runs) nothing is charged or trimmed.
    let limit = false;
    if (Actor.getChargingManager().getPricingInfo().isPayPerEvent) {
      const { chargedCount, eventChargeLimitReached } = await Actor.charge({ eventName: "job", count: rows.length });
      rows = rows.slice(0, chargedCount);
      limit = eventChargeLimitReached;
    }
    await Actor.pushData(rows);
    total += rows.length;
    console.log(`${spec}: ${rows.length} jobs (${fetched} fetched, ${fetched - rows.length} filtered out before billing)`);
    if (limit) { console.warn("max charge reached, stopping"); break; }
  } catch (e) {
    console.warn(`${spec}: FAILED ${e.message}`);
    await Actor.pushData([{ source: String(spec).split(":")[0].replace(/^https?$/, "url"), company: String(spec).split(":").slice(1).join(":"), error: e.message }]);
  }
}
await Actor.setValue("SUMMARY", { boards: boards.length, jobs: total });
await Actor.exit();
