import { audit } from "./src/services/crawler.js";
import * as db from "./src/services/storage.js";

async function test() {
  await db.initDB();
  console.log("Starting debug crawl...");
  await audit("https://www.autorox.ai/", { depth: 5, maxPages: 100, userId: "debug-test-user" });
  console.log("Debug crawl finished!");
  const pages = await db.getPages("debug-test-user");
  console.log("Pages saved count:", pages.length);
  console.log("Saved URLs:", pages.map(p => p.url));
}
test().catch(console.error);
