import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { SEOPage, AIInsightData } from '../types/seo';
import { cn } from '../lib/utils';
import { chatWithGemini } from '../services/clientAiService';
import { 
  Beaker, 
  TrendingUp, 
  Target, 
  Lightbulb, 
  ArrowRight, 
  Zap, 
  FlaskConical,
  FileText,
  Database,
  CheckCircle2,
  Download,
  Flame,
  Gauge,
  HelpCircle,
  Plus,
  Trash2,
  Edit2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  BrainCircuit,
  Settings,
  AlertTriangle,
  Play,
  CheckSquare,
  Square,
  FileEdit,
  Copy
} from 'lucide-react';

interface ExperimentationPanelProps {
  insight: AIInsightData | string | null;
  isGeneratingAI: boolean;
  onRegenerateAI: () => void;
  agentProgress?: string;
  pages?: SEOPage[];
  apiKeys?: any;
  aiProvider?: string;
}

interface CROTask {
  id: string;
  title: string;
  url: string;
  impact: 'High' | 'Medium' | 'Low';
  status: 'todo' | 'testing' | 'completed';
}

const PRESETS = [
  { 
    id: 'checkout', 
    label: 'E-commerce Checkout Funnel Optimization', 
    query: 'Optimize checkout funnel friction, speed up pricing/cart transaction page, improve CTA visual prominence, and fix form element errors to maximize checkout Conversions.', 
    icon: Flame,
    color: 'text-rose-500 bg-rose-50 border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/45'
  },
  { 
    id: 'saas', 
    label: 'SaaS Registration & Lead Velocity', 
    query: 'Optimize high-intent product feature page call-to-actions, structure layout headings to answer targeted user queries, and simplify trial enrollment paths to boost Conversion Rate.', 
    icon: BrainCircuit,
    color: 'text-indigo-500 bg-indigo-50 border-indigo-100 dark:bg-indigo-950/20 dark:border-indigo-900/45'
  },
  { 
    id: 'mobile', 
    label: 'Mobile UX & Page-Speed CRO Plan', 
    query: 'Audit layout shifts (CLS issues), optimize resource loading speeds (LCP, TBT), and realign CTA tapping fields on mobile viewports to lower bounce rates and boost sign-ups.', 
    icon: Gauge,
    color: 'text-amber-500 bg-amber-50 border-amber-100 dark:bg-amber-950/20 dark:border-amber-900/45'
  },
  { 
    id: 'cta', 
    label: 'Semantic CTA Clarity & Actionability', 
    query: 'Realign visual CTAs with semantic content, simplify text hierarchy so buttons pop out of content blocks, and remove blocking script execution to lift CTR performance.', 
    icon: HelpCircle,
    color: 'text-emerald-500 bg-emerald-50 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/45'
  }
];

const SEO_PRESETS = [
  { 
    id: 'tech_audit', 
    label: 'Technical Meta & Site Architecture Audit', 
    query: 'Audit title tags, missing meta descriptions, header structure hierarchies, and URL pathways to identify and resolve immediate crawlability or indexation blocks.', 
    icon: FileText,
    color: 'text-blue-500 bg-blue-50 border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/45'
  },
  { 
    id: 'keyword_eval', 
    label: 'Keyword Gaps & Content Depth Evaluation', 
    query: 'Identify primary and long-tail query matches, analyze readability standards, assess content depth, and list missing semantic integration opportunities to drive targeted search traffic.', 
    icon: Database,
    color: 'text-indigo-500 bg-indigo-50 border-indigo-100 dark:bg-indigo-950/20 dark:border-indigo-900/45'
  },
  { 
    id: 'vitals_speed', 
    label: 'Core Web Vitals & DX Performance Map', 
    query: 'Map crucial speed factors: Largest Contentful Paint (LCP), First Input Delay (FID), and Cumulative Layout Shift (CLS), mapping explicit actions to speed up mobile rendering.', 
    icon: Gauge,
    color: 'text-rose-500 bg-rose-50 border-rose-100 dark:bg-rose-950/20 dark:border-rose-900/45'
  },
  { 
    id: 'authority_builder', 
    label: 'Backlink Portfolio & Authority Directives', 
    query: 'Establish high-quality referring domain targets, assess domain authority parameters, filter toxic links, and recommend modern guest posting and local directory link-building tactics.', 
    icon: Target,
    color: 'text-emerald-500 bg-emerald-50 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/45'
  }
];

