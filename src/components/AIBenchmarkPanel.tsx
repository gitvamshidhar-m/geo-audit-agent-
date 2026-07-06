import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  TrendingUp, 
  HelpCircle, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  Globe, 
  Sparkles, 
  Bot, 
  Layers, 
  Cpu, 
  FileText, 
  Sliders, 
  ChevronRight, 
  Info,
  ShieldAlert,
  Users,
  Award,
  PenTool,
  ArrowUpRight,
  Zap,
  Check,
  RefreshCcw,
  Target
} from 'lucide-react';
import { SEOPage } from '../types/seo';
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
  Legend
} from 'recharts';

interface Competitor {
  id: string;
  name: string;
  url: string;
  isMainSite?: boolean;
  metrics: {
    ai_search_visibility: number; // 0-100
    chatbot_quality: number; // 0-100
    personalization: number; // 0-100
    content_depth: number; // 0-100
    automation_maturity: number; // 0-100
  };
  notes: string;
}

interface AIBenchmarkPanelProps {
  pages: SEOPage[];
  selectedPageUrl?: string;
  targetDomain?: string;
}

const BENCHMARK_METRICS = [
  {
    id: 'ai_search_visibility',
    name: 'AI Search Visibility',
    icon: Sparkles,
    color: 'emerald',
    description: 'Calculates references and crawl presence in new LLMs, Perplexity citations, Gemini AI summaries, and Search Generative Experience grids.',
    indicators: ['XML Schema Richness', 'Key Term Prominence', 'Entity Citation Ratios']
  },
  {
    id: 'chatbot_quality',
    name: 'Chatbot & Assistant Quality',
    icon: Bot,
    color: 'blue',
    description: 'Evaluates the integration of advanced conversational AI assistants, context retention abilities, system safety bounds, and active support automation layers.',
    indicators: ['RAG Context Depth', 'Evasion Resilience', 'Action API Integration']
  },
  {
    id: 'personalization',
    name: 'UX & Personalization',
    icon: Layers,
    color: 'indigo',
    description: 'Measures adaptive user interface components, predictive user flow routing, semantic suggestions, and layout personalization dynamically adjusted by visitor behavior.',
    indicators: ['Dynamic Flow Routing', 'Responsive View Rendering', 'Context Preservation']
  },
  {
    id: 'content_depth',
    name: 'AI-Enhanced Content Depth',
    icon: FileText,
    color: 'violet',
    description: 'Checks semantic value scores, density of information gains, authentic subject expertise, and isolation of synthetic boilerplate filler.',
    indicators: ['Topical Autonomy', 'Original Data Density', 'Linguistic Style Richness']
  },
  {
    id: 'automation_maturity',
    name: 'Process & Code Automation',
    icon: Cpu,
    color: 'amber',
    description: 'Exposes back-office automation loops, standard tracking scripts correctness, structured data graphs, and serverless optimization speeds.',
    indicators: ['Crawl-bot Compatibility', 'Structural Metadata APIs', 'Lighthouse Vitals Indices']
  }
];

