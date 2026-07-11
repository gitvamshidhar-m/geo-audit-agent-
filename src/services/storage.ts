import Database from "better-sqlite3";
import { SEOPage } from "../types/seo.js";

let db: any = null;

export async function initDB() {
  db = new Database("./seo_audit.sqlite");
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 10000');

  // Verify and migrate database tables that may be present but outdated (missing userId column)
  try {
    const pagesInfo = db.prepare("PRAGMA table_info(pages)").all();
    if (pagesInfo.length > 0) {
      const hasPageUserId = pagesInfo.some((col: any) => col.name === "userId");
      if (!hasPageUserId) {
        console.log("Dropping outdated pages table without userId...");
        db.exec("DROP TABLE pages;");
      }
    }
  } catch (err) {
    console.warn("Could not check or drop pages table:", err);
  }

  try {
    const statusInfo = db.prepare("PRAGMA table_info(audit_status)").all();
    if (statusInfo.length > 0) {
      const hasStatusUserId = statusInfo.some((col: any) => col.name === "userId");
      if (!hasStatusUserId) {
        console.log("Dropping outdated audit_status table without userId...");
        db.exec("DROP TABLE audit_status;");
      }
    }
  } catch (err) {
    console.warn("Could not check or drop audit_status table:", err);
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE,
      password TEXT,
      plan TEXT DEFAULT 'Free',
      credits INTEGER DEFAULT 100,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS pages (
      userId TEXT,
      url TEXT,
      data TEXT,
      score REAL,
      PRIMARY KEY (userId, url)
    );

    CREATE TABLE IF NOT EXISTS audit_status (
      userId TEXT PRIMARY KEY,
      is_running BOOLEAN,
      progress INTEGER,
      current_url TEXT,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
      has_robots BOOLEAN DEFAULT 0,
      has_sitemap BOOLEAN DEFAULT 0,
      cached_url TEXT DEFAULT NULL,
      cached_at DATETIME DEFAULT NULL,
      crawl_state TEXT DEFAULT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT,
      url TEXT,
      cached_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      stats TEXT,
      pages_count INTEGER
    );

    CREATE TABLE IF NOT EXISTS shared_reports (
      code TEXT PRIMARY KEY,
      userId TEXT,
      url TEXT,
      stats TEXT,
      pages TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed default admin account
  try {
    db.prepare("INSERT OR IGNORE INTO users (id, email, password, plan, credits) VALUES (?, ?, ?, ?, ?)")
      .run("admin", "admin@saas.com", "password123", "Pro", 500);
  } catch (err) {
    console.warn("Could not seed default user:", err);
  }
}

export async function createUser(id: string, email: string, passwordHash: string, plan: string = "Free") {
  db.prepare("INSERT INTO users (id, email, password, plan, credits) VALUES (?, ?, ?, ?, ?)")
    .run(id, email.toLowerCase().trim(), passwordHash, plan, plan === "Enterprise" ? 2000 : plan === "Pro" ? 500 : 100);
}

export async function getUser(id: string) {
  return db.prepare("SELECT * FROM users WHERE id = ?").get(id);
}

export async function getUserByEmail(email: string) {
  return db.prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase().trim());
}

export async function updateUserPlan(id: string, plan: string) {
  const credits = plan === "Enterprise" ? 2000 : plan === "Pro" ? 500 : 100;
  db.prepare("UPDATE users SET plan = ?, credits = ? WHERE id = ?").run(plan, credits, id);
}

export async function deductCredits(id: string, amount: number) {
  db.prepare("UPDATE users SET credits = MAX(0, credits - ?) WHERE id = ?").run(amount, id);
}

export async function savePage(userId: string, page: SEOPage) {
  db.prepare("INSERT OR REPLACE INTO pages (userId, url, data, score) VALUES (?, ?, ?, ?)")
    .run(userId, page.url, JSON.stringify(page), page.score);
}

export async function savePagesBatch(userId: string, pages: SEOPage[]) {
  if (pages.length === 0) return;
  const insert = db.prepare("INSERT OR REPLACE INTO pages (userId, url, data, score) VALUES (?, ?, ?, ?)");
  const tx = db.transaction((batch: SEOPage[]) => {
    for (const p of batch) insert.run(userId, p.url, JSON.stringify(p), p.score);
  });
  tx(pages);
}

export async function getPages(userId: string): Promise<SEOPage[]> {
  const rows = db.prepare("SELECT data FROM pages WHERE userId = ?").all(userId);
  return rows.map((r: any) => JSON.parse(r.data));
}

export async function updateStatus(userId: string, isRunning: boolean, progress: number, currentUrl: string, hasRobots?: boolean, hasSitemap?: boolean) {
  const status = db.prepare("SELECT * FROM audit_status WHERE userId = ?").get(userId);
  if (!status) {
    db.prepare("INSERT INTO audit_status (userId, is_running, progress, current_url, has_robots, has_sitemap) VALUES (?, ?, ?, ?, ?, ?)")
      .run(userId, isRunning ? 1 : 0, progress, currentUrl, hasRobots ? 1 : 0, hasSitemap ? 1 : 0);
  } else {
    const updates = ["is_running = ?", "progress = ?", "current_url = ?", "last_updated = CURRENT_TIMESTAMP"];
    const params: any[] = [isRunning ? 1 : 0, progress, currentUrl];

    if (hasRobots !== undefined) {
      updates.push("has_robots = ?");
      params.push(hasRobots ? 1 : 0);
    }
    if (hasSitemap !== undefined) {
      updates.push("has_sitemap = ?");
      params.push(hasSitemap ? 1 : 0);
    }

    const query = `UPDATE audit_status SET ${updates.join(", ")} WHERE userId = ?`;
    params.push(userId);
    db.prepare(query).run(...params);
  }
}

export async function getAuditStatus(userId: string) {
  const status = db.prepare("SELECT * FROM audit_status WHERE userId = ?").get(userId);
  if (!status) {
    return {
      userId,
      is_running: 0,
      progress: 0,
      current_url: "",
      has_robots: 0,
      has_sitemap: 0,
      last_updated: null
    };
  }
  return status;
}

export async function getStats(userId: string) {
  const pages = await getPages(userId);
  const status = await getAuditStatus(userId);
  const criticalIssues = pages.reduce((acc, p) => acc + p.issues.filter(i => i.type === "critical").length, 0);
  const warningIssues = pages.reduce((acc, p) => acc + p.issues.filter(i => i.type === "warning").length, 0);
  const totalLinks = pages.reduce((acc, p) => acc + (p.links.internal.length + p.links.external.length), 0);
  const averageScore = pages.length > 0 ? pages.reduce((acc, p) => acc + p.score, 0) / pages.length : 0;

  // New aggregate metrics
  const wordCountDistribution = { thin: 0, standard: 0, rich: 0 };
  const headingHealth = { missingH1: 0, multipleH1: 0, healthy: 0 };
  const totalHeadings = { h1: 0, h2: 0, h3: 0, h4: 0, h5: 0, h6: 0 };
  const loadTimeDistribution = { fast: 0, moderate: 0, slow: 0 };
  let structuredDataCount = 0;
  let socialGraphCount = 0;
  let brokenLinksCount = 0;
  let missingAltTotal = 0;
  let totalImagesCount = 0;
  const titles = new Set<string>();
  const duplicateTitles = new Set<string>();
  const descriptions = new Set<string>();
  const duplicateDescriptions = new Set<string>();
  const contentSignatures = new Set<string>();
  const duplicateContents = new Set<string>();

  pages.forEach(p => {
    // Duplicates
    if (p.title) {
      if (titles.has(p.title)) duplicateTitles.add(p.title);
      else titles.add(p.title);
    }
    if (p.description) {
      if (descriptions.has(p.description)) duplicateDescriptions.add(p.description);
      else descriptions.add(p.description);
    }
    
    // Duplicate Content Proxy (same word count + same top keywords)
    if (p.wordCount > 50 && p.keywordDensity && p.keywordDensity.length >= 3) {
      const topWords = p.keywordDensity.slice(0,3).map(k => k.word).join('|');
      const sig = `${p.wordCount}-${topWords}`;
      if (contentSignatures.has(sig)) duplicateContents.add(sig);
      else contentSignatures.add(sig);
    }

    // Word Count
    const wc = p.wordCount || 0;
    if (wc < 300) wordCountDistribution.thin++;
    else if (wc < 1000) wordCountDistribution.standard++;
    else wordCountDistribution.rich++;

    // Heading Health
    const h1s = p.headers?.h1 || [];
    if (h1s.length === 0) headingHealth.missingH1++;
    else if (h1s.length > 1) headingHealth.multipleH1++;
    else headingHealth.healthy++;

    totalHeadings.h1 += h1s.length;
    totalHeadings.h2 += (p.headers?.h2 || []).length;
    totalHeadings.h3 += (p.headers?.h3 || []).length;
    totalHeadings.h4 += (p.headers?.h4 || []).length;
    totalHeadings.h5 += (p.headers?.h5 || []).length;
    totalHeadings.h6 += (p.headers?.h6 || []).length;

    // Load Time (relaxed: <3s = fast, <6s = moderate, >=6s = slow)
    const lt = p.loadTime || 0;
    if (lt < 3000) loadTimeDistribution.fast++;
    else if (lt < 6000) loadTimeDistribution.moderate++;
    else loadTimeDistribution.slow++;

    // Coverage
    if (p.structuredData && p.structuredData.length > 0) structuredDataCount++;
    if (p.ogTags && Object.keys(p.ogTags).length > 0) socialGraphCount++;

    // Broken links (status 0 or 4xx/5xx)
    if (p.statusCode === 0 || (p.statusCode >= 400)) brokenLinksCount++;

    // Image alts
    if (p.imageMetrics) {
      missingAltTotal += p.imageMetrics.missingAlt;
      totalImagesCount += p.imageMetrics.total;
    }
  });

  const structuredDataCoverage = pages.length > 0 ? Number(((structuredDataCount / pages.length) * 100).toFixed(1)) : 0;
  const socialGraphCoverage = pages.length > 0 ? Number(((socialGraphCount / pages.length) * 100).toFixed(1)) : 0;
  const imageAltCoverage = totalImagesCount > 0 ? Number((((totalImagesCount - missingAltTotal) / totalImagesCount) * 100).toFixed(1)) : 100;

  // Internal link authority mapping
  const internalLinkCounts: Record<string, number> = {};
  pages.forEach(p => {
    p.links.internal.forEach(link => {
      internalLinkCounts[link] = (internalLinkCounts[link] || 0) + 1;
    });
  });

  const topInternalPages = Object.entries(internalLinkCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([url, count]) => ({ url, count }));

  // Sitewide Kitchen Sink Keywords
  const allKeywords: Record<string, { count: number, totalDensity: number }> = {};
  pages.forEach(p => {
    (p.keywordDensity || []).forEach(kd => {
      if (!allKeywords[kd.word]) {
        allKeywords[kd.word] = { count: 0, totalDensity: 0 };
      }
      allKeywords[kd.word].count++;
      allKeywords[kd.word].totalDensity += kd.density;
    });
  });

  const topKeywords = Object.entries(allKeywords)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 20)
    .map(([word, data]) => ({ 
      word, 
      count: data.count, 
      density: Number((data.totalDensity / pages.length).toFixed(2)) 
    }));

  const commonIndustryModifiers = ['services', 'pricing', 'reviews', 'guide', 'tutorial', 'best', 'features', 'contact', 'about', 'blog'];
  const keywordGaps = commonIndustryModifiers.filter(mod => !allKeywords[mod]).slice(0, 5);

  return {
    totalPages: pages.length,
    averageScore: Math.round(averageScore),
    criticalIssues,
    warningIssues,
    totalLinks,
    hasRobots: !!status.has_robots,
    hasSitemap: !!status.has_sitemap,
    globalTechnicalHealth: {
      robotsTxtExists: !!status.has_robots,
      sitemapExists: !!status.has_sitemap,
      hasSitemapInRobots: !!status.has_robots, // Minor assumption for now, can be improved
      secureProtocol: pages.length > 0 ? pages[0].url.startsWith('https') : true
    },
    topInternalPages,
    topKeywords,
    keywordGaps,
    wordCountDistribution,
    geoScore: pages.length > 0 ? Math.round(pages.reduce((acc, p) => acc + (p.geoScore || 0), 0) / pages.length) : 0,
    seoVisibilityScore: pages.length > 0 ? Math.max(0, Math.min(100, Math.round(averageScore * 0.7 + (status.has_sitemap ? 10 : 0) + (status.has_robots ? 5 : 0) + (structuredDataCoverage > 30 ? 15 : 0) - (duplicateContents.size > 0 ? 10 : 0)))) : 0,
    headingHealth,
    totalHeadings,
    loadTimeDistribution,
    structuredDataCoverage,
    socialGraphCoverage,
    brokenLinksCount,
    duplicateTitleCount: duplicateTitles.size,
    duplicateDescriptionCount: duplicateDescriptions.size,
    duplicateContentCount: duplicateContents.size,
    imageAltCoverage,
    sentimentTrend: calculateSentimentTrend(pages),
    topicalClusters: calculateTopicalClusters(pages),
    aiRecognitionScore: calculateAiRecognitionScore(pages),
    latencyScore: pages.length > 0 ? Math.round(pages.reduce((acc, p) => acc + (p.performance?.performanceScore || 75), 0) / pages.length) : 0,
  };
}

