import { chromium } from "playwright-extra";
import { audit } from "./src/services/crawler.ts";

audit("https://autorox.ai", { depth: 2, maxPages: 10 }).then(() => {
    console.log("Audit done.");
    process.exit(0);
});