export function AIBenchmarkPanel({ pages = [], selectedPageUrl, targetDomain }: AIBenchmarkPanelProps) {
  const [competitors, setCompetitors] = useState<Competitor[]>(() => {
    const saved = localStorage.getItem('seo_ai_competitors');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Fallback
      }
    }

    // Default seed data holds only user's site by default so they enter competitors manually
    return [
      {
        id: 'main',
        name: targetDomain || 'My Audited Site',
        url: targetDomain ? `https://${targetDomain}` : 'https://mysite.com',
        isMainSite: true,
        metrics: {
          ai_search_visibility: 65,
          chatbot_quality: 45,
          personalization: 50,
          content_depth: 70,
          automation_maturity: 60
        },
        notes: 'Primary benchmark reference. Adjust metrics based on your actual capabilities.'
      }
    ];
  });

  const [activeCompetitorId, setActiveCompetitorId] = useState<string>('main');
  const [selectedMetricId, setSelectedMetricId] = useState<string>('ai_search_visibility');
  
  // Custom competitor form modal/states
  const [isAdding, setIsAdding] = useState(false);
  const [newCompName, setNewCompName] = useState('');
  const [newCompUrl, setNewCompUrl] = useState('');
  const [newCompNotes, setNewCompNotes] = useState('');
  const [newCompMetrics, setNewCompMetrics] = useState({
    ai_search_visibility: 50,
    chatbot_quality: 50,
    personalization: 50,
    content_depth: 50,
    automation_maturity: 50
  });

  // Persist competitors
  const saveCompetitors = (updated: Competitor[]) => {
    setCompetitors(updated);
    localStorage.setItem('seo_ai_competitors', JSON.stringify(updated));
  };

  // Sync main competitor URL and metrics if real audit data matches or loads
  useEffect(() => {
    if (pages.length > 0) {
      // Calculate a sensible default state benchmark based on real crawled data
      const averageWordCount = pages.reduce((acc, p) => acc + p.wordCount, 0) / pages.length;
      const averageLcp = pages.reduce((acc, p) => acc + (p.performance?.lcp ?? 2), 0) / pages.length;
      const hasSchemasCount = pages.filter(p => p.structuredData && p.structuredData.length > 0).length;
      const hasSchemasRatio = hasSchemasCount / pages.length;

      // Map to scores
      const visibility = Math.round(Math.min(95, 40 + (hasSchemasRatio * 50)));
      const chat = pages.some(p => (p.bodyText || "").toLowerCase().includes('chat') || (p.bodyText || "").toLowerCase().includes('bot')) ? 75 : 30;
      const personal = pages.some(p => p.textToCodeRatio > 15) ? 65 : 45;
      const depth = Math.round(Math.min(98, 30 + (averageWordCount / 20)));
      const automation = Math.round(Math.min(95, averageLcp < 2.5 ? 80 : 55));

      setCompetitors(prev => {
        const index = prev.findIndex(c => c.id === 'main');
        if (index === -1) return prev;
        
        const updated = [...prev];
        // Only update if placeholder name is active or domain synced
        const formattedDomainName = targetDomain || 'My Audited Site';
        updated[index] = {
          ...updated[index],
          name: formattedDomainName + ' (Scanned Page)',
          url: targetDomain ? `https://${targetDomain}` : updated[index].url,
          metrics: {
            ai_search_visibility: visibility,
            chatbot_quality: chat,
            personalization: personal,
            content_depth: depth,
            automation_maturity: automation
          }
        };
        return updated;
      });
    }
  }, [pages, targetDomain]);

  // Handle slider changes for currently active competitor
  const handleMetricChange = (metricId: keyof Competitor['metrics'], value: number) => {
    const updated = competitors.map(c => {
      if (c.id === activeCompetitorId) {
        return {
          ...c,
          metrics: {
            ...c.metrics,
            [metricId]: value
          }
        };
      }
      return c;
    });
    saveCompetitors(updated);
  };

  // Handle note change
  const handleNoteChange = (text: string) => {
    const updated = competitors.map(c => {
      if (c.id === activeCompetitorId) {
        return { ...c, notes: text };
      }
      return c;
    });
    saveCompetitors(updated);
  };

  // Handle name change
  const handleNameChange = (name: string) => {
    const updated = competitors.map(c => {
      if (c.id === activeCompetitorId) {
        return { ...c, name };
      }
      return c;
    });
    saveCompetitors(updated);
  };

  // Handle URL change
  const handleUrlChange = (url: string) => {
    const updated = competitors.map(c => {
      if (c.id === activeCompetitorId) {
        return { ...c, url };
      }
      return c;
    });
    saveCompetitors(updated);
  };

  // Add Competitor
  const handleAddCompetitor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompName.trim()) return;

    const newComp: Competitor = {
      id: `competitor_${Date.now()}`,
      name: newCompName,
      url: newCompUrl || 'https://example.com',
      metrics: { ...newCompMetrics },
      notes: newCompNotes.trim() || 'New competitor added for AI maturity evaluation. Edit metrics to compare profiles.'
    };

    const nextList = [...competitors, newComp];
    saveCompetitors(nextList);
    setActiveCompetitorId(newComp.id);
    setNewCompName('');
    setNewCompUrl('');
    setNewCompNotes('');
    setNewCompMetrics({
      ai_search_visibility: 50,
      chatbot_quality: 50,
      personalization: 50,
      content_depth: 50,
      automation_maturity: 50
    });
    setIsAdding(false);
  };

  // Delete Competitor
  const handleDeleteCompetitor = (id: string) => {
    if (id === 'main') return; // Cannot delete base reference
    const filtered = competitors.filter(c => c.id !== id);
    saveCompetitors(filtered);
    if (activeCompetitorId === id) {
      setActiveCompetitorId('main');
    }
  };

  // Format Recharts data for radar/bar comparisons safely
  const formattedRadarData = BENCHMARK_METRICS.map(m => {
    const dataRow: Record<string, any> = { subject: m.name };
    (competitors || []).forEach(comp => {
      if (comp && comp.name) {
        dataRow[comp.name] = comp.metrics?.[m.id as keyof Competitor['metrics']] || 0;
      }
    });
    return dataRow;
  });

  // Safe fallback for My Site and competitors if blank or modified
  const mySite = (competitors && competitors.find(c => c.id === 'main')) || (competitors && competitors[0]) || {
    id: 'main',
    name: 'My Audited Site',
    url: '',
    metrics: {
      ai_search_visibility: 0,
      chatbot_quality: 0,
      personalization: 0,
      content_depth: 0,
      automation_maturity: 0
    },
    notes: 'Primary benchmark reference.'
  };

  const activeCompetitor = (competitors && competitors.find(c => c.id === activeCompetitorId)) || (competitors && competitors[0]) || mySite;
  const selectedMetric = BENCHMARK_METRICS.find(m => m.id === selectedMetricId) || BENCHMARK_METRICS[0];

  // Colors dictionary for rendering paths/series in Recharts
  const SERIES_CHART_COLORS = ['#3b82f6', '#f43f5e', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899'];

  // Identify who is the leader in the selected metric area safely
  const getLeaderForMetric = (metricId: string) => {
    let topVal = -1;
    let leaderName = '';
    (competitors || []).forEach(c => {
      if (c && c.metrics) {
        const val = c.metrics[metricId as keyof Competitor['metrics']] || 0;
        if (val > topVal) {
          topVal = val;
          leaderName = c.name;
        }
      }
    });
    return { name: leaderName || 'No Leader', score: Math.max(0, topVal) };
  };

  const currentLeader = getLeaderForMetric(selectedMetricId);

  // Computes gap of My Site compared to the top score safely
  const myScore = mySite.metrics?.[selectedMetricId as keyof Competitor['metrics']] || 0;
  const topScore = competitors && competitors.length > 0
    ? Math.max(...competitors.map(c => c.metrics?.[selectedMetricId as keyof Competitor['metrics']] || 0))
    : 0;
  const gapToTop = topScore - myScore;

  return (
    <div className="space-y-10" id="ai-benchmarking-panel">
      {/* Header Area */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 border-b border-slate-100 pb-8">
        <div>
          <div className="flex items-center gap-2.5 text-[10px] font-black text-rose-600 uppercase tracking-[0.4em] mb-3">
            <TrendingUp size={13} className="shrink-0 animate-pulse" />
            <span>Competitive Matrix Scope</span>
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none italic uppercase flex items-center gap-3">
            Competitive AI Benchmarking
          </h2>
          <p className="text-sm font-medium text-slate-500 leading-relaxed mt-3 max-w-2xl">
            Audit and map your digital assets against direct market competitors. Benchmark AI search indexing presence, assistant integrations, UX personalization depths, and automation maturity levels.
          </p>
        </div>

        <button
          onClick={() => setIsAdding(true)}
          className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95 shrink-0"
        >
          <Plus size={14} />
          <span>Add Competitor</span>
        </button>
      </div>

      {/* Add Competitor Dialog Inline */}
      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-6 border border-slate-200 rounded-3xl bg-slate-50 relative overflow-hidden"
          >
            <form onSubmit={handleAddCompetitor} className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <Plus size={16} className="text-slate-900" />
                  <span className="text-xs font-black uppercase tracking-widest text-slate-900">Add New Benchmark Entity</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold">
                  Preset Competitor Metrics Manually
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Brand Metadata Block */}
                <div className="lg:col-span-4 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Competitor Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Apex Solutions Inc"
                      value={newCompName}
                      onChange={(e) => setNewCompName(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-850 outline-none focus:ring-2 focus:ring-slate-400/20 transition-all font-sans"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Domain / Website URL</label>
                    <input
                      type="text"
                      placeholder="e.g. apexsolutions.net"
                      value={newCompUrl}
                      onChange={(e) => setNewCompUrl(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-850 outline-none focus:ring-2 focus:ring-slate-400/20 transition-all font-sans"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Initial Brand Notes</label>
                    <textarea
                      rows={2}
                      placeholder="Specify strategic focus or notes..."
                      value={newCompNotes}
                      onChange={(e) => setNewCompNotes(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-750 outline-none focus:ring-2 focus:ring-slate-400/20 transition-all font-sans resize-none"
                    />
                  </div>
                </div>

                {/* Score Preset Block */}
                <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block font-mono border-b border-slate-100 pb-2">Pre-set Initial Maturity Scores manually</span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {BENCHMARK_METRICS.map(m => {
                      const scoreKey = m.id as keyof typeof newCompMetrics;
                      const score = newCompMetrics[scoreKey];
                      return (
                        <div key={m.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="text-[10px] font-bold text-slate-700 truncate">{m.name}</span>
                          </div>
                          
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={score}
                              onChange={(e) => {
                                let val = parseInt(e.target.value);
                                if (isNaN(val)) val = 0;
                                val = Math.max(0, Math.min(100, val));
                                setNewCompMetrics(prev => ({
                                  ...prev,
                                  [scoreKey]: val
                                }));
                              }}
                              className="w-full bg-white border border-slate-200 rounded-lg py-1 px-2 text-xs font-mono font-bold text-slate-905 focus:ring-2 focus:ring-slate-200 outline-none"
                            />
                            <span className="text-xs text-slate-400 font-mono">%</span>
                          </div>

                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={score}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              setNewCompMetrics(prev => ({
                                ...prev,
                                [scoreKey]: val
                              }));
                            }}
                            className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Action row */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-xl font-bold uppercase tracking-wider text-xs active:scale-95 transition-all outline-none"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black uppercase tracking-wider rounded-xl text-xs active:scale-95 transition-all outline-none flex items-center gap-1.5"
                >
                  <Check size={14} />
                  <span>Save Benchmark Brand</span>
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT: Multi-competitor visual radar comparison chart & notes (8 cols) */}
        <div className="lg:col-span-8 space-y-8">
          {competitors.length <= 1 ? (
            <div className="p-8 border border-dashed border-slate-300 rounded-[35px] bg-slate-50/50 text-center space-y-5 shadow-xs">
              <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center text-slate-400 mx-auto border border-slate-200 shadow-sm">
                <Target size={22} className="text-slate-700 animate-pulse" />
              </div>
              <div className="max-w-md mx-auto space-y-2">
                <h3 className="text-base font-black text-slate-850">No Competitor Brands Indexed Yet</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                  To open the competitive AI maturity matrix, enter your actual market competitor brands. Start fully manual, or quickly load sample competitors to see demo data.
                </p>
              </div>
              <div className="flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsAdding(true)}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Plus size={13} />
                  <span>Enter Competitor Brand</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const demoData = [
                      {
                        id: 'main',
                        name: targetDomain || 'My Audited Site',
                        url: targetDomain ? `https://${targetDomain}` : 'https://mysite.com',
                        isMainSite: true,
                        metrics: competitors[0]?.metrics || {
                          ai_search_visibility: 65,
                          chatbot_quality: 45,
                          personalization: 50,
                          content_depth: 70,
                          automation_maturity: 60
                        },
                        notes: competitors[0]?.notes || 'Primary benchmark reference.'
                      },
                      {
                        id: 'competitor_1',
                        name: 'Apex Solutions Inc',
                        url: 'https://apexsolutions.net',
                        metrics: {
                          ai_search_visibility: 85,
                          chatbot_quality: 75,
                          personalization: 80,
                          content_depth: 60,
                          automation_maturity: 85
                        },
                        notes: 'Market leader in tech execution. Utilizes agentic chat support workflows and premium structured JSON schema blocks.'
                      },
                      {
                        id: 'competitor_2',
                        name: 'Vanguard Corp',
                        url: 'https://vanguard-agency.io',
                        metrics: {
                          ai_search_visibility: 40,
                          chatbot_quality: 30,
                          personalization: 35,
                          content_depth: 85,
                          automation_maturity: 45
                        },
                        notes: 'Traditional editorial competitor. Rich primary content data, but suffers from legacy servers, missing schemas, and zero automated assistants.'
                      }
                    ];
                    saveCompetitors(demoData);
                  }}
                  className="px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-55 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-all active:scale-95 cursor-pointer shadow-xs"
                >
                  Load Sample Brands
                </button>
              </div>
            </div>
          ) : (
            /* Main Visual Comparison Graph Board */
            <div className="p-6 md:p-8 border border-slate-200 rounded-[35px] bg-white shadow-xs space-y-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <BarChart size={15} className="text-slate-500" />
                  <span className="text-xs font-black uppercase tracking-widest text-slate-900">Maturity Radar Comparison</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 font-bold uppercase tracking-widest">
                  Active Benchmark: {competitors.length} Brands
                </span>
              </div>

              {/* Recharts container layout */}
              <div className="w-full h-[320px] flex items-center justify-center min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={formattedRadarData}>
                    <PolarGrid stroke="#e2e8f0" strokeDasharray="3 3" />
                    <PolarAngleAxis 
                      dataKey="subject" 
                      tick={{ fill: '#475569', fontSize: 9, fontWeight: 700, fontFamily: 'sans-serif' }} 
                    />
                    <PolarRadiusAxis 
                      angle={30} 
                      domain={[0, 100]} 
                      tick={{ fill: '#94a3b8', fontSize: 9 }} 
                    />
                    
                    {competitors.map((comp, idx) => {
                      const color = SERIES_CHART_COLORS[idx % SERIES_CHART_COLORS.length];
                      return (
                        <Radar
                          key={comp.id}
                          name={comp.name}
                          dataKey={comp.name}
                          stroke={color}
                          fill={color}
                          fillOpacity={comp.id === 'main' ? 0.08 : 0.02}
                          strokeWidth={comp.id === 'main' ? 3 : 1.5}
                        />
                      );
                    })}
                    
                    <Legend 
                      verticalAlign="bottom" 
                      height={36} 
                      wrapperStyle={{ fontSize: 10, fontWeight: 700, paddingTop: 12 }} 
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Tabular Comparer Matrix */}
              <div className="overflow-x-auto border-t border-slate-100 pt-6">
                <table className="min-w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-405 font-bold uppercase tracking-wider text-[8px] font-mono">
                      <th className="py-2">Competitor Brand</th>
                      {BENCHMARK_METRICS.map(m => (
                        <th key={m.id} className="text-center py-2">{m.name}</th>
                      ))}
                      <th className="text-right py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-650">
                    {competitors.map((comp) => (
                      <tr 
                        key={comp.id}
                        className={cn(
                          "hover:bg-slate-50/50 cursor-pointer transition-colors",
                          comp.id === activeCompetitorId ? "bg-slate-50 border-l-2 border-slate-900" : ""
                        )}
                        onClick={() => setActiveCompetitorId(comp.id)}
                      >
                        <td className="py-3.5 pr-2 font-black text-slate-800">
                          <div className="flex items-center gap-1.5">
                            {comp.id === 'main' && <div className="w-1.5 h-1.5 bg-blue-600 rounded-full" />}
                            <span className="truncate max-w-[140px] block">{comp.name}</span>
                          </div>
                          <span className="text-[9px] text-slate-450 truncate block max-w-[140px] font-normal font-mono">{comp.url}</span>
                        </td>

                        {BENCHMARK_METRICS.map(m => {
                          const score = comp.metrics[m.id as keyof Competitor['metrics']] || 0;
                          return (
                            <td key={m.id} className="text-center py-3.5">
                              <span className={cn(
                                "px-2 py-0.5 rounded font-mono font-bold text-[10px]",
                                score >= 80 ? "bg-emerald-50 text-emerald-700" :
                                score >= 50 ? "bg-amber-50 text-amber-700" :
                                "bg-rose-50 text-rose-700"
                              )}>
                                {score}%
                              </span>
                            </td>
                          );
                        })}

                        <td className="text-right py-3.5">
                          {comp.id === 'main' ? (
                            <span className="text-[9px] font-mono font-black uppercase text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                              Reference
                            </span>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCompetitor(comp.id);
                              }}
                              className="p-1 px-1.5 border border-slate-205 hover:border-rose-250 hover:text-rose-600 text-slate-400 bg-white rounded-md active:scale-90 transition-all shrink-0"
                              title="Remove Competitor"
                            >
                              <Trash2 size={11} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Metric Details Panel & Remediation Action Roadmap */}
          <div className="p-6 border border-slate-200 rounded-[35px] bg-white shadow-xs space-y-6">
            <div className="flex gap-2 items-center border-b border-slate-100 pb-3">
              <Award size={14} className="text-rose-600" />
              <span className="text-xs font-black uppercase tracking-widest text-slate-900">Competitive Gap Analysis</span>
            </div>

            {/* Metric selector tabs */}
            <div className="flex flex-wrap gap-2">
              {BENCHMARK_METRICS.map(m => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMetricId(m.id)}
                    className={cn(
                      "px-3 py-2 border rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 active:scale-95 transition-all outline-none",
                      selectedMetricId === m.id
                        ? "bg-slate-900 text-white border-slate-950 shadow-sm"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    <Icon size={12} />
                    <span>{m.name}</span>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              {/* Detailed Breakdown columns (7 cols) */}
              <div className="md:col-span-7 space-y-4">
                <div>
                  <h4 className="text-base font-black text-slate-900 leading-none mb-1.5">{selectedMetric.name}</h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">
                    {selectedMetric.description}
                  </p>
                </div>

                <div className="space-y-2.5 bg-slate-50/50 p-4 rounded-2xl border border-slate-100/80">
                  <span className="text-[10px] font-bold text-slate-405 uppercase tracking-widest font-mono">Key Assessment Indicators</span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {selectedMetric.indicators.map((ind, i) => (
                      <div key={i} className="bg-white border border-slate-200/60 p-2.5 rounded-xl flex gap-2 items-center text-[10px] text-slate-650 font-bold leading-tight">
                        <Check size={11} className="text-emerald-500 shrink-0" />
                        <span>{ind}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 border border-rose-100 rounded-2xl bg-rose-50/20 text-xs leading-relaxed text-slate-700 space-y-2.5">
                  <strong className="text-[10px] text-rose-600 uppercase tracking-widest flex items-center gap-1.5">
                    <Target size={12} className="shrink-0" />
                    <span>Outperform Strategies</span>
                  </strong>
                  <div className="space-y-1.5">
                    {selectedMetricId === 'ai_search_visibility' && (
                      <p>Implement customized JSON-LD blocks covering nested structured FAQs, canonical pointers, and robot permission configurations targeted directly at Perplexity/SGE scrapers.</p>
                    )}
                    {selectedMetricId === 'chatbot_quality' && (
                      <p>Embed advanced conversational AI helpers built on robust RAG index architectures that support context retention loops and proactive client routing rather than standard support buttons.</p>
                    )}
                    {selectedMetricId === 'personalization' && (
                      <p>Incorporate dynamic intent-predicting headers and view routing frameworks that personalize narrative streams based on previous visitor search queries and history logs.</p>
                    )}
                    {selectedMetricId === 'content_depth' && (
                      <p>Introduce semantic content clusters high in raw information gains—incorporating custom developer code segments, expert author validations, or unique interview findings.</p>
                    )}
                    {selectedMetricId === 'automation_maturity' && (
                      <p>Raise performance optimization scores under 1.5s. Proxy all resource requests through standard serverless delivery pathways and consolidate bloated CSS elements.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Statistical scoreboard (5 cols) */}
              <div className="md:col-span-5 space-y-4 font-sans">
                <div className="p-4 bg-slate-900 border border-slate-950 text-white rounded-2xl flex flex-col justify-between h-24">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Market Competitor Leader</span>
                  <div className="text-xl font-black italic text-emerald-400 mt-2 block truncate">{currentLeader.name}</div>
                  <span className="text-xs font-mono font-normal text-slate-450">Top Score: {currentLeader.score}%</span>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between h-28">
                  <span className="text-[9px] font-black uppercase text-slate-450 tracking-wider">Your Domain Standing</span>
                  <div className="flex justify-between items-baseline mt-2">
                    <span className="text-3xl font-black text-slate-800 font-mono mt-1">{myScore}%</span>
                    <span className={cn(
                      "text-[10px] font-black font-mono",
                      gapToTop <= 0 ? "text-emerald-600" : "text-rose-600"
                    )}>
                      {gapToTop <= 0 ? "LEADER" : `-${gapToTop}% GAP`}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-2">
                    <div 
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        gapToTop <= 0 ? "bg-emerald-500" : "bg-rose-500"
                      )}
                      style={{ width: `${myScore}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Active Calibration Sliders for selected Brand (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="p-6 border border-slate-200 rounded-[30px] bg-white shadow-xs space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <Sliders size={14} className="text-slate-500" />
                <span className="text-xs font-black uppercase tracking-widest text-slate-900">Calibration Board</span>
              </div>
              <span className="px-2 py-0.5 border border-slate-200 bg-slate-50 text-[9px] font-black rounded uppercase tracking-wider font-mono">
                Brand Speculator
              </span>
            </div>

            {/* Target Select */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Select Target Entity</label>
              <select
                value={activeCompetitorId}
                onChange={(e) => setActiveCompetitorId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold font-sans text-slate-800 outline-none cursor-pointer focus:ring-2 focus:ring-rose-500/10"
              >
                {competitors.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Editable Identity Data entered by user */}
            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3.5">
              <div className="flex items-center justify-between border-b border-slate-200/50 pb-1.5">
                <span className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest block font-mono">Identity Metadata</span>
                {activeCompetitor?.id !== 'main' && (
                  <button
                    type="button"
                    onClick={() => handleDeleteCompetitor(activeCompetitor.id)}
                    className="text-[9px] font-bold text-rose-600 hover:text-rose-700 uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Trash2 size={10} />
                    <span>Delete</span>
                  </button>
                )}
              </div>
              
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Brand Name</label>
                <input
                  type="text"
                  value={activeCompetitor?.name || ''}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Acme Inc"
                  className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-slate-400/20 transition-all font-sans"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Website Domain</label>
                <input
                  type="text"
                  value={activeCompetitor?.url || ''}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder="e.g. acme.com"
                  className="w-full bg-white border border-slate-200 rounded-lg py-1.5 px-2.5 text-xs font-bold text-slate-850 outline-none focus:ring-2 focus:ring-slate-400/20 transition-all font-sans"
                />
              </div>
            </div>

            {/* Performance Sliders */}
            <div className="space-y-5">
              {BENCHMARK_METRICS.map(m => {
                const Icon = m.icon;
                const score = activeCompetitor.metrics[m.id as keyof Competitor['metrics']] || 0;
                return (
                  <div key={m.id} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Icon size={12} className="text-slate-400 shrink-0" />
                        <span className="text-[11px] font-bold text-slate-800 truncate block">{m.name}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={score}
                          onChange={(e) => {
                            let val = parseInt(e.target.value);
                            if (isNaN(val)) val = 0;
                            val = Math.max(0, Math.min(100, val));
                            handleMetricChange(m.id as keyof Competitor['metrics'], val);
                          }}
                          className="w-12 text-right bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-[11px] font-mono font-bold text-slate-900 focus:bg-white focus:ring-1 focus:ring-slate-400 outline-none"
                        />
                        <span className="text-slate-405 font-mono text-[10px]">%</span>
                      </div>
                    </div>

                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={score}
                      onChange={(e) => handleMetricChange(m.id as keyof Competitor['metrics'], parseInt(e.target.value) || 0)}
                      className="w-full h-1.5 bg-slate-100 rounded-full appearance-none cursor-pointer accent-slate-900"
                    />
                  </div>
                );
              })}
            </div>

            {/* Notes Section */}
            <div className="space-y-2 border-t border-slate-100 pt-5">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-mono">Strategic Notes & Analysis</label>
              <textarea
                value={activeCompetitor?.notes || ''}
                onChange={(e) => handleNoteChange(e.target.value)}
                rows={4}
                placeholder="Declare challenges, specific frameworks utilized, or targeted initiatives here..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] font-sans text-slate-800 outline-none focus:ring-2 focus:ring-rose-500/10 focus:border-rose-500/30 transition-all resize-none leading-relaxed font-normal"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
