import { SEOPage } from "../types/seo";

export interface RAGChunk {
  id: string;
  url: string;
  title: string;
  chunkType: 'metadata' | 'headers' | 'issues' | 'metrics' | 'links' | 'geo';
  content: string;
  score?: number;
}

/**
 * Creates diverse, content-rich description chunks from crawled SEO pages
 */
export function chunkPagesForRAG(pages: SEOPage[]): RAGChunk[] {
  const chunks: RAGChunk[] = [];

  for (const page of pages) {
    const url = page.url;
    const title = page.title || "Untitled Page";

    // 1. Core Metadata Chunk
    const metaContent = [
      `[URL]: ${url}`,
      `[Title]: ${title}`,
      `[Description]: ${page.description || "No description provided."}`,
      `[Canonical]: ${page.canonical || "Not specified"}`,
      `[Status Code]: ${page.statusCode || 200}`,
      `[Load Time]: ${page.loadTime ? `${page.loadTime}ms` : "Unknown"}`,
      `[Word Count]: ${page.wordCount || 0} words`,
      `[Robots Tag]: ${page.robots || "Not specified"}`,
    ].join("\n");

    chunks.push({
      id: `${url}-metadata`,
      url,
      title,
      chunkType: 'metadata',
      content: metaContent,
    });

    // 2. Structured Headers Outline Chunk
    const h1s = page.headers?.h1 || [];
    const h2s = page.headers?.h2 || [];
    const h3s = page.headers?.h3 || [];
    
    if (h1s.length > 0 || h2s.length > 0 || h3s.length > 0) {
      const headerContent = [
        `[URL]: ${url} - Header Hierarchical Architecture`,
        h1s.length > 0 ? `H1 Headers:\n${h1s.map(h => `  - ${h}`).join("\n")}` : "",
        h2s.length > 0 ? `H2 Headers (First 6):\n${h2s.slice(0, 6).map(h => `  - ${h}`).join("\n")}` : "",
        h3s.length > 0 ? `H3 Headers (First 8):\n${h3s.slice(0, 8).map(h => `  - ${h}`).join("\n")}` : "",
      ].filter(Boolean).join("\n\n");

      chunks.push({
        id: `${url}-headers`,
        url,
        title,
        chunkType: 'headers',
        content: headerContent,
      });
    }

    // 3. Page Audit SEO Issues Chunk
    const issues = page.issues || [];
    if (issues.length > 0) {
      const criticalCount = issues.filter(i => i.type === "critical").length;
      const warningCount = issues.filter(i => i.type === "warning").length;
      const infoCount = issues.filter(i => i.type === "info").length;

      const issueContent = [
        `[URL]: ${url} - Audit Findings and Critical Liabilities`,
        `Summary: ${criticalCount} Critical, ${warningCount} Warning, ${infoCount} Info issues.`,
        `Page Score: ${page.score}/100`,
        `Identified Issues:`,
        issues.map((issue, idx) => `  ${idx + 1}. [${issue.type.toUpperCase()}] [Category: ${issue.category}] - ${issue.message}`).join("\n"),
      ].join("\n");

      chunks.push({
        id: `${url}-issues`,
        url,
        title,
        chunkType: 'issues',
        content: issueContent,
      });
    }

    // 4. Semantic & Analytics Performance Chunk
    const keywords = page.keywords || [];
    const density = page.keywordDensity || [];
    const topics = page.topics || [];
    const structuredData = page.structuredData || [];

    const performanceContent = [
      `[URL]: ${url} - Linguistic, Sentiment, & Technical Metrics`,
      `Overall Sentiment: ${page.sentiment || "Neutral"} (Sentiment Score: ${page.sentimentScore ?? 0})`,
      `Text-To-Code Ratio: ${page.textToCodeRatio ? `${page.textToCodeRatio.toFixed(1)}%` : "N/A"}`,
      topics.length > 0 ? `Predicted Semantic Topics: ${topics.join(", ")}` : "",
      keywords.length > 0 ? `Top Extracted Keywords: ${keywords.slice(0, 10).join(", ")}` : "",
      density.length > 0 ? `Keyword Density Distribution:\n${density.slice(0, 5).map(k => `  - "${k.word}": Count=${k.count} (Density=${k.density?.toFixed(2)}%)`).join("\n")}` : "",
      `Structured Data (JSON-LD/Schema) Blocks: ${structuredData.length} detected`,
      `Core Web Vitals Metrics:`,
      `  - FCP (First Contentful Paint): ${page.performance?.fcp ? `${page.performance.fcp}ms` : "N/A"}`,
      `  - LCP (Largest Contentful Paint): ${page.performance?.lcp ? `${page.performance.lcp}ms` : "N/A"}`,
      `  - CLS (Cumulative Layout Shift): ${page.performance?.cls ?? "N/A"}`,
      `  - TBT (Total Blocking Time): ${page.performance?.tbt ? `${page.performance.tbt}ms` : "N/A"}`,
    ].filter(Boolean).join("\n");

    chunks.push({
      id: `${url}-metrics`,
      url,
      title,
      chunkType: 'metrics',
      content: performanceContent,
    });

    // 5. Contextual Links Network Chunk
    const internal = page.links?.internal || [];
    const external = page.links?.external || [];

    if (internal.length > 0 || external.length > 0) {
      const linksContent = [
        `[URL]: ${url} - Connection and Graph Analysis`,
        `Outbound Internal Links (${internal.length} total):`,
        internal.slice(0, 10).map(l => `  -> ${l}`).join("\n"),
        internal.length > 10 ? `  ... and ${internal.length - 10} other internal links` : "",
        `Outbound External/Outgoing Links (${external.length} total):`,
        external.slice(0, 10).map(l => `  -> ${l}`).join("\n"),
        external.length > 10 ? `  ... and ${external.length - 10} other external targets` : "",
      ].filter(Boolean).join("\n");

      chunks.push({
        id: `${url}-links`,
        url,
        title,
        chunkType: 'links',
        content: linksContent,
      });
    }

    // 6. Generative Engine Optimization (GEO) & LLM Retrieval Chunk
    const hAll = [...(page.headers?.h1 || []), ...(page.headers?.h2 || []), ...(page.headers?.h3 || [])].join(" ").toLowerCase();
    const questionsList = ["what", "how", "why", "who", "where", "when", "guide", "tutorial", "best", "compare", "vs"];
    const foundQuestions = questionsList.filter(q => hAll.includes(q));

    const geoContent = [
      `[URL]: ${url} - Generative Engine Optimization (GEO) Blueprint`,
      `Verified GEO Score: ${page.geoScore ?? 65}/100`,
      `Citation Readiness Status: ${page.geoScore && page.geoScore > 75 ? "EXCELLENT" : "IMPROVEMENT_NEEDED"}`,
      `Information Gain Index: ${page.wordCount && page.wordCount > 800 ? "HIGH" : "STANDARD"}`,
      `LLM Crawler Compliance: ${page.robots?.toLowerCase().includes("noindex") ? "BLOCKED" : "FULLY_COMPLIANT"}`,
      `Structured JSON-LD Schema: ${(page.structuredData || []).length > 0 ? "IMPLEMENTED" : "MISSING"}`,
      foundQuestions.length > 0 ? `Targeted LLM Query Headings: ${foundQuestions.join(", ")}` : "No direct conversational/question head-phrases found.",
      `Syntactic Extractability (Bullet lists, structured tags): ${page.keywordDensity && page.keywordDensity.length > 5 ? "OPTIMAL" : "SUB-OPTIMAL"}`,
      `Entity Association Topics: ${(page.topics || []).join(", ") || "Uncategorized"}`,
      `Core Recommendations to capture Search Engine Citations:`,
      `  1. ${page.geoScore && page.geoScore > 75 ? "Maintain schema and conversational headings." : "Inject question-guided headings (What, How, Why) and structured schema.org blocks to boost Perplexity & Gemini indexing."}`,
      `  2. ${page.wordCount && page.wordCount < 500 ? "Increase text length to >800 words with rich informational gains." : "Ensure high keyword relevance alignment across paragraph text blocks."}`,
    ].join("\n");

    chunks.push({
      id: `${url}-geo`,
      url,
      title,
      chunkType: 'geo',
      content: geoContent,
    });
  }

  return chunks;
}

