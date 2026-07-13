import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Settings, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle, 
  Cpu, 
  Globe, 
  Sliders, 
  Copy, 
  Check, 
  ArrowRight, 
  FileText, 
  Terminal, 
  ExternalLink,
  ChevronDown,
  RefreshCw,
  Eye,
  Sparkles,
  Zap,
  BookOpen,
  Layout,
  Link,
  Info
} from 'lucide-react';
import { SEOPage } from '../types/seo';
import { cn } from '../lib/utils';
import { 
  ResponsiveContainer, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar,
  BarChart as RechartsBarChart,
  Bar as RechartsBar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
  Cell
} from 'recharts';

interface SEOCheckPanelProps {
  pages: SEOPage[];
  selectedPageUrl?: string;
  onPageSelect?: (page: SEOPage) => void;
}

interface PrototypeFixState {
  title: string;
  description: string;
  h1: string;
  altTagsFixed: boolean;
}

export function SEOCheckPanel({ pages = [], selectedPageUrl, onPageSelect }: SEOCheckPanelProps) {
  const [activeUrl, setActiveUrl] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'onpage' | 'technical' | 'assets' | 'sandbox'>('onpage');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Sandboxed prototyping overrides
  const [sandboxFixes, setSandboxFixes] = useState<Record<string, PrototypeFixState>>({});

  useEffect(() => {
    if (selectedPageUrl && pages.some(p => p.url === selectedPageUrl)) {
      setActiveUrl(selectedPageUrl);
    } else if (pages.length > 0 && !activeUrl) {
      setActiveUrl(pages[0].url);
    }
  }, [selectedPageUrl, pages]);

  const activePage = pages.find(p => p.url === activeUrl) || pages[0] || null;

  // Retrieve sandboxed fixes or default values
  const getSandboxValues = (page: SEOPage | null): PrototypeFixState => {
    if (!page) return { title: '', description: '', h1: '', altTagsFixed: false };
    if (sandboxFixes[page.url]) return sandboxFixes[page.url];

    return {
      title: page.title || '',
      description: page.description || '',
      h1: page.headers?.h1?.[0] || '',
      altTagsFixed: false
    };
  };

  const sandbox = getSandboxValues(activePage);

  const updateSandboxValue = (key: keyof PrototypeFixState, value: any) => {
    if (!activePage) return;
    setSandboxFixes(prev => ({
      ...prev,
      [activePage.url]: {
        ...getSandboxValues(activePage),
        [key]: value
      }
    }));
  };

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 1800);
  };

  // Logic to evaluate current and simulated SEO Audit Details
  const evaluateSEOElements = (page: SEOPage | null) => {
    if (!page) {
      return {
        seoScore: 0,
        originalScore: 0,
        checklist: [],
        categories: { onpage: 0, tech: 0, linking: 0, asset: 0 },
        recommendations: []
      };
    }

    const currentSandbox = getSandboxValues(page);

    // Baseline stats
    const title = currentSandbox.title;
    const desc = currentSandbox.description;
    const hasCanonical = !!page.canonical;
    const hasRobots = !!(page.robots || 'index');
    const wordCount = page.wordCount || 250;
    const textToCode = page.textToCodeRatio || 12;

    const originalTitle = page.title || '';
    const originalDesc = page.description || '';
    const originalH1 = page.headers?.h1?.[0] || '';
    const originalHasAltIssues = page.imageMetrics ? page.imageMetrics.missingAlt > 0 : false;

    // Check alt tag status
    const altCount = page.imageMetrics ? page.imageMetrics.missingAlt : 0;
    const hasAltIssues = currentSandbox.altTagsFixed ? false : (altCount > 0);

    // Checklist generation with real state (original vs sandbox)
    const checks = [
      {
        id: 'title_presence',
        name: 'Title Tag Presence',
        desc: 'Ensures title exists on the page structure.',
        category: 'onpage',
        passed: title.trim().length > 0,
        detail: title.trim().length > 0 ? `Detected "${title}"` : 'Missing title element entirely.',
        fixed: originalTitle.trim().length === 0 && title.trim().length > 0,
        impact: 'Critical'
      },
      {
        id: 'title_length',
        name: 'Title Tag Optimal Length',
        desc: 'Recommended length is 50-60 characters for peak search results rendering.',
        category: 'onpage',
        passed: title.length >= 30 && title.length <= 65,
        detail: `Length: ${title.length} chars (Target: 30-65 chars).`,
        fixed: !(originalTitle.length >= 30 && originalTitle.length <= 65) && (title.length >= 30 && title.length <= 65),
        impact: 'High'
      },
      {
        id: 'desc_presence',
        name: 'Meta Description Presence',
        desc: 'Assesses if description snippets exist for search engines to digest.',
        category: 'onpage',
        passed: desc.trim().length > 0,
        detail: desc.trim().length > 0 ? `Detected segment.` : 'No description found.',
        fixed: originalDesc.trim().length === 0 && desc.trim().length > 0,
        impact: 'Critical'
      },
      {
        id: 'desc_length',
        name: 'Meta Description Optimal Length',
        desc: 'Validates optimal length limits between 120 and 160 characters.',
        category: 'onpage',
        passed: desc.length >= 100 && desc.length <= 165,
        detail: `Length: ${desc.length} chars (Target: 100-165 chars).`,
        fixed: !(originalDesc.length >= 100 && originalDesc.length <= 165) && (desc.length >= 100 && desc.length <= 165),
        impact: 'Medium'
      },
      {
        id: 'canonical',
        name: 'Canonical Link Tag',
        desc: 'Prevents duplicates by routing search engines to a singular canonical source.',
        category: 'technical',
        passed: hasCanonical,
        detail: hasCanonical ? `Configured to: ${page.canonical}` : 'Missing a valid canonical link element.',
        fixed: false,
        impact: 'Critical'
      },
      {
        id: 'robots',
        name: 'Robots Index Meta Tag',
        desc: 'Establishes proper access bounds for indexation crawlers.',
        category: 'technical',
        passed: hasRobots,
        detail: `Current value: ${page.robots || 'index, follow'}.`,
        fixed: false,
        impact: 'High'
      },
      {
        id: 'h1_presence',
        name: 'Main Heading Tag (H1)',
        desc: 'Main visual context heading of the structure.',
        category: 'onpage',
        passed: currentSandbox.h1.trim().length > 0,
        detail: currentSandbox.h1.trim().length > 0 ? `Found: "${currentSandbox.h1}"` : 'No H1 structure detected.',
        fixed: originalH1.trim().length === 0 && currentSandbox.h1.trim().length > 0,
        impact: 'Critical'
      },
      {
        id: 'h1_count',
        name: 'Singular H1 Validator',
        desc: 'Verifies there is exactly one H1 element declared on the DOM structure.',
        category: 'onpage',
        passed: (page.headers?.h1 || []).length <= 1,
        detail: `H1 usage total: ${(page.headers?.h1 || []).length} instances.`,
        fixed: false,
        impact: 'High'
      },
      {
        id: 'text_to_code',
        name: 'Text to Code Index',
        desc: 'Measures semantic visible content against internal DOM script and stylesheet volumes.',
        category: 'technical',
        passed: textToCode >= 15,
        detail: `Ratio: ${textToCode}% (Target: >15%).`,
        fixed: false,
        impact: 'Low'
      },
      {
        id: 'image_alts',
        name: 'Alt Image Attributes',
        desc: 'Requires alternative descriptive labels on all decorative images.',
        category: 'assets',
        passed: !hasAltIssues,
        detail: hasAltIssues ? `Found ${altCount} elements lacking alternative descriptions.` : 'All detected images possess alt attributes.',
        fixed: originalHasAltIssues && !hasAltIssues,
        impact: 'High'
      },
      {
        id: 'load_time',
        name: 'Load Execution Speed',
        desc: 'Speed indexes loading page assets under standard criteria.',
        category: 'technical',
        passed: (page.loadTime ?? 1.5) <= 2.8,
        detail: `Interactive response time: ${((page.loadTime ?? 1500) / 1000).toFixed(2)}s (Target: <2.8s).`,
        fixed: false,
        impact: 'Medium'
      }
    ];

    // Calculate score metrics
    const onpageChecks = checks.filter(c => c.category === 'onpage');
    const onpageScore = Math.round((onpageChecks.filter(c => c.passed).length / onpageChecks.length) * 100);

    const techChecks = checks.filter(c => c.category === 'technical');
    const techScore = Math.round((techChecks.filter(c => c.passed).length / techChecks.length) * 100);

    const assetsChecks = checks.filter(c => c.category === 'assets');
    const assetsScore = Math.round((assetsChecks.filter(c => c.passed).length / assetsChecks.length) * 100);

    const targetLinkingScore = page.links ? Math.min(100, (page.links.internal.length * 4) + (page.links.external.length * 3) + 20) : 55;

    const baseScoreSum = (onpageScore * 0.35) + (techScore * 0.35) + (assetsScore * 0.15) + (targetLinkingScore * 0.15);
    const simulatedOverallScore = Math.round(Math.min(100, Math.max(20, baseScoreSum)));

    // Derive original score (without sandbox overrides)
    const baseOriginalChecks = checks.map(c => !c.fixed);
    const origOnpage = Math.round((onpageChecks.filter(c => c.id !== 'title_presence' && c.id !== 'title_length' && c.id !== 'desc_presence' && c.id !== 'desc_length' && c.id !== 'h1_presence' ? c.passed : (c.id === 'title_presence' ? originalTitle.trim().length > 0 : c.id === 'title_length' ? originalTitle.length >= 30 && originalTitle.length <= 65 : c.id === 'desc_presence' ? originalDesc.trim().length > 0 : c.id === 'desc_length' ? originalDesc.length >= 100 && originalDesc.length <= 165 : originalH1.trim().length > 0)).length / onpageChecks.length) * 100);
    const origTech = techScore;
    const origAssets = originalHasAltIssues ? 40 : 100;
    const origOverallScore = Math.round(Math.min(100, Math.max(20, (origOnpage * 0.35) + (origTech * 0.35) + (origAssets * 0.15) + (targetLinkingScore * 0.15))));

    // Build specific recommendation items
    const recs: { title: string; desc: string; priority: string; fixCode: string; area: string }[] = [];

    if (title.length === 0) {
      recs.push({
        area: 'onpage',
        title: 'Add Missing Primary Title Tag',
        desc: 'Page does not declare a title tag. Search engine result crawlers use title tags to map page queries.',
        priority: 'Critical',
        fixCode: `<title>Declare an Awesome Descriptive Title (50-60 characters)</title>`
      });
    } else if (title.length < 30 || title.length > 65) {
      recs.push({
        area: 'onpage',
        title: 'Adjust Title Tag Optimization Length',
        desc: 'Adjust length of title headings. Titles that are too long get cropped in search displays; too short lacks semantic keywords.',
        priority: 'High',
        fixCode: `<title>${title.substring(0, 50)}... | Brand Name</title>`
      });
    }

    if (desc.length === 0) {
      recs.push({
        area: 'onpage',
        title: 'Formulate Missing Meta Description Tag',
        desc: 'No meta description was detected. This causes engines to dynamically extract generic surrounding page boilerplate text.',
        priority: 'Critical',
        fixCode: `<meta name="description" content="Engaging and semantic meta description detailing this page. Use targeted keywords. Limit to 120-160 characters." />`
      });
    } else if (desc.length < 100 || desc.length > 165) {
      recs.push({
        area: 'onpage',
        title: 'Recalibrate Meta Description Snippet Length',
        desc: 'Modify meta description to sit within standard bounds (100-165 chars). This ensures full search snippet readability.',
        priority: 'Medium',
        fixCode: `<meta name="description" content="${desc.substring(0, 145)}..." />`
      });
    }

    if (!hasCanonical) {
      recs.push({
        area: 'technical',
        title: 'Implement Valid Canonical Reference Links',
        desc: 'Specify canonical reference endpoints to avoid internal content duplication penalties caused by query strings.',
        priority: 'Critical',
        fixCode: `<link rel="canonical" href="${page.url}" />`
      });
    }

    if (hasAltIssues) {
      recs.push({
        area: 'assets',
        title: 'Inject Missing ALT Alternate Tags to Images',
        desc: 'Ensure decorative pictures and graph drawings support meaningful, descriptive alternative parameters for reader accessibility.',
        priority: 'High',
        fixCode: `<img src="asset.jpg" alt="Rich descriptive context matching keyword parameters" />`
      });
    }

    if (page.headers && page.headers.h1 && page.headers.h1.length === 0) {
      recs.push({
        area: 'onpage',
        title: 'Embed Primary H1 Header Element',
        desc: 'Every endpoint requires exactly one high-level H1 title framework defining the page content.',
        priority: 'Critical',
        fixCode: `<h1>${title || "Page Context Heading"}</h1>`
      });
    }

    return {
      seoScore: simulatedOverallScore,
      originalScore: origOverallScore,
      checklist: checks,
      categories: { 
        onpage: onpageScore, 
        tech: techScore, 
        linking: targetLinkingScore, 
        asset: assetsScore 
      },
      recommendations: recs
    };
  };

  const seoData = evaluateSEOElements(activePage);

  const radarChartData = [
    { name: 'On-Page SEO', value: seoData.categories.onpage },
    { name: 'Technical', value: seoData.categories.tech },
    { name: 'Links Integrity', value: seoData.categories.linking },
    { name: 'Assets & Media', value: seoData.categories.asset }
  ];

  const getPageShortName = (url: string) => {
    try {
      const parsed = new URL(url);
      return parsed.pathname === '/' ? '/' : parsed.pathname;
    } catch {
      return url.length > 20 ? url.substring(0, 20) + '...' : url;
    }
  };

  return (
    <div className="space-y-10" id="seo-deep-dive-panel">
      {/* Upper header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 border-b border-slate-100 pb-8">
        <div>
          <div className="flex items-center gap-2.5 text-[10px] font-black text-blue-600 uppercase tracking-[0.4em] mb-3">
            <Activity size={13} className="shrink-0 animate-pulse" />
            <span>Search Audit Sandbox</span>
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none italic uppercase flex items-center gap-3">
            Static SEO Checks
          </h2>
          <p className="text-sm font-medium text-slate-500 leading-relaxed mt-3 max-w-2xl">
            Evaluate traditional semantic standards. Verify canonical constraints, robots headers, description counts, single H1 headers, image alt qualities, and on-page element density values.
          </p>
        </div>

        {/* Sync Page Target Selector */}
        {pages.length > 0 && (
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-2 rounded-2xl shrink-0">
            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest pl-2">Target URL:</span>
            <select
              value={activeUrl}
              onChange={(e) => {
                setActiveUrl(e.target.value);
                if (onPageSelect) {
                  const found = pages.find(p => p.url === e.target.value);
                  if (found) onPageSelect(found);
                }
              }}
              className="bg-white border border-slate-200 rounded-lg p-1.5 text-xs font-bold font-sans text-slate-800 outline-none cursor-pointer"
            >
              {pages.map((p, idx) => (
                <option key={p.url} value={p.url}>
                  {idx + 1}. {getPageShortName(p.url)}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {pages.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-20 border border-slate-200 rounded-[45px] bg-slate-50/40 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
            <Eye size={26} />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-800">No Pages Indexed</h3>
            <p className="text-xs font-medium text-slate-450 max-w-sm mt-1">
              Please initialize your site audit by run a crawler parse or pasting an entry URL on the main Dashboard first.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: Main Scorecard & Interactive Validation Sandbox (5 cols) */}
          <div className="lg:col-span-12 xl:col-span-5 space-y-6">
            
            {/* Main Scorecard card */}
            <div className="p-6 md:p-8 border border-slate-200 rounded-[35px] bg-white shadow-xs space-y-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-36 h-36 bg-blue-500/5 rounded-full blur-[40px]" />
              
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <span className="text-xs font-black uppercase tracking-widest text-slate-800">Audit Score Card</span>
                <span className="text-[9px] font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
                  Traditional SEO Indices
                </span>
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <span className="text-slate-400 text-[9px] font-bold uppercase tracking-widest block font-mono">Simulated SEO Standing</span>
                  <div className="flex items-baseline gap-2.5 mt-1">
                    <span className="text-5xl font-black italic text-slate-900 font-mono tracking-tighter">
                      {seoData.seoScore}%
                    </span>
                    {seoData.seoScore > seoData.originalScore && (
                      <span className="text-xs font-black text-emerald-605 bg-emerald-50 px-2 py-0.5 rounded-full font-sans uppercase animate-bounce leading-none">
                        +{seoData.seoScore - seoData.originalScore}% LIFT
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest block font-mono">Original Baseline</span>
                  <span className="text-lg font-bold text-slate-500 font-mono italic">{seoData.originalScore}%</span>
                </div>
              </div>

              {/* Progress visual path */}
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mt-2 relative">
                <div 
                  className={cn(
                    "h-full rounded-full transition-all duration-700",
                    seoData.seoScore >= 80 ? 'bg-emerald-500' :
                    seoData.seoScore >= 50 ? 'bg-amber-500' :
                    'bg-rose-500'
                  )}
                  style={{ width: `${seoData.seoScore}%` }}
                />
              </div>

              {/* Recharts Area */}
              <div className="h-[180px] w-full mt-4 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart data={radarChartData} barSize={28}>
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }} 
                      axisLine={false} 
                      tickLine={false}
                    />
                    <YAxis 
                      domain={[0, 100]} 
                      tick={{ fill: '#94a3b8', fontSize: 9 }} 
                      axisLine={false} 
                      tickLine={false}
                    />
                    <RechartsTooltip 
                      contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '10px' }} 
                    />
                    <RechartsBar dataKey="value" radius={[6, 6, 0, 0]}>
                      {radarChartData.map((entry, index) => {
                        const score = entry.value;
                        const fill = score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#f43f5e';
                        return <Cell key={`cell-${index}`} fill={fill} />;
                      })}
                    </RechartsBar>
                  </RechartsBarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Simulated Live Fix Sandbox */}
            <div className="p-6 border border-slate-200 rounded-[30px] bg-slate-900 text-white space-y-5 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-[40px] pointer-events-none" />
              
              <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <div className="flex items-center gap-1.5 text-blue-400">
                  <Terminal size={14} />
                  <span className="text-xs font-black uppercase tracking-widest">Metadata sandbox Simulator</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (activePage) {
                      setSandboxFixes(prev => {
                        const copy = { ...prev };
                        delete copy[activePage.url];
                        return copy;
                      });
                    }
                  }}
                  className="text-[9px] text-slate-400 hover:text-white uppercase tracking-wider font-bold transition-colors flex items-center gap-1"
                >
                  <RefreshCw size={10} />
                  <span>Reset Prototyper</span>
                </button>
              </div>

              <p className="text-[11px] text-slate-300 leading-relaxed font-normal">
                Need to preview dynamic SEO impacts? Type simulated optimizations below. Witness metadata score shifts live, and extract compiled HTML blocks.
              </p>

              <div className="space-y-4 pt-1 font-sans">
                {/* Simulated Title */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-baseline">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono">Simulated Meta Title Tag</label>
                    <span className={cn(
                      "text-[9px] font-mono",
                      sandbox.title.length >= 30 && sandbox.title.length <= 65 ? "text-emerald-400" : "text-rose-400"
                    )}>
                      {sandbox.title.length} / 65 chars
                    </span>
                  </div>
                  <input
                    type="text"
                    value={sandbox.title}
                    onChange={(e) => updateSandboxValue('title', e.target.value)}
                    placeholder="e.g. Acme Solutions | Interactive CRM and Agent Tools"
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-2.5 text-xs font-bold text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white/10 transition-all font-sans"
                  />
                </div>

                {/* Simulated Meta Description */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-baseline">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono">Simulated Meta Description</label>
                    <span className={cn(
                      "text-[9px] font-mono",
                      sandbox.description.length >= 100 && sandbox.description.length <= 165 ? "text-emerald-400" : "text-rose-400"
                    )}>
                      {sandbox.description.length} / 165 chars
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    value={sandbox.description}
                    onChange={(e) => updateSandboxValue('description', e.target.value)}
                    placeholder="e.g. Integrate custom cognitive CRM structures seamlessly. Standard agent tools fail context mapping metrics while Acme delivers dynamic enterprise speed loops."
                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white/10 transition-all resize-none leading-relaxed font-normal font-sans"
                  />
                </div>

                {/* Toggle alt tags simulated fix */}
                <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/10">
                  <div className="min-w-0 pr-2">
                    <span className="text-[10px] font-bold block leading-snug">Prototype Fix for Alternative Image Alts</span>
                    <span className="text-[9px] font-medium text-slate-450 leading-relaxed block mt-0.5">Toggle to simulate injecting descriptive labels on missing target image elements.</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={sandbox.altTagsFixed}
                    onChange={(e) => updateSandboxValue('altTagsFixed', e.target.checked)}
                    className="w-5 h-5 rounded border border-white/20 text-blue-600 focus:ring-blue-500/20 transition-all cursor-pointer bg-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Checklist grid & recommendation priority actions (7 cols) */}
          <div className="lg:col-span-12 xl:col-span-7 space-y-6">
            
            {/* Nav tabs selection category */}
            <div className="flex border border-slate-200 bg-white p-1 rounded-2xl gap-1">
              {[
                { id: 'onpage', name: 'On-Page Tags Checklist', icon: Layout },
                { id: 'technical', name: 'Technical Indexing', icon: Globe },
                { id: 'assets', name: 'Media Assets & Load Time', icon: BookOpen },
                { id: 'sandbox', name: 'Coded Actions Panel', icon: Terminal }
              ].map(sub => {
                const Icon = sub.icon;
                return (
                  <button
                    key={sub.id}
                    onClick={() => setActiveTab(sub.id as any)}
                    className={cn(
                      "flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all outline-none border",
                      activeTab === sub.id
                        ? "bg-slate-900 border-slate-950 text-white shadow-sm font-bold"
                        : "bg-transparent border-transparent text-slate-600 hover:text-slate-900"
                    )}
                  >
                    <Icon size={12} />
                    <span className="hidden sm:inline">{sub.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab content listings */}
            
              <div
                key={activeTab}
                className="space-y-6"
              >
                {activeTab !== 'sandbox' ? (
                  <div className="p-6 border border-slate-200 rounded-[35px] bg-white shadow-xs space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                      <span className="text-xs font-black uppercase tracking-widest text-slate-900">Checklist Assessment Node</span>
                      <span className="text-[10px] font-bold font-mono text-slate-400">
                        {seoData.checklist.filter(c => c.category === activeTab && c.passed).length} / {seoData.checklist.filter(c => c.category === activeTab).length} Passed
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {seoData.checklist
                        .filter(c => c.category === activeTab)
                        .map((chk, idx) => (
                          <div key={idx} className="py-4 flex gap-4 pr-2 hover:bg-slate-50/20 rounded-xl px-1">
                            {chk.passed ? (
                              <CheckCircle2 size={18} className="text-emerald-500 shrink-0 mt-0.5" />
                            ) : (
                              <AlertTriangle size={18} className="text-rose-500 shrink-0 mt-0.5" />
                            )}
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-black text-slate-805">{chk.name}</span>
                                <span className={cn(
                                  "text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-sm font-mono",
                                  chk.impact === 'Critical' ? 'bg-rose-50 text-rose-700' :
                                  chk.impact === 'High' ? 'bg-amber-50 text-amber-700' :
                                  'bg-blue-50 text-blue-700'
                                )}>
                                  {chk.impact}
                                </span>
                              </div>
                              <p className="text-[10px] font-medium text-slate-450 leading-relaxed max-w-xl">
                                {chk.desc}
                              </p>
                              <div className="mt-1.5 font-mono text-[9px] bg-slate-50 border border-slate-200/50 p-2 rounded-lg text-slate-600 font-bold max-w-xl truncate">
                                Diagnoses: {chk.detail}
                              </div>
                            </div>
                          </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Sandboxed copyable tags list */}
                    <div className="p-6 border border-slate-200 rounded-[35px] bg-white shadow-xs space-y-4">
                      <span className="text-xs font-black uppercase tracking-widest text-slate-900 border-b border-slate-100 pb-3 block">Simulated Prototype Fixing Snippets</span>
                      <p className="text-xs text-slate-500 leading-relaxed font-medium">
                        Modified elements from your sandbox simulator are compiled below into clean, syntax-highlighted HTML blocks.
                      </p>

                      <div className="space-y-4 pt-2">
                        {/* Title copyable */}
                        <div className="space-y-2 font-mono">
                          <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            <span>Page Title Tag Snippet</span>
                            <button
                              onClick={() => handleCopyCode(`<title>${sandbox.title}</title>`, 'title')}
                              className="text-blue-600 hover:text-blue-800 flex items-center gap-1 active:scale-95 transition-all text-[9.5px]"
                            >
                              {copiedText === 'title' ? <Check size={11} /> : <Copy size={11} />}
                              <span>{copiedText === 'title' ? 'Copied' : 'Copy Snippet'}</span>
                            </button>
                          </div>
                          <div className="bg-slate-900 p-3.5 rounded-xl text-[11px] text-emerald-400 font-bold overflow-x-auto border border-slate-950">
                            &lt;title&gt;{sandbox.title}&lt;/title&gt;
                          </div>
                        </div>

                        {/* Description copyable */}
                        <div className="space-y-2 font-mono">
                          <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            <span>Meta Description Snippet</span>
                            <button
                              onClick={() => handleCopyCode(`<meta name="description" content="${sandbox.description}" />`, 'desc')}
                              className="text-blue-600 hover:text-blue-800 flex items-center gap-1 active:scale-95 transition-all text-[9.5px]"
                            >
                              {copiedText === 'desc' ? <Check size={11} /> : <Copy size={11} />}
                              <span>{copiedText === 'desc' ? 'Copied' : 'Copy Snippet'}</span>
                            </button>
                          </div>
                          <div className="bg-slate-900 p-3.5 rounded-xl text-[11px] text-emerald-400 font-bold overflow-x-auto border border-slate-950 leading-relaxed whitespace-pre-wrap">
                            &lt;meta name="description" content="{sandbox.description}" /&gt;
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Recommendations with priority */}
                {seoData.recommendations.length > 0 && (
                  <div className="p-6 border border-slate-200 rounded-[35px] bg-white shadow-xs space-y-4">
                    <span className="text-xs font-black uppercase tracking-widest text-slate-900 block border-b border-slate-100 pb-2">Prioritized Action Items for this Page</span>
                    <div className="space-y-4">
                      {seoData.recommendations.map((rec, i) => (
                        <div key={i} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "px-1.5 py-0.5 text-[8px] font-bold font-mono uppercase rounded-sm leading-none",
                                rec.priority === 'Critical' ? "bg-rose-100 text-rose-700" :
                                rec.priority === 'High' ? "bg-amber-100 text-amber-700" :
                                "bg-blue-100 text-blue-700"
                              )}>
                                {rec.priority}
                              </span>
                              <span className="text-xs font-black text-slate-800">{rec.title}</span>
                            </div>
                            <p className="text-[10px] font-medium text-slate-450 leading-relaxed max-w-xl pt-0.5">
                              {rec.desc}
                            </p>
                          </div>

                          <button
                            onClick={() => handleCopyCode(rec.fixCode, `rec_${i}`)}
                            className="bg-white border border-slate-200 hover:border-slate-300 px-3 py-1.5 rounded-xl text-[10px] font-mono font-bold text-slate-600 active:scale-95 transition-all outline-none flex items-center gap-1.5 select-all text-center self-end md:self-auto"
                          >
                            {copiedText === `rec_${i}` ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                            <span>{copiedText === `rec_${i}` ? 'Copied Code' : 'Copy Fix'}</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {seoData.recommendations.length === 0 && (
                  <div className="p-5 border border-emerald-100 rounded-[28px] bg-emerald-50/20 text-xs text-slate-700 leading-relaxed font-normal flex gap-3">
                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-emerald-900 font-bold uppercase tracking-widest text-[10px] block mb-0.5">Perfect Score Node!</strong>
                      All evaluated on-page and technical checklist parameters sit within optimal search guidelines. Try selected alternative crawled pages.
                    </div>
                  </div>
                )}
              </div>
            
          </div>
        </div>
      )}
    </div>
  );
}
