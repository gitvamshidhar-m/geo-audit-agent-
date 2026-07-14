import { createSession } from "wreq-js";

export interface WreqResult {
  html: string;
  finalUrl: string;
  headers: Record<string, string>;
  loadTime: number;
  success: boolean;
}

export async function fetchWithWreq(
  url: string,
  quick = false
): Promise<WreqResult> {
  const session = await createSession({
    browser: "chrome_142",
    os: "windows",
  });

  try {
    const start = Date.now();
    const res = await session.fetch(url, {
      method: "GET",
      timeout: quick ? 8000 : 20000,
      redirect: "follow",
    });
    const loadTime = Date.now() - start;

    const html = await res.text().catch(() => "");
    const headers: Record<string, string> = {};
    res.headers.forEach((v: string, k: string) => { headers[k] = v; });
    headers["x-actual-status"] = res.status.toString();
    headers["x-via"] = "wreq";

    return {
      html,
      finalUrl: res.url || url,
      headers,
      loadTime,
      success: html.length > 50,
    };
  } finally {
    await session.close().catch(() => {});
  }
}