/**
 * Tokenizes text and removes small punctuation / makes lowercase
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s\-/]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 1);
}

/**
 * Advanced Ranker implementing custom Term-Frequency (TF) Inverse-Document-Frequency (IDF) math matching,
 * combined with exact phrase boosts and URL hierarchy bonuses.
 */
export function queryRAGIndex(query: string, chunks: RAGChunk[], limit = 6): RAGChunk[] {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) {
    return chunks.slice(0, limit);
  }

  // 1. Calculate document/chunk frequency for IDF
  const totalDocs = chunks.length;
  const docFrequency: Record<string, number> = {};

  for (const chunk of chunks) {
    const chunkTokens = new Set(tokenize(chunk.content));
    for (const token of chunkTokens) {
      docFrequency[token] = (docFrequency[token] || 0) + 1;
    }
  }

  // 2. Score each chunk
  const scoredChunks = chunks.map(chunk => {
    const contentTokens = tokenize(chunk.content);
    const contentLower = chunk.content.toLowerCase();
    const queryLower = query.toLowerCase();

    // Term Counter
    const tokenCounts: Record<string, number> = {};
    for (const token of contentTokens) {
      tokenCounts[token] = (tokenCounts[token] || 0) + 1;
    }

    let score = 0;

    // Accumulate TF-IDF
    for (const token of queryTokens) {
      const tf = (tokenCounts[token] || 0) / Math.max(1, contentTokens.length);
      const df = docFrequency[token] || 0;
      const idf = Math.log(1 + (totalDocs / (df + 1)));
      
      score += tf * idf * 10; // scale factor
    }

    // Bonus 1: Exact Query Phrase match (Highly valuable for exact matches)
    if (contentLower.includes(queryLower)) {
      score += 5.0;
    }

    // Bonus 2: Partial multi-word alignment boost
    let wordMatches = 0;
    for (const token of queryTokens) {
      if (contentLower.includes(token)) {
        wordMatches++;
      }
    }
    const ratioMatched = wordMatches / queryTokens.length;
    score += ratioMatched * 2.5;

    // Bonus 3: URL/Path alignment (e.g. if query contains page names matching exact page path)
    const urlLower = chunk.url.toLowerCase();
    for (const token of queryTokens) {
      if (token.length > 3 && urlLower.includes(token)) {
        score += 1.5; // query targets this specific page directly Let's boost it!
      }
    }

    // Segment Bonus: Increase weight of headers chunk for structural questions, or issues chunk for problem queries
    const qIssues = queryLower.includes("error") || queryLower.includes("violation") || queryLower.includes("broken") || queryLower.includes("issue") || queryLower.includes("critical") || queryLower.includes("warning") || queryLower.includes("flaw") || queryLower.includes("problem") || queryLower.includes("seo page score");
    if (qIssues && chunk.chunkType === 'issues') {
      score *= 1.4;
    }

    const qHeaders = queryLower.includes("h1") || queryLower.includes("h2") || queryLower.includes("h3") || queryLower.includes("heading") || queryLower.includes("title") || queryLower.includes("outline") || queryLower.includes("structure") || queryLower.includes("hierarchy");
    if (qHeaders && chunk.chunkType === 'headers') {
      score *= 1.4;
    }

    const qMetrics = queryLower.includes("lcp") || queryLower.includes("fcp") || queryLower.includes("cls") || queryLower.includes("tbt") || queryLower.includes("speed") || queryLower.includes("performance") || queryLower.includes("load time") || queryLower.includes("sentiment") || queryLower.includes("keyword");
    if (qMetrics && chunk.chunkType === 'metrics') {
      score *= 1.4;
    }

    const qGeo = queryLower.includes("geo") || queryLower.includes("generative") || queryLower.includes("llm") || queryLower.includes("perplexity") || queryLower.includes("chatgpt") || queryLower.includes("citation") || queryLower.includes("cite") || queryLower.includes("reference") || queryLower.includes("searchGPT") || queryLower.includes("overviews") || queryLower.includes("ai overview") || queryLower.includes("extractability") || queryLower.includes("schema");
    if (qGeo && chunk.chunkType === 'geo') {
      score *= 1.8; // High weight for GEO intent searches
    }

    return {
      ...chunk,
      score: parseFloat(score.toFixed(4)),
    };
  });

  // Filter out completely unrelated chunks (score of 0), and sort descending
  return scoredChunks
    .filter(c => (c.score || 0) > 0)
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, limit);
}

