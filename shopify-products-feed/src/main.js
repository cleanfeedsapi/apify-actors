import { Actor } from "apify";
import { fetchShops, isComplete } from "./shopify.js";

await Actor.init();
const {
  shops = ["https://www.allbirds.com", "https://gymshark.com"],
  collections = [],
  maxProductsPerShop = 40,
  onlyChangedSince = "",
} = (await Actor.getInput()) ?? {};
if (!shops.length) throw new Error("input.shops is empty");

const all = await fetchShops({ shops, collections, maxProductsPerShop, onlyChangedSince });
const errors = all.filter((r) => r.error);
let products = all.filter((r) => !r.error && isComplete(r));

// PPE: one "product" event per complete product row. Outside pay-per-event nothing is charged or trimmed.
if (Actor.getChargingManager().getPricingInfo().isPayPerEvent) {
  const { chargedCount, eventChargeLimitReached } = await Actor.charge({
    eventName: "product",
    count: products.length,
  });
  products = products.slice(0, chargedCount);
  if (eventChargeLimitReached) console.warn("max charge reached, trimmed products");
}

await Actor.pushData([...products, ...errors]);
await Actor.setValue("SUMMARY", {
  shops: shops.length,
  products: products.length,
  errors: errors.length,
});
console.log(`${products.length} products, ${errors.length} error rows`);
await Actor.exit();
