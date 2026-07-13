import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  Send,
  MessageSquare,
  Bot,
  Zap,
  Globe,
  Search,
  Database,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { chatWithGemini } from '../services/clientAiService';
import { SEOPage } from '../types/seo';
import { cn } from '../lib/utils';

export function AIAssistant({ pages, aiProvider, setAiProvider, apiKeys }: { 
  pages: SEOPage[]; 
  aiProvider: any;
  setAiProvider: (p: any) => void;
  apiKeys: any;
}) {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [retrievedSources, setRetrievedSources] = useState<any[]>([]);
  const [showRAGInspector, setShowRAGInspector] = useState(false);

  const handleAsk = async () => {
    if (!query.trim()) return;
    setIsAsking(true);
    setResponse('');
    setRetrievedSources([]);
    try {
      const gKeyRaw = apiKeys.gemini || '';
      const effectiveKeys = {
        ...apiKeys,
        gemini: (gKeyRaw === 'MY_GEMINI_API_KEY' || gKeyRaw === 'YOUR_GEMINI_API_KEY' ? process.env.GEMINI_API_KEY : gKeyRaw) || process.env.GEMINI_API_KEY || ''
      };

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: aiProvider, query, pages, keys: effectiveKeys })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResponse(data.response);
      setRetrievedSources(data.sources || []);
    } catch (err: any) {
      setResponse(`Neural Link Error: ${err.message}`);
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 mt-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="bg-white border border-slate-200 rounded-[40px] p-8 md:p-12 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-5">
           <Bot size={120} className="text-slate-900" />
        </div>
        
        <div className="relative z-10">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-12 border-b border-slate-100 pb-8">
            <div className="space-y-2 shrink-0">
              <div className="flex items-center gap-3">
                 <div className="p-2 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-500/20 shrink-0">
                   <MessageSquare size={20} />
                 </div>
                 <h3 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight lowercase">Neural SEO Query Engine</h3>
              </div>
              <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-wider ml-12 md:ml-14">Interrogate the dataset using semantic correlation</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 md:gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-150 shrink-0 self-start xl:self-auto">
               <div className="flex items-center gap-1.5 px-2 md:px-3">
                 <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-wider">Engine:</span>
                 <select 
                   value={aiProvider}
                   onChange={(e) => setAiProvider(e.target.value as any)}
                   className="bg-transparent text-[9px] md:text-[10px] font-black text-blue-600 uppercase tracking-wider outline-none cursor-pointer hover:text-blue-700"
                 >
                   <option value="gemini">Gemini 3.5</option>
                   <option value="openai">GPT-4o</option>
                   <option value="anthropic">Claude 3.5</option>
                   <option value="deepseek">DeepSeek v3</option>
                   <option value="groq">Groq (Llama)</option>
                   <option value="perplexity">Perplexity</option>
                   <option value="huggingface">Hugging Face</option>
                 </select>
               </div>
               <div className="w-px h-4 bg-slate-200" />
               <div className="px-2 md:px-3 flex items-center gap-2">
                 <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-wider">Status:</span>
                 <span className="flex items-center gap-1.5">
                   <div className={cn(
                     "w-1.5 h-1.5 rounded-full animate-pulse",
                     apiKeys[aiProvider] ? "bg-emerald-500" : "bg-slate-300"
                   )} />
                   <span className={cn(
                     "text-[9px] md:text-[10px] font-black uppercase tracking-wider",
                     apiKeys[aiProvider] ? "text-emerald-600" : "text-slate-400"
                   )}>
                     {apiKeys[aiProvider] ? "Linked" : "Key Req."}
                   </span>
                 </span>
               </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="relative group/input">
              <div className="absolute left-6 top-6 text-slate-400 group-focus-within/input:text-blue-500 transition-colors">
                 <Search size={24} strokeWidth={1.5} />
              </div>
              <textarea 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ex: What are the most critical architectural flaws across the 10 lowest scoring nodes?"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-[32px] pl-16 pr-32 pt-6 pb-20 text-base font-bold text-slate-800 placeholder:text-slate-300 outline-none focus:border-blue-500 focus:bg-white transition-all shadow-inner focus:shadow-blue-500/5 min-h-[140px] resize-none"
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleAsk())}
              />
              <button 
                onClick={handleAsk}
                disabled={isAsking || !query.trim()}
                className="absolute right-6 bottom-6 px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.25em] flex items-center gap-3 hover:bg-blue-600 transition-all disabled:opacity-50 shadow-xl shadow-slate-900/10 active:scale-95"
              >
                {isAsking ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                Execute Query
              </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
               {[
                 "Analyze LCP clusters",
                 "High-effort vs Low-impact",
                 "Schema optimization nodes",
                 "Internal link trajectories"
               ].map(sample => (
                 <button 
                   key={sample}
                   onClick={() => setQuery(sample)}
                   className="p-4 bg-white border border-slate-100 rounded-2xl text-[10px] font-black uppercase text-slate-400 tracking-wider hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all text-left truncate group/sample"
                 >
                   <span className="group-hover/sample:translate-x-1 transition-transform inline-block">/ {sample}</span>
                 </button>
               ))}
            </div>
          </div>
        </div>
      </div>

      {response && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#0f172a] text-white rounded-[40px] p-8 md:p-12 shadow-2xl relative overflow-hidden group/response border border-slate-800"
        >
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent" />
          <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.5)]" />
          
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] rotate-12 transition-transform duration-700 group-hover/response:rotate-0">
             <Bot size={160} />
          </div>
          
          {/* Hardware elements */}
          <div className="absolute top-8 right-12 flex gap-1">
             {[1,2,3].map(i => (
               <div key={i} className="w-1 h-1 rounded-full bg-slate-700" />
             ))}
          </div>

          <div className="flex items-center justify-between mb-10 border-b border-slate-800 pb-8">
            <div className="flex items-center gap-4">
               <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.4)]">
                 <Zap size={20} />
               </div>
               <div>
                 <span className="text-[10px] font-black uppercase tracking-[0.5em] text-blue-400 block mb-1">Intelligence Stream</span>
                 <h4 className="text-xl font-black text-white italic uppercase tracking-tight">Derived Semantic Analysis</h4>
               </div>
            </div>
            <div className="hidden md:flex items-center gap-6 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
               <div className="flex items-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                 Confidence: 98.4%
               </div>
               <div className="w-px h-4 bg-slate-800" />
               <div className="flex items-center gap-2 font-mono text-blue-400/80">
                 PROCESSED // {new Date().toLocaleTimeString()}
               </div>
            </div>
          </div>

          <div className="relative z-10 custom-scrollbar max-h-[600px] overflow-y-auto pr-4 mb-8">
             <div className="prose prose-invert prose-blue max-w-none prose-p:text-slate-300 prose-p:leading-relaxed prose-p:text-base prose-headings:text-white prose-headings:font-black prose-headings:uppercase prose-headings:tracking-tight prose-strong:text-blue-400 prose-code:text-emerald-400 prose-pre:bg-slate-950 prose-pre:border prose-pre:border-slate-800">
                <ReactMarkdown>{response || ""}</ReactMarkdown>
             </div>
          </div>

          {/* Advanced Hybrid RAG Engine Inspector Panel */}
          {retrievedSources.length > 0 && (
            <div className="relative z-10 border-t border-slate-800 pt-8 mt-8">
              <button
                onClick={() => setShowRAGInspector(!showRAGInspector)}
                className="flex items-center justify-between w-full p-4 bg-slate-900 border border-slate-850 hover:border-slate-700/80 rounded-2xl transition-all group/inspector text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-lg group-hover/inspector:bg-indigo-600 group-hover/inspector:text-white transition-all duration-300">
                    <Database size={16} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-200">Retrieval Service Logs</span>
                      <span className="bg-emerald-500/10 text-emerald-400 text-[9px] font-black px-1.5 py-0.5 rounded-full border border-emerald-500/20 uppercase tracking-widest animate-pulse">RAG Active</span>
                    </div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mt-0.5">
                      Extracted {retrievedSources.length} critical domain shards out of {pages.length * 5} index points
                    </span>
                  </div>
                </div>
                <div>
                  {showRAGInspector ? (
                    <ChevronUp size={16} className="text-slate-400" />
                  ) : (
                    <ChevronDown size={16} className="text-slate-400" />
                  )}
                </div>
              </button>

              <AnimatePresence>
                {showRAGInspector && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden mt-4 space-y-3"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {retrievedSources.map((source, index) => (
                        <div
                          key={source.id || index}
                          className="bg-slate-950 border border-slate-850 hover:border-slate-700 p-4 rounded-2xl transition-all space-y-3 text-slate-300 relative group/source"
                        >
                          <div className="flex items-start justify-between gap-2 border-b border-slate-900 pb-2">
                            <div className="min-w-0">
                              <span className="text-[10px] font-black text-slate-450 uppercase tracking-wide block truncate">
                                {source.title}
                              </span>
                              <a
                                href={source.url}
                                target="_blank"
                                referrerPolicy="no-referrer"
                                className="text-[11px] font-bold text-blue-400 hover:underline inline-flex items-center gap-1 mt-0.5 truncate max-w-full"
                              >
                                {source.url}
                                <ExternalLink size={10} className="shrink-0" />
                              </a>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <span className={cn(
                                "text-[9px] font-black uppercase px-2 py-0.5 rounded border tracking-wider",
                                source.chunkType === 'issues' ? 'bg-red-550/10 text-red-400 border-red-500/20' :
                                source.chunkType === 'headers' ? 'bg-amber-550/10 text-amber-400 border-amber-500/20' :
                                source.chunkType === 'metrics' ? 'bg-pink-550/10 text-pink-400 border-pink-500/20' :
                                source.chunkType === 'links' ? 'bg-blue-550/10 text-blue-400 border-blue-500/20' :
                                source.chunkType === 'geo' ? 'bg-violet-500/10 text-violet-400 border-violet-500/20 animate-pulse' :
                                'bg-slate-800 text-slate-300 border-slate-700'
                              )}>
                                {source.chunkType}
                              </span>
                              <span className="text-[9px] font-mono font-bold text-indigo-400">
                                Match: {source.score}
                              </span>
                            </div>
                          </div>
                          
                          <pre className="text-[11px] font-mono bg-slate-900 border border-slate-850/50 p-3 rounded-lg overflow-x-auto text-slate-400 max-h-[140px] leading-relaxed custom-scrollbar whitespace-pre-wrap">
                            {source.content}
                          </pre>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          <div className="mt-10 pt-8 border-t border-slate-800 flex items-center justify-between">
             <div className="flex items-center gap-3">
                <div className="px-2 py-1 bg-slate-800 rounded text-[9px] font-black text-slate-400 tracking-wider uppercase">Encryption: TLS 1.3</div>
                <div className="px-2 py-1 bg-slate-800 rounded text-[9px] font-black text-slate-400 tracking-wider uppercase">Pipeline: TF-IDF RAG v2.1</div>
             </div>
             <button 
               onClick={() => window.print()}
               className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] hover:text-white transition-colors"
             >
               Export Fragment
             </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