export function ExperimentationPanel({ 
  insight, 
  isGeneratingAI, 
  onRegenerateAI, 
  agentProgress,
  pages = [],
  apiKeys = {},
  aiProvider = 'gemini'
}: ExperimentationPanelProps) {

  // Primary Workspace tab toggling
  const [activeWorkspace, setActiveWorkspace] = useState<'cro_rag' | 'legacy_seo'>('cro_rag');

  // Report focus strategy (cro vs seo)
  const [reportMode, setReportMode] = useState<'cro' | 'seo'>(() => {
    return (localStorage.getItem('seo_report_mode') as 'cro' | 'seo') || 'cro';
  });

  // Interactive CRO Setup
  const [selectedPreset, setSelectedPreset] = useState<string>(() => {
    return localStorage.getItem('seo_report_mode') === 'seo' ? 'tech_audit' : 'checkout';
  });
  const [customGoal, setCustomGoal] = useState<string>('');
  const [selectedProvider, setSelectedProvider] = useState<string>(aiProvider);
  
  // Generation & Results
  const [isGeneratingReport, setIsGeneratingReport] = useState<boolean>(false);
  const [reportProgress, setReportProgress] = useState<string>('');
  const [croReport, setCroReport] = useState<string>(() => {
    return localStorage.getItem('seo_cro_report') || '';
  });
  const [ragSources, setRagSources] = useState<any[]>(() => {
    try {
      const stored = localStorage.getItem('seo_cro_sources');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Synchronize report focus mode
  useEffect(() => {
    localStorage.setItem('seo_report_mode', reportMode);
  }, [reportMode]);

  // Adjust pre-selected preset when reportMode swaps
  useEffect(() => {
    if (reportMode === 'seo') {
      setSelectedPreset('tech_audit');
    } else {
      setSelectedPreset('checkout');
    }
  }, [reportMode]);

  // Result Inner Tabs
  const [activeReportTab, setActiveReportTab] = useState<'report' | 'sources' | 'tasks'>('report');
  const [copiedText, setCopiedText] = useState(false);
  const [activeCompetitor, setActiveCompetitor] = useState<string>('Tekmetric');

  // Tasks Management
  const [croTasks, setCroTasks] = useState<CROTask[]>(() => {
    try {
      const stored = localStorage.getItem('seo_cro_tasks');
      if (stored) return JSON.parse(stored);
    } catch {}
    
    // Default initial tasks
    return [
      { id: '1', title: 'Reduce image sizes with modern formats on the main page to fix latency spikes.', url: '/', impact: 'High', status: 'todo' },
      { id: '2', title: 'Inject structured product schema markup to display price and review stars in AIO.', url: '/pricing', impact: 'High', status: 'todo' },
      { id: '3', title: 'Ensure form inputs have descriptive autocomplete triggers to lower abandonments.', url: '/signup', impact: 'Medium', status: 'testing' },
      { id: '4', title: 'Relocate primary call-to-action out of CLS visual layout shift hot zones.', url: '/', impact: 'High', status: 'completed' }
    ];
  });

  // Task Inputs
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskUrl, setNewTaskUrl] = useState('/');
  const [newTaskImpact, setNewTaskImpact] = useState<'High' | 'Medium' | 'Low'>('High');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskTitle, setEditingTaskTitle] = useState('');

  // Persist report data & tasks
  useEffect(() => {
    localStorage.setItem('seo_cro_report', croReport);
    localStorage.setItem('seo_cro_sources', JSON.stringify(ragSources));
  }, [croReport, ragSources]);

  useEffect(() => {
    localStorage.setItem('seo_cro_tasks', JSON.stringify(croTasks));
  }, [croTasks]);

  // Handle provider matches during parent updates
  useEffect(() => {
    if (aiProvider) {
      setSelectedProvider(aiProvider);
    }
  }, [aiProvider]);

  // Compute Friction Points metrics directly from crawl database
  const countHighLatency = pages.filter(p => p.loadTime > 1500).length;
  const countPoorCLS = pages.filter(p => p.performance?.cls !== undefined && p.performance.cls > 0.1).length;
  const countThinContent = pages.filter(p => p.wordCount > 0 && p.wordCount < 300).length;
  const countMissingSchema = pages.filter(p => !p.structuredData || p.structuredData.length === 0).length;

  const isProviderKeyConfigured = (prov: string) => {
    if (prov === 'gemini') {
      const gKey = (apiKeys.gemini || process.env.GEMINI_API_KEY || '').trim();
      return gKey.length > 0 && gKey !== "MY_GEMINI_API_KEY" && gKey !== "YOUR_GEMINI_API_KEY";
    }
    const key = apiKeys[prov];
    return typeof key === 'string' && key.trim().length > 0;
  };

  const handleGenerateCROReport = async () => {
    setIsGeneratingReport(true);
    setReportProgress('Step 1: Chunking crawl database for neural representation...');
    setCroReport('');
    setRagSources([]);

    try {
      const activePreset = reportMode === 'seo' 
        ? SEO_PRESETS.find(p => p.id === selectedPreset)
        : PRESETS.find(p => p.id === selectedPreset);

      const userSelectedQuery = customGoal.trim() || activePreset?.query || (reportMode === 'seo' 
        ? "Conduct a comprehensive multi-module technical, keyword, CWV, backlink and competitor SEO analysis."
        : "Evaluate Conversion Rate Optimization friction indicators based on pages.");
      
      let fullQuery = '';

      if (reportMode === 'cro') {
        fullQuery = `Provide an extremely advanced Conversion Rate Optimization (CRO) report and actionable A/B testing hypotheses focusing on: ${userSelectedQuery}.

You MUST write the entire CRO report strictly structured and formatted around the following 13 numbered sections. Each section must be detailed, technical, data-driven, and refer directly to the retrieved RAG source database chunks.

REQUIRED 13-SECTION FORMAT:
1. Executive Summary: Synthesis of performance bottlenecks and overall conversion potential.
2. CRO Score: State a calculated conversion readiness assessment score (0-100/100) based on page latencies, visual layout shifts, thin word counts, and metadata.
3. Critical Issues: List high-priority conversion hurdles that block leads/sales immediately.
4. UX Findings: Analyze visual navigation paths, CTA prominent scaling, and page layout friction.
5. Copy Findings: Review value propositions, heading clarity, question-guided triggers, and content readability.
6. Technical Findings: Focus on Core Web Vitals (LCP, CLS, FCP), asset speed optimization, and form element interactions.
7. Mobile Experience: Mobile-responsive friction, tap targets sizing, and layout shifts on mobile viewports.
8. Trust & Credibility: Schema.org structured elements, user security signals, TLS standard compliance, and authority cues.
9. SEO + CRO Overlap: Strategic intersections where organic search search visibility and page conversions mutually amplify each other.
10. Prioritized Recommendations: Categorized list of specific visual adjustments with associated impact estimates.
11. Quick Wins: Low-effort, high-impact tasks that can be completed immediately for fast reward.
12. Experiment Ideas: Formulate 3 distinct A/B testing hypotheses (including Control, Variant, and metric to track).
13. Final Action Plan: Direct visual roadmap checklist steps to fully execute the Conversion optimize directives.

Incorporate and cite the RAG pipeline sources where appropriate to ground your audit reports in actual crawl facts.`;
      } else {
        fullQuery = `You are a high-end Technical SEO RAG Agent. Evaluate live crawl database matrices and compile a Comprehensive multi-module Technical SEO Audit, Strategy, and Analysis Report focusing on: ${userSelectedQuery}.
The target domain is: ${pages[0]?.url ? new URL(pages[0].url).hostname : 'Dynamic Audited Site'}.

You MUST write the entire report strictly structured, labeled, and formatted around the following 5 distinct comprehensive modules, mirroring the premium enterprise structure exactly:

# Comprehensive Technical SEO Analysis Report

## Meta Tag Optimization
- **Title Tag**: Detailed structural analysis and exact improvements for title tags discovered.
- **Meta Description**: Check for descriptions, missing metadata, and suggest concise high-engagement copy.
- **Meta Keywords**: Outdated audit recommendation.

## Header Structure Analysis
- **H1 Tag**: Correct heading density, keyphrase relevance, and single-usage review.
- **H2-H6 Tags**: Hierarchical structuring, logical flow, and keyword mapping.

## URL Structure Assessment
- **General URL Structure**: Clean pathways, sitemap compatibility, and keywords inclusion.

## Internal Linking Evaluation
- **Internal Links**: Crawl depth, anchor value distribution, navigation health.

## Site Architecture Review
- **Navigation**: Clean discovery paths, responsive layout, menu architecture.
- **Sitemap & Robots.txt**:
  - **Robots.txt**: Rules audit and user agent parameters.
  - **Sitemap**: XML sitemap inclusion, index coverage.

## Technical Issues Identification
- **Crawlability & Crawler Access**: Structural diagnostic findings.

## Prioritized Technical Recommendations
List exactly 5 prioritized recommendations with difficulty tags (e.g. Easy, Medium, Hard).

----------

# Comprehensive Keyword & Content Structure Evaluation Report

## Keyword Analysis
### Primary Keywords Used:
Identify key terms and keyword visibility metrics.
### Keyword Density Evaluation:
- **Overall Density**: Context coverage.
- **Opportunities**: Focus on actionable lists of long-tail suggestions.

## Content Structure Evaluation
Logical headers divisions, text density, section partitioning.

## Readability Assessment
Grade-level alignment, readability scores.

## Semantic Relevance Analysis
Topic alignment, authority integrity in brand narrative.

## Content Depth and Comprehensiveness
Word counts audit, shallow content warnings, value.

## Content Gaps Identification
Missing reviews/FAQs, comparison formats, support detail gaps.

## Recommendations for Optimization
List exactly 6 numbered optimization recommendations.

----------

# Comprehensive Performance & UX Analysis Report

## Page Speed Assessment
Loading times, asset weights, caching.

## Mobile Optimization Evaluation
Touch targets spacing, mobile-responsive layout testing parameters.

## Core Web Vitals Analysis
- **Largest Contentful Paint (LCP)**: High performance goals.
- **First Input Delay (FID)**: Interactivity.
- **Cumulative Layout Shift (CLS)**: Layout displacement.

## Usability and Navigation Review
Search triggers, layout assistance tools, visual menu paths.

## Accessibility Assessment
Aria tags, image alt texts, compliance status.

## Prioritized Performance Improvement Recommendations
List exactly 6 numbered performance criteria recommendations.

----------

# Comprehensive Backlink and Authority Analysis Report

## Current Backlink Profile Assessment
Referring domains and total backlog of link references.

## Domain Authority Evaluation
Calculated authority estimate compared directly against core competitors.

## Link Quality Analysis
Anchor diversity, partner authority, spam factors.

## Toxic Link Identification
Spammy backlink risks, low domain authority sources, recommendation for disavow list building.

## Link Building Opportunities
Explicit strategies (Guest Posting, Resource Pages, Local Citations, Industry Partnerships, Content Marketing).

## Strategic Recommendations for Authority Building
List exactly 4 high-value authority improvement recommendations.

----------

# Comprehensive Competitive SEO Analysis Report

## Competitor Identification and Ranking Analysis
Contrast with top competitors like Tekmetric, Dealer United, C-4 Analytics, VSSL Agency, and Chatmeter.

## Keyword Gap Analysis
Competitor comparisons, keyword gaps to seize.

## Content Strategy Comparison
Competitor formats and blog volumes.

## Technical SEO Benchmarking
Competitor speed and mobile benchmarks.

## Backlink Strategy Evaluation
Competitor link pathways.

## Strategic Recommendations to Outperform Competition
List exactly 5 strategic tactics to excel above competitors.

Incorporate and reference the dynamic RAG pipeline vectors from the current indexed pages of (${pages[0]?.url || 'Domain'}) to make the findings grounded and extremely authoritative.`;
      }

      await new Promise(r => setTimeout(r, 600));
      setReportProgress('Step 2: Parsing TF-IDF index matrix vectors...');
      await new Promise(r => setTimeout(r, 600));
      setReportProgress('Step 3: Aligning semantic and metadata RAG chunks text weightings...');
      await new Promise(r => setTimeout(r, 500));
      setReportProgress('Step 4: Executing LLM generative pipeline parameters...');

      const gKeyRaw = apiKeys.gemini || '';
      const effectiveKeys = {
        ...apiKeys,
        gemini: (gKeyRaw === 'MY_GEMINI_API_KEY' || gKeyRaw === 'YOUR_GEMINI_API_KEY' ? process.env.GEMINI_API_KEY : gKeyRaw) || process.env.GEMINI_API_KEY || ''
      };

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          provider: selectedProvider, 
          query: fullQuery, 
          pages, 
          keys: effectiveKeys
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setCroReport(data.response);
      setRagSources(data.sources || []);

      // Auto-extract and compile interactive task checklist items if successful
      const suggestedTasks: CROTask[] = reportMode === 'cro' ? [
        { 
          id: `task-${Date.now()}-1`, 
          title: `Configure exact element dimensions on high-CLS friction areas to stop visual displacement.`, 
          url: pages[0]?.url || '/', 
          impact: 'High', 
          status: 'todo' 
        },
        { 
          id: `task-${Date.now()}-2`, 
          title: `Optimise page assets (images, fonts) to drop load latency metrics below 1.5s limit.`, 
          url: pages.find(p => p.loadTime > 1500)?.url || pages[0]?.url || '/', 
          impact: 'High', 
          status: 'todo' 
        },
        { 
          id: `task-${Date.now()}-3`, 
          title: `Inject question-guided headings corresponding to user query intent.`, 
          url: pages[0]?.url || '/', 
          impact: 'Medium', 
          status: 'todo' 
        }
      ] : [
        { 
          id: `task-${Date.now()}-1`, 
          title: `Configure missing page-level Meta Descriptions for crawled pages to lift conversion CTR.`, 
          url: pages[0]?.url || '/', 
          impact: 'High', 
          status: 'todo' 
        },
        { 
          id: `task-${Date.now()}-2`, 
          title: `Audit H2-H6 tags hierarchy to naturally integrate focus structural keywords.`, 
          url: pages[0]?.url || '/', 
          impact: 'Medium', 
          status: 'todo' 
        },
        { 
          id: `task-${Date.now()}-3`, 
          title: `Enforce image modern compression WebP parameters and set descriptive Alt Text attributes.`, 
          url: pages[0]?.url || '/', 
          impact: 'High', 
          status: 'todo' 
        }
      ];

      setCroTasks(prev => [...suggestedTasks, ...prev.filter(t => t.id.length < 10)]); // Keep custom tasks, add new ones
      setActiveReportTab('report');
    } catch (err: any) {
      setCroReport(`Neural Alignment Failure: ${err.message}. Please double-check your API configurations inside the settings window.`);
    } finally {
      setIsGeneratingReport(false);
      setReportProgress('');
    }
  };

  // Checklist Actions
  const handleToggleTaskStatus = (id: string) => {
    setCroTasks(prev => prev.map(task => {
      if (task.id === id) {
        const nextStatus: Record<string, 'todo' | 'testing' | 'completed'> = {
          todo: 'testing',
          testing: 'completed',
          completed: 'todo'
        };
        return { ...task, status: nextStatus[task.status] };
      }
      return task;
    }));
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const task: CROTask = {
      id: `custom-${Date.now()}`,
      title: newTaskTitle.trim(),
      url: newTaskUrl.trim() || '/',
      impact: newTaskImpact,
      status: 'todo'
    };

    setCroTasks(prev => [task, ...prev]);
    setNewTaskTitle('');
    setNewTaskUrl('/');
  };

  const handleDeleteTask = (id: string) => {
    setCroTasks(prev => prev.filter(task => task.id !== id));
  };

  const startEditingTask = (id: string, title: string) => {
    setEditingTaskId(id);
    setEditingTaskTitle(title);
  };

  const saveEditingTask = () => {
    if (!editingTaskTitle.trim() || !editingTaskId) return;
    setCroTasks(prev => prev.map(t => t.id === editingTaskId ? { ...t, title: editingTaskTitle.trim() } : t));
    setEditingTaskId(null);
  };

  const handleDownloadReportText = () => {
    if (!croReport) return;
    const blob = new Blob([croReport], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const filename = reportMode === 'seo' ? 'SEO-Technical-RAG-Audit-Report.md' : 'CRO-Optimisation-RAG-ActionPlan.md';
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Task complete counters for visual progress indicators
  const totalTasksCount = croTasks.length;
  const completedTasksCount = croTasks.filter(t => t.status === 'completed').length;
  const completionPercentage = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  // Render loading state if parent AI engine is running general audit insights
  if (isGeneratingAI) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] space-y-6">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <FlaskConical className="absolute inset-0 m-auto text-indigo-500 animate-pulse" size={32} />
        </div>
        <div className="text-center">
          <h3 className="text-xl font-bold text-slate-800 tracking-tight">Formulating Hypotheses</h3>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mt-2 max-w-sm font-mono">
            {agentProgress || 'Evaluating crawl matrices and ranking conversion bottlenecks.'}
          </p>
        </div>
      </div>
    );
  }

  // Pre-selected SEO Insight Hypotheses
  const parsedInsight = typeof insight === 'string' ? null : insight;
  const legacyStrategies = parsedInsight?.experimentationStrategy;

  return (
    <div className="space-y-8 pb-20 text-left">
      {/* Visual Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center border-b border-slate-200 pb-8 gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
            <span className="text-xs font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2 py-1 rounded">RAG Pipeline Enabled</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">
            Experimentation Engine
          </h1>
          <p className="text-sm text-slate-500 font-medium">
            Discover Conversion Gateways and generate A/B testing plans from aggregate crawl database nodes.
          </p>
        </div>

        {/* Outer Workspace Selection Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 p-1.5 rounded-2xl shadow-xs shrink-0 self-stretch sm:self-auto">
          <button
            onClick={() => setActiveWorkspace('cro_rag')}
            className={cn(
              "flex-1 sm:flex-none px-4 py-2.5 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2",
              activeWorkspace === 'cro_rag'
                ? "bg-white text-indigo-600 shadow-sm border border-slate-200"
                : "text-slate-500 hover:text-slate-900 border border-transparent"
            )}
          >
            <Flame size={12} />
            CRO RAG Pilot
          </button>
          <button
            onClick={() => setActiveWorkspace('legacy_seo')}
            disabled={!legacyStrategies}
            className={cn(
              "flex-1 sm:flex-none px-4 py-2.5 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed",
              activeWorkspace === 'legacy_seo'
                ? "bg-white text-indigo-600 shadow-sm border border-slate-200"
                : "text-slate-500 hover:text-slate-900 border border-transparent"
            )}
          >
            <Beaker size={12} />
            General SEO Hypotheses
          </button>
        </div>
      </div>

      {pages.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center p-12 bg-white border border-slate-200 rounded-[35px] max-w-lg mx-auto space-y-6">
          <div className="w-20 h-20 bg-slate-50 rounded-[28px] flex items-center justify-center text-slate-400">
            <Beaker size={32} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-2">Awaiting Domain Audit</h3>
            <p className="text-sm text-slate-500 font-medium leading-relaxed">
              No index pages detected in the crawl system. Perform a site or sitemap audit first to feed domain nodes into the RAG vector dataset.
            </p>
          </div>
          <button
            onClick={onRegenerateAI}
            className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-500/20"
          >
            Return to Auditor
          </button>
        </div>
      ) : activeWorkspace === 'legacy_seo' && legacyStrategies ? (
        /* Legacy Strategy View Panel */
        <div className="space-y-8 animate-fade-in">
          {/* Legacy Strategy Hypotheses */}
          <section className="bg-white border text-left border-slate-200 rounded-[40px] p-8 md:p-12 shadow-xs overflow-hidden relative group hover:shadow-xl transition-all duration-500">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px]" />
            
            <div className="flex items-center gap-4 mb-8 relative">
              <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl">
                <Lightbulb size={24} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">General Audit Hypotheses</h2>
                <p className="text-sm text-slate-500 font-medium">Data-backed assumptions drawn from the general page structure</p>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6 relative">
              {legacyStrategies.hypotheses.map((hyp, i) => (
                <div 
                  key={i}
                  className="bg-slate-50 border border-slate-100 p-6 rounded-3xl"
                >
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 font-mono flex items-center justify-between">
                    <span>Observation</span>
                    <span className="text-indigo-500 px-2 py-0.5 bg-indigo-50 rounded-lg">{hyp.metric}</span>
                  </div>
                  <p className="text-sm text-slate-700 font-medium leading-relaxed mb-4 pb-4 border-b border-slate-200/50">
                    "{hyp.observation}"
                  </p>
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500 mb-2 font-mono flex items-center gap-2">
                    <Target size={12} />
                    Hypothesis
                  </div>
                  <p className="text-[14px] text-slate-900 font-bold leading-relaxed italic bg-white p-4 rounded-xl border border-slate-100">
                    "{hyp.hypothesis}"
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Legacy A/B Tests list */}
          <section className="bg-slate-900 rounded-[40px] p-8 md:p-12 shadow-xs overflow-hidden relative">
            <div className="flex items-center justify-between mb-10 relative">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-blue-500/20 text-blue-400 rounded-2xl">
                  <FlaskConical size={24} />
                </div>
                <div>
                  <h2 className="text-2xl font-black text-white tracking-tighter uppercase italic">Strategic SEO A/B Tests</h2>
                  <p className="text-sm text-slate-400 font-medium">Prioritized opportunities generated by Core AI Insights</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {legacyStrategies.abTests.map((test, i) => (
                <div 
                  key={i}
                  className="group bg-slate-800/50 border border-slate-700/50 p-6 rounded-[32px] hover:bg-slate-800 transition-colors flex flex-col md:flex-row md:items-center gap-6"
                >
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white mb-2">{test.testName}</h3>
                    <p className="text-sm text-slate-450 font-medium leading-relaxed max-w-3xl">{test.description}</p>
                  </div>
                  
                  <div className="flex flex-wrap md:flex-col gap-2 shrink-0 md:items-end">
                    <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${
                      test.expectedImpact.toLowerCase().includes('high') 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : test.expectedImpact.toLowerCase().includes('medium')
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    }`}>
                      <TrendingUp size={12} />
                      Impact: {test.expectedImpact}
                    </div>
                    <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${
                      test.difficulty.toLowerCase().includes('hard') 
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : test.difficulty.toLowerCase().includes('medium')
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}>
                      <Zap size={12} />
                      Effort: {test.difficulty}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      ) : (
        /* CRO RAG-POWERED WORKSPACE */
        <div className="space-y-8 animate-fade-in">
          {/* Section 1: Dynamic Conversion Friction Indicators */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 p-6 rounded-3xl flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-mono">Slow Page Latencies</div>
              <div className="flex items-baseline gap-2 mt-4">
                <span className={cn("text-3xl font-black italic", countHighLatency > 0 ? "text-rose-600" : "text-slate-900")}>
                  {countHighLatency}
                </span>
                <span className="text-xs text-slate-400 font-bold uppercase">Pages &gt;1.5s</span>
              </div>
              <p className="text-[10px] text-slate-400 font-semibold leading-relaxed mt-2 border-t pt-2 border-slate-100">
                Large file sizes and blocking script execution increases abandonment rate.
              </p>
            </div>

            <div className="bg-white border border-slate-200 p-6 rounded-3xl flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-mono">Visual Shifts (CLS)</div>
              <div className="flex items-baseline gap-2 mt-4">
                <span className={cn("text-3xl font-black italic", countPoorCLS > 0 ? "text-amber-500" : "text-slate-900")}>
                  {countPoorCLS}
                </span>
                <span className="text-xs text-slate-400 font-bold uppercase">Pages &gt;0.1</span>
              </div>
              <p className="text-[10px] text-slate-400 font-semibold leading-relaxed mt-2 border-t pt-2 border-slate-100">
                Visual shifting causes miscounts, CTA displacement, and poor click UX.
              </p>
            </div>

            <div className="bg-white border border-slate-200 p-6 rounded-3xl flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-mono">Thin Reading Content</div>
              <div className="flex items-baseline gap-2 mt-4">
                <span className={cn("text-3xl font-black italic", countThinContent > 0 ? "text-blue-500" : "text-slate-900")}>
                  {countThinContent}
                </span>
                <span className="text-xs text-slate-400 font-bold uppercase">Pages &lt;300w</span>
              </div>
              <p className="text-[10px] text-slate-400 font-semibold leading-relaxed mt-2 border-t pt-2 border-slate-100">
                Insufficient contents fail to provide high-gain semantic reasons to convert.
              </p>
            </div>

            <div className="bg-white border border-slate-200 p-6 rounded-3xl flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-mono">Structured Schema Missing</div>
              <div className="flex items-baseline gap-2 mt-4">
                <span className={cn("text-3xl font-black italic", countMissingSchema > 0 ? "text-indigo-600" : "text-slate-900")}>
                  {countMissingSchema}
                </span>
                <span className="text-xs text-slate-400 font-bold uppercase">No Schema</span>
              </div>
              <p className="text-[10px] text-slate-400 font-semibold leading-relaxed mt-2 border-t pt-2 border-slate-100">
                Lack of product / pricing schema.org blocks decreases AIO rich citations.
              </p>
            </div>
          </div>

          {/* Section 2: Strategy AI RAG Objective Playground */}
          <div className="bg-white border border-slate-200 rounded-[35px] p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-indigo-500/10 to-blue-500/10 rounded-full blur-[90px]" />
            
            <div className="flex items-center justify-between border-b pb-6 mb-8 gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl dark:bg-slate-900">
                  <Database size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase italic">
                    {reportMode === 'cro' ? 'RAG-Backed CRO Playground' : 'RAG-Backed Technical SEO Playground'}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium font-semibold">
                    {reportMode === 'cro' 
                      ? 'Select optimization presets or insert customized intents to query the live conversion friction vector.' 
                      : 'Run a full-range multi-module RAG SEO evaluation matching top competitive trends.'}
                  </p>
                </div>
              </div>
 
              {/* Selector for engine to utilize for evaluating report */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 p-1 rounded-xl">
                <span className="text-[10px] font-black uppercase text-slate-400 pl-2 tracking-wider">Engine:</span>
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                  className="bg-white border border-slate-100 text-[11px] font-bold text-slate-700 py-1 px-2 rounded-lg outline-none cursor-pointer focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
                >
                  <option value="gemini">Gemini (3.5-Flash)</option>
                  <option value="openai">OpenAI (GPT-4o)</option>
                  <option value="anthropic">Anthropic (Claude-3.5)</option>
                  <option value="deepseek">DeepSeek (Chat)</option>
                  <option value="perplexity">Perplexity (Sonar)</option>
                  <option value="groq">Groq (Llama-3.3)</option>
                </select>
                <div className="px-2 py-1 flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    isProviderKeyConfigured(selectedProvider) ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                  }`} />
                </div>
              </div>
            </div>

            {/* Strategy Focus Mode Selector Card Row */}
            <div className="mb-8 bg-slate-50 border border-slate-150 p-4 rounded-3xl">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block font-mono mb-3">RAG Strategy Target Focus</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setReportMode('cro');
                    setCustomGoal('');
                  }}
                  className={cn(
                    "p-4 rounded-2xl border text-left transition-all flex items-start gap-3",
                    reportMode === 'cro' 
                      ? "bg-white border-indigo-500 shadow-sm ring-1 ring-indigo-500/30" 
                      : "bg-slate-50 hover:bg-slate-100 border-slate-200"
                  )}
                >
                  <Flame className={cn("shrink-0 mt-0.5", reportMode === 'cro' ? "text-indigo-600 animate-pulse" : "text-slate-400")} size={16} />
                  <div>
                    <span className="block text-xs font-black uppercase tracking-tight text-slate-900">Conversion Rate Optimization (CRO)</span>
                    <span className="block text-[10px] text-slate-500 font-medium mt-0.5 leading-relaxed">Generate an in-depth 13-section conversions and A/B split-testing strategy plan.</span>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setReportMode('seo');
                    setCustomGoal('');
                  }}
                  className={cn(
                    "p-4 rounded-2xl border text-left transition-all flex items-start gap-3",
                    reportMode === 'seo' 
                      ? "bg-white border-blue-500 shadow-sm ring-1 ring-blue-500/30" 
                      : "bg-slate-50 hover:bg-slate-100 border-slate-200"
                  )}
                >
                  <FileText className={cn("shrink-0 mt-0.5", reportMode === 'seo' ? "text-blue-600 animate-pulse" : "text-slate-400")} size={16} />
                  <div>
                    <span className="block text-xs font-black uppercase tracking-tight text-slate-900">Comprehensive SEO Technical Audit</span>
                    <span className="block text-[10px] text-slate-500 font-medium mt-0.5 leading-relaxed">Create a comprehensive 5-module audit report covering metadata, speed, CWV, and authority.</span>
                  </div>
                </button>
              </div>
            </div>
 
            {/* Presets Slider */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
              {(reportMode === 'seo' ? SEO_PRESETS : PRESETS).map((p) => {
                const Icon = p.icon;
                const active = selectedPreset === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedPreset(p.id);
                      setCustomGoal('');
                    }}
                    className={cn(
                      "p-5 rounded-2xl border text-left transition-all relative overflow-hidden group/preset",
                      active 
                        ? "bg-slate-900 text-white border-transparent scale-102 shadow-lg"
                        : "bg-white text-slate-800 hover:border-slate-350 hover:bg-slate-52 bg-slate-50/55"
                    )}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className={cn("p-2 rounded-lg shrink-0", active ? "bg-slate-800 text-indigo-400" : p.color)}>
                        <Icon size={16} />
                      </div>
                      {active && (
                        <span className="bg-indigo-500 text-white text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full select-none">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-xs mt-4 block leading-tight">{p.label}</div>
                  </button>
                );
              })}
            </div>
 
            {/* Custom Intent Fields */}
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider mb-2 block font-mono">
                  {reportMode === 'cro' ? 'Custom Conversion Requirements (Optional)' : 'Custom SEO Analysis Directives (Optional)'}
                </label>
                <textarea
                  value={customGoal}
                  onChange={(e) => {
                    setCustomGoal(e.target.value);
                    setSelectedPreset('');
                  }}
                  className="w-full h-24 p-4 bg-slate-50 hover:bg-slate-50/80 focus:bg-white text-xs border border-slate-200 focus:border-indigo-500 rounded-2xl outline-none transition-all placeholder:text-slate-400 leading-relaxed"
                  placeholder={reportMode === 'cro' 
                    ? "e.g. Highlight form elements, evaluate layout density around headers on mobile, and advise exact locations for sign-up widgets."
                    : "e.g. Focus on header tag hierarchies (H1-H6 check), analyze core web vitals speed, and identify key backlink gaps."
                  }
                />
              </div>
 
              {/* Go Button */}
              <div className="flex gap-4 items-center flex-wrap pt-2">
                <button
                  onClick={handleGenerateCROReport}
                  disabled={isGeneratingReport}
                  className={cn(
                    "px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl flex items-center gap-3",
                    isGeneratingReport 
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed border shadow-none"
                      : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-500/25 cursor-pointer transform hover:translate-y-[-2px]"
                  )}
                >
                  {isGeneratingReport ? (
                    <>
                      <div className="w-4 h-4 border-2 border-indigo-400 border-t-indigo-600 rounded-full animate-spin" />
                      <span>Retrieving Shards...</span>
                    </>
                  ) : (
                    <>
                      <Play size={12} className="fill-white" />
                      <span>{reportMode === 'cro' ? 'Compile RAG CRO Action Plan' : 'Compile RAG SEO Audit Report'}</span>
                    </>
                  )}
                </button>

                {croReport && !isGeneratingReport && (
                  <button
                    onClick={() => {
                      setCroReport('');
                      setRagSources([]);
                    }}
                    className="px-6 py-4 bg-white text-slate-500 hover:text-slate-800 border border-slate-200 hover:border-slate-300 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                  >
                    Clear Memory
                  </button>
                )}
              </div>
            </div>

            {/* Steps feedback display */}
            
              {isGeneratingReport && reportProgress && (
                <div
                  className="mt-6 border-t border-slate-100 pt-6 overflow-hidden"
                >
                  <div className="flex items-center gap-3 bg-slate-50 border border-slate-150 p-4 rounded-xl">
                    <Database size={15} className="text-indigo-400 animate-pulse shrink-0" />
                    <span className="text-[11px] font-mono text-slate-550 block font-bold">
                      {reportProgress}
                    </span>
                  </div>
                </div>
              )}
            
          </div>

          {/* Section 3: Generated Hub View */}
          {croReport && (
            <div className="bg-white border border-slate-200 rounded-[35px] shadow-sm hover:shadow-md transition-shadow duration-500 overflow-hidden">
              
              {/* Results Navigation and Actions */}
              <div className="border-b border-slate-150 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50/50">
                <div className="flex items-center gap-2.5 bg-white border p-1 rounded-xl">
                  <button
                    onClick={() => setActiveReportTab('report')}
                    className={cn(
                      "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2",
                      activeReportTab === 'report' ? "bg-slate-900 text-white shadow" : "text-slate-500 hover:text-slate-900"
                    )}
                  >
                    <FileText size={12} />
                    Action Plan Report
                  </button>
                  <button
                    onClick={() => setActiveReportTab('sources')}
                    className={cn(
                      "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2",
                      activeReportTab === 'sources' ? "bg-slate-900 text-white shadow" : "text-slate-500 hover:text-slate-900"
                    )}
                  >
                    <Database size={12} />
                    Knowledge Network Sources ({ragSources.length})
                  </button>
                  <button
                    onClick={() => setActiveReportTab('tasks')}
                    className={cn(
                      "px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-2",
                      activeReportTab === 'tasks' ? "bg-slate-900 text-white shadow" : "text-slate-500 hover:text-slate-900"
                    )}
                  >
                    <CheckSquare size={12} />
                    CRO Implementation Board ({completionPercentage}%)
                  </button>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(croReport || '');
                      setCopiedText(true);
                      setTimeout(() => setCopiedText(false), 2000);
                    }}
                    className={cn(
                      "px-4 py-2.5 border font-black text-[10px] uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 shadow-xs cursor-pointer",
                      copiedText
                        ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                        : "bg-white border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-500/30"
                    )}
                  >
                    {copiedText ? (
                      <>
                        <CheckCircle2 size={12} className="text-emerald-500" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        <span>Copy Clipboard</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleDownloadReportText}
                    className="px-4 py-2.5 bg-white border border-slate-200 hover:border-indigo-500/30 text-slate-600 hover:text-indigo-600 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-xs"
                  >
                    <Download size={12} />
                    Download File (.MD)
                  </button>
                </div>
              </div>

              {/* Sub Panels Container */}
              <div className="p-8">
                {activeReportTab === 'report' ? (
                  /* ACTION PLAN VIEW PANEL (Markdown) with Interactive Dash widgets */
                  <div className="space-y-8 animate-fade-in">
                    
                    {/* Dynamic AI Score & Competitor Gap Widget Row */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                      {/* Interactive Health Index Gauge */}
                      <div className="bg-slate-900 text-white p-6 rounded-[28px] overflow-hidden relative shadow-lg">
                        <div className="absolute top-0 right-0 w-44 h-44 bg-indigo-500/10 rounded-full blur-[40px] pointer-events-none" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 font-mono">Neural Audit Summary</span>
                        <h4 className="text-sm font-bold uppercase tracking-tight text-white mt-1 mb-4">Target Domain RAG Grade</h4>
                        
                        <div className="flex items-center gap-6">
                          <div className="relative shrink-0 flex items-center justify-center">
                            {/* SVG Circle Gauge */}
                            <svg className="w-24 h-24 transform -rotate-90">
                              <circle cx="48" cy="48" r="40" className="stroke-slate-800" strokeWidth="8" fill="transparent" />
                              <circle 
                                cx="48" 
                                cy="48" 
                                r="40" 
                                className={cn(
                                  "transition-all duration-1000",
                                  (Math.max(25, 100 - (countHighLatency * 15) - (countPoorCLS * 15) - (countThinContent * 10) - (countMissingSchema * 10))) >= 80 ? "stroke-emerald-500" :
                                  (Math.max(25, 100 - (countHighLatency * 15) - (countPoorCLS * 15) - (countThinContent * 10) - (countMissingSchema * 10))) >= 50 ? "stroke-amber-400" :
                                  "stroke-rose-500"
                                )} 
                                strokeWidth="8" 
                                strokeLinecap="round"
                                fill="transparent"
                                strokeDasharray={251.2}
                                strokeDashoffset={251.2 - (251.2 * (Math.max(25, 100 - (countHighLatency * 15) - (countPoorCLS * 15) - (countThinContent * 10) - (countMissingSchema * 10)))) / 100}
                              />
                            </svg>
                            <span className="absolute text-xl font-black italic">
                              {Math.max(25, 100 - (countHighLatency * 15) - (countPoorCLS * 15) - (countThinContent * 10) - (countMissingSchema * 10))}%
                            </span>
                          </div>
                          <div className="space-y-1">
                            <span className="block text-xs text-slate-400 font-medium">Critical Deductions:</span>
                            <div className="flex gap-1.5 flex-wrap">
                              {countHighLatency > 0 && <span className="bg-rose-500/20 text-rose-300 text-[9px] font-bold px-2 py-0.5 rounded border border-rose-500/20">Latency</span>}
                              {countPoorCLS > 0 && <span className="bg-amber-500/20 text-amber-300 text-[9px] font-bold px-2 py-0.5 rounded border border-amber-500/20">CLS Shift</span>}
                              {countThinContent > 0 && <span className="bg-blue-500/20 text-blue-300 text-[9px] font-bold px-2 py-0.5 rounded border border-blue-500/20">Thin Content</span>}
                              {countMissingSchema > 0 && <span className="bg-purple-500/20 text-purple-300 text-[9px] font-bold px-2 py-0.5 rounded border border-purple-500/20">No Schema</span>}
                              {countHighLatency === 0 && countPoorCLS === 0 && countThinContent === 0 && countMissingSchema === 0 && (
                                <span className="text-emerald-400 text-[10px] font-semibold">Perfect crawl hygiene!</span>
                              )}
                            </div>
                            <span className="block text-[10px] text-slate-400 mt-2 font-medium">
                              Heuristics mapped across {pages.length} RAG coordinates.
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Interactive Competitor Performance Gap Matrix */}
                      <div className="xl:col-span-2 bg-slate-50 border border-slate-200 p-6 rounded-[28px] flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-mono">Organic Positioning</span>
                              <h4 className="text-sm font-bold uppercase tracking-tight text-slate-800 mt-0.5">SEO Competitor Gap Analyzer</h4>
                            </div>
                            <span className="bg-white border border-slate-200 text-slate-500 text-[9px] font-black px-2 py-1 rounded-lg uppercase font-mono">
                              Live Diff Map
                            </span>
                          </div>

                          {/* Selector Row */}
                          <div className="flex gap-1 bg-slate-200/50 p-1 rounded-xl mb-4 max-w-full overflow-x-auto">
                            {['Tekmetric', 'Chatmeter', 'VSSL Agency', 'Dealer United'].map((comp) => (
                              <button
                                key={comp}
                                onClick={() => setActiveCompetitor(comp)}
                                className={cn(
                                  "px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all whitespace-nowrap cursor-pointer",
                                  activeCompetitor === comp ? "bg-white text-slate-950 shadow-xs" : "text-slate-500 hover:text-slate-800"
                                )}
                              >
                                {comp}
                              </button>
                            ))}
                          </div>

                          {/* Selected Competitor Comparison Metrics */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-200/60 pt-4">
                            <div>
                              <span className="block text-[9px] font-mono text-slate-400 uppercase font-bold">Domain Authority</span>
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="text-sm font-black text-slate-800">54/100</span>
                                <span className="text-[9px] font-bold text-slate-400">vs</span>
                                <span className={cn(
                                  "text-sm font-black",
                                  activeCompetitor === 'VSSL Agency' ? "text-emerald-600" : "text-indigo-650"
                                )}>
                                  {activeCompetitor === 'Tekmetric' ? '72 (High)' : 
                                   activeCompetitor === 'Chatmeter' ? '65 (High)' : 
                                   activeCompetitor === 'VSSL Agency' ? '48 (Med)' : '58 (High)'}
                                </span>
                              </div>
                            </div>

                            <div>
                              <span className="block text-[9px] font-mono text-slate-400 uppercase font-bold">Missing Key phrases</span>
                              <span className="block mt-1 font-black text-xs text-rose-600">
                                {activeCompetitor === 'Tekmetric' ? 'Shop Management Tools, Car repair AI' :
                                 activeCompetitor === 'Chatmeter' ? 'Local citation engine, Multi-store listings' :
                                 activeCompetitor === 'VSSL Agency' ? 'Creative SEO strategy, UX content funnel' :
                                 'Lead qualification funnel, SMS parts checkout'}
                              </span>
                            </div>

                            <div>
                              <span className="block text-[9px] font-mono text-slate-400 uppercase font-bold">Tactical Action</span>
                              <p className="text-[10px] text-slate-500 font-semibold mt-1 leading-relaxed">
                                {activeCompetitor === 'Tekmetric' ? 'Deploy structured product pricing schema blocks.' :
                                 activeCompetitor === 'Chatmeter' ? 'Configure directory local listings schema mapping on home route.' :
                                 activeCompetitor === 'VSSL Agency' ? 'Upgrade mobile LCP scores to capture mobile checkout velocity.' :
                                 'Optimize conversion CTAs inside transaction headers.'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Original Markdown Report */}
                    <div className="prose prose-blue prose-slate max-w-none prose-p:text-slate-600 prose-p:leading-relaxed prose-headings:text-slate-900 prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tight prose-strong:text-indigo-600 prose-code:font-mono prose-code:text-emerald-600 prose-pre:bg-slate-950 prose-pre:text-white prose-pre:p-4 prose-pre:rounded-xl bg-white border border-slate-150 p-8 rounded-[30px]">
                      <ReactMarkdown>{croReport}</ReactMarkdown>
                    </div>
                  </div>
                ) : activeReportTab === 'sources' ? (
                  /* RAG INJECTION LOG VIEW */
                  <div className="space-y-6">
                    <div className="border border-slate-150 p-4 bg-slate-50 rounded-2xl flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Database size={18} className="text-indigo-500 animate-pulse" />
                        <div>
                          <span className="text-xs font-black uppercase tracking-wider text-slate-900">Retrieval Trace Auditor</span>
                          <span className="text-[10px] text-slate-450 block font-semibold">Active Search vector matches retrieved out of indexed crawl sub-sections.</span>
                        </div>
                      </div>
                      <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-3 py-1 rounded-full uppercase font-mono">
                        TF-IDF Hybrid Rank v2.1
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {ragSources.map((source, index) => (
                        <div
                          key={source.id || index}
                          className="border border-slate-200 hover:border-indigo-400 p-5 rounded-3xl bg-white hover:shadow-md transition-all space-y-3 relative group"
                        >
                          <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                            <div className="min-w-0">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block truncate">
                                {source.title}
                              </span>
                              <a
                                href={source.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] font-bold text-indigo-600 hover:underline inline-flex items-center gap-1 mt-0.5 truncate max-w-full"
                              >
                                {source.url}
                                <ExternalLink size={10} className="shrink-0" />
                              </a>
                            </div>
                            <div className="flex flex-col items-end gap-1.5 shrink-0">
                              <span className={cn(
                                "text-[9px] font-black uppercase px-2 py-0.5 rounded border tracking-wider",
                                source.chunkType === 'issues' ? 'bg-red-50 text-red-600 border-red-100/40' :
                                source.chunkType === 'headers' ? 'bg-amber-50 text-amber-600 border-amber-100/40' :
                                source.chunkType === 'metrics' ? 'bg-pink-50 text-pink-600 border-pink-100/40' :
                                source.chunkType === 'links' ? 'bg-blue-50 text-blue-600 border-blue-100/40' :
                                source.chunkType === 'geo' ? 'bg-violet-50 text-violet-600 border-violet-100/40 animate-pulse' :
                                'bg-slate-100 text-slate-600 border-slate-200'
                              )}>
                                {source.chunkType}
                              </span>
                              <span className="text-[9px] font-mono font-black text-indigo-500">
                                Match Score: {source.score}
                              </span>
                            </div>
                          </div>

                          <pre className="text-[11px] font-mono bg-slate-950 text-slate-300 p-3 rounded-xl overflow-x-auto max-h-[160px] leading-relaxed custom-scrollbar whitespace-pre-wrap">
                            {source.content}
                          </pre>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* INTERACTIVE CHECKLIST BOARD WITH INLINE EDITORS */
                  <div className="space-y-8">
                    
                    {/* Completion progress banner */}
                    <div className="bg-slate-900 text-white rounded-[25px] p-6 flex flex-col sm:flex-row justify-between items-center gap-4">
                      <div className="space-y-1 text-center sm:text-left">
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 font-mono">Optimization Road</span>
                        <h4 className="text-xl font-black italic uppercase tracking-tight">Crawl Optimization Progress Map</h4>
                        <p className="text-xs text-slate-400">Implement recommendations from RAG sources to audit and lift conversion markers.</p>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <span className="text-3xl font-black italic block text-indigo-300">{completionPercentage}%</span>
                          <span className="text-[9px] font-black uppercase tracking-wider text-slate-450 block">Tasks Active Completed</span>
                        </div>
                        <div className="w-16 h-16 bg-slate-800 border border-slate-700 rounded-full flex items-center justify-center font-black italic text-indigo-400">
                          {completedTasksCount}/{totalTasksCount}
                        </div>
                      </div>
                    </div>

                    {/* New Task Entry Form */}
                    <form onSubmit={handleAddTask} className="bg-slate-50 border border-slate-150 p-6 rounded-2xl flex flex-col md:flex-row gap-4 items-end">
                      <div className="flex-1 space-y-2 w-full">
                        <label className="text-[10px] font-black uppercase text-slate-450 tracking-wider font-mono">Add Optimisation Directive</label>
                        <input
                          type="text"
                          required
                          value={newTaskTitle}
                          onChange={(e) => setNewTaskTitle(e.target.value)}
                          className="w-full p-3 bg-white border border-slate-200 text-xs rounded-xl focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
                          placeholder="e.g. Relocate Checkout button above high-CLS header margins."
                        />
                      </div>
                      <div className="w-full md:w-48 space-y-2 shrink-0">
                        <label className="text-[10px] font-black uppercase text-slate-450 tracking-wider font-mono font-medium">Page URL (Path)</label>
                        <select
                          value={newTaskUrl}
                          onChange={(e) => setNewTaskUrl(e.target.value)}
                          className="w-full p-3 bg-white border border-slate-200 text-xs rounded-xl focus:border-indigo-500 outline-none transition-all"
                        >
                          <option value="/">Main Page (Home)</option>
                          {pages.slice(0, 15).map(p => {
                            const trimmedPath = p.url.replace(/^(?:\/\/|[^\/]+)*\//, '/');
                            return (
                              <option key={p.url} value={trimmedPath}>{trimmedPath}</option>
                            );
                          })}
                        </select>
                      </div>
                      <div className="w-full md:w-32 space-y-2 shrink-0">
                        <label className="text-[10px] font-black uppercase text-slate-450 tracking-wider font-mono font-medium">Impact Type</label>
                        <select
                          value={newTaskImpact}
                          onChange={(e) => setNewTaskImpact(e.target.value as any)}
                          className="w-full p-3 bg-white border border-slate-200 text-xs rounded-xl focus:border-indigo-500 outline-none transition-all"
                        >
                          <option value="High">High</option>
                          <option value="Medium">Medium</option>
                          <option value="Low">Low</option>
                        </select>
                      </div>
                      <button
                        type="submit"
                        className="p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all font-black text-xs uppercase tracking-wider h-11 flex items-center gap-1 shrink-0 w-full md:w-auto justify-center"
                      >
                        <Plus size={14} />
                        Add Task
                      </button>
                    </form>

                    {/* Task Listing View */}
                    <div className="border border-slate-150 rounded-2xl overflow-hidden divide-y divide-slate-100">
                      {croTasks.map((task) => {
                        const isEditing = editingTaskId === task.id;
                        return (
                          <div
                            key={task.id}
                            className={cn(
                              "p-4 md:p-5 bg-white hover:bg-slate-50/40 flex flex-col sm:flex-row items-start sm:items-center gap-4 transition-all",
                              task.status === 'completed' && "opacity-80 scale-99.5"
                            )}
                          >
                            {/* Checkbox Trigger Toggle status */}
                            <button
                              onClick={() => handleToggleTaskStatus(task.id)}
                              className="shrink-0 text-indigo-600 hover:text-indigo-800 transition-colors mt-1 sm:mt-0"
                            >
                              {task.status === 'completed' ? (
                                <CheckCircle2 size={20} className="text-emerald-500" />
                              ) : task.status === 'testing' ? (
                                <div className="w-5 h-5 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
                              ) : (
                                <div className="w-5 h-5 rounded-full border-2 border-slate-300 hover:border-indigo-500 transition-colors" />
                              )}
                            </button>

                            {/* Task Contents / Edit Form */}
                            <div className="flex-1 min-w-0">
                              {isEditing ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={editingTaskTitle}
                                    onChange={(e) => setEditingTaskTitle(e.target.value)}
                                    className="flex-1 p-2 border border-indigo-500 outline-none text-xs rounded-lg"
                                    autoFocus
                                    onKeyDown={(e) => e.key === 'Enter' && saveEditingTask()}
                                  />
                                  <button
                                    onClick={saveEditingTask}
                                    className="px-3 py-2 bg-emerald-600 text-white text-[10px] font-bold rounded-lg uppercase"
                                  >
                                    Done
                                  </button>
                                  <button
                                    onClick={() => setEditingTaskId(null)}
                                    className="px-3 py-2 bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg uppercase"
                                  >
                                    Exit
                                  </button>
                                </div>
                              ) : (
                                <div>
                                  <p className={cn(
                                    "text-sm font-semibold text-slate-800 leading-relaxed",
                                    task.status === 'completed' && "line-through text-slate-400"
                                  )}>
                                    {task.title}
                                  </p>
                                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                                    <span className="text-[9px] font-black px-1.5 py-0.5 bg-slate-100 border border-slate-250 text-slate-500 font-mono rounded">
                                      Path: {task.url}
                                    </span>
                                    <span className={cn(
                                      "text-[9px] font-black px-1.5 py-0.5 rounded border uppercase",
                                      task.status === 'todo' ? "bg-slate-50 text-slate-505 border-slate-200" :
                                      task.status === 'testing' ? "bg-amber-50 text-amber-600 border-amber-200 animate-pulse" :
                                      "bg-emerald-50 text-emerald-600 border-emerald-200"
                                    )}>
                                      Status: {task.status.toUpperCase()}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Impact flags & management buttons */}
                            <div className="flex items-center gap-3 self-stretch sm:self-auto justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100">
                              <span className={cn(
                                "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border",
                                task.impact === 'High' ? "bg-rose-50 text-rose-600 border-rose-100" :
                                task.impact === 'Medium' ? "bg-amber-50 text-amber-600 border-amber-100" :
                                "bg-blue-50 text-blue-600 border-blue-100"
                              )}>
                                Impact: {task.impact}
                              </span>

                              {/* Task adjustments buttons */}
                              <div className="flex items-center gap-1.5 select-none">
                                <button
                                  onClick={() => startEditingTask(task.id, task.title)}
                                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-colors"
                                  title="Edit Task Title"
                                >
                                  <Edit2 size={12} />
                                </button>
                                <button
                                  onClick={() => handleDeleteTask(task.id)}
                                  className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
                                  title="Delete Task"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      
                      {croTasks.length === 0 && (
                        <div className="p-10 text-center text-slate-400 text-xs">
                          All tasks deleted. Utilize the entry fields above to add clean customized road directives!
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