/**
 * Builds the beautifully tailored context injection prompt for RAG
 */
export function buildRAGPrompt(query: string, retrievedChunks: RAGChunk[], originalPagesCount: number): string {
  if (retrievedChunks.length === 0) {
    return `
      You are an elite SEO AI strategist. The site crawler hasn't logged any relevant sub-sections matching this specific query or there are no pages indexed in the dataset.
      Briefly prompt the user to make sure they have run a site crawl first, then answer the query conceptually from standard enterprise SEO best practices.
      
      User Question: ${query}
    `;
  }

  const chunksFormatted = retrievedChunks.map((chunk, index) => {
    return `--- RAG SOURCE PIECE #${index + 1} [Type: ${chunk.chunkType.toUpperCase()}] [URL: ${chunk.url}] [Relevance: ${chunk.score}] ---
Title: ${chunk.title}
Content:
${chunk.content}
--------------------------------------------------------------------------------`;
  }).join("\n\n");

  return `You are an elite, Enterprise-level SEO Strategist and Neural Search Auditor. 
Your objective is to provide professional, data-supported solutions with maximum clarity.

We have indexed a crawl database containing ${originalPagesCount} total pages.
In response to the user's specific query, our Advanced Hybrid RAG retrieval pipeline has parsed the database and retrieved the most semantically and syntactically relevant information chunks below.

Use these retrieved chunks as your GROUND TRUTH context to answer the user's query with technical rigor. Refer directly to pages, heading layouts, issues, and statistics mentioned in the sources to back up your claims.

Retrieved Context Chunks:
================================================================================
${chunksFormatted}
================================================================================

User's Query: "${query}"

Provide your professional evaluation, listing specifically affected URLs and actionable recommendations where appropriate. Use clear markdown formatting, bullet points, and code/tag blocks as needed. Keep your tone direct, clinical, and expert.
`;
}
