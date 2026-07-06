import { GoogleGenAI } from "@google/genai";
import { SEOPage, AuditStats } from "../types/seo";

import { CrewAIEngine, CrewAgent, CrewTask } from "./crewAIEngine";
import { chunkPagesForRAG, queryRAGIndex, buildRAGPrompt } from "./ragService";

async function retry<T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const isRetryable = 
      error.message?.includes("429") || 
      error.message?.includes("quota") || 
      error.message?.includes("exhausted") ||
      error.message?.includes("503") ||
      error.message?.includes("500");

    if (retries > 0 && isRetryable) {
      console.log(`Retrying AI call... (${retries} left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return retry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

export async function generateGeminiInsights(stats: AuditStats, pages: any[], userApiKey?: string, onProgress?: (msg: string) => void) {
  const apiKey = (userApiKey || process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey) throw new Error("Gemini API Key is missing. Please provide it in settings.");

  const topIssues = pages
    .flatMap(p => p.issues || [])
    .reduce((acc, issue) => {
      acc[issue.message] = (acc[issue.message] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  const sortedIssues = Object.entries(topIssues)
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .slice(0, 10);

  const initialContext = `
    Aggregate Audit Intelligence:
    - Scope: ${stats.totalPages} pages
    - Baseline Score: ${stats.averageScore}/100
    - Technical Debt: ${stats.criticalIssues} critical violations, ${stats.warningIssues} warnings
    - Content Depth Distribution: ${stats.wordCountDistribution ? JSON.stringify(stats.wordCountDistribution) : "N/A"}
    - Heading Integrity: ${stats.headingHealth ? JSON.stringify(stats.headingHealth) : "N/A"}
    - Top Keywords & Density: ${stats.topKeywords ? JSON.stringify(stats.topKeywords) : "N/A"}
    - GEO (Generative Engine Optimization) Score: ${stats.geoScore}/100
    - AI Recognition Score: ${stats.aiRecognitionScore}/100
    
    Top Recurring Biological Issues:
    ${sortedIssues.map(([msg, count]) => `- ${msg} (found on ${count} pages)`).join("\n")}
    
    Neural Topography Snippets:
    ${pages.slice(0, 10).map(p => `- ${p.url}: keywords=[${(p.keywords || []).join(", ")}], score=${p.score}, t2c=${p.textToCodeRatio}%`).join("\n")}
  `;

  const engine = new CrewAIEngine(apiKey);

  const techAgent: CrewAgent = {
    name: "Tech-01",
    role: "Senior Technical SEO Engineer",
    backstory: "You have 15 years evaluating site architecture, crawling mechanics, and CWV performance."
  };

  const contentAgent: CrewAgent = {
    name: "Content-01",
    role: "Generative Engine Optimization (GEO) Lead",
    backstory: "You are an expert at optimizing content for AI overviews, ChatGPT, Perplexity, and Semantic Search."
  };
  
  const marketAgent: CrewAgent = {
    name: "Market-01",
    role: "Digital Marketing Strategist",
    backstory: "You identify missing target audiences, campaign strategies, and messaging gaps based on SEO data."
  };

  const chiefAgent: CrewAgent = {
    name: "Orchestrator-Prime",
    role: "Director of Enterprise SEO",
    backstory: "You synthesize the outputs of specialized agents into a singular, highly actionable strategic roadmap."
  };

  engine.addAgent(techAgent)
        .addAgent(contentAgent)
        .addAgent(marketAgent)
        .addAgent(chiefAgent);

  engine.addTask({
    agent: techAgent,
    description: "Analyze the technical health of the site. Identify major infrastructure liabilities and performance roadblocks.",
    expectedOutput: `JSON format: { "technicalStatus": "string", "criticalLiabilities": ["string"], "prioritizedTechSteps": ["string"] }`
  });

  engine.addTask({
    agent: contentAgent,
    description: "Analyze content depth, semantic gaps, and geo score to determine AI compliance.",
    expectedOutput: `JSON format: { "semanticGaps": ["string"], "aiReadiness": "string", "geoFixes": ["string"], "experimentationIdeas": [{ "observation": "string", "hypothesis": "string", "metric": "string" }] }`
  });

  engine.addTask({
    agent: marketAgent,
    description: "Analyze keywords and topics to determine how to better target the audience.",
    expectedOutput: `JSON format: { "targetAudienceGaps": ["string"], "campaignOpportunities": [{ "campaignName": "string", "description": "string", "targetChannels": ["string"], "expectedOutcome": "string" }], "messagingRefinements": [{ "currentProblem": "string", "proposedMessaging": "string", "reasoning": "string" }] }`
  });

  engine.addTask({
    agent: chiefAgent,
    description: "Synthesize all insights into the final neural SEO Action Plan json format.",
    expectedOutput: `JSON format EXACTLY matching this spec:
    {
      "executiveSummary": "string (concise summary)",
      "marketPosition": "string",
      "criticalRoadmap": [
        { "task": "string", "impact": "High/Medium/Low", "effort": "Easy/Medium/Hard", "description": "string" }
      ],
      "technicalAudit": { "score": 0, "findings": ["string"], "recommendation": "string" },
      "contentStrategy": { "status": "string", "improvements": ["string"], "suggestedMeta": { "title": "string", "description": "string" } },
      "semanticClusterAnalysis": { "topEntities": ["string"], "contentGaps": ["string"], "brandVibe": "string" },
      "geoStrategy": { "citationReadiness": "string", "informationGain": ["string"], "schemaEffectiveness": "string", "actionableFixes": ["string"] },
      "experimentationStrategy": {
        "hypotheses": [{ "observation": "string", "hypothesis": "string", "metric": "string" }],
        "abTests": [{ "testName": "string", "description": "string", "expectedImpact": "High/Medium/Low", "difficulty": "Easy/Medium/Hard" }]
      },
      "marketIntelligence": {
        "targetAudienceGaps": ["string"],
        "campaignOpportunities": [{ "campaignName": "string", "description": "string", "targetChannels": ["string"], "expectedOutcome": "string" }],
        "messagingRefinements": [{ "currentProblem": "string", "proposedMessaging": "string", "reasoning": "string" }],
        "competitivePositioning": {
          "marketDifferentiator": "string",
          "threats": ["string"],
          "opportunities": ["string"]
        },
        "buyerPersonas": [{ "personaName": "string", "painPoints": ["string"], "contentPreferences": ["string"] }],
        "pricingStrategy": "string"
      },
      "detailedActionPlan": { "technical": ["string"], "content": ["string"], "ux": ["string"] },
      "fullReport": {
        "priorityActionPlan": [{ "id": 1, "action": "string", "impact": "Critical/High/Medium/Low", "effort": "Low/Medium/High" }],
        "criticalIssues": [{ "url": "string", "issue": "string", "why": "string", "howToFix": "string" }],
        "highPriority": [{ "url": "string", "issue": "string", "why": "string", "howToFix": "string" }],
        "quickWins": ["string"],
        "pageSummary": [{ "url": "string", "score": 0, "topIssue": "string" }]
      }
    }
    `
  });

  return await retry(async () => {
    const finalData = await engine.kickoff(initialContext, onProgress);
    return JSON.stringify(finalData); // return as string to match previous API
  });
}


export async function chatWithGemini(query: string, pages: any[], userApiKey?: string) {
  const apiKey = (userApiKey || process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey) throw new Error("Gemini API Key is missing");

  const ai = new GoogleGenAI({ apiKey });
  
  // 1. Chunk and index crawled pages
  const chunks = chunkPagesForRAG(pages);
  
  // 2. Query index to retrieve the top 8 sources matching user word triggers
  const retrievedSources = queryRAGIndex(query, chunks, 8);
  
  // 3. Render contextual prompt
  const prompt = buildRAGPrompt(query, retrievedSources, pages.length);

  const system = "You are an elite SEO AI Strategist and Semantic Search Expert. Be technical, data-driven, and refer directly to retrieved RAG sources to answer the query.";

  const textResponse = await retry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
          systemInstruction: system
      }
    });

    return response.text || "I couldn't generate a response.";
  });

  return {
    response: textResponse,
    sources: retrievedSources
  };
}
