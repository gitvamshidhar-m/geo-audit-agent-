import { GoogleGenAI } from "@google/genai";
import { AuditStats, SEOPage } from "../types/seo.js";

export interface Agent {
  name: string;
  role: string;
  goal: string;
  backstory: string;
}

export interface Task {
  description: string;
  expectedOutput: string;
  agent: Agent;
}

export class CrewAI {
  private ai: GoogleGenAI;
  private agents: Agent[] = [];
  private tasks: Task[] = [];
  
  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  addAgent(agent: Agent) {
    this.agents.push(agent);
  }

  addTask(task: Task) {
    this.tasks.push(task);
  }

  async run(contextRaw: string, onProgress?: (msg: string) => void): Promise<string> {
    let context = contextRaw;
    let finalResult = "";

    for (let i = 0; i < this.tasks.length; i++) {
      const task = this.tasks[i];
      if (onProgress) {
        onProgress(`Agent [${task.agent.name}] - ${task.agent.role} is working...`);
      }

      const systemPrompt = `You are ${task.agent.name}. 
Role: ${task.agent.role}
Backstory: ${task.agent.backstory}
Goal: ${task.agent.goal}

You are part of a multi-agent SEO optimization team.`;

      const prompt = `Context Data:
${context}

Task Description:
${task.description}

Expected Output Format:
${task.expectedOutput}
`;

      try {
        const response = await this.ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            systemInstruction: systemPrompt
          }
        });

        const result = response.text || "";
        finalResult = result;
        // Append context for the next agent
        context += `\n\n--- Output from ${task.agent.name} ---\n${result}`;
        
      } catch (e) {
        console.error(`Error executing task for agent ${task.agent.name}`, e);
        throw e;
      }
    }
    
    return finalResult; // The last task is the final synthesized output
  }
}
