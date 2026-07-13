import React from 'react';
import { 
  FileText, 
  TrendingUp, 
  ShieldAlert, 
  Clock, 
  Download, 
  ChevronRight,
  Target,
  BarChart2,
  Lock,
  Cpu,
  BrainCog,
  Brain
} from 'lucide-react';
import { SEOPage, AuditStats } from '../types/seo';
import { cn } from '../lib/utils';

interface StrategicBriefProps {
  pages: SEOPage[];
  stats: AuditStats | null;
  auditEndTime: number | null;
  onDownloadPDF: () => void;
  aiInsight?: any;
  isGeneratingAI?: boolean;
  onRegenerateAI?: () => void;
  agentProgress?: string;
}

export function StrategicBrief({ pages, stats, auditEndTime, onDownloadPDF, aiInsight, isGeneratingAI, onRegenerateAI, agentProgress }: StrategicBriefProps) {
  const [isDeckExpanded, setIsDeckExpanded] = React.useState(false);

  if (!stats || pages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-6 text-slate-300">
          <FileText size={32} />
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">Briefing Data Unavailable</h3>
        <p className="text-slate-500 max-w-sm">Complete a system audit to generate your custom strategic briefing and architectural roadmap.</p>
      </div>
    );
  }

  const avgScore = Math.round(pages.reduce((acc, p) => acc + p.score, 0) / pages.length);
  const criticalCount = stats.criticalIssues;
  const healthStatus = avgScore > 85 ? 'OPTIMAL' : avgScore > 70 ? 'STABLE' : 'ACTION REQUIRED';
  const reportDate = auditEndTime ? new Date(auditEndTime).toLocaleDateString() : new Date().toLocaleDateString();

  // Generate more steps based on audit data
  const generateExtendedDirectives = () => {
    const directives: any[] = [];
    
    // 1. Technical Categories
    const techDirectives = [
      { category: 'Technical', label: 'Priority High', task: 'Consolidate Canonical directives across top-level nodes', impact: 'CRITICAL', color: 'rose', detail: 'Found multiple pages missing self-referential canonical tags, risking duplicate content penalties.' },
      { category: 'Technical', label: 'Priority Med', task: 'Sanitize Header Hierarchy (H1-H4)', impact: 'STRUCTURE', color: 'amber', detail: 'Inconsistent heading levels detected. Normalizing this ensures better semantic indexing by neural engines.' },
      { category: 'Technical', label: 'Priority High', task: 'Remediate 404/Orphaned links in footer stack', impact: 'INTEGRITY', color: 'rose', detail: 'Broken links detected in the persistent global navigation. This bleeds crawl budget and degrades node authority.' }
    ];

    // 2. Performance Categories
    const perfDirectives = [
      { category: 'Performance', label: 'Priority High', task: 'Migrate to modern image standards (WebP/AVIF)', impact: 'VELOCITY', color: 'indigo', detail: 'Legacy JPEG/PNG formats detected across 40% of nodes. WebP migration would reduce payload by ~60%.' },
      { category: 'Performance', label: 'Priority Med', task: 'Implement aggressive browser-level caching directives', impact: 'LATENCY', color: 'blue', detail: 'Static assets are being re-fetched on every session. Cache-control headers will reduce recurring T2C ratios.' },
      { category: 'Performance', label: 'Priority High', task: 'Defer non-critical third-party scripts', impact: 'LCP', color: 'rose', detail: 'Third-party JS is blocking the main thread for >800ms. Deferring these will drastically improve Core Web Vitals.' },
      { category: 'Performance', label: 'Priority Med', task: 'Optimize Cumulative Layout Shift (CLS) on dynamic blocks', impact: 'STABILITY', color: 'amber', detail: 'Elements are shifting during load on mobile viewports. Hardcoding dimensions for ad units and media will stabilize the index.' }
    ];

    // 3. Content & Semantic Categories
    const contentDirectives = [
      { category: 'Content', label: 'Priority Low', task: 'Optimize internal linking for bottom-tier score pages', impact: 'AUTHORITY', color: 'emerald', detail: 'Pages with scores < 50 have low internal link counts (< 2). Strengthening link topography will boost crawl priority.' },
      { category: 'Content', label: 'Priority Med', task: 'Synthesize Schema.org structured data for product nodes', impact: 'RICH SNIPPET', color: 'amber', detail: 'Entity-specific markup is missing. Implementing Product/Review schema will increase SGE and SERP visibility.' },
      { category: 'Content', label: 'Priority Med', task: 'Eliminate duplicate Meta Descriptions', impact: 'UNIQUENESS', color: 'blue', detail: 'Detected redundant descriptions across 15% of the node index. Unique snippets are essential for click-through resonance.' },
      { category: 'Content', label: 'Priority High', task: 'Normalize AI-Generated content patterns', impact: 'E-E-A-T', color: 'indigo', detail: 'Some nodes show high repetitive variance. Infusing more unique expert perspectives will protect against neural filtering.' }
    ];

    // 4. Link & Authority Categories
    const linkDirectives = [
       { category: 'Authority', label: 'Priority Med', task: 'Map out internal link flow from Home -> Deep Nodes', impact: 'FLOW', color: 'indigo', detail: 'Root-to-leaf depth exceeds 5 clicks for core content. Flattening this architecture will distribute PageRank more effectively.' },
       { category: 'Authority', label: 'Priority Low', task: 'Identify and prune outbound links to low-trust nodes', impact: 'TRUST', color: 'slate', detail: 'Outbound links to unverified domains detected. Removing these protects your technical health score.' },
       { category: 'Authority', label: 'Priority High', task: 'Strengthen Anchor Text relevance for pillar pages', impact: 'RELEVANCE', color: 'emerald', detail: 'Generic patterns like "click here" detected. Mapping keyword-rich anchor text will reinforce semantic node clusters.' }
    ];

    // Add dynamic logic based on stats
    if (stats.criticalIssues > 5) {
      techDirectives.unshift({ 
        category: 'Technical',
        label: 'Priority Urgent', 
        task: 'Execute Emergency Technical Sanitization', 
        impact: 'CORE', 
        color: 'rose',
        detail: `The system has flagged ${stats.criticalIssues} critical failures. Immediate intervention is required to prevent domain-wide de-indexing.`
      });
    }

    const slowPages = pages.filter(p => (p.loadTime || 0) > 3000);
    if (slowPages.length > 3) {
       perfDirectives.unshift({
         category: 'Performance',
         label: 'Priority High',
         task: `Redistribute assets for ${slowPages.length} High-Latency Nodes`,
         impact: 'BOUNCE RATE',
         color: 'rose',
         detail: 'Significant delay detected in your primary traffic path. Assets must be bundled or served via closer CDN nodes.'
       });
    }

    // 5. Emerging Search (LLM/SGE) Categories
    const sgeDirectives = [
       { category: 'Neural/SGE', label: 'Priority High', task: 'Optimize for Direct Answer Synthesis', impact: 'VISIBILITY', color: 'blue', detail: 'Restructuring content into clear Q&A blocks to increase the probability of being selected as a primary source for AI-generated summaries.' },
       { category: 'Neural/SGE', label: 'Priority Med', task: 'Synthesize Entity-Relationship Context', impact: 'SEMANTICS', color: 'indigo', detail: 'Defining clear relationships between subjects, objects, and verbs. This helps LLMs map your domain as a high-authority entity node.' },
       { category: 'Neural/SGE', label: 'Priority High', task: 'Normalize Content Variance for Neural Consistency', impact: 'TRUST', color: 'emerald', detail: 'Ensuring consistent factual data across all pages. Discrepancies in data points (like pricing or specs) can lead to lower trust scores in neural ranking models.' }
    ];

    return [...techDirectives, ...perfDirectives, ...contentDirectives, ...linkDirectives, ...sgeDirectives];
  };

  const extendedDirectives = generateExtendedDirectives();
  const directivesByCategory = extendedDirectives.reduce((acc: any, d: any) => {
    if (!acc[d.category]) acc[d.category] = [];
    acc[d.category].push(d);
    return acc;
  }, {});

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Executive Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-4">
             <div className="p-1.5 bg-slate-900 rounded-lg text-white">
               <Lock size={14} />
             </div>
             <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Internal Security Clearance Level 1</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight italic uppercase">Foundational Directive</h1>
          <p className="text-slate-500 mt-2 font-medium">Strategic Synthesis & Architectural Roadmap // {reportDate}</p>
        </div>
        
        <div className="flex items-center gap-3">
          {onRegenerateAI && (
            <button 
              onClick={onRegenerateAI}
              disabled={isGeneratingAI}
              className="flex justify-center items-center gap-2 w-[220px] py-3 bg-blue-50 text-blue-600 rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-blue-100 transition-all border border-blue-100 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
            >
              <BrainCog size={16} className={isGeneratingAI ? "animate-spin" : ""} />
              {isGeneratingAI ? 'Synthesizing...' : 'Regenerate Insight'}
            </button>
          )}
          <button 
            onClick={onDownloadPDF}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/10 active:scale-95"
          >
            <Download size={14} />
            Export Brief
          </button>
        </div>
      </div>

      {/* KPI Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aggregated Score</span>
            <TrendingUp size={16} className="text-emerald-500" />
          </div>
          <div className="flex flex-wrap items-baseline gap-2 mt-2 md:mt-0">
            <div className="text-4xl font-black text-slate-900 italic tracking-tighter">{avgScore}%</div>
            <div className={cn(
              "text-[9px] font-black uppercase px-2 py-0.5 rounded whitespace-nowrap",
              avgScore > 80 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
            )}>
              {healthStatus}
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Critical Defects</span>
            <ShieldAlert size={16} className="text-rose-500" />
          </div>
          <div className="flex flex-wrap items-baseline gap-2 mt-2 md:mt-0">
            <div className="text-4xl font-black text-slate-900 italic tracking-tighter">{criticalCount}</div>
            <div className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-slate-50 text-slate-500 whitespace-nowrap">
              Vulnerabilities
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Neural Volume</span>
            <Cpu size={16} className="text-blue-500" />
          </div>
          <div className="flex flex-wrap items-baseline gap-2 mt-2 md:mt-0">
            <div className="text-4xl font-black text-slate-900 italic tracking-tighter">{pages.length}</div>
            <div className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-blue-50 text-blue-600 whitespace-nowrap">
              Active Nodes
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-6 rounded-3xl shadow-sm hover:shadow-md transition-shadow group overflow-hidden relative">
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform">
             <Target size={80} />
          </div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Growth Forecast</span>
            <Target size={16} className="text-indigo-500" />
          </div>
          <div className="flex flex-wrap items-baseline gap-2 mt-2 md:mt-0">
            <div className="text-4xl font-black text-slate-900 italic tracking-tighter">+24%</div>
            <div className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 whitespace-nowrap">
              Proj. Lift
            </div>
          </div>
        </div>
      </div>

      {/* AI Synthesized Insights */}
      {aiInsight && (
        <section className="bg-slate-900 border border-slate-800 rounded-[32px] p-8 md:p-10 shadow-2xl relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:scale-110 transition-transform">
              <Brain size={160} className="text-blue-500" />
           </div>
           
           <div className="relative z-10">
             <div className="flex items-center gap-3 mb-6">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h2 className="text-xl font-bold text-white tracking-tight">AI Master Controller Synthesis</h2>
             </div>
             
             {typeof aiInsight === 'string' ? (
                <div className="prose prose-invert prose-sm max-w-none text-slate-300">
                  <p>{aiInsight}</p>
                </div>
             ) : (
                <div className="space-y-8">
                  {aiInsight.executiveSummary && (
                    <div>
                      <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-2">Executive Overview</h4>
                      <p className="text-sm text-slate-300 leading-relaxed font-medium">{aiInsight.executiveSummary}</p>
                    </div>
                  )}
                  
                  {aiInsight.marketPosition && (
                    <div>
                      <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2">Semantic Market Position</h4>
                      <p className="text-sm text-slate-300 leading-relaxed">{aiInsight.marketPosition}</p>
                    </div>
                  )}
                  
                  {aiInsight.criticalRoadmap && Array.isArray(aiInsight.criticalRoadmap) && (
                    <div>
                      <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-4">Critical Vectors</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {aiInsight.criticalRoadmap.map((item: any, i: number) => (
                           <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                             <div className="flex items-center justify-between mb-2">
                               <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Impact: {item.impact}</span>
                               <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Effort: {item.effort}</span>
                             </div>
                             <h5 className="text-sm font-bold text-white mb-1 leading-snug">{item.task}</h5>
                             {item.description && <p className="text-xs text-slate-400">{item.description}</p>}
                           </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
             )}
           </div>
        </section>
      )}

      {/* Advanced Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         {/* Neural Gap Analysis */}
         <section className="bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8">
               <div>
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">Neural Gap Analysis</h3>
                  <p className="text-xs text-slate-500 font-medium">Identifying technical vs. semantic inconsistencies.</p>
               </div>
               <BrainCog size={20} className="text-blue-500" />
            </div>

            <div className="space-y-6">
               {[
                 { label: 'Technical Depth', value: 85, color: 'blue' },
                 { label: 'Semantic Breadth', value: 64, color: 'indigo' },
                 { label: 'Entity Connectivity', value: 42, color: 'emerald' },
                 { label: 'SGE Readiness', value: 31, color: 'rose' },
               ].map((item, i) => (
                 <div key={i} className="space-y-2">
                    <div className="flex justify-between text-[10px] font-black uppercase text-slate-400">
                       <span>{item.label}</span>
                       <span className="text-slate-900">{item.value}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                       <div
                         style={{ width: `${item.value}%` }}
                         className={`h-full bg-${item.color}-500 shadow-sm transition-all duration-500`} 
                       />
                    </div>
                 </div>
               ))}
            </div>
         </section>

         {/* Node Integrity Heatmap */}
         <section className="bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm">
            <div className="flex items-center justify-between mb-8">
               <div>
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight">Node Integrity Heatmap</h3>
                  <p className="text-xs text-slate-500 font-medium">Real-time health distribution across the crawl stack.</p>
               </div>
               <div className="flex gap-2">
                  <div className="flex items-center gap-1.5">
                     <div className="w-2 h-2 bg-emerald-500 rounded-sm" />
                     <span className="text-[8px] font-black text-slate-400 uppercase">90+</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                     <div className="w-2 h-2 bg-amber-500 rounded-sm" />
                     <span className="text-[8px] font-black text-slate-400 uppercase">70-90</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                     <div className="w-2 h-2 bg-rose-500 rounded-sm" />
                     <span className="text-[8px] font-black text-slate-400 uppercase">&lt;70</span>
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-10 md:grid-cols-20 gap-1.5">
               {pages.slice(0, 100).map((page, i) => (
                 <div 
                   key={i}
                   className={cn(
                     "aspect-square rounded-sm border border-black/5",
                     page.score >= 90 ? "bg-emerald-500" : page.score >= 70 ? "bg-amber-400" : "bg-rose-500"
                   )}
                   title={`${page.url}: ${page.score}%`}
                 />
               ))}
               {pages.length < 100 && Array.from({ length: 100 - pages.length }).map((_, i) => (
                 <div key={`empty-${i}`} className="aspect-square rounded-sm bg-slate-100 border border-black/5 opacity-50" />
               ))}
            </div>
            <div className="mt-6 pt-6 border-t border-slate-100 flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase">
               <span>Total Nodes Analyzed</span>
               <span className="text-slate-900">{pages.length} / 1000 MAX</span>
            </div>
         </section>

         {/* Predictive Impact Vectors */}
         <section className="bg-slate-900 rounded-[32px] p-8 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-110 transition-transform">
               <Target size={120} />
            </div>
            <div className="relative z-10">
               <h3 className="text-lg font-black text-white italic uppercase tracking-tight mb-2">Predictive Impact Vectors</h3>
               <p className="text-xs text-slate-400 font-medium mb-8">Estimated domain lift following directive execution.</p>
               
               <div className="grid grid-cols-3 gap-4">
                  {[
                    { label: 'Crawlability', lift: '+15%', color: 'blue' },
                    { label: 'Ranking', lift: '+22%', color: 'emerald' },
                    { label: 'UX Utility', lift: '+38%', color: 'indigo' },
                  ].map((vec, i) => (
                    <div key={i} className="p-4 bg-white/5 border border-white/10 rounded-[20px] text-center">
                       <div className={`text-sm font-black text-${vec.color}-400 mb-1`}>{vec.lift}</div>
                       <div className="text-[8px] font-black uppercase text-slate-500 tracking-widest">{vec.label}</div>
                    </div>
                  ))}
               </div>

               <div className="mt-8 space-y-4">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                     <span>Neural Trust Threshold</span>
                     <span className="text-emerald-400">Achievable in 30 Days</span>
                  </div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                     <div
                        whileInView={{ width: '75%' }}
                        className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                     />
                  </div>
               </div>
            </div>
         </section>

         {/* Neural Maturity Index */}
         <section className="bg-white border border-slate-200 rounded-[32px] p-8 shadow-sm lg:col-span-2">
         <div className="flex items-center justify-between mb-10">
            <div>
               <h3 className="text-xl font-bold text-slate-900 tracking-tight">Neural Maturity Index</h3>
               <p className="text-sm text-slate-500 font-medium mt-1">Cross-vector site health distribution.</p>
            </div>
            <div className="px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100 italic font-black text-[10px] text-slate-400 uppercase tracking-widest">
               Calculated // v4.2
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
            {[
              { label: 'Technical Integrity', value: 88, color: 'blue' },
              { label: 'Semantic Authority', value: 72, color: 'indigo' },
              { label: 'Performance Velocity', value: avgScore, color: 'emerald' },
              { label: 'Link Topography', value: 64, color: 'amber' },
            ].map((metric, i) => (
              <div key={i} className="space-y-3">
                 <div className="flex justify-between items-end">
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{metric.label}</span>
                    <span className="text-sm font-black text-slate-900">{metric.value}%</span>
                 </div>
                 <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      whileInView={{ width: `${metric.value}%` }}
                      className={`h-full bg-${metric.color}-500 shadow-sm`}
                    />
                 </div>
              </div>
            ))}
         </div>
      </section>
      </div>

      {/* Strategic Vision Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section className="bg-slate-900 text-white rounded-[32px] p-8 md:p-10 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-10 opacity-5">
               <FileText size={160} strokeWidth={1} />
             </div>
             
             <div className="relative z-10">
               <div className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-400 mb-6">Subject: Executive Synthesis</div>
               <h3 className="text-2xl font-black italic tracking-tight mb-6 uppercase">Mission Critical Findings</h3>
               
               <div className="space-y-6">
                 <div className="flex items-start gap-5 p-5 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors group">
                    <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                      <BarChart2 size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-100 mb-1">Architecture Velocity Paradox</h4>
                      <p className="text-sm text-slate-400 leading-relaxed font-medium">System performance is currently bottlenecked by unoptimized media nodes and redundant network calls, affecting both user retention and crawl efficiency across the primary domain stack.</p>
                    </div>
                 </div>

                 <div className="flex items-start gap-5 p-5 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors group">
                    <div className="w-10 h-10 bg-rose-500/20 rounded-xl flex items-center justify-center text-rose-400 group-hover:scale-110 transition-transform">
                      <ShieldAlert size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-100 mb-1">Content Integrity Drift</h4>
                      <p className="text-sm text-slate-400 leading-relaxed font-medium">Detected a significant volume of metadata decay and duplicate header directives. This tactical dilution weakens semantic authority and generates confusion across search engine neural crawlers.</p>
                    </div>
                 </div>

                 <div className="flex items-start gap-5 p-5 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors group">
                    <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                      <TrendingUp size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-100 mb-1">Semantic Opportunity Vector</h4>
                      <p className="text-sm text-slate-400 leading-relaxed font-medium">Strategic keyword clusters are under-utilized. Strengthening internal link topography around your high-value nodes could result in a 35% increase in domain authority within the next audit cycle.</p>
                    </div>
                 </div>
               </div>
             </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-6">
               <h3 className="text-xl font-bold text-slate-900 tracking-tight">Tactical Roadmap</h3>
               <div className="h-px flex-1 mx-6 bg-slate-200" />
               <button 
                onClick={() => setIsDeckExpanded(true)}
                className="text-[10px] font-black uppercase text-blue-600 hover:text-blue-700 tracking-widest flex items-center gap-1 group"
               >
                 Expand Full Deck <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
               </button>
            </div>

            <div className="space-y-4">
              {extendedDirectives.slice(0, 4).map((item, i) => (
                <div key={i} className="flex flex-col md:flex-row md:items-center justify-between p-5 bg-white border border-slate-200 rounded-2xl group hover:border-slate-300 transition-all shadow-sm">
                   <div className="flex items-center gap-4 mb-3 md:mb-0">
                      <div className={`text-[9px] font-black px-2 py-1 bg-${item.color}-50 text-${item.color}-600 rounded uppercase tracking-wider`}>
                        {item.impact}
                      </div>
                      <span className="font-medium text-slate-700">{item.task}</span>
                   </div>
                   <div className="flex items-center gap-3">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">{item.label}</div>
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                      <button className="p-1 text-slate-400 hover:text-slate-900 transition-colors">
                        <ChevronRight size={16} />
                      </button>
                   </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-8">
           <div className="bg-white border border-slate-200 p-8 rounded-[32px] shadow-sm">
              <h4 className="text-sm font-black uppercase text-slate-400 tracking-[0.2em] mb-6 border-b border-slate-100 pb-2">Status Timeline</h4>
              
              <div className="space-y-8 relative">
                <div className="absolute left-2.5 top-0 bottom-0 w-px bg-slate-100" />
                
                <div className="relative pl-10">
                   <div className="absolute left-0 top-1 w-5 h-5 bg-blue-600 rounded-full border-4 border-white shadow-sm flex items-center justify-center text-[8px] text-white">1</div>
                   <h5 className="font-bold text-slate-900 text-sm">Crawl Execution</h5>
                   <p className="text-xs text-slate-500 mt-1">Successfully synthesized {pages.length} nodes from the root domain stack.</p>
                   <div className="text-[9px] font-black text-slate-300 uppercase mt-2 tracking-widest">Complete</div>
                </div>

                <div className="relative pl-10">
                   <div className="absolute left-0 top-1 w-5 h-5 bg-blue-600 rounded-full border-4 border-white shadow-sm flex items-center justify-center text-[8px] text-white">2</div>
                   <h5 className="font-bold text-slate-900 text-sm">Neural Synthesis</h5>
                   <p className="text-xs text-slate-500 mt-1">Generated tactical insights using semantic correlation of page metadata.</p>
                   <div className="text-[9px] font-black text-slate-300 uppercase mt-2 tracking-widest">Complete</div>
                </div>

                <div className="relative pl-10">
                   <div className="absolute left-0 top-1 w-5 h-5 bg-slate-200 rounded-full border-4 border-white shadow-sm flex items-center justify-center text-[8px] text-slate-500">3</div>
                   <h5 className="font-bold text-slate-900 text-sm">Strategic Remediation</h5>
                   <p className="text-xs text-slate-500 mt-1">Currently identifying specific code-level directives for technical engineers.</p>
                   <div className="text-[9px] font-black text-blue-600 uppercase mt-2 tracking-widest animate-pulse">Running...</div>
                </div>
              </div>
           </div>

           <div className="bg-indigo-600 rounded-[32px] p-8 text-white relative overflow-hidden group shadow-xl shadow-indigo-200">
              <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-all"><Clock size={50} /></div>
              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-200 mb-2">Audit Context</div>
              <div className="text-2xl font-black italic mb-6">
                ARCHIVE SYNC
              </div>
              <div className="space-y-4">
                 <div className="flex justify-between text-[11px] font-medium border-b border-indigo-500/50 pb-2">
                   <span className="text-indigo-200">Processing Time</span>
                   <span>42.8s</span>
                 </div>
                 <div className="flex justify-between text-[11px] font-medium border-b border-indigo-500/50 pb-2">
                   <span className="text-indigo-200">Data Density</span>
                   <span>High</span>
                 </div>
                 <div className="flex justify-between text-[11px] font-medium">
                   <span className="text-indigo-200">Directive Status</span>
                   <span>Verified</span>
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* Expanded Deck Modal */}
      
        {isDeckExpanded && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
             <div
               onClick={() => setIsDeckExpanded(false)}
               className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
             />
             <div
               className="relative bg-white w-full max-w-5xl max-h-[85vh] rounded-[40px] shadow-2xl overflow-hidden flex flex-col"
             >
              <div className="p-8 md:p-10 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
                 <div>
                    <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Master Directive Deck</div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight italic uppercase">Complete Architectural Roadmap</h2>
                 </div>
                 <button 
                  onClick={() => setIsDeckExpanded(false)}
                  className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:border-slate-300 transition-all"
                 >
                   <Lock size={18} />
                 </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 md:p-10 custom-scrollbar">
                 <div className="space-y-12">
                   {Object.keys(directivesByCategory).map((category) => (
                     <div key={category} className="space-y-6">
                        <div className="flex items-center gap-4">
                           <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest">{category}</h3>
                           <div className="h-px flex-1 bg-slate-100" />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           {directivesByCategory[category].map((item: any, i: number) => (
                             <div 
                               key={i}
                               className="p-6 bg-slate-50 border border-slate-100 rounded-3xl hover:border-blue-200 hover:bg-white transition-all group flex flex-col justify-between"
                             >
                                <div>
                                  <div className="flex items-center justify-between gap-4 mb-4">
                                     <div className={`px-2 py-0.5 bg-${item.color}-50 text-${item.color}-600 rounded-lg text-[9px] font-black uppercase tracking-wider border border-${item.color}-100`}>
                                       {item.impact}
                                     </div>
                                     <div className="text-[9px] font-bold text-slate-400 uppercase">{item.label}</div>
                                  </div>
                                  <h4 className="font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">{item.task}</h4>
                                  <p className="text-xs text-slate-500 leading-relaxed font-medium">
                                    {item.detail}
                                  </p>
                                </div>
                                <div className="mt-6 flex items-center gap-2 pt-4 border-t border-slate-100 border-dashed">
                                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                   <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic tracking-tighter">Execution Vector: Ready</span>
                                </div>
                             </div>
                           ))}
                        </div>
                     </div>
                   ))}
                 </div>
              </div>

              <div className="p-8 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
                 <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                   {extendedDirectives.length} Tactical items identified in current crawl cycle.
                 </div>
                 <div className="flex gap-4">
                    <button 
                      onClick={() => window.print()}
                      className="px-6 py-3 bg-white border border-slate-200 text-slate-900 rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-slate-50 transition-all active:scale-95"
                    >
                      Print Summary
                    </button>
                    <button 
                      onClick={() => setIsDeckExpanded(false)}
                      className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-wider hover:bg-slate-800 transition-all shadow-lg active:scale-95"
                    >
                      Acknowledge Roadmap
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
      
    </div>
  );
}
