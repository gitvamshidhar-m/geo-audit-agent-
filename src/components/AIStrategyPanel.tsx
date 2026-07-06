import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  RefreshCw, 
  FileText, 
  Download, 
  Globe, 
  Activity,
  Zap,
  Layout,
  Code,
  Compass,
  Layers,
  CheckCircle2,
  AlertCircle,
  Network,
  Maximize2,
  Target,
  BrainCircuit,
  Binary,
  MonitorCheck,
  Search,
  MessageSquare,
  ShieldCheck,
  CheckSquare,
  ChevronRight,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Cell,
  BarChart,
  Bar,
  XAxis as RechartsXAxis,
  YAxis as RechartsYAxis
} from 'recharts';
import ReactMarkdown from 'react-markdown';
import { cn } from '../lib/utils';
import { RoadmapItem } from './RoadmapItem';
import { AIInsightData, SEOPage, AuditStats, GEOResult } from '../types/seo';
import { generateGeminiInsights } from '../services/clientAiService';
import { generateInsights } from '../services/aiProviderService';
import { generateGEOAuditChecklistPDF } from '../utils/pdfGenerator';

const GEO_DIMENSIONS = [
  { id: 'brand_entity_info', name: 'Brand Entity Info', description: 'Accuracy and consistency of brand information across the web.' },
  { id: 'content_structure', name: 'Content Structure', description: 'The organization, layout, and hierarchy of the content on pages.' },
  { id: 'content_strategy', name: 'Content Strategy', description: 'Overall plan for creating, delivering, and governing content.' },
  { id: 'citation_frequency', name: 'Citation Frequency', description: 'How often the brand/site is cited as a source by AI models.' },
  { id: 'share_of_voice', name: 'Share of Voice (SOV)', description: 'Brand visibility vs competitors in AI-generated answers.' },
  { id: 'sentiment', name: 'Sentiment Analysis', description: 'The tone (positive/negative) of AI responses regarding the brand.' },
  { id: 'clarity', name: 'Content Clarity', description: 'Overall readability and understanding of the core message.' },
  { id: 'structure', name: 'Semantic Structure', description: 'Correct usage of HTML tags and content hierarchy.' },
  { id: 'depth', name: 'Informational Depth', description: 'The thoroughness and detail provided on the subject.' },
  { id: 'readability', name: 'Machine Readability', description: 'How easily AI parsers can extract structured data.' },
  { id: 'originality', name: 'Content Originality', description: 'Uniqueness of perspectives vs common training data.' },
  { id: 'architecture', name: 'Information Architecture', description: 'Logical flow and navigation of information.' }
];

const AI_ENGINES = [
  { id: 'chatgpt', name: 'ChatGPT', icon: 'GPT' },
  { id: 'perplexity', name: 'Perplexity', icon: 'P' },
  { id: 'gemini', name: 'Gemini', icon: 'G' },
  { id: 'claude', name: 'Claude', icon: 'C' },
  { id: 'search-gpt', name: 'SearchGPT', icon: 'SG' }
];

const RadarDot = (props: any) => {
  const { cx, cy, payload, dataKey } = props;
  if (!cx || !cy) return null;
  const score = payload[dataKey];
  
  let color = "#10b981"; // Emerald-500
  if (score < 40) color = "#ef4444"; // Rose-500
  else if (score < 75) color = "#f59e0b"; // Amber-500
  
  return (
    <circle
      cx={cx}
      cy={cy}
      r={4}
      fill={color}
      stroke="#fff"
      strokeWidth={2}
      className="drop-shadow-sm transition-all duration-300"
    />
  );
};

const CustomRadarBackground = (props: any) => {
  const { cx, cy, outerRadius } = props;
  return (
    <g>
      {/* Right Hemisphere (Teal) */}
      <path
        d={`M ${cx} ${cy - outerRadius} 
           A ${outerRadius} ${outerRadius} 0 0 1 ${cx} ${cy + outerRadius}
           L ${cx} ${cy} Z`}
        fill="#f0fdfa"
        stroke="none"
      />
      {/* Left Hemisphere (Grey) */}
      <path
        d={`M ${cx} ${cy - outerRadius} 
           A ${outerRadius} ${outerRadius} 0 0 0 ${cx} ${cy + outerRadius}
           L ${cx} ${cy} Z`}
        fill="#f1f5f9"
        stroke="none"
      />
    </g>
  );
};

function NeuralNetworkBackground() {
  return (
    <div className="absolute inset-0 opacity-[0.08] pointer-events-none">
      <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <radialGradient id="nodeGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </radialGradient>
        </defs>
        {[...Array(30)].map((_, i) => (
          <motion.circle
            key={i}
            cx={`${Math.random() * 100}%`}
            cy={`${Math.random() * 100}%`}
            r={Math.random() * 4 + 1}
            fill="url(#nodeGradient)"
            animate={{
              cx: [`${Math.random() * 100}%`, `${Math.random() * 100}%`, `${Math.random() * 100}%`],
              cy: [`${Math.random() * 100}%`, `${Math.random() * 100}%`, `${Math.random() * 100}%`],
              opacity: [0.1, 0.4, 0.1]
            }}
            transition={{
              duration: 20 + Math.random() * 30,
              repeat: Infinity,
              ease: "linear"
            }}
          />
        ))}
      </svg>
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500 rounded-full blur-[160px] opacity-20" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500 rounded-full blur-[160px] opacity-20" />
    </div>
  );
}

function SemanticNeuralGraph({ items, title, subtitle }: { items: string[], title: string, subtitle: string }) {
  return (
    <div className="relative bg-[#0f172a] rounded-[48px] p-8 overflow-hidden h-[450px] group shadow-2xl border border-slate-800">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent)]" />
      <div className="relative z-10 flex flex-col justify-between h-full">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Network size={16} />
            </div>
            <div>
              <h4 className="text-white font-black text-sm uppercase tracking-tight">{title}</h4>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{subtitle}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 relative flex items-center justify-center">
          {/* Centrally animated core */}
          <motion.div 
            animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="absolute w-48 h-48 bg-blue-500/10 rounded-full blur-3xl"
          />
          
          <div className="relative w-full h-full">
            {items.map((item, i) => {
              const angle = (i / items.length) * (2 * Math.PI);
              const x = 50 + Math.cos(angle) * 30;
              const y = 50 + Math.sin(angle) * 30;
              
              return (
                <React.Fragment key={i}>
                  {/* Connection lines to center */}
                  <motion.div 
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: i * 0.1 }}
                    className="absolute top-1/2 left-1/2 h-[1px] bg-blue-500/20 origin-left"
                    style={{ 
                      width: '30%', 
                      transform: `rotate(${angle}rad)` 
                    }}
                  />
                  
                  <motion.div 
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1, type: "spring" }}
                    className="absolute p-3 rounded-2xl bg-slate-800 border border-slate-700 shadow-xl cursor-default hover:border-blue-500 transition-colors group/node max-w-[150px]"
                    style={{ 
                      left: `${x}%`, 
                      top: `${y}%`,
                      transform: 'translate(-50%, -50%)' 
                    }}
                  >
                    <div className="flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shrink-0" />
                       <span className="text-[10px] font-black text-slate-300 group-hover/node:text-white uppercase tracking-widest break-words leading-tight">{item}</span>
                    </div>
                    {/* Floating hint */}
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[8px] font-black uppercase px-2 py-1 rounded opacity-0 group-hover/node:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-lg">
                      Authority Weight: {Math.floor(Math.random() * 40 + 60)}%
                    </div>
                  </motion.div>
                </React.Fragment>
              );
            })}
          </div>
        </div>

        <div className="flex justify-between items-center bg-white/5 backdrop-blur-md p-4 rounded-3xl border border-white/5">
           <div className="flex items-center gap-2">
              <span className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Active Sync</span>
              <div className="flex gap-1">
                 {[...Array(3)].map((_, i) => (
                   <motion.div 
                    key={i}
                    animate={{ scaleY: [1, 2, 1] }}
                    transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                    className="w-0.5 h-1.5 bg-blue-400 rounded-full"
                   />
                 ))}
              </div>
           </div>
           <button className="text-[9px] font-black text-white hover:text-blue-400 uppercase tracking-widest flex items-center gap-1 transition-colors">
              Expand View <Maximize2 size={10} />
           </button>
        </div>
      </div>
    </div>
  );
}