function calculateSentimentTrend(pages: SEOPage[]) {
  const trend = { positive: 0, neutral: 0, negative: 0 };
  pages.forEach(p => {
    if (p.sentiment === 'positive') trend.positive++;
    else if (p.sentiment === 'negative') trend.negative++;
    else trend.neutral++;
  });
  return trend;
}

function calculateTopicalClusters(pages: SEOPage[]) {
  const clusters: Record<string, number> = {};
  pages.forEach(p => {
    (p.topics || []).forEach(t => {
      clusters[t] = (clusters[t] || 0) + 1;
    });
  });
  return Object.entries(clusters)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cluster, weight]) => ({ cluster, weight }));
}

function calculateAiRecognitionScore(pages: SEOPage[]) {
  if (pages.length === 0) return 0;
  const avgGeo = pages.reduce((acc, p) => acc + (p.geoScore || 0), 0) / pages.length;
  const visibilityBonus = (pages.filter(p => p.keywords.length > 0).length / pages.length) * 15;
  return Math.min(100, Math.round(avgGeo + visibilityBonus));
}

export async function saveCrawlState(userId: string, state: { queue: any[]; visited: string[]; processedCount: number }) {
  db.prepare("UPDATE audit_status SET crawl_state = ? WHERE userId = ?").run(JSON.stringify(state), userId);
}

