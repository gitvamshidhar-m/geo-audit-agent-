import http from "node:http";
import https from "node:https";

const PORT = parseInt(process.env.PORT || "9999");
const AUTH = process.env.PROXY_AUTH || "geo:audit2024";

const server = http.createServer((req, res) => {
  const url = req.url?.slice(1) || "";
  if (!url) { res.writeHead(400); res.end("usage: GET /https://site.com/page"); return; }

  const client = url.startsWith("https") ? https : http;
  const opts = {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
    timeout: 15000,
    rejectUnauthorized: false,
  };
  client.get(url, opts, (proxyRes) => {
    let data = "";
    proxyRes.on("data", (c) => data += c);
    proxyRes.on("end", () => {
      res.writeHead(proxyRes.statusCode || 200, {
        "Content-Type": proxyRes.headers["content-type"] || "text/html",
        "X-Proxied-Status": String(proxyRes.statusCode || 200),
      });
      res.end(data);
    });
  }).on("error", (e) => { res.writeHead(502); res.end(`Proxy error: ${e.message}`); });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`\nStep 1: Run this on your Windows machine:`);
  console.log(`  npx tsx home-proxy.ts`);
  console.log(`\nStep 2: In another terminal, expose it:`);
  console.log(`  npx localtunnel --port 9999`);
  console.log(`  (copy the https://xxxx.loca.lt URL)`);
  console.log(`\nStep 3: On Render, set env var:`);
  console.log(`  HOME_PROXY_URL=https://xxxx.loca.lt`);
  console.log(`\nThe crawler will use your home IP as fallback tier.`);
});