export function AIStrategyPanel({ 
  insight, 
  isGenerating, 
  aiProvider,
  onExport,
  onDownloadPDF,
  onShare,
  onRetry,
  url,
  stats,
  pages,
  auditEndTime,
  apiKeys,
  agentProgress
}: { 
  insight: AIInsightData | string | null;
  isGenerating: boolean;
  aiProvider: string;
  onExport: () => void;
  onDownloadPDF: () => void;
  onShare: () => void;
  onRetry: () => void;
  url: string;
  stats: AuditStats | null;
  pages: SEOPage[];
  auditEndTime: number | null;
  apiKeys?: any;
  agentProgress?: string;
}) {
  const [activeSubTab, setActiveSubTab] = useState<'strategy' | 'network' | 'entities' | 'geo'>('strategy');
  const [geoRatings, setGeoRatings] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    GEO_DIMENSIONS.forEach(d => initial[d.id] = 70);
    return initial;
  });
  const [selectedEngines, setSelectedEngines] = useState<string[]>(['chatgpt', 'perplexity', 'gemini']);
  const [isGeoCalculating, setIsGeoCalculating] = useState(false);
  const [customGeoResult, setCustomGeoResult] = useState<GEOResult | null>(null);
  const [isAutoCalibrating, setIsAutoCalibrating] = useState(false);
  const [hasInitialCalibrated, setHasInitialCalibrated] = useState(false);

  // Auto-calibrate on mount if data is present
  React.useEffect(() => {
    if (activeSubTab === 'geo' && pages.length > 0 && !hasInitialCalibrated && !customGeoResult) {
      autoCalibrate().catch(err => console.error("Initial calibration failed", err));
      setHasInitialCalibrated(true);
    }
  }, [activeSubTab, pages.length, hasInitialCalibrated, customGeoResult]);

  // Auto-calibrate based on audit data
  const autoCalibrate = async () => {
    setIsAutoCalibrating(true);
    try {
      // Real data-driven calibration
      const newRatings: Record<string, number> = {};
      
      if (pages.length > 0) {
        const avgT2C = pages.reduce((a, b) => a + (b.textToCodeRatio || 0), 0) / pages.length;
        const hasStructured = pages.some(p => p.structuredData && p.structuredData.length > 0);
        const avgScore = pages.reduce((a, b) => a + (b.score || 0), 0) / pages.length;
        
        newRatings['brand_entity_info'] = Math.round(avgScore * 0.8 + (hasStructured ? 15 : 0));
        newRatings['content_structure'] = hasStructured ? 85 : 55;
        newRatings['content_strategy'] = Math.round(avgScore * 0.88);
        newRatings['citation_frequency'] = Math.round(avgScore * 0.9 + (hasStructured ? 5 : -5));
        newRatings['share_of_voice'] = Math.round(avgScore * 0.85);
        newRatings['sentiment'] = Math.min(95, Math.round(avgScore * 0.95 + 10));
        newRatings['clarity'] = Math.min(95, Math.max(30, Math.round(avgT2C * 1.5)));
        newRatings['structure'] = hasStructured ? 85 : 40;
        newRatings['readability'] = hasStructured ? 90 : 35;
        newRatings['depth'] = Math.round(avgScore * 0.9);
        newRatings['originality'] = 75; // Default safe baseline
        newRatings['architecture'] = Math.round(avgScore * 0.85);
      } else {
        GEO_DIMENSIONS.forEach(d => newRatings[d.id] = 50); // fallback
      }
      
      setGeoRatings(newRatings);
      
      const avgLoadTime = pages.length > 0 ? pages.reduce((a, b) => a + (b.loadTime || 0), 0) / pages.length : 0;
      const totalArticle = pages.filter(p => JSON.stringify(p.structuredData)?.includes('Article')).length;
      const totalFAQ = pages.filter(p => JSON.stringify(p.structuredData)?.includes('FAQPage')).length;
      const totalOrg = pages.filter(p => JSON.stringify(p.structuredData)?.includes('Organization')).length;
      const total404 = pages.filter(p => p.statusCode === 404).length;
      const avgWords = pages.length > 0 ? pages.reduce((a, b) => a + (b.wordCount || 0), 0) / pages.length : 0;
      const maxWords = pages.length > 0 ? Math.max(...pages.map(p => p.wordCount || 0)) : 0;
      const totalExtLinks = pages.reduce((a, p) => a + (p.links?.external?.length || 0), 0);
      const avgHeaders = pages.length > 0 ? pages.reduce((a, p) => a + (p.headers?.h2?.length || 0) + (p.headers?.h3?.length || 0), 0) / pages.length : 0;
      const pagesWithOg = pages.filter(p => p.ogTags && Object.keys(p.ogTags).length > 0).length;

      // Instantly generate the GEO result dashboard
      const bvs = Math.round(Object.values(newRatings).reduce((a, b) => a + b, 0) / Object.values(newRatings).length);
      const dims = GEO_DIMENSIONS.map(d => ({
         name: d.name,
         score: newRatings[d.id] || 70,
         description: `Computed automatically based on average score correlation and technical signals for ${d.name}.`
      }));
      
      setCustomGeoResult({
        bvs,
        engines: selectedEngines,
        dimensions: dims,
        recommendations: [
          {
            title: "Technical SEO & Crawling",
            priority: "High",
            description: "This audit examines whether AI bots can access, crawl, and understand your website's content. Unlike traditional search engines that use web crawlers, AI systems like ChatGPT use specialized bots (GPTBot, ClaudeBot, etc.) that may be blocked by your current settings without you realizing it.",
            findings: `Analyzed ${pages.length} pages (Load time avg: ${avgLoadTime.toFixed(2)}ms ${avgLoadTime > 3000 ? '⚠️ High' : '✅ Good'}). Found ${totalArticle} pages with Article schema and ${totalFAQ} pages with FAQ schema. Encountered ${total404} 404 links.`,
            actionItems: [
              "Check your robots.txt file to ensure GPTBot, ClaudeBot, and Bing's GPT-4 bot are allowed to crawl your site",
              "Verify your site loads in under 3 seconds on mobile (use PageSpeed Insights)",
              "Implement Article schema markup on all blog posts and guides",
              "Add FAQ schema to any content with question-and-answer sections",
              "Ensure your XML sitemap includes all important pages and submit it to Google Search Console",
              "Fix any 404 errors or broken internal links that could confuse AI crawlers",
              "Add structured data for your organization (name, logo, contact info) on your homepage",
              "NOTE: Think of this as making sure AI systems can 'read' your website properly. If they can't access or understand your content, you won't appear in any AI responses."
            ]
          },
          {
            title: "Content Strategy - Topic Coverage",
            priority: "High",
            description: "This analyzes whether you have comprehensive content covering the topics your audience asks AI tools about. AI systems prefer to cite sources that cover topics thoroughly rather than those with scattered, incomplete information.",
            findings: `Content size averages ${Math.round(avgWords)} words per page. Max page word count is ${maxWords}, which indicates ${maxWords > 1500 ? 'good' : 'poor'} pillar-page readiness.`,
            actionItems: [
              "Search your target keywords in ChatGPT and Perplexity to see which brands get mentioned",
              "Create a content map showing which topics you cover well vs. gaps in your coverage",
              "Develop comprehensive guides for your 3-5 most important business topics",
              "Create 'ultimate guides' or pillar pages for your core topics",
              "NOTE: AI tools need to see you as a comprehensive source on your topics. Partial coverage means you'll lose citations to competitors with more complete information. Pro tip: Use a GEO tool like Genrank, so you can easily monitor prompts where you are mentioned (or not)."
            ]
          },
          {
            title: "Content Structure - Quality/Format",
            priority: "Medium",
            description: "This evaluates whether your content is structured and formatted in ways that AI systems can easily parse, understand, and cite. AI tools prefer content with a clear hierarchy, credible sources, and easy-to-extract information.",
            findings: `Pages use an average of ${avgHeaders.toFixed(1)} subheadings (H2/H3). Found a total of ${totalExtLinks} external sources cited across the site.`,
            actionItems: [
              "Add 3-5 authoritative sources/citations to each major article",
              "Include expert quotes or statistics in your content (AI tools love citing specific data)",
              "Break up long paragraphs into shorter sections with clear subheadings",
              "Add bullet points and numbered lists for easy AI extraction (just like this one!)",
              "Create executive summaries for long-form content (500+ words at the top)",
              "Add 'Key Takeaways' sections that AI can easily quote",
              "Include author bylines with expertise credentials",
              "Implement FAQ sections within relevant articles and mark them up with schema",
              "Ensure your content directly answers questions (not just provides general information)",
              "NOTE: Remember: AI systems are looking for quotable, citable content. Make it easy for them to extract and reference your information."
            ]
          },
          {
            title: "Brand Entity Info",
            priority: "Medium",
            description: "This examines how consistently and authoritatively your brand appears across the web. AI systems build an understanding of your company by cross-referencing multiple sources, so inconsistent information weakens your entity's strength.",
            findings: `Found Organization schema on ${totalOrg} pages. ${pagesWithOg}/${pages.length} pages are properly equipped with Open Graph representation.`,
            actionItems: [
              "Audit your company information across Crunchbase, LinkedIn, Wikipedia, and industry directories",
              "Ensure consistent company description, founding date, team size, and location everywhere",
              "Create or update your Google Business Profile with complete information",
              "Establish a Wikipedia presence (if eligible) or contribute to Wikidata",
              "Get your executives mentioned in industry publications and podcasts",
              "Ensure your team members have updated LinkedIn profiles mentioning your company",
              "Monitor how AI tools currently describe your brand using brand visibility tracking",
              "Fix any conflicting information about your company size, services, or history",
              "NOTE: AI systems are essentially building a 'profile' of your company. These systems have an obsessive need to consolidate the same data about your brand. Any Inconsistent information makes you appear less authoritative and trustworthy."
            ]
          },
          {
            title: "Off-site Reputation",
            priority: "Low",
            description: "This tracks what others say about your brand across forums, reviews, social media, and news outlets. This is essentially almost the same principle as link building in SEO. The difference is where you get cited.",
            findings: `To accurately gauge off-site reputation, integrate a mention-tracking API. Currently, this relies on structural integrity of brand mentions.`,
            actionItems: [
              "Set up Google Alerts for your brand name and key executives",
              "Monitor discussions about your company on Reddit, Quora, and industry forums",
              "Respond professionally to negative reviews or complaints (AI tools may cite these)",
              "Encourage satisfied customers to leave detailed reviews mentioning specific benefits",
              "Participate in industry discussions where you can add genuine value",
              "Publish thought leadership content on platforms that AI systems frequently crawl",
              "Build relationships with industry publications for positive coverage",
              "Implement AI agent workflows to maintain a consistent thought leadership presence",
              "NOTE: Think of this as your 'digital reputation management' for AI systems. What others say about you significantly influences how AI tools present your brand. Although this is marked as 'low' priority, it is actually just as important as the other items on the checklist."
            ]
          }
        ]
      });

    } catch (error) {
       console.error("Auto-calibration failed", error);
    } finally {
      setIsAutoCalibrating(false);
    }
  };

  // Dynamically calculate average BVS based on current calibration
  const currentBVS = Math.round(
    Object.values(geoRatings).reduce((a, b) => a + b, 0) / Object.values(geoRatings).length
  );

  const calculateGeoScore = async () => {
    if (pages.length === 0) return;
    setIsGeoCalculating(true);
    try {
      const avgT2C = pages.reduce((a, b) => a + (b.textToCodeRatio || 0), 0) / pages.length;
      
      const prompt = `
        You are a GEO (Generative Engine Optimization) Specialist. 
        Perform a high-fidelity audit for the brand based on these user-defined calibration points and audit metadata.
        
        User Calibration Nodes:
        ${GEO_DIMENSIONS.map(d => `- ${d.name}: ${geoRatings[d.id]}`).join('\n')}
        
        Selected AI Engines for target analysis: ${selectedEngines.join(', ')}
        URL Environment: ${url}
        Audit Stats: ${JSON.stringify({
          pagesProcessed: pages.length,
          avgComplexity: avgT2C,
          hasSitemap: stats?.hasSitemap,
          hasRobots: stats?.hasRobots
        })}
        
        OUTPUT SCHEMA (MUST BE VALID JSON):
        {
          "bvs": number,
          "dimensions": [
            { "name": "string (Exact Name from Dimensions)", "score": number, "description": "string" }
          ],
          "engines": ["string"],
          "recommendations": [
            { "title": "string", "description": "string", "priority": "Critical" | "High" | "Medium" | "Low", "findings": "string (specific observation from the audit)", "actionItems": ["string"] }
          ]
        }
      `;

      const gKeyRaw = apiKeys.gemini || '';
      const effectiveKeys = {
        ...apiKeys,
        gemini: (gKeyRaw === 'MY_GEMINI_API_KEY' || gKeyRaw === 'YOUR_GEMINI_API_KEY' ? process.env.GEMINI_API_KEY : gKeyRaw) || process.env.GEMINI_API_KEY || ''
      };

      const res = await fetch('/api/ai/geo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          provider: aiProvider, 
          query: prompt,
          pages: pages.slice(0, 3), // Use less pages for GEO summary to save tokens
          keys: effectiveKeys
        })
      });
      
      if (!res.ok) {
        throw new Error(`GEO Engine Error: ${res.status}`);
      }
      
      const data = await res.json();
      let resultString = data.response;

      // Robust JSON extraction
      const jsonMatch = resultString.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        resultString = jsonMatch[0];
      }
      
      const parsed = JSON.parse(resultString);
      
      // Update the calibration sliders with true AI findings
      if (parsed.dimensions && Array.isArray(parsed.dimensions)) {
        const newRatings = { ...geoRatings };
        parsed.dimensions.forEach((d: any) => {
          const dim = GEO_DIMENSIONS.find(gd => gd.name === d.name);
          if (dim) {
            newRatings[dim.id] = d.score;
          }
        });
        setGeoRatings(newRatings);
      }
      
      setCustomGeoResult(parsed);
    } catch (error) {
      console.error("GEO Calculation failed", error);
      // Fallback for UI if AI fails
      setCustomGeoResult({
        bvs: currentBVS,
        engines: selectedEngines,
        dimensions: GEO_DIMENSIONS.slice(0, 5).map(d => ({ name: d.name, score: geoRatings[d.id], description: "Manual calibration active." })),
        recommendations: [
          { title: "AI Connection Timeout", description: "The GEO engine could not reach the LLM cluster. Displaying manual calibration metrics instead.", priority: "Medium", findings: "Manual calibration currently active." }
        ]
      });
    } finally {
      setIsGeoCalculating(false);
    }
  };

  const isData = insight && typeof insight === 'object';
  const avgT2C = pages.length > 0 ? (pages.reduce((acc, p) => acc + (p.textToCodeRatio || 0), 0) / pages.length) : 0;
  
  // Robust radar data with safe defaults
  const radarData = [
    { subject: 'Technical', A: (isData && (insight as any).technicalAudit?.score) || 0, fullMark: 100 },
    { subject: 'Semantic', A: avgT2C || 0, fullMark: 100 },
    { subject: 'Recognition', A: stats?.aiRecognitionScore || (stats?.geoScore || 0) || 0, fullMark: 100 },
    { subject: 'Performance', A: stats?.loadTimeDistribution ? (stats.loadTimeDistribution.fast / (stats.totalPages || 1)) * 100 : 0, fullMark: 100 },
    { subject: 'Sentiment', A: stats?.sentimentTrend ? ((stats.sentimentTrend.positive / (stats.totalPages || 1)) * 100) : 50, fullMark: 100 },
  ];

  return (
    <div className="bg-[#f8fafc] border border-[#3b82f6]/30 p-4 md:p-8 rounded-[40px] relative overflow-hidden transition-all hover:shadow-2xl shadow-blue-500/5 group min-h-[800px]">
      <NeuralNetworkBackground />

      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 md:mb-12 gap-6 relative z-10">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
             <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-xl shadow-blue-500/30 transform group-hover:rotate-6 transition-transform">
               <Sparkles size={24} />
             </div>
             <div>
                <h3 className="text-lg font-black uppercase text-slate-900 tracking-tight leading-tight">Neural Directives Center</h3>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <span>Synthesizer: {aiProvider}</span>
                  <span className="w-1.5 h-1.5 bg-slate-200 rounded-full" />
                  <span className="text-blue-500 font-black">Quantum State: Active</span>
                  {auditEndTime && (
                    <>
                      <span className="w-1.5 h-1.5 bg-slate-200 rounded-full" />
                      <span className="text-slate-500 uppercase tracking-widest font-black">Generated: {new Date(auditEndTime).toLocaleString()}</span>
                    </>
                  )}
                </div>
             </div>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
             <button 
               onClick={() => setActiveSubTab('strategy')}
               className={cn("px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", activeSubTab === 'strategy' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800")}
             >
               Strategy
             </button>
             <button 
               onClick={() => setActiveSubTab('network')}
               className={cn("px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", activeSubTab === 'network' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800")}
             >
               Network
             </button>
             <button 
               onClick={() => setActiveSubTab('entities')}
               className={cn("px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", activeSubTab === 'entities' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800")}
             >
               Semantic
             </button>
             <button 
               onClick={() => setActiveSubTab('geo')}
               className={cn("px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", activeSubTab === 'geo' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-800")}
             >
               GEO Engine
             </button>
          </div>
        </div>
        
        <div className="flex items-center gap-3 bg-white/80 backdrop-blur-md p-2 rounded-2xl border border-slate-200 shadow-xl shrink-0">
          {isGenerating ? (
            <div className="flex items-center gap-3 px-4 py-1">
               <RefreshCw size={14} className="animate-spin text-blue-500" />
               <span className="text-[11px] font-black text-blue-600 uppercase tracking-widest animate-pulse">{agentProgress || 'Processing Nodes...'}</span>
            </div>
          ) : (
            <>
              <button onClick={onDownloadPDF} className="flex items-center gap-2 px-4 py-2 hover:bg-slate-100 rounded-xl text-slate-600 hover:text-blue-600 transition-all font-black text-[10px] uppercase tracking-widest border border-transparent hover:border-slate-200">
                <FileText size={16} /> Generate PDF
              </button>
              <button onClick={onExport} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-blue-600 transition-all border border-transparent hover:border-slate-200" title="Export JSON">
                <Download size={18} />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="relative z-10">
        <AnimatePresence mode="wait">
          {activeSubTab === 'strategy' && (
            <motion.div 
              key="strategy"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-8 md:space-y-12"
            >
              {isGenerating && !insight ? (
                <div className="flex flex-col items-center justify-center py-32 space-y-8 animate-in fade-in duration-700">
                  <div className="relative">
                    <div className="w-24 h-24 border-4 border-blue-500/10 rounded-full animate-[spin_4s_linear_infinite]" />
                    <div className="absolute inset-0 border-t-4 border-blue-500 rounded-full animate-spin" />
                    <div className="absolute inset-0 flex items-center justify-center">
                       <RefreshCw className="text-blue-500 animate-spin-reverse" size={32} />
                    </div>
                  </div>
                  {agentProgress && (
                    <div className="text-center">
                      <p className="text-sm font-bold text-slate-800 tracking-tight max-w-sm">{agentProgress}</p>
                    </div>
                  )}
                </div>
              ) : (
                <React.Fragment>
                  {isData && typeof insight === 'object' ? (
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                       <div className="xl:col-span-8 space-y-8">
                          <section className="bg-white border border-slate-200 p-8 md:p-12 rounded-[48px] shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-2 h-full bg-blue-600" />
                            <div className="flex items-center gap-3 mb-6">
                              <div className="text-[10px] font-black text-blue-600 uppercase tracking-[0.4em]">Executive Synthesis</div>
                              <div className="h-[1px] flex-1 bg-slate-100" />
                            </div>
                            <p className="text-xl md:text-2xl font-medium text-slate-800 leading-relaxed tracking-tight italic">
                              "{insight.executiveSummary || 'Synthesis in progress. Re-calibrate neural engine if persistent.'}"
                            </p>
                          </section>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                             <div className="bg-blue-600 rounded-[40px] p-8 text-white shadow-xl shadow-blue-500/20 flex flex-col justify-between">
                                <div>
                                  <div className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-6 underline decoration-blue-400 underline-offset-4">Market Position Analysis</div>
                                  <p className="text-lg font-bold leading-relaxed">{insight.marketPosition}</p>
                                </div>
                                <div className="mt-12 flex items-center gap-4">
                                   <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
                                      <Globe size={24} className="text-blue-200" />
                                   </div>
                                   <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Global Node Presence</span>
                                 </div>
                             </div>

                             {insight.semanticClusterAnalysis?.brandVibe && (
                               <div className="bg-indigo-900 rounded-[40px] p-8 text-white shadow-xl shadow-indigo-500/20 col-span-1 sm:col-span-2">
                                  <div className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-2">Detected Brand Authority Tone</div>
                                  <p className="text-sm font-bold opacity-90 leading-relaxed italic">"{insight.semanticClusterAnalysis.brandVibe}"</p>
                               </div>
                             )}

                             <div className="bg-white border border-slate-200 rounded-[40px] p-8 shadow-sm flex flex-col justify-between">
                                <div>
                                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">Neural Balance Core</div>
                                  <div className="h-[250px]">
                                     <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                                        <RadarChart cx="50%" cy="50%" outerRadius="40%" data={radarData} margin={{ top: 10, right: 40, bottom: 10, left: 40 }}>
                                          <PolarGrid stroke="#e2e8f0" />
                                          <PolarAngleAxis 
                                            dataKey="subject" 
                                            tick={{ fontSize: 9, fontWeight: 900, fill: '#64748b' }}
                                          />
                                          <Radar
                                            name="Optimization"
                                            dataKey="A"
                                            stroke="#3b82f6"
                                            fill="#3b82f6"
                                            fillOpacity={0.5}
                                          />
                                        </RadarChart>
                                     </ResponsiveContainer>
                                  </div>
                                </div>
                                <div className="mt-4 flex items-center justify-between pt-6 border-t border-slate-50">
                                   <span className="text-[10px] font-black uppercase text-slate-400">Avg Compliance</span>
                                   <span className="text-xl font-black text-blue-600">{Math.round(radarData.reduce((acc, d) => acc + d.A, 0) / radarData.length)}%</span>
                                </div>
                             </div>
                          </div>
                       </div>

                       <div className="xl:col-span-4 min-w-[260px]">
                          <section className="bg-slate-900 text-white p-4 md:p-5 rounded-[32px] h-full shadow-2xl relative overflow-hidden flex flex-col">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-[60px]" />
                            <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-8 flex items-center gap-2">
                               <Binary size={12} /> Technical Score
                            </div>
                            <div className="flex flex-col mb-8">
                               <div className="flex items-baseline gap-2 pr-2">
                                 <span className="text-7xl font-black italic tracking-tighter">{(insight as any).technicalAudit?.score || (insight as any).score || 0}</span>
                                 <span className="text-blue-400 text-lg font-bold">/100</span>
                               </div>
                               {auditEndTime && (
                                 <div className="text-[8px] font-black text-slate-500 uppercase mt-1">
                                   Verified: {new Date(auditEndTime).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                                 </div>
                               )}
                            </div>
                            <div className="space-y-4 mb-12 flex-1">
                              {(insight.technicalAudit?.findings || []).map((f: string, i: number) => (
                                <div key={i} className="flex gap-3 items-start group/finding p-2 rounded-2xl hover:bg-white/5 transition-colors">
                                  <div className="shrink-0 w-5 h-5 bg-blue-500/20 rounded-lg flex items-center justify-center text-blue-400">
                                     <span className="text-[10px] font-black">{i + 1}</span>
                                  </div>
                                  <p className="text-xs font-semibold text-slate-300 leading-snug flex-1 min-w-0 break-words">{f}</p>
                                </div>
                              ))}
                            </div>
                            <div className="bg-white/5 p-6 rounded-3xl border border-white/5 backdrop-blur-sm">
                               <div className="text-[8px] font-black text-blue-400 uppercase tracking-widest mb-2">Priority Vector</div>
                               <p className="text-xs font-bold leading-relaxed text-slate-100 italic">"{insight.technicalAudit?.recommendation || 'Recommendation pending recalibration.'}"</p>
                            </div>
                          </section>
                       </div>
                    </div>
                  ) : insight ? (
                    <div className="bg-white border border-slate-200 p-8 md:p-12 rounded-[48px] shadow-sm">
                      <div className="flex items-center gap-3 mb-6">
                        <AlertCircle className="text-amber-500" size={20} />
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Raw Neural Output</div>
                      </div>
                      <div className="prose prose-slate max-w-none">
                        <ReactMarkdown>{typeof insight === 'string' ? insight : JSON.stringify(insight, null, 2)}</ReactMarkdown>
                      </div>
                      <button 
                        onClick={onRetry}
                        className="mt-8 flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20"
                      >
                        <RefreshCw size={16} /> Re-analyze Data
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-32 text-center">
                       <BrainCircuit size={48} className="text-slate-200 mb-4" />
                       <h4 className="text-xl font-black text-slate-400 uppercase tracking-tighter">No Analysis Syncronized</h4>
                       <p className="text-slate-400 text-sm mt-2 max-w-sm">Initialization of the neural engine is required. Please trigger a re-analysis of the audit data.</p>
                       <button 
                        onClick={onRetry}
                        className="mt-8 flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all"
                      >
                        <Target size={16} /> Initialize AI Analysis
                      </button>
                    </div>
                  )}

                  {isData && typeof insight === 'object' && (
                    <React.Fragment>
                      <div className="space-y-8 md:space-y-12 mb-12">
                       <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                         <div>
                           <h4 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3 italic">
                             Neural Execution Roadmap
                             <div className="px-3 py-1 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase">Cycle 1</div>
                           </h4>
                           <p className="text-sm text-slate-400 font-bold uppercase tracking-widest mt-2">{(insight.criticalRoadmap || []).length} Tactical Priorities Identified</p>
                         </div>
                       </div>
                       <div className="grid grid-cols-1 gap-6">
                        {(insight.criticalRoadmap || []).map((item: any, index: number) => (
                          <RoadmapItem key={index} item={item} index={index} />
                        ))}
                       </div>
                    </div>

                    {insight.detailedActionPlan && (
                      <div className="space-y-12">
                        <div className="flex items-center gap-4">
                           <h4 className="text-2xl font-black text-slate-900 tracking-tight italic uppercase">Neural Strategic Deployment</h4>
                           <div className="h-[1px] flex-1 bg-slate-200" />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                           <div className="space-y-6">
                              <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600"><Code size={20} /></div>
                                 <span className="text-xs font-black uppercase tracking-widest text-slate-400">Technical Ops</span>
                              </div>
                              <div className="space-y-3">
                                 {(insight.detailedActionPlan?.technical || []).map((t, i) => (
                                   <div key={i} className="flex gap-3 text-xs text-slate-600 font-medium bg-white p-4 rounded-[24px] border border-slate-100 shadow-sm leading-relaxed">
                                      <span className="text-blue-500 font-black shrink-0">{i+1}.</span>
                                      {t}
                                   </div>
                                 ))}
                              </div>
                           </div>
                           <div className="space-y-6">
                              <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600"><FileText size={20} /></div>
                                 <span className="text-xs font-black uppercase tracking-widest text-slate-400">Content Ops</span>
                              </div>
                              <div className="space-y-3">
                                 {(insight.detailedActionPlan?.content || []).map((t, i) => (
                                   <div key={i} className="flex gap-3 text-xs text-slate-600 font-medium bg-white p-4 rounded-[24px] border border-slate-100 shadow-sm leading-relaxed">
                                      <span className="text-emerald-500 font-black shrink-0">{i+1}.</span>
                                      {t}
                                   </div>
                                 ))}
                              </div>
                           </div>
                           <div className="space-y-6">
                              <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600"><Activity size={20} /></div>
                                 <span className="text-xs font-black uppercase tracking-widest text-slate-400">UX Velocity</span>
                              </div>
                              <div className="space-y-3">
                                 {(insight.detailedActionPlan?.ux || []).map((t, i) => (
                                   <div key={i} className="flex gap-3 text-xs text-slate-600 font-medium bg-white p-4 rounded-[24px] border border-slate-100 shadow-sm leading-relaxed">
                                      <span className="text-amber-500 font-black shrink-0">{i+1}.</span>
                                      {t}
                                   </div>
                                 ))}
                              </div>
                           </div>
                        </div>
                      </div>
                    )}

                    {insight.fullReport?.priorityActionPlan && (
                      <div className="bg-slate-900 rounded-[64px] p-12 text-white relative overflow-hidden">
                         <div className="absolute top-0 right-0 p-12 opacity-5"><BrainCircuit size={300} /></div>
                         <div className="relative z-10">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                               <div>
                                  <div className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em] mb-4">Complete Neural Audit</div>
                                  <h4 className="text-4xl font-black italic tracking-tighter">Full Priority Roadmap</h4>
                               </div>
                               <div className="text-right">
                                  <div className="text-7xl font-black italic text-white/10">{(insight.fullReport?.priorityActionPlan || []).length}</div>
                                  <div className="text-[10px] font-black uppercase tracking-widest text-blue-400 -mt-4">Total Actions</div>
                               </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                               {(insight.fullReport?.priorityActionPlan || []).map((p: any, i: number) => (
                                 <div key={i} className="bg-white/5 border border-white/10 p-6 rounded-[32px] flex items-center justify-between group hover:bg-white/10 transition-all">
                                    <div className="flex items-center gap-4">
                                       <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center font-black text-blue-400">{p.id}</div>
                                       <div>
                                          <div className="text-sm font-black text-white">{p.action}</div>
                                          <div className="text-[8px] font-black uppercase text-slate-500 tracking-widest mt-1">Impact: {p.impact} | Effort: {p.effort}</div>
                                       </div>
                                    </div>
                                 </div>
                               ))}
                            </div>
                         </div>
                      </div>
                    )}

                    {insight.fullReport?.criticalIssues && (
                      <div className="space-y-8 mt-12">
                         <div className="flex items-center gap-3">
                            <h3 className="text-xl font-black text-rose-600 uppercase tracking-tight italic flex items-center gap-2">
                               <AlertCircle size={20} /> Critical Node Failures
                            </h3>
                            <div className="h-[1px] flex-1 bg-rose-100" />
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {insight.fullReport.criticalIssues.map((issue: any, i: number) => (
                              <div key={i} className="bg-rose-50 border border-rose-100 rounded-[32px] p-8 relative overflow-hidden group">
                                 <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform">
                                    <AlertCircle size={80} />
                                 </div>
                                 <div className="relative z-10">
                                    <div className="text-[10px] font-mono text-rose-400 break-all mb-4 uppercase">{issue.url}</div>
                                    <h5 className="text-xl font-black text-rose-900 mb-2">{issue.issue}</h5>
                                    <div className="space-y-4 text-sm font-medium text-rose-700/80">
                                       <p className="leading-relaxed"><strong className="text-rose-900 uppercase text-[10px]">Context:</strong> {issue.why}</p>
                                       <p className="leading-relaxed bg-white/50 p-4 rounded-2xl border border-rose-200/50"><strong className="text-rose-900 uppercase text-[10px]">Deployment:</strong> {issue.howToFix}</p>
                                    </div>
                                 </div>
                              </div>
                            ))}
                         </div>
                      </div>
                    )}

                    {(insight.fullReport?.highPriority || insight.fullReport?.quickWins) && (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12">
                         {insight.fullReport?.highPriority && (
                           <div className="space-y-8">
                              <div className="flex items-center gap-3">
                                 <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight italic">High Priority</h3>
                                 <div className="h-[1px] flex-1 bg-slate-200" />
                              </div>
                              <div className="space-y-4">
                                 {insight.fullReport.highPriority.map((item: any, i: number) => (
                                   <div key={i} className="bg-white border border-slate-200 p-6 rounded-[32px] shadow-sm">
                                      <div className="text-[9px] font-mono text-slate-400 mb-2 break-all">{item.url}</div>
                                      <h6 className="font-bold text-slate-900 mb-1">{item.issue}</h6>
                                      <p className="text-xs text-slate-500 leading-relaxed italic">"{item.howToFix}"</p>
                                   </div>
                                 ))}
                              </div>
                           </div>
                         )}

                         {insight.fullReport?.quickWins && (
                           <div className="space-y-8">
                              <div className="flex items-center gap-3">
                                 <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight italic">Quick Wins</h3>
                                 <div className="h-[1px] flex-1 bg-slate-200" />
                              </div>
                              <div className="grid grid-cols-1 gap-3">
                                 {insight.fullReport.quickWins.map((win: string, i: number) => (
                                   <div key={i} className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600"><CheckCircle2 size={16} /></div>
                                      <span className="text-xs font-bold text-emerald-900 uppercase tracking-tight">{win}</span>
                                   </div>
                                 ))}
                              </div>
                           </div>
                         )}
                      </div>
                    )}

                    {insight.fullReport?.pageSummary && (

                      <div className="space-y-8 mt-12 mb-12">
                         <div className="flex items-center gap-3">
                            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight italic">Page-by-Page Neural Summary</h3>
                            <div className="h-[1px] flex-1 bg-slate-200" />
                         </div>
                         <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                            {insight.fullReport.pageSummary.map((p: any, i: number) => (
                              <div key={i} className="bg-white border border-slate-200 rounded-[32px] p-6 shadow-sm hover:shadow-xl transition-all group flex flex-col justify-between h-full">
                  <div className="flex justify-between items-center gap-4 mb-4">
                     <div className="text-[10px] font-mono text-slate-400 break-all line-clamp-2 flex-1 group-hover:text-blue-500 transition-colors uppercase leading-tight">{p.url}</div>
                     <div className={cn(
                       "w-10 h-10 shrink-0 rounded-2xl flex items-center justify-center text-[10px] font-black border-2",
                                      p.score > 80 ? "border-emerald-100 text-emerald-600 bg-emerald-50" :
                                      p.score > 50 ? "border-amber-100 text-amber-600 bg-amber-50" :
                                      "border-rose-100 text-rose-600 bg-rose-50"
                                    )}>
                                      {p.score}
                                    </div>
                                 </div>
                                 <div>
                                    <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                       <Activity size={10} className="text-blue-500" /> Primary Obstacle
                                    </div>
                                    <p className="text-[11px] font-bold text-slate-900 leading-tight line-clamp-2 italic">"{p.topIssue}"</p>
                                 </div>
                              </div>
                            ))}
                         </div>
                      </div>
                    )}
                    </React.Fragment>
                  )}
                </React.Fragment>
              )}
            </motion.div>
          )}

          {activeSubTab === 'network' && (
            <motion.div 
              key="network"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="space-y-8"
            >
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <SemanticNeuralGraph 
                    title="Authority Clusters" 
                    subtitle="Interconnected Content Silos" 
                    items={isData && typeof insight === 'object' && insight.semanticClusterAnalysis ? insight.semanticClusterAnalysis.topEntities : ['Node Alpha', 'Node Beta', 'Node Gamma', 'Node Delta']} 
                  />
                  
                  <div className="bg-white border border-slate-200 rounded-[48px] p-8 shadow-sm flex flex-col h-[450px]">
                    <div className="flex items-center justify-between mb-8">
                       <div>
                         <h4 className="text-slate-900 font-black text-sm uppercase tracking-tight">Internal Link Trajectory</h4>
                         <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Weight Distribution Map</p>
                       </div>
                       <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
                          <Layers size={20} />
                       </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
                       {(stats?.topInternalPages || []).map((p, i) => (
                         <div key={i} className="p-4 bg-slate-50 border border-slate-100 rounded-3xl hover:border-indigo-300 transition-colors group">
                            <div className="flex justify-between items-center mb-2">
                               <span className="text-[10px] font-mono text-slate-500 truncate max-w-[200px]">{p.url}</span>
                               <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">Rank {i + 1}</span>
                            </div>
                            <div className="flex items-center gap-3">
                               <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(p.count / (stats?.totalLinks || 1)) * 1000}%` }}
                                    className="h-full bg-indigo-500"
                                  />
                               </div>
                               <span className="text-[11px] font-black text-slate-900">{p.count} Internal Links</span>
                            </div>
                         </div>
                       ))}
                       {(stats?.topInternalPages || []).length === 0 && (
                          <div className="h-full flex flex-col items-center justify-center text-center opacity-30 gap-3">
                             <Compass size={40} />
                             <p className="text-xs font-bold uppercase tracking-widest">Map Analysis Pending</p>
                          </div>
                       )}
                    </div>
                  </div>
               </div>

               <div className="bg-slate-900 rounded-[48px] p-8 md:p-12 text-white overflow-hidden relative">
                  <div className="absolute right-0 bottom-0 opacity-10 blur-2xl">
                     <Target size={300} />
                  </div>
                  <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                     <div>
                        <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-blue-400 mb-8">
                           <BrainCircuit size={24} />
                        </div>
                        <h4 className="text-3xl font-black tracking-tight mb-6 italic">Neural Link Prediction</h4>
                        <p className="text-slate-400 leading-relaxed mb-8">Based on the current authority map, these pages are likely to suffer from 'Orphan' status or over-saturation. Our AI recommends shifting link weight to improve indexation efficiency.</p>
                        <div className="flex gap-4">
                           <div className="p-4 bg-white/5 rounded-3xl border border-white/10 flex-1">
                              <span className="text-[8px] font-black text-rose-400 uppercase tracking-widest block mb-2">High Risk Pages</span>
                              <span className="text-2xl font-black">{Math.floor(pages.length * 0.15)}</span>
                           </div>
                           <div className="p-4 bg-white/5 rounded-3xl border border-white/10 flex-1">
                              <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest block mb-2">Optimized Clusters</span>
                              <span className="text-2xl font-black">{Math.floor(pages.length * 0.65)}</span>
                           </div>
                        </div>
                     </div>
                     <div className="bg-white/5 rounded-[40px] p-8 border border-white/10 backdrop-blur-sm">
                        <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-6">Active Directives</div>
                        <div className="space-y-4">
                           {[
                             "Recalibrate internal anchor text for semantic parity",
                             "De-prioritize low-value boilerplate footer links",
                             "Implement hierarchical breadcrumb node injection",
                             "Cross-link isolated content clusters manually"
                           ].map((d, i) => (
                             <div key={i} className="flex gap-3 items-center">
                                <div className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                                   <span className="text-[10px] font-black">{i + 1}</span>
                                </div>
                                <p className="text-sm font-medium text-slate-300">{d}</p>
                             </div>
                           ))}
                        </div>
                     </div>
                  </div>
               </div>
            </motion.div>
          )}

          {activeSubTab === 'entities' && (
            <motion.div 
              key="entities"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm">
                     <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Total Entities</div>
                     <div className="text-4xl font-black text-slate-900 italic">{(stats?.topKeywords || []).length}</div>
                     <div className="mt-4 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full inline-block">Site-Wide Detection</div>
                  </div>
                  <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm">
                     <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Semantic Gaps</div>
                     <div className="text-4xl font-black text-slate-900 italic">{(stats?.keywordGaps || []).length}</div>
                     <div className="mt-4 text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full inline-block">Urgent Attention</div>
                  </div>
                  <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm">
                     <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Entity Density</div>
                     <div className="text-4xl font-black text-slate-900 italic">{((stats?.topKeywords || []).length / Math.max(1, pages.length)).toFixed(1)}</div>
                     <div className="mt-4 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full inline-block">Avg Per Page</div>
                  </div>
                  <div className="bg-white p-8 rounded-[40px] border border-slate-200 shadow-sm">
                     <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Brand Authority</div>
                     <div className="text-4xl font-black text-slate-900 italic">88%</div>
                     <div className="mt-4 text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full inline-block">Projected</div>
                  </div>
               </div>

               <section className="bg-white border border-slate-200 p-8 md:p-12 rounded-[48px] shadow-sm">
                  <div className="flex items-center justify-between mb-12">
                     <div>
                       <h4 className="text-2xl font-black text-slate-900 tracking-tight italic">Top Performing Keywords</h4>
                       <p className="text-sm text-slate-400 font-bold uppercase tracking-widest mt-1">Density & prevalence across identified nodes</p>
                     </div>
                     <button className="px-6 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all">Download Dataset</button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                     {(stats?.topKeywords || []).map((k, i) => (
                       <div key={i} className="p-6 bg-slate-50 border border-slate-100 rounded-3xl hover:shadow-lg hover:shadow-slate-200/50 transition-all group">
                          <div className="flex justify-between items-start mb-4">
                             <div className="flex flex-col min-w-0 mr-2 flex-1">
                                <div className="px-3 py-1 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-800 group-hover:border-blue-500 transition-colors uppercase truncate" title={k.word}>{k.word}</div>
                                <span className="text-[8px] font-black text-blue-500 uppercase mt-1">Density: {k.density}%</span>
                             </div>
                             <span className="text-[10px] font-black text-slate-400">#{i + 1}</span>
                          </div>
                          <div className="space-y-4">
                             <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                <span className="text-slate-400">Prevalence</span>
                                <span className="text-slate-900">{k.count} Pages</span>
                             </div>
                             <div className="h-1 w-full bg-slate-200 rounded-full overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${(k.count / pages.length) * 100}%` }}
                                  className="h-full bg-blue-500"
                                />
                             </div>
                          </div>
                       </div>
                     ))}
                  </div>
               </section>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="bg-white border border-slate-200 rounded-[40px] p-8 shadow-sm">
                     <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Sentiment Spectrum</h5>
                     <div className="flex items-center gap-4">
                        <div className="flex-1 space-y-4">
                           {[
                             { label: 'Positive', count: stats?.sentimentTrend?.positive || 0, color: 'bg-emerald-500' },
                             { label: 'Neutral', count: stats?.sentimentTrend?.neutral || 0, color: 'bg-slate-300' },
                             { label: 'Negative', count: stats?.sentimentTrend?.negative || 0, color: 'bg-rose-500' }
                           ].map((s, i) => (
                             <div key={i} className="group/s">
                                <div className="flex justify-between text-[8px] font-black uppercase mb-1">
                                   <span>{s.label}</span>
                                   <span>{s.count}</span>
                                </div>
                                <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                                   <motion.div 
                                     initial={{ width: 0 }} 
                                     animate={{ width: stats?.totalPages ? `${(s.count / stats.totalPages) * 100}%` : '0%' }} 
                                     className={cn("h-full", s.color)} 
                                   />
                                </div>
                             </div>
                           ))}
                        </div>
                     </div>
                  </div>

                  <div className="md:col-span-2 bg-indigo-900 rounded-[40px] p-8 text-white relative overflow-hidden">
                     <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl" />
                     <div className="relative z-10">
                        <h5 className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-4 italic">Core Knowledge Domains</h5>
                        <div className="flex flex-wrap gap-2">
                           {(isData && insight.semanticClusterAnalysis?.topEntities ? insight.semanticClusterAnalysis.topEntities : (stats?.topicalClusters?.map(c => c.cluster) || [])).map((entity: any, i: number) => (
                             <div key={i} className="px-4 py-2 bg-white/10 border border-white/10 rounded-xl text-[10px] font-bold uppercase tracking-tight backdrop-blur-sm">
                                {entity}
                             </div>
                           ))}
                           {!(isData && insight.semanticClusterAnalysis?.topEntities) && (stats?.topicalClusters || []).length === 0 && (
                             <span className="text-xs italic opacity-50">Mapping semantic nodes...</span>
                           )}
                        </div>
                     </div>
                  </div>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-rose-50 border border-rose-100 rounded-[48px] p-8 md:p-12 relative overflow-hidden group">
                     <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                        <AlertCircle size={100} />
                     </div>
                     <div className="relative z-10">
                        <h4 className="text-2xl font-black text-rose-900 tracking-tight italic mb-6">Semantic Gaps Detected</h4>
                        <p className="text-rose-700/70 text-sm font-medium leading-relaxed mb-8">Pages are missing critical contextual entities that competitors likely use to establish topical authority. Prioritize these for content expansion.</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                           {((stats && stats.keywordGaps && stats.keywordGaps.length > 0) ? stats.keywordGaps : (insight && typeof insight === 'object' && insight.semanticClusterAnalysis ? insight.semanticClusterAnalysis.contentGaps : ['Niche Authority', 'Conversion Tactics', 'Schema Depth', 'User Intent Sync'])).map((gap: string, i: number) => (
                             <div key={i} className="bg-white/60 p-4 rounded-2xl border border-rose-100 flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-rose-500" />
                                <span className="text-xs font-black text-rose-900 uppercase tracking-tight">{gap}</span>
                             </div>
                           ))}
                        </div>
                     </div>
                  </div>

                  <div className={cn("border rounded-[48px] p-8 md:p-12 relative overflow-hidden group", 
                    (stats?.topKeywords || []).some(k => (k.density || 0) > 3.5) ? "bg-rose-50 border-rose-100" : "bg-emerald-50 border-emerald-100"
                  )}>
                     <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                        <Zap size={100} />
                     </div>
                     <div className="relative z-10">
                        <h4 className={cn("text-2xl font-black tracking-tight italic mb-6", 
                          (stats?.topKeywords || []).some(k => (k.density || 0) > 3.5) ? "text-rose-900" : "text-emerald-900"
                        )}>Keyword Density Alerts</h4>
                        <p className={cn("text-sm font-medium leading-relaxed mb-8",
                          (stats?.topKeywords || []).some(k => (k.density || 0) > 3.5) ? "text-rose-700/70" : "text-emerald-700/70"
                        )}>
                          {(stats?.topKeywords || []).some(k => (k.density || 0) > 3.5) 
                            ? "Over-optimization detected. Some core keywords exceed safe algorithmic limits, increasing the risk of keyword stuffing penalties."
                            : "Optimization levels are currently within safe algorithmic boundaries. No over-optimization spikes detected across the cluster."}
                        </p>
                        <div className="space-y-4">
                           <div className={cn("flex justify-between items-end border-b pb-2", 
                              (stats?.topKeywords || []).some(k => (k.density || 0) > 3.5) ? "border-rose-200" : "border-emerald-200"
                           )}>
                              <span className={cn("text-[10px] font-black uppercase",
                                (stats?.topKeywords || []).some(k => (k.density || 0) > 3.5) ? "text-rose-800" : "text-emerald-800"
                              )}>AVG Density</span>
                              <span className={cn("text-xl font-black",
                                (stats?.topKeywords || []).some(k => (k.density || 0) > 3.5) ? "text-rose-600" : "text-emerald-600"
                              )}>
                                {stats?.topKeywords && stats.topKeywords.length > 0 
                                  ? (stats.topKeywords.reduce((a, b) => a + (b.density || 0), 0) / stats.topKeywords.length).toFixed(1) 
                                  : '0.0'}%
                              </span>
                           </div>
                           <div className={cn("flex justify-between items-end border-b pb-2",
                              (stats?.topKeywords || []).some(k => (k.density || 0) > 3.5) ? "border-rose-200" : "border-emerald-200"
                           )}>
                              <span className={cn("text-[10px] font-black uppercase",
                                (stats?.topKeywords || []).some(k => (k.density || 0) > 3.5) ? "text-rose-800" : "text-emerald-800"
                              )}>Max Threshold Hit</span>
                              <span className={cn("text-xl font-black",
                                (stats?.topKeywords || []).some(k => (k.density || 0) > 3.5) ? "text-rose-600" : "text-emerald-600"
                              )}>
                                {stats?.topKeywords && stats.topKeywords.length > 0 
                                  ? Math.max(...stats.topKeywords.map(k => k.density || 0)).toFixed(1)
                                  : '0.0'}%
                              </span>
                           </div>
                           <div className="flex justify-between items-end">
                              <span className={cn("text-[10px] font-black uppercase",
                                (stats?.topKeywords || []).some(k => (k.density || 0) > 3.5) ? "text-rose-800" : "text-emerald-800"
                              )}>Keyword Stuffing Risk</span>
                              <span className={cn("text-xl font-black",
                                (stats?.topKeywords || []).some(k => (k.density || 0) > 3.5) ? "text-rose-600" : "text-emerald-600"
                              )}>
                                {(stats?.topKeywords || []).some(k => (k.density || 0) > 3.5) ? "HIGH" : "LOW"}
                              </span>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            </motion.div>
          )}
          {activeSubTab === 'geo' && (
            <motion.div 
              key="geo"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-12"
            >
              {/* Interactive GEO Audit Tool */}
              <div className="bg-white border border-blue-200 rounded-[48px] p-8 md:p-12 shadow-xl shadow-blue-500/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                  <MonitorCheck size={200} className="rotate-12" />
                </div>
                
                <div className="relative z-10">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                    <div>
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest mb-4 shadow-lg shadow-blue-500/20">
                        <Activity size={12} /> Dynamic Audit
                      </div>
                      <h3 className="text-3xl font-black text-slate-900 tracking-tighter italic uppercase">GEO Audit Command Center</h3>
                      <p className="text-slate-400 text-sm font-medium mt-2">Dynamic assessment of your brand visibility across generative engines to calibrate AI strategies.</p>
                      
                      <div className="mt-4 flex gap-2">
                        <button 
                          onClick={autoCalibrate}
                          disabled={isAutoCalibrating || pages.length === 0}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2"
                        >
                          {isAutoCalibrating ? <RefreshCw size={12} className="animate-spin" /> : <MonitorCheck size={12} />}
                          {isAutoCalibrating ? 'Scanning Nodes...' : 'Auto-Calibrate from Audit'}
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      {AI_ENGINES.map(engine => (
                        <button
                          key={engine.id}
                          onClick={() => setSelectedEngines(prev => prev.includes(engine.id) ? prev.filter(e => e !== engine.id) : [...prev, engine.id])}
                          className={cn(
                            "w-12 h-12 rounded-2xl flex items-center justify-center text-[10px] font-black transition-all border-2",
                            selectedEngines.includes(engine.id) 
                              ? "bg-slate-900 border-slate-900 text-white shadow-xl translate-y-[-4px]" 
                              : "bg-white border-slate-200 text-slate-400 hover:border-slate-300"
                          )}
                        >
                          {engine.icon}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {GEO_DIMENSIONS.map(dim => (
                        <div key={dim.id} className="space-y-3 p-4 bg-white border border-slate-100 rounded-2xl group hover:border-blue-300 transition-all shadow-sm hover:shadow-md">
                          <div className="flex justify-between items-center">
                            <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest truncate mr-2">{dim.name}</label>
                            <span className={cn(
                              "text-sm font-black font-mono italic",
                              geoRatings[dim.id] < 40 ? "text-rose-600" : 
                              geoRatings[dim.id] < 75 ? "text-amber-600" : "text-emerald-600"
                            )}>
                              {geoRatings[dim.id]}%
                            </span>
                          </div>
                          <input 
                            type="range"
                            min="0"
                            max="100"
                            value={geoRatings[dim.id]}
                            onChange={(e) => setGeoRatings(prev => ({ ...prev, [dim.id]: parseInt(e.target.value) }))}
                            className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                          />
                        </div>
                      ))}
                    </div>
                    
                    <div className="lg:col-span-1 bg-slate-900 rounded-[40px] p-6 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center min-h-[450px]">
                       <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent)]" />
                       <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-4 relative z-10">Live Neural Calibration</h4>
                       <div className="w-full h-full flex-grow relative z-10">
                          <ResponsiveContainer width="100%" height="100%">
                             <RadarChart cx="50%" cy="50%" outerRadius="60%" data={GEO_DIMENSIONS.map(d => ({ name: d.name, score: geoRatings[d.id] }))}>
                                <CustomRadarBackground />
                                <PolarGrid gridType="circle" stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                                <PolarAngleAxis dataKey="name" tick={{ fontSize: 7, fontWeight: 700, fill: '#94a3b8' }} />
                                <Radar
                                  name="Score"
                                  dataKey="score"
                                  stroke="#10b981"
                                  fill="#10b981"
                                  fillOpacity={0.15}
                                  dot={<RadarDot dataKey="score" />}
                                  activeDot={{ r: 6 }}
                                />
                             </RadarChart>
                          </ResponsiveContainer>
                       </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap justify-center gap-4">
                    <button 
                      onClick={calculateGeoScore}
                      disabled={isGeoCalculating || selectedEngines.length === 0}
                      className={cn(
                        "group relative px-10 py-5 bg-blue-600 text-white rounded-[24px] font-black uppercase text-sm tracking-widest flex items-center gap-3 shadow-2xl shadow-blue-500/30 transition-all active:scale-95",
                        (isGeoCalculating || selectedEngines.length === 0) ? "opacity-50 grayscale cursor-not-allowed" : "hover:bg-blue-700 hover:translate-y-[-2px]"
                      )}
                    >
                      {isGeoCalculating ? (
                        <>
                          <RefreshCw className="animate-spin" size={20} />
                          <span>Processing Dimensions...</span>
                        </>
                      ) : (
                        <>
                          <Zap size={20} className="group-hover:animate-pulse" />
                          <span>Calculate GEO Score</span>
                        </>
                      )}
                    </button>
                    
                    <button
                      onClick={() => generateGEOAuditChecklistPDF(url, customGeoResult)}
                      className="group relative px-6 py-5 bg-slate-900 text-white rounded-[24px] font-black uppercase text-sm tracking-widest flex items-center gap-3 shadow-xl transition-all hover:bg-slate-800 hover:translate-y-[-2px]"
                    >
                      <Download size={20} className="group-hover:-translate-y-1 transition-transform" />
                      <span>Download GEO Action Plan (PDF)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* GEO Audit Results */}
              <AnimatePresence>
                {customGeoResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-1 lg:grid-cols-12 gap-8"
                  >
                    <div className="lg:col-span-4 space-y-8">
                       <div className="bg-slate-900 rounded-[48px] p-10 text-white relative overflow-hidden shadow-2xl">
                          <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none transform -rotate-12">
                             <TrendingUp size={240} />
                          </div>
                          <div className="relative z-10">
                             <div className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em] mb-10">Brand Visibility Score (BVS)</div>
                             <div className="flex items-baseline gap-2 mb-10">
                                <motion.span 
                                  key={currentBVS}
                                  initial={{ opacity: 0.5, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  className="text-8xl font-black italic tracking-tighter shadow-blue-500/20"
                                >
                                  {currentBVS}
                                </motion.span>
                                <span className="text-blue-400 text-2xl font-bold">/100</span>
                             </div>
                             <p className="text-slate-400 text-xs font-semibold leading-relaxed mb-10 uppercase tracking-wide">
                                Composite index calculated across {customGeoResult.engines.length} AI engines and 6 visibility dimensions.
                             </p>
                             
                             <div className="space-y-4">
                               <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/10">
                                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                                     <BarChart3 size={20} />
                                  </div>
                                  <div>
                                     <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Confidence Level</div>
                                     <div className="text-xs font-black uppercase">Standard {customGeoResult.bvs > 70 ? 'Optimal' : 'Calibrating'}</div>
                                  </div>
                               </div>
                             </div>
                          </div>
                       </div>
                       
                       <div className="bg-white border border-slate-200 rounded-[40px] p-8 shadow-sm relative overflow-hidden">
                          <div className="absolute inset-0 bg-[#f8fafc] opacity-50 pointer-events-none" />
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8 relative z-10">Dimension Breakdown</h4>
                          <div className="h-[420px] relative z-10">
                            <ResponsiveContainer width="100%" height="100%">
                               <RadarChart cx="50%" cy="50%" outerRadius="62%" data={GEO_DIMENSIONS.map(d => ({ name: d.name, score: geoRatings[d.id] }))}>
                                  <CustomRadarBackground />
                                  <PolarGrid gridType="circle" stroke="#e2e8f0" strokeDasharray="3 3" />
                                  <PolarAngleAxis 
                                    dataKey="name" 
                                    tick={{ fontSize: 7, fontWeight: 700, fill: '#475569' }}
                                  />
                                  <Radar
                                    name="Score"
                                    dataKey="score"
                                    stroke="#0d9488"
                                    fill="#0d9488"
                                    fillOpacity={0.15}
                                    dot={<RadarDot dataKey="score" />}
                                    activeDot={{ r: 5 }}
                                  />
                               </RadarChart>
                            </ResponsiveContainer>
                          </div>
                       </div>
                    </div>

                    <div className="lg:col-span-8 space-y-8">
                       <div className="bg-white border border-slate-200 rounded-[48px] p-10 shadow-sm">
                          <div className="flex items-center gap-3 mb-10">
                             <div className="p-3 bg-blue-100 rounded-2xl text-blue-600"><CheckCircle2 size={24} /></div>
                             <h4 className="text-2xl font-black text-slate-900 tracking-tight italic uppercase">Prioritized GEO Directives</h4>
                          </div>

                          <div className="space-y-6">
                             {customGeoResult.recommendations.map((rec, i) => (
                               <div key={i} className="p-8 bg-slate-50 border border-slate-100 rounded-[32px] relative overflow-hidden group hover:border-blue-300 transition-all">
                                  <div className={cn(
                                    "absolute top-0 right-0 px-4 py-2 text-[8px] font-black uppercase tracking-widest rounded-bl-2xl",
                                    rec.priority === 'Critical' || rec.priority === 'High' ? "bg-rose-500 text-white" :
                                    rec.priority === 'Medium' ? "bg-amber-500 text-white" :
                                    "bg-blue-200 text-blue-700"
                                  )}>
                                     Priority: {rec.priority}
                                  </div>
                                  <h5 className="text-xl font-black text-slate-900 mb-4 tracking-tight">{rec.title}</h5>
                                  <p className="text-sm text-slate-600 font-medium leading-relaxed mb-6">{rec.description}</p>
                                  
                                  {rec.findings && (
                                    <div className="mb-6 p-4 bg-blue-50/50 border border-blue-100 rounded-2xl flex gap-3 items-start">
                                      <Activity className="shrink-0 text-blue-500 mt-0.5" size={16} />
                                      <div>
                                        <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1.5">Live Audit Findings</div>
                                        <p className="text-sm text-slate-700 font-medium">{rec.findings}</p>
                                      </div>
                                    </div>
                                  )}
                                  
                                  {Array.isArray(rec.actionItems) && rec.actionItems.length > 0 && (
                                    <div className="space-y-3 mt-6 pt-6 border-t border-slate-200">
                                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Specific action items:</div>
                                      {rec.actionItems.map((item, j) => {
                                        const isNote = item.startsWith("NOTE:");
                                        return (
                                          <div key={j} className={cn("flex items-start gap-3", isNote ? "mt-5" : "")}>
                                             {!isNote && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0" />}
                                             <p className={cn(
                                               "text-sm font-medium leading-relaxed",
                                               isNote ? "italic text-slate-500" : "text-slate-700"
                                             )}>{item.replace(/^NOTE?:\s*/, "")}</p>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                               </div>
                             ))}
                          </div>
                       </div>

                       <div className="bg-blue-600 rounded-[48px] p-10 text-white grid grid-cols-1 md:grid-cols-2 gap-10">
                          {customGeoResult.dimensions.slice(0, 4).map((dim, i) => (
                             <div key={i} className="space-y-2">
                                <div className="text-[10px] font-black text-blue-200 uppercase tracking-widest">{dim.name}</div>
                                <p className="text-sm font-bold opacity-90 italic">"{dim.description}"</p>
                                <div className="h-1 w-24 bg-white/20 rounded-full mt-4">
                                   <div className="h-full bg-white rounded-full" style={{ width: `${dim.score}%` }} />
                                </div>
                             </div>
                          ))}
                       </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

               <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-1 bg-slate-900 rounded-[48px] p-10 text-white relative overflow-hidden shadow-2xl">
                     <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-[60px]" />
                     <div className="relative z-10">
                        <div className="text-[10px] font-black text-blue-400 uppercase tracking-[0.4em] mb-8">AI Recognition Index</div>
                        <div className="flex items-baseline gap-2 mb-8">
                           <span className="text-7xl font-black italic tracking-tighter">{stats?.aiRecognitionScore || 0}</span>
                           <span className="text-blue-400 text-lg font-bold">/100</span>
                        </div>
                        <p className="text-slate-400 text-sm leading-relaxed mb-12">Measures how well LLMs (GPT-4, Gemini, Claude) can identify, summarize, and attribute your content based on structural clarity.</p>
                        
                        <div className="space-y-6">
                           <div>
                              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                                 <span>Positive Sentiment</span>
                                 <span>{stats?.sentimentTrend ? Math.round((stats.sentimentTrend.positive / stats.totalPages) * 100) : 0}%</span>
                              </div>
                              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                 <motion.div initial={{ width: 0 }} animate={{ width: stats?.sentimentTrend ? `${(stats.sentimentTrend.positive / stats.totalPages) * 100}%` : '0%' }} className="h-full bg-emerald-500" />
                              </div>
                           </div>
                           <div>
                              <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                                 <span>Semantic Recall</span>
                                 <span>{stats?.aiRecognitionScore || 0}%</span>
                              </div>
                              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                 <motion.div initial={{ width: 0 }} animate={{ width: `${stats?.aiRecognitionScore || 0}%` }} className="h-full bg-blue-500" />
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="lg:col-span-2 space-y-8">
                     <div className="bg-white border border-slate-200 rounded-[48px] p-8 md:p-12 shadow-sm">
                        <h4 className="text-2xl font-black text-slate-900 tracking-tight italic mb-8">Topical Cluster Authority</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           {(stats?.topicalClusters || []).map((cluster, i) => (
                             <div key={i} className="p-5 bg-slate-50 border border-slate-100 rounded-3xl flex items-center justify-between group hover:border-blue-300 transition-all">
                                <div className="flex items-center gap-3">
                                   <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-blue-500 font-black">{i + 1}</div>
                                   <span className="text-sm font-black text-slate-700 uppercase">{cluster.cluster}</span>
                                </div>
                                <div className="text-right">
                                   <div className="text-[10px] font-black text-slate-400 uppercase">Weight</div>
                                   <div className="text-xs font-black text-blue-600">{Math.round((cluster.weight / stats!.totalPages) * 100)}%</div>
                                </div>
                             </div>
                           ))}
                           {(stats?.topicalClusters || []).length === 0 && (
                             <div className="col-span-2 py-12 text-center opacity-30 text-xs font-black uppercase tracking-widest italic">Analyzing topical nodes...</div>
                           )}
                        </div>
                     </div>
                  </div>
               </div>

               {isData && (insight as any).geoStrategy ? (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="bg-indigo-600 rounded-[48px] p-8 md:p-12 text-white relative overflow-hidden shadow-xl shadow-indigo-500/20">
                     <div className="absolute right-0 bottom-0 opacity-10 scale-[2] blur-xl">
                        <Sparkles size={200} />
                     </div>
                     <div className="relative z-10 max-w-3xl">
                        <div className="inline-block px-3 py-1 bg-white text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-6">Generative Engine Strategy</div>
                        <h4 className="text-2xl md:text-3xl font-black tracking-tight mb-6 italic">{(insight as any).geoStrategy.citationReadiness}</h4>
                        <p className="text-indigo-100/90 text-sm font-medium leading-relaxed mb-6">{(insight as any).geoStrategy.schemaEffectiveness}</p>
                        
                        <div className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mb-4">Actionable Fixes</div>
                        <div className="space-y-3">
                          {((insight as any).geoStrategy.actionableFixes || []).map((fix: string, idx: number) => (
                            <div key={idx} className="flex gap-3 items-center">
                              <div className="w-1.5 h-1.5 bg-white rounded-full" />
                              <span className="text-sm font-bold text-white uppercase tracking-tight">{fix}</span>
                            </div>
                          ))}
                        </div>
                     </div>
                   </div>

                   <div className="bg-white border border-slate-200 rounded-[48px] p-8 md:p-12 shadow-sm flex flex-col justify-center">
                      <div className="inline-block px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-[10px] font-black uppercase tracking-widest mb-6 w-max">Information Gain</div>
                      <h4 className="text-xl font-black text-slate-900 tracking-tight italic mb-6">Where to Add Unique Value</h4>
                      <div className="space-y-4">
                        {((insight as any).geoStrategy.informationGain || []).map((gain: string, idx: number) => (
                           <div key={idx} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                             <p className="text-sm font-medium text-slate-700">{gain}</p>
                           </div>
                        ))}
                      </div>
                   </div>
                 </div>
               ) : (
                 <div className="bg-blue-600 rounded-[48px] p-8 md:p-12 text-white relative overflow-hidden shadow-xl shadow-blue-500/20">
                    <div className="absolute right-0 bottom-0 opacity-10 scale-[2] blur-xl">
                       <Sparkles size={200} />
                    </div>
                    <div className="relative z-10 max-w-3xl">
                       <div className="inline-block px-3 py-1 bg-white text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest mb-6">Quantum GEO Prediction</div>
                       <h4 className="text-3xl md:text-4xl font-black tracking-tight mb-6 italic">Prepare for the "Searching-by-Answering" Era.</h4>
                       <p className="text-blue-100/80 text-lg font-medium leading-relaxed mb-8">Generated engines prioritize content that is not just 'relevant' but 'definitive'. Our models indicate that sites with high structured data coverage and conversational FAQ schemas receive 40% more citations in synthetic search results.</p>
                       <div className="flex flex-wrap gap-4">
                          <div className="px-6 py-3 bg-white/20 backdrop-blur-md rounded-2xl border border-white/20 font-black text-xs uppercase tracking-widest">Boost Fact Density</div>
                          <div className="px-6 py-3 bg-white/20 backdrop-blur-md rounded-2xl border border-white/20 font-black text-xs uppercase tracking-widest">Normalize Headings</div>
                          <div className="px-6 py-3 bg-white/20 backdrop-blur-md rounded-2xl border border-white/20 font-black text-xs uppercase tracking-widest">Clean Semantic Code</div>
                       </div>
                    </div>
                 </div>
               )}
            </motion.div>
          )}
        </AnimatePresence>

        {isData && typeof insight === 'object' && activeSubTab === 'strategy' && (
          <section className="mt-12 bg-white border border-slate-200 p-8 md:p-12 rounded-[48px] shadow-xl relative overflow-hidden animate-in fade-in slide-in-from-bottom-4">
            <div className="absolute top-0 right-0 p-8">
              <Compass className="text-slate-50 opacity-10 scale-[5]" size={48} />
            </div>
            <div className="flex flex-col md:flex-row justify-between gap-8 md:gap-12 relative z-10">
              <div className="flex-1 space-y-6">
                <div>
                  <div className="text-[10px] font-black text-blue-600 uppercase tracking-[0.4em] mb-4">Content Strategy Matrix</div>
                  <h4 className="text-2xl font-black text-slate-900 tracking-tight mb-2">Status Analysis</h4>
                  <div className="inline-block px-3 py-1 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase tracking-widest">{insight.contentStrategy.status}</div>
                </div>
                <div className="space-y-4">
                  {insight.contentStrategy.improvements.map((imp, i) => (
                      <div key={i} className="flex gap-3 items-center">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full ring-4 ring-blue-500/10" />
                        <span className="text-sm font-bold text-slate-600 uppercase tracking-tight">{imp}</span>
                      </div>
                  ))}
                </div>
              </div>
              <div className="flex-1 bg-slate-50 p-8 md:p-10 rounded-[40px] border border-slate-100 flex flex-col justify-center">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-white rounded-xl shadow-sm"><Zap className="text-amber-500" size={18} /></div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Suggested Meta Synthesis</span>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-1">
                        <span className="text-[8px] font-black text-slate-400 uppercase">Title Tag</span>
                        <p className="text-sm font-black text-blue-600 leading-tight">{insight.contentStrategy.suggestedMeta.title}</p>
                    </div>
                    <div className="space-y-1">
                        <span className="text-[8px] font-black text-slate-400 uppercase">Description</span>
                        <p className="text-xs font-medium text-slate-500 leading-relaxed italic line-clamp-3">"{insight.contentStrategy.suggestedMeta.description}"</p>
                    </div>
                  </div>
              </div>
            </div>
          </section>
        )}
      </div>

      {insight && (
        <div className="absolute -right-48 -bottom-48 w-1/2 h-1/2 border-[2px] border-blue-500/5 rounded-full animate-[spin_50s_linear_infinite] pointer-events-none" />
      )}
    </div>
  );
}
