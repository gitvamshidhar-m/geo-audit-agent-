import { GoogleGenAI, Type } from "@google/genai";
import { SEOPage, AuditStats } from "../types/seo";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function generateSEOInsights(stats: AuditStats, pages: SEOPage[]) {
  if (!process.env.GEMINI_API_KEY) {
    return "Gemini API key is not configured. Please add it to your environment to see AI-powered SEO insights.";
  }

  // Sample data to avoid hitting context limits for very large audits
  const topIssues = pages
    .flatMap(p => p.issues || [])
    .reduce((acc, issue) => {
      acc[issue.message] = (acc[issue.message] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

  const sortedIssues = Object.entries(topIssues)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const prompt = `
    Analyze the following SEO audit data for a website and provide a concise, high-level strategic executive summary and 3-5 actionable priority fixes.
    
    Audit Stats:
    - Total Pages: ${stats.totalPages}
    - Average Score: ${stats.averageScore}/100
    - Critical Issues: ${stats.criticalIssues}
    - Warning Issues: ${stats.warningIssues}
    - Total Links Found: ${stats.totalLinks}
    - Robots.txt: ${stats.hasRobots ? "Found" : "Missing"}
    - Sitemap.xml: ${stats.hasSitemap ? "Found" : "Missing"}
    
    Top Recurring Issues:
    ${sortedIssues.map(([msg, count]) => `- ${msg} (found on ${count} pages)`).join("\n")}
    
    Common Keywords Detected:
    ${pages.slice(0, 5).map(p => `- ${p.url}: ${(p.keywords || []).join(", ")}`).join("\n")}
    
    Format your response as a clear SEO strategy roadmap. Be professional, technical yet accessible.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an expert SEO Strategist at a top digital agency. You provide high-impact, data-driven SEO advice."
      }
    });

    return response.text || "Failed to generate AI insights.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error generating AI insights. Please check your connection and API key.";
  }
}

export async function chatAboutSEO(query: string, context: SEOPage[]) {
  if (!process.env.GEMINI_API_KEY) {
    return "Gemini API key is not configured.";
  }

  const contextText = context.slice(0, 15).map(p => `URL: ${p.url}, Score: ${p.score}, Issues: ${(p.issues || []).map((i: any) => i.message).join(', ')}`).join('\n');
  
  const prompt = `
    You are an AI SEO Assistant. Use the following audit context to answer the user's question concisely.
    Context:
    ${contextText}

    User Question: ${query}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    return response.text || "I couldn't generate a response.";
  } catch (error) {
    console.error("Gemini API error:", error);
    return "I encountered an error while processing your request.";
  }
}
