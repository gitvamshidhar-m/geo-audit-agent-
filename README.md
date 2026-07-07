---
title: GEO Audit Agent
emoji: 🐠
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
license: mit
---

# GEO Audit Agent

Ensure your web pages are fully optimized for AI-driven search with the GEO Audit Agent. Crawl any website, analyze SEO/GEO readiness, and get a prioritized action plan.

## Prerequisites

- Node.js 18+
- A Gemini API key (or other AI provider keys)

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Copy `.env.example` to `.env.local` and set your API keys:
   ```
   GEMINI_API_KEY="your_gemini_api_key_here"
   ```

3. Start the dev server:
   ```
   npm run dev
   ```

Open http://localhost:3000

## Features

- Website crawling & SEO analysis
- Multi-provider AI insights (Gemini, OpenAI, Anthropic, Groq, HuggingFace, DeepSeek, Perplexity)
- AI security auditing (prompt injection, PII masking, MCP simulation)
- Market intelligence & competitor analysis
- RAG experimentation lab
- PDF report generation
- SaaS user management with plan tiers
