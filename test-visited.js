const visited = new Set();
const maxPages = 5;
const queue = [];
let processedCount = 1;
const currentDepth = 0;
const depth = 2;

visited.add("https://example.com");
visited.add("example.com");

const internalLinks = ['https://example.com/about', 'https://example.com/contact'];

internalLinks.forEach((link) => {
  const linkKey = link.trim().replace(/\/$/, "").toLowerCase();
  const linkNoWww = linkKey.replace(/^https?:\/\/(www\.)?/, "");

  if (
    !visited.has(linkKey) &&
    !visited.has(linkNoWww) &&
    processedCount + queue.length < maxPages * 2
  ) {
    visited.add(linkKey);
    visited.add(linkNoWww);
    console.log("Adding to queue:", link);
    queue.push({ url: link, currentDepth: currentDepth + 1 });
  }
});
console.log("Queue result:", queue);
