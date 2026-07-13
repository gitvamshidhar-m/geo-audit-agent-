import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { History, TrendingUp, TrendingDown, Minus, ExternalLink, BarChart3, Trash2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

interface AuditHistoryEntry {
  id: number;
  url: string;
  cached_at: string;
  stats: string;
  pages_count: number;
}

interface HistoryPanelProps {
  apiFetch: (url: string, init?: RequestInit) => Promise<Response>;
  onLoadAudit?: (url: string) => void;
}

export function HistoryPanel({ apiFetch, onLoadAudit }: HistoryPanelProps) {
  const [history, setHistory] = useState<AuditHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await apiFetch('/api/audit/history');
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
    } finally {
      setLoading(false);
    }
  };

  const parseStats = (statsStr: string) => {
    try { return JSON.parse(statsStr); } catch { return {}; }
  };

  const getDomain = (url: string) => {
    try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-emerald-500';
    if (score >= 40) return 'text-amber-500';
    return 'text-red-500';
  };

  const getScoreBg = (score: number) => {
    if (score >= 70) return 'bg-emerald-50 border-emerald-200';
    if (score >= 40) return 'bg-amber-50 border-amber-200';
    return 'bg-red-50 border-red-200';
  };

  const getTrend = (current: number, previous: number) => {
    if (current > previous + 2) return <TrendingUp className="w-4 h-4 text-emerald-500" />;
    if (current < previous - 2) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-slate-400" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <History className="w-12 h-12 text-slate-300 mb-4" />
        <h3 className="text-lg font-bold text-slate-700 mb-2">No Audit History</h3>
        <p className="text-sm text-slate-500">Run your first audit to see historical data here.</p>
      </div>
    );
  }

  // Prepare chart data (last 10 audits)
  const chartData = history.slice(0, 10).reverse().map((entry, idx) => {
    const stats = parseStats(entry.stats);
    return {
      name: getDomain(entry.url),
      score: Math.round(stats.averageScore || 0),
      pages: entry.pages_count,
      date: new Date(entry.cached_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    };
  });

  return (
    <div className="space-y-6">
      {/* Score Trend Chart */}
      {chartData.length > 1 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4" /> Score Trend
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                formatter={(value: number) => [`${value}/100`, 'Score']}
              />
              <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Audit History List */}
      <div className="space-y-3">
        {history.map((entry, idx) => {
          const stats = parseStats(entry.stats);
          const avgScore = Math.round(stats.averageScore || 0);
          const prevStats = idx < history.length - 1 ? parseStats(history[idx + 1].stats) : null;
          const prevScore = prevStats ? Math.round(prevStats.averageScore || 0) : avgScore;
          const trend = getTrend(avgScore, prevScore);

          return (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`rounded-xl border p-4 ${getScoreBg(avgScore)} hover:shadow-md transition-shadow`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-slate-800 truncate">{getDomain(entry.url)}</span>
                    {trend}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>{new Date(entry.cached_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    <span>{entry.pages_count} pages</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`text-2xl font-black ${getScoreColor(avgScore)}`}>
                    {avgScore}
                  </div>
                  {onLoadAudit && (
                    <button
                      onClick={() => onLoadAudit(entry.url)}
                      className="p-2 rounded-lg bg-white/80 hover:bg-white border border-slate-200 text-slate-500 hover:text-blue-600 transition-colors"
                      title="Re-run audit"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
