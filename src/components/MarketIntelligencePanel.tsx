import React from 'react';
import { AIInsightData } from '../types/seo';
import { Megaphone, Users, MessageSquare, TrendingUp, Target, Briefcase, BarChart2 } from 'lucide-react';

interface MarketIntelligencePanelProps {
  insight: AIInsightData | string | null;
  isGeneratingAI: boolean;
  onRegenerateAI: () => void;
  agentProgress?: string;
}

export function MarketIntelligencePanel({ insight, isGeneratingAI, onRegenerateAI, agentProgress }: MarketIntelligencePanelProps) {
  if (isGeneratingAI) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-6">
        <div className="relative">
          <div className="w-20 h-20 border-4 border-rose-500/20 border-t-rose-500 rounded-full animate-spin" />
          <Megaphone className="absolute inset-0 m-auto text-rose-500 animate-pulse" size={32} />
        </div>
        <div className="text-center">
          <h3 className="text-xl font-bold text-slate-800 tracking-tight">Synthesizing Market Intel</h3>
          <p className="text-sm text-slate-500 font-medium mt-2 max-w-sm">
            {agentProgress || 'Our AI is translating audit technicalities into high-impact marketing campaigns and messaging frameworks.'}
          </p>
        </div>
      </div>
    );
  }

  const parsedInsight = typeof insight === 'string' ? null : insight;
  const marketIntel = parsedInsight?.marketIntelligence;

  if (!marketIntel) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center space-y-6 max-w-md mx-auto">
        <div className="w-20 h-20 bg-slate-50 border border-slate-100 rounded-[30px] flex items-center justify-center text-slate-300">
          <Megaphone size={32} />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-2">No Market Intelligence Data</h3>
          <p className="text-sm text-slate-500 font-medium">Audit the site and generate AI Insights to unlock marketing campaigns, audience gaps, and messaging frameworks.</p>
        </div>
        <button
          onClick={onRegenerateAI}
          className="px-8 py-3 bg-rose-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-rose-700 transition-all shadow-xl shadow-rose-500/20"
        >
          Generate Marketing Strategy
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-black tracking-tight text-slate-900 mb-4 bg-clip-text text-transparent bg-gradient-to-r from-rose-500 to-orange-400">
          Market Intelligence
        </h1>
        <p className="text-slate-500 text-lg max-w-2xl mx-auto font-medium">
          Equip Digital Marketers and Managers with fresh market insights. Refine campaigns, target new segments, and sharpen your core messaging.
        </p>
      </header>

      {/* Target Audience Gaps */}
      <section className="bg-white border text-left border-slate-200 rounded-[40px] p-8 md:p-12 shadow-sm relative overflow-hidden">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-4 bg-orange-50 text-orange-600 rounded-2xl">
            <Users size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Underserved Audiences</h2>
            <p className="text-sm text-slate-500 font-medium mt-1">Segments not effectively captured by current content architecture</p>
          </div>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {marketIntel.targetAudienceGaps.map((gap, i) => (
            <div 
              key={i}
              className="bg-slate-50 border border-slate-100 p-6 rounded-3xl"
            >
              <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-orange-500 font-black mb-4 shadow-sm">
                0{i + 1}
              </div>
              <p className="text-sm text-slate-700 font-bold leading-relaxed">
                "{gap}"
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Messaging Refinements */}
      <section className="bg-slate-900 rounded-[40px] p-8 md:p-12 shadow-xl relative overflow-hidden text-left">
        <div className="absolute top-0 right-0 w-[40rem] h-[40rem] bg-rose-500/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3" />
        
        <div className="flex items-center gap-4 mb-10 relative">
          <div className="p-4 bg-rose-500/20 text-rose-400 rounded-2xl">
            <MessageSquare size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">Messaging Blueprint</h2>
            <p className="text-sm text-slate-400 font-medium mt-1">Strategic shifts to improve resonance and clarity</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 relative">
          {marketIntel.messagingRefinements.map((ref, i) => (
            <div
              key={i}
              className="group"
            >
              <div className="bg-slate-800 border border-slate-700 rounded-[32px] overflow-hidden flex flex-col h-full hover:border-slate-600 transition-colors">
                <div className="p-6 border-b border-slate-700/50 bg-rose-950/30">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-400 mb-2 font-mono">Current Limitation</div>
                  <p className="text-slate-300 text-sm font-medium leading-relaxed italic">
                    "{ref.currentProblem}"
                  </p>
                </div>
                <div className="p-6 flex-1 bg-emerald-950/20">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 mb-2 font-mono flex items-center gap-2">
                    <Target size={12} /> Proposed Angle
                  </div>
                  <p className="text-white text-lg font-bold leading-relaxed">
                    "{ref.proposedMessaging}"
                  </p>
                </div>
                <div className="p-6 border-t border-slate-700 bg-slate-800/80">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1 font-mono">Strategic Reasoning</div>
                  <p className="text-slate-400 text-xs font-medium leading-relaxed">
                    {ref.reasoning}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Campaign Opportunities */}
      <section className="bg-white border text-left border-slate-200 rounded-[40px] p-8 md:p-12 shadow-sm relative overflow-hidden">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl">
            <Briefcase size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Campaign Opportunities</h2>
            <p className="text-sm text-slate-500 font-medium mt-1">Ready-to-launch initiatives sourced from audit intel</p>
          </div>
        </div>

        <div className="space-y-4">
          {marketIntel.campaignOpportunities?.map((campaign, i) => (
            <div 
              key={i}
              className="flex flex-col md:flex-row md:items-center gap-6 bg-slate-50 border border-slate-100 p-6 rounded-[32px] hover:shadow-md transition-all hover:bg-white"
            >
              <div className="flex-1">
                <h3 className="text-xl font-bold text-slate-900 tracking-tight mb-2 flex items-center gap-2">
                  <span className="text-indigo-500">•</span> {campaign.campaignName}
                </h3>
                <p className="text-sm text-slate-600 font-medium leading-relaxed max-w-3xl">{campaign.description}</p>
                
                <div className="mt-4 flex flex-wrap gap-2">
                  {campaign.targetChannels?.map((channel, idx) => (
                    <span 
                      key={idx} 
                      className="px-3 py-1.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl text-[10px] font-black uppercase tracking-widest"
                    >
                      {channel}
                    </span>
                  ))}
                </div>
              </div>

              <div className="md:border-l border-slate-200 md:pl-8 md:w-64 shrink-0">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2 font-mono flex items-center gap-2">
                  <BarChart2 size={12} /> Expected Outcome
                </div>
                <div className="text-sm font-bold text-indigo-900 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
                  {campaign.expectedOutcome}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Competitive & Strategic Positioning */}
      {marketIntel.competitivePositioning && (
        <section className="bg-white border text-left border-slate-200 rounded-[40px] p-8 md:p-12 shadow-sm relative overflow-hidden">
          <div className="flex items-center gap-4 mb-8">
             <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl">
               <TrendingUp size={24} />
             </div>
             <div>
               <h2 className="text-2xl font-black text-slate-900 tracking-tight">Competitive Positioning</h2>
               <p className="text-sm text-slate-500 font-medium mt-1">Market differentiation and strategic foresight</p>
             </div>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
             <div className="bg-slate-50 border border-slate-100 p-8 rounded-[32px]">
                <h3 className="text-xs font-black uppercase tracking-widest text-emerald-600 mb-4 font-mono">Market Differentiator</h3>
                <p className="text-slate-800 font-bold leading-relaxed">{marketIntel.competitivePositioning.marketDifferentiator}</p>
             </div>
             <div className="bg-rose-50 border border-rose-100 p-8 rounded-[32px]">
                <h3 className="text-xs font-black uppercase tracking-widest text-rose-600 mb-4 font-mono">Key Threats</h3>
                <ul className="space-y-3">
                  {marketIntel.competitivePositioning.threats?.map((threat, i) => (
                    <li key={i} className="text-sm text-slate-700 font-medium flex items-start gap-2">
                       <span className="text-rose-400 shrink-0 mt-0.5">•</span>
                       {threat}
                    </li>
                  ))}
                </ul>
             </div>
             <div className="bg-indigo-50 border border-indigo-100 p-8 rounded-[32px]">
                <h3 className="text-xs font-black uppercase tracking-widest text-indigo-600 mb-4 font-mono">Blue Ocean Opportunities</h3>
                <ul className="space-y-3">
                  {marketIntel.competitivePositioning.opportunities?.map((opp, i) => (
                    <li key={i} className="text-sm text-slate-700 font-medium flex items-start gap-2">
                       <span className="text-indigo-400 shrink-0 mt-0.5">•</span>
                       {opp}
                    </li>
                  ))}
                </ul>
             </div>
          </div>
        </section>
      )}

      {/* Buyer Personas */}
      {marketIntel.buyerPersonas && marketIntel.buyerPersonas.length > 0 && (
        <section className="bg-white border text-left border-slate-200 rounded-[40px] p-8 md:p-12 shadow-sm relative overflow-hidden">
          <div className="flex items-center gap-4 mb-8">
             <div className="p-4 bg-sky-50 text-sky-600 rounded-2xl">
               <Users size={24} />
             </div>
             <div>
               <h2 className="text-2xl font-black text-slate-900 tracking-tight">Buyer Personas</h2>
               <p className="text-sm text-slate-500 font-medium mt-1">Detailed profiles of your key conversion targets</p>
             </div>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
             {marketIntel.buyerPersonas.map((persona, i) => (
               <div key={i} className="bg-slate-50 border border-slate-100 p-8 rounded-[32px] hover:shadow-md transition-all">
                  <h3 className="text-xl font-bold text-slate-900 mb-6">{persona.personaName}</h3>
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 font-mono flex items-center gap-2">Pain Points</h4>
                      <ul className="space-y-2">
                        {persona.painPoints?.map((pp, idx) => (
                           <li key={idx} className="text-sm text-slate-700 font-medium flex items-start gap-2">
                             <span className="text-sky-400 shrink-0 mt-0.5">•</span>
                             {pp}
                           </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 font-mono flex items-center gap-2">Content Preferences</h4>
                      <div className="flex flex-wrap gap-2">
                        {persona.contentPreferences?.map((pref, idx) => (
                           <span key={idx} className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold">
                             {pref}
                           </span>
                        ))}
                      </div>
                    </div>
                  </div>
               </div>
             ))}
          </div>
        </section>
      )}

      {/* Pricing Strategy */}
      {marketIntel.pricingStrategy && (
        <section className="bg-slate-900 rounded-[40px] p-8 md:p-12 shadow-xl relative overflow-hidden text-left">
           <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px]" />
           <div className="flex items-center gap-4 mb-6 relative">
             <div className="p-4 bg-emerald-500/20 text-emerald-400 rounded-2xl">
               <Target size={24} />
             </div>
             <div>
               <h2 className="text-2xl font-black text-white tracking-tight">Pricing & Value Strategy</h2>
               <p className="text-sm text-slate-400 font-medium mt-1">Value proposition insights based on market positioning</p>
             </div>
           </div>
           <div className="relative">
             <p className="text-lg text-slate-300 font-medium leading-relaxed bg-slate-800/50 p-8 rounded-[32px] border border-slate-700/50">
               {marketIntel.pricingStrategy}
             </p>
           </div>
        </section>
      )}
    </div>
  );
}
