import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sliders, 
  HelpCircle, 
  CheckCircle2, 
  AlertTriangle, 
  Globe, 
  Scale, 
  Layers, 
  Zap, 
  Sparkles, 
  Code, 
  FileText, 
  Activity, 
  Award, 
  BarChart, 
  ArrowRight, 
  RotateCcw, 
  ShieldCheck, 
  Info,
  Check,
  TrendingUp,
  SlidersHorizontal,
  ChevronRight,
  ListChecks,
  Compass,
  FileCheck
} from 'lucide-react';
import { SEOPage, AuditStats } from '../types/seo';
import { cn } from '../lib/utils';
import { 
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  ResponsiveContainer,
  BarChart as RechartsBarChart,
  Bar as RechartsBar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Cell
} from 'recharts';

interface ScoringModelPanelProps {
  pages: SEOPage[];
  stats: AuditStats | null;
  onPageSelect?: (page: SEOPage) => void;
  selectedPageUrl?: string;
}

interface DimensionConfig {
  id: string;
  name: string;
  weight: number; // Percentage (e.g., 20)
  color: string; // Tailwind class
  accentColor: string; // Tailwind text/fill accent
  icon: React.ComponentType<any>;
  description: string;
  factors: {
    name: string;
    description: string;
    weightContribution: number;
  }[];
}

const DEFAULT_DIMENSIONS: DimensionConfig[] = [
  {
    id: 'tech_readiness',
    name: 'Technical AI Readiness',
    weight: 20,
    color: 'bg-indigo-600',
    accentColor: 'text-indigo-600 border-indigo-100 bg-indigo-50/50',
    icon: Code,
    description: 'Ensures structured schemas (JSON-LD JSON tags), metadata correctness, canonical pointers, and robot permission parameters are optimized for next-generation crawl-bots.',
    factors: [
      { name: 'JSON-LD Schema Markup', description: 'Checks for rich structured schema elements supporting content definitions.', weightContribution: 40 },
      { name: 'Crawl Pointers & Robots.txt', description: 'Assesses indexing permissions and bot exclusion parameters.', weightContribution: 30 },
      { name: 'Canonical Configuration', description: 'Confirms a unique authoritative source URL is declared to prevent crawling duplications.', weightContribution: 30 }
    ]
  },
  {
    id: 'ai_seo',
    name: 'AI SEO / AEO',
    weight: 20,
    color: 'bg-violet-600',
    accentColor: 'text-violet-600 border-violet-100 bg-violet-50/50',
    icon: Sparkles,
    description: 'Measures search-engine direct extraction capabilities, question-based paragraph structures matching natural user queries, and brand topical density indicators.',
    factors: [
      { name: 'GEO Brand Extraction', description: 'Evaluates name and entity placement prominence for LLM citation indices.', weightContribution: 40 },
      { name: 'Natural Language Query Match', description: 'Scans for clear Q&A formatting structures (H1/H2/H3 addressing what/why/how).', weightContribution: 35 },
      { name: 'Topical Authority Breadth', description: 'Density of high-quality semantic entities mapped on the target page.', weightContribution: 25 }
    ]
  },
  {
    id: 'ux_personalization',
    name: 'UX & Personalization',
    weight: 15,
    color: 'bg-blue-600',
    accentColor: 'text-blue-600 border-blue-100 bg-blue-50/50',
    icon: Layers,
    description: 'Analyzes information density layout hygiene, text-to-code balance, and mobile responsiveness structures for seamless reader intake.',
    factors: [
      { name: 'Content-to-Code Density', description: 'Avoids heavy bloated wrappers, raising the core narrative ratio above boilerplate.', weightContribution: 40 },
      { name: 'Typographical Balance', description: 'Scans for structured, safe text elements paired for responsive reading speeds.', weightContribution: 35 },
      { name: 'Internal Link Routing', description: 'Assesses intuitive contextual link architectures preventing high user drop-offs.', weightContribution: 25 }
    ]
  },
  {
    id: 'content_quality',
    name: 'Content Quality',
    weight: 15,
    color: 'bg-sky-600',
    accentColor: 'text-sky-600 border-sky-100 bg-sky-50/50',
    icon: FileText,
    description: 'Audits information gain richness, linguistic voice authenticity, and lack of repetitive low-value cliches typical of standard generative boilerplate.',
    factors: [
      { name: 'Semantic Uniqueness Index', description: 'Rates content originality compared to dry textbook training corpuses.', weightContribution: 40 },
      { name: 'Linguistic Tone Coherence', description: 'Flags overuse of repetitive marketing phrases and AI vocabulary filler.', weightContribution: 35 },
      { name: 'Expert Subject Depth', description: 'Presence of comprehensive factual details over generic bulleted overviews.', weightContribution: 25 }
    ]
  },
  {
    id: 'performance',
    name: 'Performance',
    weight: 10,
    color: 'bg-amber-600',
    accentColor: 'text-amber-600 border-amber-100 bg-amber-50/50',
    icon: Activity,
    description: 'Validates standard Core Web Vitals speed points, load latencies, and layout visual shifts to ensure lightweight indexation.',
    factors: [
      { name: 'Largest Contentful Paint (LCP)', description: 'Measures the time taken to render the primary visual block under 2.5s.', weightContribution: 40 },
      { name: 'Total Blocking Time (TBT)', description: 'Audits background script execution blocking main thread responsiveness.', weightContribution: 35 },
      { name: 'Cumulative Layout Shift (CLS)', description: 'Validates visual framework structural stability during rendering.', weightContribution: 25 }
    ]
  },
  {
    id: 'security_compliance',
    name: 'Security & Compliance',
    weight: 10,
    color: 'bg-emerald-600',
    accentColor: 'text-emerald-600 border-emerald-100 bg-emerald-50/50',
    icon: Compass,
    description: 'Verifies transport encryptions, safety configurations, and image alt content accessibility standards.',
    factors: [
      { name: 'HTTPS Transport Protection', description: 'Requires secured network configurations covering all asset paths.', weightContribution: 45 },
      { name: 'ADA Alt Accessibility', description: 'Requires descriptive helper attributes on all media indicators.', weightContribution: 35 },
      { name: 'Metadata Safety Profile', description: 'Guards against malicious redirects and hidden script overlays.', weightContribution: 20 }
    ]
  },
  {
    id: 'analytics_measurement',
    name: 'Analytics & Measurement',
    weight: 10,
    color: 'bg-rose-500',
    accentColor: 'text-rose-500 border-rose-100 bg-rose-50/50',
    icon: BarChart,
    description: 'Audits presence of tracking infrastructure, clean redirection chains, structure graphs, and user event monitoring systems.',
    factors: [
      { name: 'Tracking Scripts Presence', description: 'Verifies tracking or monitoring infrastructure handles page feedback.', weightContribution: 40 },
      { name: 'Event Call-To-Action (CTA) Coverage', description: 'Presence of clear conversion goals and structured tag names.', weightContribution: 35 },
      { name: 'Data Layer Accessibility', description: 'Encourages standardized semantic tracking variables for precise audit maps.', weightContribution: 25 }
    ]
  }
];

