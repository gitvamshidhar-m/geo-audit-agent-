import { audit } from "./src/services/crawler.js";
import * as db from "./src/services/storage.js";

async function test() {
  db.initDB();
  await audit("https://books.toscrape.com/", { depth: 1, maxPages: 5 });
  const status = await db.getAuditStatus("public");
  console.log("Status:", status);
  const rows = await db.getPages("public");
  console.log("Pages:", rows.length);
  for (const row of rows) {
    console.log(row.url, row.title, row.statusCode);
  }
}
test();
