import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ChevronDown, 
  ChevronUp, 
  Zap, 
  Activity, 
  Compass, 
  Layers,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { cn } from '../lib/utils';

export function RoadmapItem({ item, index }: { item: any; index: number }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTooLong, setIsTooLong] = useState(false);
  const descriptionRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (descriptionRef.current) {
      setIsTooLong(descriptionRef.current.scrollHeight > descriptionRef.current.clientHeight);
    }
  }, [item?.description]);

  if (!item) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="flex flex-col md:flex-row gap-6 md:gap-8 p-8 md:p-10 rounded-[48px] bg-white/[0.04] border border-white/5 hover:border-blue-500/40 hover:bg-white/[0.07] transition-all group/item backdrop-blur-md relative"
    >
      <div className="flex flex-row md:flex-col items-center justify-between md:justify-start shrink-0">
        <div className={cn(
          "w-14 h-14 rounded-3xl flex items-center justify-center font-black text-xl shadow-2xl transition-all duration-500 group-hover/item:scale-110",
          item.impact === 'High' ? "bg-blue-600 text-white shadow-blue-500/40" :
          item.impact === 'Medium' ? "bg-slate-800 text-blue-400" :
          "bg-slate-900 text-slate-500"
        )}>
          {index + 1}
        </div>
        <div className="md:mt-4 flex flex-col items-center md:items-start">
           <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Effort</div>
           <div className={cn(
             "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
             item.effort === 'Easy' ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
             item.effort === 'Medium' ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
             "bg-rose-500/10 text-rose-400 border border-rose-500/20"
           )}>
             {item.effort}
           </div>
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <h4 className="text-xl md:text-2xl font-black text-white tracking-tight group-hover/item:text-blue-400 transition-colors">
            {item.task}
          </h4>
          <div className="flex items-center gap-2 bg-black/40 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/5 shrink-0">
            <Zap size={14} className={cn(item.impact === 'High' ? "text-blue-400" : "text-slate-600")} />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Impact:</span>
            <span className={cn(
              "text-[10px] font-black uppercase tracking-widest",
              item.impact === 'High' ? "text-blue-400" : "text-slate-500"
            )}>{item.impact}</span>
          </div>
        </div>

        <div className="relative">
          <p 
            ref={descriptionRef}
            className={cn(
              "text-slate-400 text-sm md:text-base leading-relaxed font-medium transition-all duration-500",
              !isExpanded && "line-clamp-3 md:line-clamp-none"
            )}
          >
            {item.description}
          </p>
          
          {isTooLong && (
            <button 
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-4 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 hover:text-blue-400 transition-colors py-2 group/btn md:hidden"
            >
              {isExpanded ? (
                <>Collapse Node Details <ChevronUp size={10} /></>
              ) : (
                <>Expand Full Intelligence <ChevronDown size={10} /></>
              )}
            </button>
          )}
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6 pt-6 border-t border-white/5 grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-hidden"
            >
               <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                 <div className="flex items-center gap-2 mb-2">
                   <Activity size={12} className="text-blue-500" />
                   <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Technical Precision</span>
                 </div>
                 <div className="text-xs text-slate-300 font-medium">Calibrated for internal linkage and semantic depth.</div>
               </div>
               <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                 <div className="flex items-center gap-2 mb-2">
                   <Compass size={12} className="text-blue-500" />
                   <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Growth Path</span>
                 </div>
                 <div className="text-xs text-slate-300 font-medium">Estimated visibility uplift: +24% within 60 days.</div>
               </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="absolute top-8 right-8 opacity-0 group-hover/item:opacity-100 transition-opacity">
         <Layers size={40} className="text-blue-500/10" />
      </div>
    </motion.div>
  );
}
