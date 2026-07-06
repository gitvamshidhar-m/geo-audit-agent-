import { chromium } from "playwright-extra";
import { audit } from "./src/services/crawler.ts";
import { initDB } from "./src/services/storage.ts";

(async () => {
    await initDB();
    await audit("https://autorox.ai", { depth: 2, maxPages: 10 });
    console.log("Audit done.");
    process.exit(0);
})();