export async function getCrawlState(userId: string) {
  const row = db.prepare("SELECT crawl_state FROM audit_status WHERE userId = ?").get(userId) as any;
  if (row?.crawl_state) {
    try { return JSON.parse(row.crawl_state); } catch { return null; }
  }
  return null;
}

export async function clearCrawlState(userId: string) {
  db.prepare("UPDATE audit_status SET crawl_state = NULL WHERE userId = ?").run(userId);
}

export async function isCachedAudit(userId: string, url: string) {
  const row = db.prepare("SELECT cached_url, cached_at FROM audit_status WHERE userId = ?").get(userId) as any;
  if (row?.cached_url === url && row?.cached_at) {
    const age = (Date.now() - new Date(row.cached_at + 'Z').getTime()) / 1000 / 60;
    if (age < 60) return true;
  }
  return false;
}

export async function markCached(userId: string, url: string) {
  db.prepare("UPDATE audit_status SET cached_url = ?, cached_at = CURRENT_TIMESTAMP WHERE userId = ?").run(url, userId);
}

export async function saveAuditHistory(userId: string, url: string, stats: any, pagesCount: number) {
  db.prepare("INSERT INTO audit_history (userId, url, stats, pages_count) VALUES (?, ?, ?, ?)").run(userId, url, JSON.stringify(stats), pagesCount);
}

export async function getAuditHistory(userId: string) {
  return db.prepare("SELECT * FROM audit_history WHERE userId = ? ORDER BY cached_at DESC LIMIT 10").all(userId);
}

export async function resetData(userId: string) {
  db.prepare("DELETE FROM pages WHERE userId = ?").run(userId);
  await updateStatus(userId, false, 0, "", false, false);
  await clearCrawlState(userId);
}

export async function saveShareReport(code: string, userId: string, url: string, stats: any, pages: any[]) {
  db.prepare("INSERT OR REPLACE INTO shared_reports (code, userId, url, stats, pages) VALUES (?, ?, ?, ?, ?)")
    .run(code, userId, url, JSON.stringify(stats), JSON.stringify(pages));
}

export async function getShareReport(code: string) {
  return db.prepare("SELECT * FROM shared_reports WHERE code = ?").get(code);
}
