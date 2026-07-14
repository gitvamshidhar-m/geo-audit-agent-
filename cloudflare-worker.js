export default {
  async fetch(request) {
    const url = new URL(request.url);
    const target = url.pathname.slice(1) + url.search;
    if (!target) return new Response("Usage: /https://example.com", { status: 400 });

    const strategies = [
      {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
        "Cache-Control": "max-age=0",
      },
      {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate",
        "Connection": "keep-alive",
      },
    ];

    for (const headers of strategies) {
      try {
        const resp = await fetch(target, { headers, redirect: "follow" });
        const body = await resp.text();
        if (resp.status !== 403) {
          return new Response(body, {
            status: resp.status,
            headers: {
              "Content-Type": resp.headers.get("content-type") || "text/html",
              "X-Proxied-Status": resp.status,
              "Access-Control-Allow-Origin": "*",
            },
          });
        }
      } catch {}
    }

    return new Response("All strategies failed", { status: 502 });
  },
};
