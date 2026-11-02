import { Actor } from "apify";
import { searchRepos } from "./github.js";

await Actor.init();
const {
  queries = ["topic:mcp stars:>50"],
  sort = "stars",
  maxReposPerQuery = 200,
  token = "",
} = (await Actor.getInput()) ?? {};
if (!queries.length) throw new Error("input.queries is empty");
let total = 0;
for (const q of queries) {
  try {
    let rows = await searchRepos(q, { sort, maxRepos: maxReposPerQuery, token });
    // PPE: one "repo" event per returned row. Outside pay-per-event (free/dev runs) nothing is charged or trimmed.
    let limit = false;
    if (Actor.getChargingManager().getPricingInfo().isPayPerEvent) {
      const { chargedCount, eventChargeLimitReached } = await Actor.charge({ eventName: "repo", count: rows.length });
      rows = rows.slice(0, chargedCount);
      limit = eventChargeLimitReached;
    }
    await Actor.pushData(rows);
    total += rows.length;
    console.log(`${q}: ${rows.length} repos`);
    if (limit) { console.warn("max charge reached, stopping"); break; }
  } catch (e) {
    console.warn(`${q}: FAILED ${e.message}`);
    await Actor.pushData([{ query: String(q), error: e.message }]);
  }
}
await Actor.setValue("SUMMARY", { queries: queries.length, repos: total });
await Actor.exit();
