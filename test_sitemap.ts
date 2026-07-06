import fetch from "node-fetch";

const fetchSitemapUrls = async (sUrl: string, depth = 0): Promise<string[]> => {
    if (depth > 3) return [];
    try {
        const sRes = await fetch(sUrl);
        if (sRes?.ok) {
            const sText = await sRes.text();
            const locs = sText.match(/<loc>(https?:\/\/[^<]+)<\/loc>/g);
            if (locs) {
                const extracted = locs.map((u) => u.replace(/<\/?loc>/g, "").trim());
                let all: string[] = [];
                for (const loc of extracted) {
                    if (loc.endsWith(".xml") || loc.includes("sitemap")) {
                        const sub = await fetchSitemapUrls(loc, depth + 1);
                        all = all.concat(sub);
                    } else {
                        all.push(loc);
                    }
                }
                return all;
            }
        }
    } catch (e) {}
    return [];
};

fetchSitemapUrls("https://www.autorox.ai/sitemap.xml").then(urls => console.log("Sitemap URL count:", urls.length));
