import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  HelpCircle, 
  Bot, 
  Layers, 
  Search, 
  Compass, 
  AlertTriangle, 
  CheckCircle2, 
  Zap, 
  TrendingUp, 
  ArrowRight, 
  User, 
  UserCheck, 
  BarChart2, 
  Activity, 
  Flame, 
  ThumbsUp, 
  Play, 
  GitFork, 
  Frown, 
  Smile, 
  X,
  Info,
  Sliders
} from 'lucide-react';
import { SEOPage } from '../types/seo';
import { cn } from '../lib/utils';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip as RechartsTooltip, 
  BarChart as RechartsBarChart, 
  Bar as RechartsBar, 
  Cell 
} from 'recharts';

interface AIUXAuditPanelProps {
  pages: SEOPage[];
  selectedPageUrl?: string;
  onPageSelect?: (page: SEOPage) => void;
}

interface MiniMetric {
  name: string;
  score: number;
  status: 'optimal' | 'warning' | 'critical';
  details: string;
}

export function AIUXAuditPanel({ pages = [], selectedPageUrl, onPageSelect }: AIUXAuditPanelProps) {
  const [activeUrl, setActiveUrl] = useState<string>('');
  
  // Tab within UX Audit panel
  const [activeSubTab, setActiveSubTab] = useState<'features' | 'personalization' | 'search' | 'journey'>('features');
  
  // Custom calibrators for interactive simulator
  const [chatbotContextRetention, setChatbotContextRetention] = useState<number>(65);
  const [chatbotHandoffSpeed, setChatbotHandoffSpeed] = useState<number>(45);
  const [personalizationTier, setPersonalizationTier] = useState<'basic' | 'segmented' | 'cognitive'>('segmented');
  const [searchRelevance, setSearchRelevance] = useState<number>(70);
  const [zeroResultStrategy, setZeroResultStrategy] = useState<'fallback' | 'recommendations' | 'empty'>('recommendations');

  // Journey Simulation state
  const [simulationStep, setSimulationStep] = useState<number>(0);
  const [isSimulatingJourney, setIsSimulatingJourney] = useState(false);
  const [journeyStepsLog, setJourneyStepsLog] = useState<{
    stage: string;
    impact: string;
    conversionDelta: number;
    frictionPoints: string;
  }[]>([]);

  useEffect(() => {
    if (selectedPageUrl && pages.some(p => p.url === selectedPageUrl)) {
      setActiveUrl(selectedPageUrl);
    } else if (pages.length > 0 && !activeUrl) {
      setActiveUrl(pages[0].url);
    }
  }, [selectedPageUrl, pages]);

  const activePage = pages.find(p => p.url === activeUrl) || pages[0] || null;

  // Derive page elements to reflect custom feedback scores
  const getPageUXHeuristics = (page: SEOPage | null) => {
    if (!page) {
      return {
        overallUXScore: 0,
        chatbotRating: 0,
        personalizationRating: 0,
        searchRating: 0,
        journeyEfficacy: 0,
        issuesCount: 0
      };
    }

    const text = (page.bodyText || "" + page.title + page.description).toLowerCase();
    
    // Check chatbot indicators
    const hasChatbot = text.includes('chat') || text.includes('bot') || text.includes('message') || text.includes('comment');
    const chatbotRating = hasChatbot ? Math.round((chatbotContextRetention + (100 - chatbotHandoffSpeed)) / 2) : 35;

    // Check personalization indicators
    const p1 = text.includes('recommend') || text.includes('suggest') || text.includes('similar') || text.includes('related');
    const p2 = text.includes('you') || text.includes('your') || text.includes('prefer') || text.includes('personal');
    let personalizationRating = 30;
    if (personalizationTier === 'cognitive') personalizationRating = 88;
    else if (personalizationTier === 'segmented') personalizationRating = 65;
    else if (p1 && p2) personalizationRating = 55;
    else if (p1 || p2) personalizationRating = 45;

    // Search rating
    const hasSearch = text.includes('search') || text.includes('find') || text.includes('query') || text.includes('filter');
    let searchRating = hasSearch ? searchRelevance : 40;
    if (zeroResultStrategy === 'empty') searchRating = Math.max(20, searchRating - 30);
    else if (zeroResultStrategy === 'recommendations') searchRating = Math.min(100, searchRating + 10);

    // Journey friction indicators
    let journeyEfficacy = Math.round((chatbotRating + personalizationRating + searchRating) / 3);
    if (page.wordCount < 300) journeyEfficacy = Math.max(30, journeyEfficacy - 15); // short pages have thin layouts

    const overallUXScore = Math.round((chatbotRating * 0.3) + (personalizationRating * 0.3) + (searchRating * 0.2) + (journeyEfficacy * 0.2));

    return {
      overallUXScore,
      chatbotRating,
      personalizationRating,
      searchRating,
      journeyEfficacy,
      hasChatbot,
      hasSearch
    };
  };

  const metrics = getPageUXHeuristics(activePage);

  // Conversion Lift Calculator logic
  const calculateConversionImpact = () => {
    const baselineCR = 1.8; // 1.8% baseline conversion rate
    let multiplier = 1.0;

    // Chatbot impact
    if (chatbotContextRetention > 80) multiplier += 0.15;
    else if (chatbotContextRetention < 40) multiplier -= 0.05;

    // Personalization impact
    if (personalizationTier === 'cognitive') multiplier += 0.35;
    else if (personalizationTier === 'segmented') multiplier += 0.18;
    else multiplier += 0.05;

    // Search impact
    if (searchRelevance > 80 && zeroResultStrategy === 'recommendations') multiplier += 0.25;
    else if (zeroResultStrategy === 'empty') multiplier -= 0.10;

    const projectedCR = Math.min(6.5, Math.max(0.5, baselineCR * multiplier));
    const percentageLift = Math.round(((projectedCR - baselineCR) / baselineCR) * 100);

    return {
      baselineCR,
      projectedCR: projectedCR.toFixed(2),
      percentageLift,
      isPositive: percentageLift >= 0
    };
  };

  const conversionData = calculateConversionImpact();

  // Run Journey Efficacy Simulation Step-by-Step
  const triggerJourneySimulation = () => {
    setIsSimulatingJourney(true);
    setSimulationStep(0);
    setJourneyStepsLog([]);

    const stages = [
      {
        stage: '1. Intent Discovery & Navigation',
        impact: personalizationTier === 'cognitive' ? 'Cognitive segmentation matches exact traffic vector.' : 'Standard landing routing.',
        conversionDelta: personalizationTier === 'cognitive' ? 15 : personalizationTier === 'segmented' ? 8 : 2,
        frictionPoints: activePage && activePage.wordCount < 300 ? 'Thin content makes discovery ambiguous for crawlers.' : 'Optimal'
      },
      {
        stage: '2. Product Search & Filter',
        impact: `Search relevance calibrated to ${searchRelevance}%. ${zeroResultStrategy === 'recommendations' ? 'Matches synonyms on fallback query.' : 'Zero-result defaults to blank canvas.'}`,
        conversionDelta: searchRelevance > 75 ? 12 : searchRelevance < 45 ? -8 : 3,
        frictionPoints: zeroResultStrategy === 'empty' ? 'Zero-result search drops user instantly.' : 'Safe recommendations guide recovery.'
      },
      {
        stage: '3. Chatbot Dialogue & Assistance',
        impact: metrics.hasChatbot ? `Interactive assistant enabled. Context retention @ ${chatbotContextRetention}%.` : 'No proactive bot found.',
        conversionDelta: metrics.hasChatbot ? Math.round((chatbotContextRetention - 40) * 0.2) : -5,
        frictionPoints: chatbotContextRetention < 50 ? 'Bot loses historical guidelines quickly.' : 'Fluent conversation bounds.'
      },
      {
        stage: '4. Dynamic Call-to-Action Match',
        impact: `Personalization tier: ${personalizationTier.toUpperCase()}. Personalized layouts loaded based on behavioral adaptation.`,
        conversionDelta: personalizationTier === 'cognitive' ? 18 : personalizationTier === 'segmented' ? 10 : 0,
        frictionPoints: personalizationTier === 'basic' ? 'Static CTAs mismatch reader search intent.' : 'Adaptive dynamic pointers.'
      }
    ];

    let current = 0;
    const interval = setInterval(() => {
      if (current < stages.length) {
        setSimulationStep(current + 1);
        setJourneyStepsLog(prev => [...prev, stages[current]]);
        current++;
      } else {
        clearInterval(interval);
        setIsSimulatingJourney(false);
      }
    }, 1000);
  };

  // Structured findings lists
  const chatbotFeatures = [
    { name: 'Response Quality Index', score: chatbotContextRetention, desc: 'Clarity, structural coherence, and safety standards of dynamically returned dialogs.', icon: ThumbsUp },
    { name: 'Semantic Context Retention', score: chatbotContextRetention - 5, desc: 'Ability to preserve multi-turn conversational histories without repeated prompts.', icon: Bot },
    { name: 'Adaptive Escalation Flow', score: 100 - chatbotHandoffSpeed, desc: 'Efficiency in routing ambiguous queries to human operators or support desks.', icon: GitFork },
    { name: 'Factual Accuracy Safeguards', score: Math.round(chatbotContextRetention * 0.9 + 5), desc: 'Grounding systems that check and block generation errors in real-time.', icon: CheckCircle2 }
  ];

  const searchFeatures = [
    { name: 'Predictive Query Complete', score: searchRelevance - 10, desc: 'Predicts search intents letter-by-letter as user inputs characters.', icon: Search },
    { name: 'Natural Language Search Accuracy', score: searchRelevance, desc: 'Understands complex verbal paragraphs or questions beyond typical keywords.', icon: Sparkles },
    { name: 'Zero-Result Recovery Path', score: zeroResultStrategy === 'recommendations' ? 85 : zeroResultStrategy === 'fallback' ? 55 : 15, desc: 'Redirects traffic to alternative matching categories on zero product matches.', icon: Activity }
  ];

  const getPageShortName = (url: string) => {
    try {
      const parsed = new URL(url);
      return parsed.pathname === '/' ? '/' : parsed.pathname;
    } catch {
      return url.length > 20 ? url.substring(0, 20) + '...' : url;
    }
  };

  // Chart data
  const comparisonData = [
    { name: 'Chatbot', score: metrics.chatbotRating, fill: '#3b82f6' },
    { name: 'Personalization', score: metrics.personalizationRating, fill: '#6366f1' },
    { name: 'Smart Search', score: metrics.searchRating, fill: '#a855f7' },
    { name: 'Journey Efficacy', score: metrics.journeyEfficacy, fill: '#34d399' }
  ];

  return (
    <div className="space-y-10" id="ai-ux-audit-workspace">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 border-b border-slate-100 pb-8">
        <div>
          <div className="flex items-center gap-2.5 text-[10px] font-black text-indigo-600 uppercase tracking-[0.4em] mb-3">
            <Compass size={13} className="shrink-0 animate-spin" style={{ animationDuration: '6s' }} />
            <span>Core Experience Evaluation</span>
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none italic uppercase flex items-center gap-3">
            AI UX Audit
          </h2>
          <p className="text-sm font-medium text-slate-500 leading-relaxed mt-3 max-w-2xl">
            Analyze client-side engagement layers—evaluating chatbot dialogues, relevance-scoring smart search queries, user segmentation models, and behavioral conversion pipelines.
          </p>
        </div>

        {/* Dynamic target selector */}
        {pages.length > 0 && (
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-2 rounded-2xl shrink-0">
            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-widest pl-2">Target Page:</span>
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
                  {idx + 1}. {p.title ? `${p.title.substring(0, 20)}...` : getPageShortName(p.url)}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {pages.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-20 border border-slate-200 rounded-[40px] bg-slate-50/40 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
            <Layers size={28} />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-800">No Target UX Indicators Found</h3>
            <p className="text-xs font-medium text-slate-450 max-w-sm mt-1">
              Please crawled websites first to evaluate and run cognitive simulation workflows against standard user flows.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT: Calibration Board & Interactive Simulator (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="p-6 border border-slate-200 rounded-[30px] bg-white shadow-xs space-y-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Sliders size={14} className="text-slate-500" />
                  <span className="text-xs font-black uppercase tracking-widest text-slate-900">Calibration Board</span>
                </div>
                <span className="px-2 py-0.5 border border-indigo-100 bg-indigo-50/60 text-[9px] font-black rounded text-indigo-700 uppercase tracking-wider font-mono">
                  UX Simulator
                </span>
              </div>

              {/* Chatbot calibration parameters */}
              <div className="space-y-4">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono flex items-center gap-1">
                  <Bot size={11} className="text-blue-500" />
                  <span>Interactive Assistant Calibrator</span>
                </h4>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-slate-700">Context Retention Span</span>
                    <span className="text-slate-900 font-mono">{chatbotContextRetention} turns</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={chatbotContextRetention}
                    onChange={(e) => setChatbotContextRetention(parseInt(e.target.value) || 50)}
                    className="w-full h-1.5 bg-slate-100 rounded-full appearance-none cursor-pointer accent-blue-600"
                  />
                  <span className="text-[9px] text-slate-450 block font-normal leading-normal">Defines the deep memory size utilized to store conversation history logs inside the active model context.</span>
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-slate-700">Human Handoff Friction</span>
                    <span className="text-slate-900 font-mono">{chatbotHandoffSpeed}s wait</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="120"
                    value={chatbotHandoffSpeed}
                    onChange={(e) => setChatbotHandoffSpeed(parseInt(e.target.value) || 60)}
                    className="w-full h-1.5 bg-slate-100 rounded-full appearance-none cursor-pointer accent-blue-600"
                  />
                </div>
              </div>

              {/* Personalization level calibration */}
              <div className="space-y-4 border-t border-slate-100 pt-5">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono flex items-center gap-1">
                  <User size={11} className="text-indigo-500" />
                  <span>UX Personalization Tiers</span>
                </h4>

                <div className="grid grid-cols-3 gap-2">
                  {(['basic', 'segmented', 'cognitive'] as const).map(tier => (
                    <button
                      key={tier}
                      onClick={() => setPersonalizationTier(tier)}
                      className={cn(
                        "p-2.5 border rounded-xl text-[9px] font-black uppercase tracking-wider text-center active:scale-95 transition-all outline-none",
                        personalizationTier === tier
                          ? "bg-indigo-50 border-indigo-250 text-indigo-700 font-bold"
                          : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                      )}
                    >
                      {tier}
                    </button>
                  ))}
                </div>
                <p className="text-[9px] text-slate-455 font-normal leading-relaxed">
                  {personalizationTier === 'basic' && 'Standard static layouts showing identical menus to all visitors.'}
                  {personalizationTier === 'segmented' && 'Dynamic blocks and tailored CTAs assigned by high-level user demographic lists.'}
                  {personalizationTier === 'cognitive' && 'Advanced real-time adaptation fitting visual components to dynamic stream intents.'}
                </p>
              </div>

              {/* Smart Search Level */}
              <div className="space-y-4 border-t border-slate-100 pt-5">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono flex items-center gap-1">
                  <Search size={11} className="text-purple-500" />
                  <span>Search Relevance & Recovery</span>
                </h4>

                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-bold">
                    <span className="text-slate-700">Predictive Match Accuracy</span>
                    <span className="text-slate-900 font-mono">{searchRelevance}%</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="100"
                    value={searchRelevance}
                    onChange={(e) => setSearchRelevance(parseInt(e.target.value) || 70)}
                    className="w-full h-1.5 bg-slate-100 rounded-full appearance-none cursor-pointer accent-purple-600"
                  />
                </div>

                <div className="space-y-2 pt-1.5">
                  <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider block font-mono">Zero-Result Strategy</span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'empty', name: 'Raw Default empty' },
                      { id: 'fallback', name: 'Related Categories' },
                      { id: 'recommendations', name: 'Smart Suggestions' }
                    ].map(st => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setZeroResultStrategy(st.id as any)}
                        className={cn(
                          "p-2 border rounded-xl text-[8px] font-black uppercase tracking-wider text-center active:scale-95 transition-all outline-none leading-none h-9 flex items-center justify-center",
                          zeroResultStrategy === st.id
                            ? "bg-purple-50 border-purple-255 text-purple-705"
                            : "bg-slate-50 border-slate-205 text-slate-500 hover:bg-slate-100"
                        )}
                      >
                        {st.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Predictive Lift Scoreboard */}
            <div className="p-6 border border-slate-250/80 rounded-[30px] bg-slate-900 text-white space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-[40px] pointer-events-none" />
              
              <div className="flex items-center gap-1.5 border-b border-white/10 pb-3">
                <TrendingUp size={14} className="text-emerald-400" />
                <span className="text-xs font-black uppercase tracking-widest text-slate-300">Projected Conversion Uplift</span>
              </div>

              <div className="flex items-baseline justify-between py-2">
                <span className="text-4xl font-black text-emerald-400 italic font-mono">
                  {conversionData.percentageLift > 0 ? `+${conversionData.percentageLift}%` : `${conversionData.percentageLift}%`}
                </span>
                <span className="text-xs font-mono text-slate-400">Projected Uplift</span>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-white/5 p-3 rounded-xl border border-white/10 text-[11px] leading-relaxed font-mono">
                <div>
                  <span className="text-slate-400 block text-[9px] font-sans font-bold uppercase tracking-wider">Baseline CR</span>
                  <span className="text-white font-bold text-xs mt-0.5 block">{conversionData.baselineCR}%</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[9px] font-sans font-bold uppercase tracking-wider">Projected CR</span>
                  <span className="text-emerald-405 font-black text-xs mt-0.5 block">{conversionData.projectedCR}%</span>
                </div>
              </div>

              <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                By integrating structured cognitive search queries, real-time context-retaining assistants, and segmented behavioral views, you dynamically reduce dropout funnels.
              </p>
            </div>
          </div>

          {/* RIGHT: Workspaces containing selected tabs (7 cols) */}
          <div className="lg:col-span-12 lg:col-start-6 lg:row-start-1 space-y-6">
            {/* Visual indicators scoreboard tabs */}
            <div className="flex border border-slate-200 bg-white p-1 rounded-2xl gap-1">
              {[
                { id: 'features', name: 'AI Assistants Audit', icon: Bot },
                { id: 'personalization', name: 'Personalization Scale', icon: UserCheck },
                { id: 'search', name: 'Smart Search Relevance', icon: Search },
                { id: 'journey', name: 'Journey drop-off Simulator', icon: GitFork }
              ].map(sub => {
                const Icon = sub.icon;
                return (
                  <button
                    key={sub.id}
                    onClick={() => setActiveSubTab(sub.id as any)}
                    className={cn(
                      "flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all outline-none border",
                      activeSubTab === sub.id
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

            {/* Overall Quality Grades Chart */}
            <div className="p-6 border border-slate-200 rounded-[35px] bg-white shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2 min-w-0">
                  <Activity size={14} className="text-indigo-600" />
                  <span className="text-xs font-black uppercase tracking-widest text-slate-900">Experience Category Scores</span>
                </div>
                
                <div className="flex gap-4 self-center font-mono text-[10px]">
                  <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" /><span>Chatbot: {metrics.chatbotRating}%</span></div>
                  <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-650 inline-block" /><span>Segmented: {metrics.personalizationRating}%</span></div>
                  <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block" /><span>Search: {metrics.searchRating}%</span></div>
                </div>
              </div>

              {/* Chart mapping */}
              <div className="w-full h-[180px] flex items-center justify-center min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart data={comparisonData} barGap={4}>
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: '#475569', fontSize: 10, fontWeight: 700 }} 
                      axisLine={false} 
                      tickLine={false}
                    />
                    <YAxis 
                      domain={[0, 100]} 
                      tick={{ fill: '#94a3b8', fontSize: 10 }} 
                      axisLine={false} 
                      tickLine={false}
                    />
                    <RechartsTooltip 
                      contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '12px', color: '#fff', fontSize: '10px' }} 
                    />
                    <RechartsBar dataKey="score" radius={[6, 6, 0, 0]}>
                      {comparisonData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </RechartsBar>
                  </RechartsBarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* TAB CONTENT: Features */}
            {activeSubTab === 'features' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {chatbotFeatures.map((feat, i) => (
                    <div key={i} className="p-5 border border-slate-200 rounded-[24px] bg-white text-xs leading-relaxed hover:shadow-xs transition-shadow flex flex-col justify-between h-[180px]">
                      <div className="space-y-2">
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-[11px] font-black text-slate-800 tracking-tight block">{feat.name}</span>
                          <span className={cn(
                            "px-2 py-0.5 rounded font-mono text-[9px] font-black border uppercase tracking-widest",
                            feat.score >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-150' : 
                            feat.score >= 50 ? 'bg-amber-50 text-amber-700 border-amber-150' : 
                            'bg-rose-50 text-rose-700 border-rose-150'
                          )}>
                            {feat.score >= 80 ? 'Excellent' : feat.score >= 50 ? 'Intermediary' : 'Poor'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-normal font-medium">
                          {feat.desc}
                        </p>
                      </div>

                      <div className="space-y-2 font-mono">
                        <div className="flex justify-between text-[10px] font-bold">
                          <span className="text-slate-400">Efficacy Level</span>
                          <span className="text-slate-800">{feat.score}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              feat.score >= 80 ? "bg-emerald-500" : feat.score >= 50 ? "bg-amber-500" : "bg-rose-500"
                            )}
                            style={{ width: `${feat.score}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Human handoff analysis info */}
                <div className="p-4 border border-blue-100 rounded-2xl bg-blue-50/20 text-xs text-slate-700 leading-relaxed flex gap-3">
                  <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-850 font-black uppercase tracking-widest block text-[10px] mb-1">Human Handoff & Escalation Flow Audit</strong>
                    Our heuristics discovered high latency bounds waiting for human operator links. To avoid immediate customer retention drops, embed real-time webhook callbacks with secondary routing triggers which alert managers within <strong className="font-mono">30 seconds</strong>.
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: Personalization */}
            {activeSubTab === 'personalization' && (
              <div className="space-y-6">
                <div className="p-6 border border-slate-200 rounded-[28px] bg-white shadow-xs space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 border-b border-slate-100 pb-2">Dynamic Persona Selection & CTAs Map</h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">
                    Analyze content variations mapped out across visitor paths. High-performing pages avoid static boilerplates, loading contextually relevant CTAs mapped to individual user searches.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-2">
                    {[
                      {
                        title: '1. Organic Search Persona',
                        target: 'Arrives via technical SGE/GEO queries searching specifically for API configurations.',
                        cta: 'Learn API integrations',
                        score: personalizationTier === 'cognitive' ? 95 : personalizationTier === 'segmented' ? 70 : 30
                      },
                      {
                        title: '2. Comparative Shopper',
                        target: 'Arrives via competitive product tables comparing Apex vs. Vanguard.',
                        cta: 'Compare pricing matrix',
                        score: personalizationTier === 'cognitive' ? 90 : personalizationTier === 'segmented' ? 65 : 35
                      },
                      {
                        title: '3. Executive Intent',
                        target: 'Broad commercial visitor looking for high-level brief summarizers and PDFs.',
                        cta: 'Download Strategic PDF',
                        score: personalizationTier === 'cognitive' ? 98 : personalizationTier === 'segmented' ? 75 : 40
                      }
                    ].map((step, i) => (
                      <div key={i} className="p-4 border border-slate-150 rounded-2xl bg-slate-50/50 flex flex-col justify-between space-y-3 font-sans">
                        <div className="space-y-1.5">
                          <span className="text-[11px] font-bold text-slate-900 leading-tight block">{step.title}</span>
                          <p className="text-[10px] text-slate-500 leading-relaxed font-normal">{step.target}</p>
                        </div>

                        <div className="space-y-2 mt-2 pt-2 border-t border-slate-205/40">
                          <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none font-mono">Personalized Dynamic CTA</div>
                          <div className="text-[10px] font-black text-indigo-700 font-mono italic">“{step.cta}”</div>
                          <div className="flex items-center justify-between text-[9px] font-mono font-bold mt-1 text-slate-650">
                            <span>Adaptation Efficacy:</span>
                            <span className={step.score >= 80 ? "text-emerald-600" : step.score >= 50 ? "text-amber-600" : "text-rose-600"}>{step.score}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: Search */}
            {activeSubTab === 'search' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {searchFeatures.map((feat, i) => (
                    <div key={i} className="p-5 border border-slate-200 rounded-[24px] bg-white text-xs leading-relaxed hover:shadow-xs transition-shadow flex flex-col justify-between h-[180px]">
                      <div className="space-y-2">
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-[11px] font-black text-slate-800 tracking-tight block">{feat.name}</span>
                          <span className={cn(
                            "px-2 py-0.5 rounded font-mono text-[9px] font-black border uppercase tracking-widest",
                            feat.score >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-150' : 
                            feat.score >= 50 ? 'bg-amber-50 text-amber-700 border-amber-150' : 
                            'bg-rose-50 text-rose-700 border-rose-150'
                          )}>
                            {feat.score >= 80 ? 'Active' : feat.score >= 50 ? 'Semi-tuned' : 'Inactive'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-550 leading-normal font-normal">
                          {feat.desc}
                        </p>
                      </div>

                      <div className="space-y-2 font-mono">
                        <div className="flex justify-between text-[10px] font-bold">
                          <span className="text-slate-400">Relevance Grade</span>
                          <span className="text-slate-800">{feat.score}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              feat.score >= 80 ? "bg-emerald-500" : feat.score >= 50 ? "bg-amber-500" : "bg-rose-500"
                            )}
                            style={{ width: `${feat.score}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Smart search strategy highlights */}
                <div className="p-5 border border-indigo-150 rounded-2xl bg-indigo-50/20 text-xs text-slate-700 leading-relaxed font-normal space-y-2">
                  <strong className="text-indigo-900 font-bold uppercase tracking-widest text-[10px] block">Predictive & NL Query Best Practices</strong>
                  <p>
                    Modern user queries rely extensively on sentence blocks (e.g., &quot;How does Vanguard perform on Core Web Vitals comparisons&quot;) rather than static codes. Ensure your indices index long-tail questions and parse synonyms to return semantic landing structures dynamically on search result pages.
                  </p>
                </div>
              </div>
            )}

            {/* TAB CONTENT: Journey Simulation */}
            {activeSubTab === 'journey' && (
              <div className="p-6 border border-slate-200 rounded-[35px] bg-white shadow-xs space-y-6">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <div className="flex gap-2 items-center">
                    <Activity size={14} className="text-rose-600 animate-pulse" />
                    <span className="text-xs font-black uppercase tracking-widest text-slate-900">Cognitive Journey Flow Simulator</span>
                  </div>
                  <button
                    onClick={triggerJourneySimulation}
                    disabled={isSimulatingJourney}
                    className="px-3.5 py-1.5 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 hover:bg-rose-700 disabled:bg-slate-100 disabled:text-slate-400 active:scale-95 transition-all outline-none"
                  >
                    {isSimulatingJourney ? (
                      <>
                        <Activity size={11} className="animate-spin" />
                        <span>Running simulation...</span>
                      </>
                    ) : (
                      <>
                        <Play size={10} fill="currentColor" />
                        <span>Simulate Funnel Efficacy</span>
                      </>
                    )}
                  </button>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Watch mock customer interaction segments run in real-time. This fuzzer analyzes dynamic user friction nodes, high drop-off clusters, and gauges conversational efficiency based on calibrated scores.
                </p>

                {/* Journey Grid Line */}
                <div className="space-y-4 pt-2">
                  {journeyStepsLog.map((step, idx) => {
                    const isFrictionAlert = step.frictionPoints !== 'Optimal';
                    return (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={cn(
                          "p-4 border rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 relative overflow-hidden",
                          isFrictionAlert ? "bg-rose-50/50 border-rose-200 text-rose-800" : "bg-emerald-50/50 border-emerald-250 text-emerald-800"
                        )}
                      >
                        <div className="space-y-1">
                          <span className="text-[11px] font-black leading-none uppercase font-mono block tracking-tight">
                            {step.stage}
                          </span>
                          <p className="text-[10px] text-slate-500 font-medium">
                            {step.impact}
                          </p>
                        </div>

                        <div className="flex items-center gap-4 self-end sm:self-center shrink-0">
                          <div className="text-right">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block font-mono">Conversion Impact</span>
                            <span className={cn("text-xs font-black font-mono", step.conversionDelta >= 0 ? "text-emerald-600" : "text-rose-600")}>
                              {step.conversionDelta >= 0 ? `+${step.conversionDelta}%` : `${step.conversionDelta}%`}
                            </span>
                          </div>

                          <span className={cn(
                            "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider font-mono select-none block shrink-0",
                            isFrictionAlert ? "bg-rose-100 border border-rose-250 text-rose-700" : "bg-emerald-100 border border-emerald-250 text-emerald-750"
                          )}>
                            {step.frictionPoints}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}

                  {journeyStepsLog.length === 0 && (
                    <div className="p-10 border border-dashed border-slate-200 rounded-2xl text-center text-xs text-slate-400 italic">
                      Click the “Simulate Funnel Efficacy” button above to execute contextual customer journey scenarios.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
