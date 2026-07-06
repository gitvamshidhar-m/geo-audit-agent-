import { audit } from './src/services/crawler.js';
import { initDB, getPages } from './src/services/storage.js';

initDB().then(async () => {
  await audit("https://autozilla.co", { depth: 2, maxPages: 100 });
  const pages = await getPages("public");
  console.log("Pages crawled:", pages.length);
  console.log("URLs:", pages.map(p => p.url));
});
