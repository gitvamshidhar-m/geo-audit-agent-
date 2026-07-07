import { GoogleGenAI } from "@google/genai";
import { AuditStats, SEOPage } from "../types/seo.js";

export interface CrewAgent {
  name: string;
  role: string;
  backstory: string;
}

export interface CrewTask {
  description: string;
  expectedOutput: string;
  agent: CrewAgent;
}

export class CrewAIEngine {
  private ai: GoogleGenAI;
  private agents: CrewAgent[] = [];
  private tasks: CrewTask[] = [];

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  addAgent(agent: CrewAgent) {
    this.agents.push(agent);
    return this;
  }

  addTask(task: CrewTask) {
    this.tasks.push(task);
    return this;
  }

  async kickoff(contextRaw: string, onUpdate?: (msg: string) => void): Promise<any> {
    let context = contextRaw;
    const results: Record<string, string> = {};

    for (let i = 0; i < this.tasks.length; i++) {
        const task = this.tasks[i];
        if (onUpdate) {
            onUpdate(`Agent ${task.agent.name} (${task.agent.role}) is analyzing...`);
        }

        const systemPrompt = `You are ${task.agent.name}.
Role: ${task.agent.role}
Backstory: ${task.agent.backstory}

You are part of a multi-agent SEO optimization team.`;

        const prompt = `Context Data:
${context}

Your Task:
${task.description}

Required Output Format:
${task.expectedOutput}
`;

        try {
            const response = await this.ai.models.generateContent({
                model: "gemini-3.5-flash",
                contents: prompt,
                config: {
                    systemInstruction: systemPrompt,
                    responseMimeType: "application/json"
                }
            });

            const resultRaw = response.text || "{}";
            let parsed = resultRaw;
            
            try {
                parsed = JSON.parse(resultRaw.replace(/```json\n?|\n?```/g, "").trim());
            } catch (e) {
                // Keep as raw if parsing fails
            }

            results[task.agent.name] = resultRaw;
            
            // Append this agent's insights to the context for the next agent
            context += `\n\n--- Insights from ${task.agent.name} (${task.agent.role}) ---\n${JSON.stringify(parsed, null, 2)}`;
        } catch (e) {
            console.error(`Agent ${task.agent.name} failed:`, e);
            throw e;
        }
    }

    // The final task should be the ChiefOrchestrator that combines everything into the final JSON structure
    const lastResult = results[this.tasks[this.tasks.length - 1].agent.name];
    try {
        return JSON.parse(lastResult.replace(/```json\n?|\n?```/g, "").trim());
    } catch (e) {
        return JSON.parse(lastResult); // try raw
    }
  }
}