export function ScoringModelPanel({ pages = [], stats, onPageSelect, selectedPageUrl }: ScoringModelPanelProps) {
  // Dimension weights state
  const [weights, setWeights] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('seo_custom_weights');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Fallback
      }
    }
    return {
      tech_readiness: 20,
      ai_seo: 20,
      ux_personalization: 15,
      content_quality: 15,
      performance: 10,
      security_compliance: 10,
      analytics_measurement: 10
    };
  });

  // Selected Page URL
  const [activeUrl, setActiveUrl] = useState<string>('');

  useEffect(() => {
    if (selectedPageUrl && pages.some(p => p.url === selectedPageUrl)) {
      setActiveUrl(selectedPageUrl);
    } else if (pages.length > 0 && !activeUrl) {
      setActiveUrl(pages[0].url);
    }
  }, [selectedPageUrl, pages]);

  const activePage = pages.find(p => p.url === activeUrl) || pages[0] || null;

  // Handle single weight change
  const handleWeightChange = (id: string, value: number) => {
    const nextWeights = { ...weights, [id]: value };
    setWeights(nextWeights);
    localStorage.setItem('seo_custom_weights', JSON.stringify(nextWeights));
  };

  // Reset to default weights
  const resetWeights = () => {
    const defaults = {
      tech_readiness: 20,
      ai_seo: 20,
      ux_personalization: 15,
      content_quality: 15,
      performance: 10,
      security_compliance: 10,
      analytics_measurement: 10
    };
    setWeights(defaults);
    localStorage.setItem('seo_custom_weights', JSON.stringify(defaults));
  };

  // Sum of weights to display warning if not exactly 100% (or normalize dynamically)
  const sumOfWeights = Object.values(weights).reduce((a, b) => a + b, 0);
  const isSumNormal = sumOfWeights === 100;

  // Function to calculate scores for a specific page using assigned weights
  const evaluatePageScores = (page: SEOPage | null) => {
    if (!page) {
      return {
        overall: 0,
        breakdown: {
          tech_readiness: 0,
          ai_seo: 0,
          ux_personalization: 0,
          content_quality: 0,
          performance: 0,
          security_compliance: 0,
          analytics_measurement: 0
        },
        factorChecks: {} as Record<string, boolean>
      };
    }

    // Normalized weights to guarantee score fits 100 max range even if weights don't sum to 100
    const normFactor = sumOfWeights > 0 ? 100 / sumOfWeights : 1;

    // Check factors values dynamically based on real data
    const checks: Record<string, boolean> = {
      // Tech readiness
      schema_markup: page.structuredData && page.structuredData.length > 0,
      robots_txt: stats?.hasRobots ?? true,
      canonical_conf: !!page.canonical,
      
      // AI SEO
      geo_brand: (page.geoAudit?.bvs ?? page.geoScore ?? 65) > 60,
      nl_query: [...(page.headers?.h1 || []), ...(page.headers?.h2 || []), ...(page.headers?.h3 || [])].join(' ').toLowerCase().match(/(what|how|why|who|guide|best|tips)/i) !== null,
      topical_breadth: (page.keywords && page.keywords.length >= 4),

      // UX & Personalization
      content_ratio: page.textToCodeRatio >= 12,
      headings_hierarchy: (page.headers?.h1 || []).length === 1,
      routing: (page.links?.internal || []).length >= 2,

      // Content Quality
      semantic_uniq: page.aiPlagiarism ? (page.aiPlagiarism.uniquenessIndex > 60) : (page.wordCount > 500),
      tone_coherence: page.aiPlagiarism ? (page.aiPlagiarism.clicheDensity < 12) : true,
      subject_depth: page.wordCount > 600,

      // Performance
      lcp_cwv: (page.performance?.lcp ?? 1.8) < 2.5,
      tbt_bg: (page.performance?.tbt ?? 150) < 300,
      cls_stability: (page.performance?.cls ?? 0.08) < 0.1,

      // Security
      https_transport: page.url.startsWith('https://'),
      alt_accessibility: page.imageMetrics ? (page.imageMetrics.missingAlt === 0) : true,
      safety_profile: page.statusCode === 200,

      // Analytics
      tracking_exists: (page.links?.external || []).length > 2 || page.structuredData?.length > 1,
      cta_coverage: page.wordCount > 300 && (page.links?.internal || []).length > 0,
      dataLayer_open: page.structuredData?.length > 0
    };

    // Calculate details score for each dimension (0-100 scale)
    const breakdown = {
      tech_readiness: Math.round(
        (checks.schema_markup ? 40 : 10) +
        (checks.robots_txt ? 30 : 5) +
        (checks.canonical_conf ? 30 : 5)
      ),
      ai_seo: Math.round(
        (checks.geo_brand ? 40 : 15) +
        (checks.nl_query ? 35 : 10) +
        (checks.topical_breadth ? 25 : 10)
      ),
      ux_personalization: Math.round(
        (checks.content_ratio ? 40 : 15) +
        (checks.headings_hierarchy ? 35 : 15) +
        (checks.routing ? 25 : 10)
      ),
      content_quality: Math.round(
        (checks.semantic_uniq ? 40 : 15) +
        (checks.tone_coherence ? 35 : 10) +
        (checks.subject_depth ? 25 : 10)
      ),
      performance: Math.round(
        page.performance?.performanceScore ?? 75
      ),
      security_compliance: Math.round(
        (checks.https_transport ? 45 : 10) +
        (checks.alt_accessibility ? 35 : 10) +
        (checks.safety_profile ? 20 : 0)
      ),
      analytics_measurement: Math.round(
        (checks.tracking_exists ? 40 : 15) +
        (checks.cta_coverage ? 35 : 10) +
        (checks.dataLayer_open ? 25 : 10)
      )
    };

    // Max cap values
    Object.keys(breakdown).forEach(k => {
      const key = k as keyof typeof breakdown;
      breakdown[key] = Math.min(100, Math.max(5, breakdown[key]));
    });

    // Calculate weighted sum
    let weightedSum = 0;
    const modelKeys = Object.keys(weights);
    modelKeys.forEach(k => {
      const key = k as keyof typeof weights;
      const dimensionScore = breakdown[key as keyof typeof breakdown] || 0;
      weightedSum += dimensionScore * (weights[key] || 0);
    });

    const overall = sumOfWeights > 0 ? Math.round((weightedSum / sumOfWeights)) : 0;

    return {
      overall,
      breakdown,
      factorChecks: checks
    };
  };

  const currentResult = evaluatePageScores(activePage);

  // Radar data formatting
  const radarData = DEFAULT_DIMENSIONS.map(d => ({
    subject: d.name,
    score: currentResult.breakdown[d.id as keyof typeof currentResult.breakdown] || 0,
    fullMark: 100
  }));

  // Leaderboard data
  const pageLeaderboard = pages.map((p, idx) => {
    const res = evaluatePageScores(p);
    return {
      url: p.url,
      title: p.title || p.url.replace(/https?:\/\/(www\.)?/, '').substring(0, 30),
      score: res.overall,
      breakdown: res.breakdown
    };
  }).sort((a, b) => b.score - a.score);

  const getPageShortName = (url: string) => {
    try {
      const parsed = new URL(url);
      return parsed.pathname === '/' ? '/' : parsed.pathname;
    } catch {
      return url.length > 25 ? url.substring(0, 25) + '...' : url;
    }
  };

  return (
    <div className="space-y-10" id="scoring-model-workspace">
      {/* Upper Information Banner */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 border-b border-slate-100 pb-8">
        <div>
          <div className="flex items-center gap-2.5 text-[10px] font-black text-blue-600 uppercase tracking-[0.4em] mb-3">
            <Scale size={13} className="shrink-0" />
            <span>Analytical Calibration Engine</span>
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none italic uppercase flex items-center gap-3">
            AI Website Audit Scoring Model
          </h2>
          <p className="text-sm font-medium text-slate-500 leading-relaxed mt-3 max-w-2xl">
            Evaluate scanned pages using a customizable multi-criteria weight model mapping directly to technical readiness, search retrieval, content uniqueness, and compliance safety.
          </p>
        </div>
        
        <div className="flex items-center gap-3 shrink-0">
          <button 
            onClick={resetWeights}
            className="px-4 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-bold font-mono text-[11px] uppercase tracking-wider flex items-center gap-2 active:scale-95 transition-all"
          >
            <RotateCcw size={12} />
            <span>Reset to Defaults</span>
          </button>
        </div>
      </div>

      {pages.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 border border-slate-200 rounded-[32px] bg-slate-50/40 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
            <Sliders size={24} />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-800">No Web Crawl Data Found</h3>
            <p className="text-xs font-medium text-slate-400 max-w-sm mt-1">Please insert a target URL and crawl the pages first to evaluate them against the AI website grading model.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT: CALIBRATION WORKSPACE & SLIDERS (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 border border-slate-200 rounded-[30px] bg-white shadow-xs space-y-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal size={14} className="text-slate-650" />
                  <span className="text-xs font-black uppercase tracking-widest text-slate-900">Calibration Panel</span>
                </div>
                <div className={cn(
                  "px-2.5 py-1 rounded-lg text-[9px] font-black border uppercase tracking-wider flex items-center gap-1.5",
                  isSumNormal ? "bg-emerald-50/80 text-emerald-700 border-emerald-100" : "bg-amber-50 text-amber-700 border-amber-200"
                )}>
                  {isSumNormal ? (
                    <>
                      <ShieldCheck size={11} className="text-emerald-600" />
                      <span>SUM: EXACTLY 100%</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle size={11} className="text-amber-600" />
                      <span>Calibrating ({sumOfWeights}%)</span>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-5">
                {DEFAULT_DIMENSIONS.map((dim) => {
                  const Icon = dim.icon;
                  const currentVal = weights[dim.id] || 0;
                  const normalizedPercentage = sumOfWeights > 0 ? Math.round((currentVal / sumOfWeights) * 100) : 0;
                  
                  return (
                    <div key={dim.id} className="space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className={cn("p-1.5 rounded-lg border", dim.accentColor)}>
                            <Icon size={12} className="shrink-0" />
                          </div>
                          <div>
                            <span className="text-[11px] font-bold text-slate-900 block truncate">{dim.name}</span>
                            <span className="text-[9px] font-medium text-slate-400 block font-mono">Normalized: {normalizedPercentage}%</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 font-mono text-right shrink-0">
                          <span className="text-xs font-black text-slate-800">{currentVal}%</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <input 
                          type="range"
                          min="0"
                          max="40"
                          step="1"
                          value={currentVal}
                          onChange={(e) => handleWeightChange(dim.id, parseInt(e.target.value) || 0)}
                          className="h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer flex-1 accent-blue-600"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {!isSumNormal && (
                <div className="p-3 border border-amber-150 rounded-xl bg-amber-50/50 flex gap-2.5 items-start text-[10px] text-amber-800 leading-relaxed font-medium">
                  <Info size={14} className="text-amber-600 shrink-0 mt-0.5" />
                  <p>
                    Weights total is currently <strong className="font-mono">{sumOfWeights}%</strong> instead of 100%. The mathematical model will automatically normalize evaluations in real-time to preserve grades based on accurate relative weighting coefficients.
                  </p>
                </div>
              )}
            </div>

            {/* Quick Summary Reference Card */}
            <div className="p-6 border border-slate-200 rounded-[30px] bg-slate-50/40 space-y-4">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Scoring Architecture Guidelines</h4>
              <div className="space-y-4 text-xs text-slate-600 leading-relaxed font-normal">
                <p>
                  This model establishes standardized parameters evaluating how content performs on modern search interfaces and crawls.
                </p>
                <div className="space-y-2.5">
                  <div className="flex gap-2.5 items-start">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0 mt-1.5" />
                    <span><strong>Technical & AI SEO</strong> (40% sum) prioritize structural readability for AI bots and search layout crawlers.</span>
                  </div>
                  <div className="flex gap-2.5 items-start">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-650 shrink-0 mt-1.5" />
                    <span><strong>UX & Content Quality</strong> (30% sum) monitor narrative authenticity, original information gain, and reading efficiency.</span>
                  </div>
                  <div className="flex gap-2.5 items-start">
                    <div className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0 mt-1.5" />
                    <span><strong>Performance, Security & Tracking</strong> (30% sum) verify Core Web Vitals criteria speeds, security protocols, and event loops.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: LIVE RESULT & GRAPH (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Active URL selector */}
            <div className="p-4 border border-slate-200 rounded-2xl bg-white shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0 self-start sm:self-center">
                <Globe size={14} className="text-slate-400 shrink-0" />
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Target Page:</span>
                <span className="text-xs font-bold text-slate-800 truncate ml-1">{getPageShortName(activeUrl)}</span>
              </div>
              <select
                value={activeUrl}
                onChange={(e) => {
                  setActiveUrl(e.target.value);
                  if (onPageSelect) {
                    const found = pages.find(p => p.url === e.target.value);
                    if (found) onPageSelect(found);
                  }
                }}
                className="w-full sm:w-[220px] bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold font-sans text-slate-700 outline-none focus:ring-2 focus:ring-blue-600/10 focus:border-blue-600/30 transition-all cursor-pointer shrink-0"
              >
                {pages.map((p) => (
                  <option key={p.url} value={p.url}>
                    {p.title ? `${p.title.substring(0, 30)}...` : getPageShortName(p.url)}
                  </option>
                ))}
              </select>
            </div>

            {/* Score Summary Billboard Visualizer */}
            <div className="p-6 md:p-8 border border-slate-200 rounded-[35px] bg-white shadow-xs relative overflow-hidden space-y-8">
              <div className="absolute top-0 right-0 w-44 h-44 bg-blue-500/[0.02] rounded-full blur-[50px] pointer-events-none" />
              
              <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                {/* Dial Circle */}
                <div className="flex flex-col items-center text-center shrink-0">
                  <div className="relative w-36 h-36 flex items-center justify-center">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="72"
                        cy="72"
                        r="64"
                        className="stroke-slate-100"
                        strokeWidth="10"
                        fill="transparent"
                      />
                      <circle
                        cx="72"
                        cy="72"
                        r="64"
                        className="stroke-blue-600 transition-all duration-1000 ease-out"
                        strokeWidth="10"
                        fill="transparent"
                        strokeDasharray={402}
                        strokeDashoffset={402 - (402 * currentResult.overall) / 100}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                      <span className="text-[10px] font-black uppercase text-slate-405 tracking-widest leading-none">Grade</span>
                      <span className="text-4xl font-black text-slate-900 tracking-tighter italic mt-1">{currentResult.overall}%</span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <span className={cn(
                      "px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest border",
                      currentResult.overall >= 80 ? "bg-emerald-50 text-emerald-700 border-emerald-155" :
                      currentResult.overall >= 50 ? "bg-amber-50 text-amber-700 border-amber-155" :
                      "bg-rose-50 text-rose-700 border-rose-155"
                    )}>
                      {currentResult.overall >= 80 ? 'Excellent AI Alignment' :
                       currentResult.overall >= 50 ? 'Moderate Readiness' : 'Sub-optimal Readiness'}
                    </span>
                  </div>
                </div>

                {/* Radar/Area Breakdown Chart */}
                <div className="flex-1 w-full h-[180px] flex items-center justify-center min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                      <PolarGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                      <PolarAngleAxis 
                        dataKey="subject" 
                        tick={{ fill: '#64748b', fontSize: 8, fontWeight: 700, fontFamily: 'monospace' }} 
                      />
                      <PolarRadiusAxis 
                        angle={30} 
                        domain={[0, 100]} 
                        tick={{ fill: '#94a3b8', fontSize: 8 }} 
                      />
                      <Radar
                        name="Page Ready Profile"
                        dataKey="score"
                        stroke="#3b82f6"
                        fill="#2563eb"
                        fillOpacity={0.12}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Subordinate factor checkpoints */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-6">
                <div>
                  <h5 className="text-[10px] font-black tracking-widest uppercase text-slate-400 mb-3 flex items-center gap-1.5">
                    <CheckCircle2 size={11} className="text-emerald-500" />
                    <span>Passed Quality Markers</span>
                  </h5>
                  <div className="space-y-1.5">
                    {/* Filter out checks that elements are true */}
                    {Object.entries(currentResult.factorChecks)
                      .filter(([_, val]) => val === true)
                      .slice(0, 4)
                      .map(([key, _]) => {
                        const words = key.replace(/_/g, ' ');
                        return (
                          <div key={key} className="flex gap-2 items-center text-[11px] font-mono text-slate-600">
                            <span className="w-3.5 h-3.5 rounded bg-emerald-50 border border-emerald-150 flex items-center justify-center shrink-0">
                              <Check size={9} className="text-emerald-600" />
                            </span>
                            <span className="capitalize">{words}</span>
                          </div>
                        );
                      })}
                    {Object.entries(currentResult.factorChecks).filter(([_, val]) => val === true).length === 0 && (
                      <span className="text-[10px] text-slate-400 italic">No positive signals detected</span>
                    )}
                  </div>
                </div>

                <div>
                  <h5 className="text-[10px] font-black tracking-widest uppercase text-slate-405 mb-3 flex items-center gap-1.5">
                    <AlertTriangle size={11} className="text-amber-500" />
                    <span>Areas Requiring Optimization</span>
                  </h5>
                  <div className="space-y-1.5">
                    {Object.entries(currentResult.factorChecks)
                      .filter(([_, val]) => val === false)
                      .slice(0, 4)
                      .map(([key, _]) => {
                        const words = key.replace(/_/g, ' ');
                        return (
                          <div key={key} className="flex gap-2 items-center text-[11px] font-mono text-slate-500">
                            <span className="w-3.5 h-3.5 rounded bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
                              <AlertTriangle size={9} className="text-rose-500" />
                            </span>
                            <span className="capitalize text-slate-550">{words}</span>
                          </div>
                        );
                      })}
                    {Object.entries(currentResult.factorChecks).filter(([_, val]) => val === false).length === 0 && (
                      <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100/40 font-mono">
                        Perfect Score Compliance!
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Dimensional Expansion Matrix */}
            <div className="p-6 border border-slate-200 rounded-[30px] bg-white shadow-xs space-y-4">
              <div className="flex gap-2 items-center border-b border-slate-100 pb-3">
                <ListChecks size={14} className="text-slate-500" />
                <span className="text-xs font-black uppercase tracking-widest text-slate-900">Dimension Score Mappings</span>
              </div>

              <div className="space-y-3.5 pt-1.5">
                {DEFAULT_DIMENSIONS.map((dim) => {
                  const score = currentResult.breakdown[dim.id as keyof typeof currentResult.breakdown] || 0;
                  const currentWeight = weights[dim.id] || 0;
                  const scoreContribution = sumOfWeights > 0 ? ((score * currentWeight) / sumOfWeights).toFixed(1) : '0';
                  
                  return (
                    <div key={dim.id} className="p-3.5 border border-slate-100 rounded-xl hover:border-slate-200 hover:bg-slate-50/10 transition-all">
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1 max-w-[75%]">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-black text-slate-900">{dim.name}</span>
                            <span className="text-[9px] font-mono bg-slate-50 text-slate-500 border border-slate-150 px-1.5 py-0.5 rounded">
                              Weight: {currentWeight}%
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-450 leading-relaxed">
                            {dim.description}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-xs font-black text-slate-900">{score}/100</div>
                          <div className="text-[9px] font-mono text-slate-400 mt-1">Contrib: +{scoreContribution}%</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Leaderboard comparisons table element */}
            <div className="p-6 border border-slate-200 rounded-[30px] bg-white shadow-xs space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div className="flex gap-2 items-center">
                  <TrendingUp size={14} className="text-slate-500" />
                  <span className="text-xs font-black uppercase tracking-widest text-slate-900">Scoring Leaderboard</span>
                </div>
                <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest">
                  {pages.length} Pages Audited
                </span>
              </div>

              <div className="overflow-x-auto min-w-full">
                <table className="min-w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[8px] font-mono">
                      <th className="py-2.5">Url / Path</th>
                      <th className="text-center py-2.5">Custom Calc Score</th>
                      <th className="text-right py-2.5">Category Metrics Breakdown</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pageLeaderboard.map((item) => (
                      <tr 
                        key={item.url} 
                        className={cn(
                          "hover:bg-slate-50/50 cursor-pointer transition-colors",
                          item.url === activeUrl ? "bg-blue-50/20 font-bold" : ""
                        )}
                        onClick={() => {
                          setActiveUrl(item.url);
                          if (onPageSelect) {
                            const found = pages.find(p => p.url === item.url);
                            if (found) onPageSelect(found);
                          }
                        }}
                      >
                        <td className="py-3.5 pr-4 truncate max-w-[200px] font-medium text-slate-700">
                          <div className="flex items-center gap-2">
                            {item.url === activeUrl && <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />}
                            <span className="truncate block leading-none">{getPageShortName(item.url)}</span>
                          </div>
                          {item.title && <span className="text-[9px] text-slate-400 font-normal truncate block mt-1">{item.title}</span>}
                        </td>
                        <td className="text-center py-3.5">
                          <span className={cn(
                            "px-2 py-0.5 rounded-md font-mono font-black text-[10px] tracking-tight border",
                            item.score >= 80 ? "bg-emerald-50 text-emerald-700 border-emerald-150" :
                            item.score >= 50 ? "bg-amber-50 text-amber-700 border-amber-150" :
                            "bg-rose-50 text-rose-700 border-rose-150"
                          )}>
                            {item.score}%
                          </span>
                        </td>
                        <td className="text-right py-3.5 pl-4">
                          <div className="flex gap-1.5 justify-end items-center">
                            {DEFAULT_DIMENSIONS.map(dim => {
                              const scoreVal = item.breakdown[dim.id as keyof typeof item.breakdown] || 0;
                              return (
                                <div key={dim.id} className="relative group/mini shrink-0">
                                  <div className={cn(
                                    "w-3 h-3 rounded-full border border-white flex items-center justify-center text-[5px] font-bold text-white",
                                    scoreVal >= 80 ? "bg-emerald-500" :
                                    scoreVal >= 50 ? "bg-amber-500" :
                                    "bg-rose-500"
                                  )}>
                                    {scoreVal >= 80 ? '✓' : '!'}
                                  </div>
                                  <div className="absolute bottom-full right-1/2 translate-x-1/2 mb-1.5 hidden group-hover/mini:block bg-slate-900 border border-slate-950 text-white p-1.5 rounded text-[8px] font-sans font-normal whitespace-nowrap z-50 shadow-md">
                                    <div className="font-bold">{dim.name}</div>
                                    <div>Score: {scoreVal}/100 | Click to select url</div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
