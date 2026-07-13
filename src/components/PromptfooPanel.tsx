import React, { useState } from 'react';
import { 
  Terminal, 
  Settings, 
  Play, 
  Trash2, 
  Plus, 
  Download, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  HelpCircle, 
  Layers, 
  ChevronRight, 
  Cpu, 
  Eye, 
  Code,
  FileText,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  PromptfooTestCase, 
  PromptfooResult, 
  runPromptfooEvaluation, 
  exportPromptfooYaml 
} from '../services/promptfooRunner';

interface PromptfooPanelProps {
  apiKeys: { gemini?: string; [key: string]: any };
}

export function PromptfooPanel({ apiKeys }: PromptfooPanelProps) {
  const [activeTab, setActiveTab] = useState<'config' | 'results'>('config');
  const [selectedProvider, setSelectedProvider] = useState<'gemini' | 'openai' | 'anthropic' | 'deepseek' | 'perplexity' | 'groq'>('gemini');
  
  // Prompts State
  const [prompts, setPrompts] = useState<{ id: string; text: string }[]>([
    { 
      id: "Prompt-A", 
      text: "Based on the provided web content: \"{{web_content}}\"\n\nAnswer this user query accurately and concisely: \"{{query}}\". Ensure the tone is objective and informative." 
    },
    { 
      id: "Prompt-B", 
      text: "You are an AI Search Assistant. Synthesize an answer to \"{{query}}\" relying ONLY on this reference text:\n--- \n{{web_content}}\n---\nOnly mention facts directly present in the source. If the source doesn't have the answer, state that." 
    }
  ]);

  // Test Cases State
  const [testCases, setTestCases] = useState<PromptfooTestCase[]>([
    {
      id: "TestCase-1",
      name: "ChatGPT Product Query",
      vars: {
        web_content: "GEO Audit Agent is an innovative generative engine optimization platform. Built in 2026, it ensures that technical crawlers and semantic search agents can perfectly read, index, and cite your web pages across platforms like ChatGPT and Perplexity.",
        query: "What platforms does GEO Audit Agent optimize for?"
      },
      assert: [
        { type: 'contains', value: "ChatGPT" },
        { type: 'contains', value: "Perplexity" },
        { type: 'not-contains', value: "deprecated" }
      ]
    },
    {
      id: "TestCase-2",
      name: "Perplexity Tech Check",
      vars: {
        web_content: "Our system audits Core Web Vitals, HTML heading structure, canonicalization, and schema.org structure to guarantee search parity.",
        query: "Does the system audit performance metrics?"
      },
      assert: [
        { type: 'contains', value: "Core Web Vitals" },
        { type: 'llm-rubric', value: "The response must answer 'yes' and mention that the system audits Core Web Vitals structure." }
      ]
    }
  ]);

  // Evaluation Outputs
  const [results, setResults] = useState<PromptfooResult[]>([]);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evalProgress, setEvalProgress] = useState<{ current: number; total: number; message: string }>({
    current: 0,
    total: 0,
    message: ''
  });
  const [errorMsg, setErrorMsg] = useState('');

  // Editing helpers
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [promptEditText, setPromptEditText] = useState('');

  // Dynamic Prompt Adding
  const addPrompt = () => {
    const nextNum = prompts.length + 1;
    const newId = `Prompt-${String.fromCharCode(65 + prompts.length)}`; // Prompt-C, Prompt-D
    setPrompts([...prompts, { 
      id: newId, 
      text: `Analyze this content: "{{web_content}}". Explain if it answers the question: "{{query}}"` 
    }]);
  };

  const removePrompt = (id: string) => {
    if (prompts.length <= 1) return; // Keep at least one
    setPrompts(prompts.filter(p => p.id !== id));
    // Also cleanup results associated with this prompt
    setResults(results.filter(r => r.promptId !== id));
  };

  const savePromptText = (id: string, text: string) => {
    setPrompts(prompts.map(p => p.id === id ? { ...p, text } : p));
    setEditingPromptId(null);
  };

  // Dynamic TestCase Adding
  const addTestCase = () => {
    const nextNum = testCases.length + 1;
    const newId = `TestCase-${nextNum}`;
    setTestCases([...testCases, {
      id: newId,
      name: `Custom Query Try ${nextNum}`,
      vars: {
        web_content: "Add your website content or reference text here.",
        query: "What question would users ask search engines about this content?"
      },
      assert: [
        { type: 'contains', value: "content" }
      ]
    }]);
  };

  const removeTestCase = (id: string) => {
    if (testCases.length <= 1) return;
    setTestCases(testCases.filter(t => t.id !== id));
    setResults(results.filter(r => r.testCaseId !== id));
  };

  const updateTestCaseField = (tcId: string, path: 'name' | 'query' | 'web_content', val: string) => {
    setTestCases(testCases.map(t => {
      if (t.id === tcId) {
        if (path === 'name') return { ...t, name: val };
        return { ...t, vars: { ...t.vars, [path]: val } };
      }
      return t;
    }));
  };

  const addAssertion = (tcId: string) => {
    setTestCases(testCases.map(t => {
      if (t.id === tcId) {
        return {
          ...t,
          assert: [...t.assert, { type: 'contains', value: 'keyword' }]
        };
      }
      return t;
    }));
  };

  const removeAssertion = (tcId: string, index: number) => {
    setTestCases(testCases.map(t => {
      if (t.id === tcId) {
        const newAssert = [...t.assert];
        newAssert.splice(index, 1);
        return { ...t, assert: newAssert };
      }
      return t;
    }));
  };

  const updateAssertionType = (tcId: string, index: number, type: 'contains' | 'not-contains' | 'contains-any' | 'llm-rubric') => {
    setTestCases(testCases.map(t => {
      if (t.id === tcId) {
        const newAssert = [...t.assert];
        newAssert[index] = { ...newAssert[index], type };
        return { ...t, assert: newAssert };
      }
      return t;
    }));
  };

  const updateAssertionValue = (tcId: string, index: number, value: string) => {
    setTestCases(testCases.map(t => {
      if (t.id === tcId) {
        const newAssert = [...t.assert];
        newAssert[index] = { ...newAssert[index], value };
        return { ...t, assert: newAssert };
      }
      return t;
    }));
  };

  // Run Promptfoo Evaluation
  const handleLaunchEvaluation = async () => {
    setErrorMsg('');
    setIsEvaluating(true);
    setActiveTab('results');
    setResults([]);

    try {
      const evaluationResults = await runPromptfooEvaluation(
        selectedProvider,
        prompts,
        testCases,
        apiKeys,
        (current, total, message) => {
          setEvalProgress({ current, total, message });
        }
      );
      setResults(evaluationResults);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "An error occurred during promptfoo evaluation run.");
      setActiveTab('config');
    } finally {
      setIsEvaluating(false);
    }
  };

  // Download Config
  const handleExportYaml = () => {
    const yamlContent = exportPromptfooYaml(selectedProvider, prompts, testCases);
    const blob = new Blob([yamlContent], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `promptfoo-${selectedProvider}.yaml`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Helper to check if a provider's key exists
  const isProviderKeyConfigured = (prov: string) => {
    const key = apiKeys[prov];
    return typeof key === 'string' && key.trim().length > 0;
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 pb-16">
      {/* Header and top controls */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center border-b border-slate-200 pb-8 gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic font-display">
              Promptfoo Evaluation Studio
            </h2>
          </div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
            A real-time prompt playground following the Promptfoo standard for GEO testing
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Engine Selector Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 p-1 rounded-xl shadow-xs">
            <span className="text-[10px] font-black uppercase text-slate-400 pl-2 tracking-wider">Engine:</span>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value as any)}
              className="bg-white border border-slate-100 text-xs font-bold text-slate-700 py-1 px-2.5 rounded-lg outline-none cursor-pointer focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
            >
              <option value="gemini">Gemini (3.5-Flash)</option>
              <option value="openai">OpenAI (GPT-4o)</option>
              <option value="anthropic">Anthropic (Claude-3.5)</option>
              <option value="deepseek">DeepSeek (Chat)</option>
              <option value="perplexity">Perplexity (Sonar)</option>
              <option value="groq">Groq (Llama-3.3)</option>
            </select>
            {/* Active configured indicator badge */}
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-bold ${
              isProviderKeyConfigured(selectedProvider)
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                : 'bg-amber-50 text-amber-700 border border-amber-100'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                isProviderKeyConfigured(selectedProvider) ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
              }`} />
              {isProviderKeyConfigured(selectedProvider) ? 'Configured' : 'Missing Key'}
            </span>
          </div>

          <button
            onClick={() => setActiveTab('config')}
            className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl border transition-all ${
              activeTab === 'config'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Configurations
          </button>
          
          <button
            onClick={() => setActiveTab('results')}
            className={`px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl border transition-all ${
              activeTab === 'results'
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            Evaluation Results ({results.length})
          </button>

          <button
            onClick={handleExportYaml}
            title="Download promptfoo.yaml config file"
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-xs font-bold text-slate-700 rounded-xl hover:bg-slate-50 active:scale-95 transition-all"
          >
            <Download size={14} />
            <span>Export promptfoo.yaml</span>
          </button>

          <button
            onClick={handleLaunchEvaluation}
            disabled={isEvaluating}
            className={`flex items-center gap-2 px-5 py-2 text-xs font-bold text-white uppercase tracking-wider rounded-xl shadow-sm transition-all ${
              isEvaluating 
                ? 'bg-slate-300 cursor-not-allowed' 
                : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'
            }`}
          >
            <Play size={14} className={isEvaluating ? "animate-spin" : ""} />
            <span>{isEvaluating ? "Evaluating..." : "Run Eval"}</span>
          </button>
        </div>
      </div>

      {/* Tutorial Banner */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100 rounded-3xl p-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-indigo-100/40 rounded-full blur-3xl pointer-events-none" />
        <div className="flex items-start gap-4">
          <div className="p-3 bg-indigo-600 text-white rounded-2xl shrink-0">
            <HelpCircle size={22} className="animate-pulse" />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-black text-slate-900 tracking-tight">What is Promptfoo evaluation?</h3>
            <p className="text-sm text-slate-600 font-medium leading-relaxed max-w-4xl">
              Promptfoo is a popular, open-source CLI framework for checking how adjustments to instructions (prompts) 
              or core factual reference context affect response visibility in generative search. This custom dashboard evaluates 
              independent prompts on specific web-indexing queries against static assertions, including an <strong>LLM Rubric Judge</strong>.
            </p>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-xs font-bold text-indigo-600">
              <span className="flex items-center gap-1.5">
                <Terminal size={14} />
                Supports variables like <code>{"{{web_content}}"}</code> and <code>{"{{query}}"}</code>
              </span>
              <span className="flex items-center gap-1.5">
                <Cpu size={14} />
                Real-Time AI-as-a-Judge Assertions supported
              </span>
            </div>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center gap-3 text-rose-800 text-xs font-bold">
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Grid Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'config' && (
          <motion.div
            key="config-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8"
          >
            {/* Left Box: Prompts configuration (4 cols) */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2">
                    <Code className="text-indigo-600" size={18} />
                    <h3 className="text-md font-black text-slate-950 uppercase tracking-tight">Prompt Templates</h3>
                  </div>
                  <button 
                    onClick={addPrompt}
                    className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 text-xs font-bold transition-all"
                  >
                    <Plus size={14} /> Add Prompt
                  </button>
                </div>

                <div className="space-y-4">
                  {prompts.map((p, idx) => (
                    <div key={p.id} className="border border-slate-150 rounded-2xl p-4 space-y-3 hover:border-indigo-100 transition-all">
                      <div className="flex justify-between items-center">
                        <span className="px-2.5 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black tracking-widest rounded-lg">
                          {p.id}
                        </span>
                        
                        <div className="flex items-center gap-2">
                          {editingPromptId === p.id ? (
                            <button
                              onClick={() => savePromptText(p.id, promptEditText)}
                              className="text-emerald-600 hover:text-emerald-700 text-[10px] font-bold"
                            >
                              Save
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingPromptId(p.id);
                                setPromptEditText(p.text);
                              }}
                              className="text-slate-500 hover:text-slate-800 text-[10px] font-semibold"
                            >
                              Edit
                            </button>
                          )}
                          {prompts.length > 1 && (
                            <button 
                              onClick={() => removePrompt(p.id)}
                              className="text-slate-400 hover:text-rose-600 transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>

                      {editingPromptId === p.id ? (
                        <textarea
                          value={promptEditText}
                          onChange={(e) => setPromptEditText(e.target.value)}
                          rows={4}
                          className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl p-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        />
                      ) : (
                        <p className="text-xs font-medium text-slate-600 font-mono whitespace-pre-wrap leading-relaxed">
                          {p.text}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Box: Test Cases configuration (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-6">
                <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2">
                    <Layers className="text-indigo-600" size={18} />
                    <h3 className="text-md font-black text-slate-950 uppercase tracking-tight">Dynamic Test Cases</h3>
                  </div>
                  <button 
                    onClick={addTestCase}
                    className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-700 text-xs font-bold transition-all"
                  >
                    <Plus size={14} /> Add Test Case
                  </button>
                </div>

                <div className="space-y-6">
                  {testCases.map((tc, tcIdx) => (
                    <div key={tc.id} className="border border-slate-200 rounded-2xl p-5 space-y-4 hover:border-slate-300 transition-all bg-slate-50/40">
                      <div className="flex justify-between items-center">
                        <input
                          type="text"
                          value={tc.name}
                          onChange={(e) => updateTestCaseField(tc.id, 'name', e.target.value)}
                          className="text-sm font-black text-slate-800 border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none bg-transparent"
                        />
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-slate-400 tracking-wider">
                            {tc.id}
                          </span>
                          {testCases.length > 1 && (
                            <button 
                              onClick={() => removeTestCase(tc.id)}
                              className="text-slate-400 hover:text-rose-600 transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Variables Input */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Variable: query</span>
                          <input
                            type="text"
                            value={tc.vars.query || ''}
                            onChange={(e) => updateTestCaseField(tc.id, 'query', e.target.value)}
                            className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Variable: web_content</span>
                          <textarea
                            value={tc.vars.web_content || ''}
                            onChange={(e) => updateTestCaseField(tc.id, 'web_content', e.target.value)}
                            rows={2}
                            className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-xl px-3 py-2 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Assertions */}
                      <div className="space-y-2 border-t border-slate-150 pt-4">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Expected Assertions</span>
                          <button
                            onClick={() => addAssertion(tc.id)}
                            className="text-[10px] font-bold text-indigo-600 hover:underline"
                          >
                            + Add assertion
                          </button>
                        </div>

                        <div className="space-y-2.5">
                          {tc.assert.map((assertion, aIdx) => (
                            <div key={aIdx} className="flex items-center gap-2">
                              <select
                                value={assertion.type}
                                onChange={(e) => updateAssertionType(tc.id, aIdx, e.target.value as any)}
                                className="text-[10px] font-bold text-slate-700 bg-white border border-slate-200 rounded-lg px-2 py-1.5 focus:outline-none max-w-xs"
                              >
                                <option value="contains">contains</option>
                                <option value="not-contains">not-contains</option>
                                <option value="contains-any">contains-any</option>
                                <option value="llm-rubric">llm-rubric (Semantic Judge)</option>
                              </select>
                              
                              <input
                                type="text"
                                value={assertion.value}
                                onChange={(e) => updateAssertionValue(tc.id, aIdx, e.target.value)}
                                placeholder="Match value or semantic instructions..."
                                className="flex-1 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg px-2 py-1 focus:outline-none"
                              />

                              {tc.assert.length > 1 && (
                                <button
                                  onClick={() => removeAssertion(tc.id, aIdx)}
                                  className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                                >
                                  <XCircle size={14} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'results' && (
          <motion.div
            key="results-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {isEvaluating ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center space-y-6 max-w-lg mx-auto">
                <div className="w-16 h-16 bg-indigo-50 border border-indigo-100 rounded-3xl flex items-center justify-center text-indigo-600 mx-auto shadow-sm">
                  <Cpu size={28} className="animate-spin" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Evaluating Prompt Stacks</h3>
                  <p className="text-sm text-slate-500 font-medium">
                    Run {evalProgress.current} of {evalProgress.total || prompts.length * testCases.length}
                  </p>
                  <p className="text-xs font-semibold text-indigo-600 animate-pulse bg-indigo-50/50 rounded-xl py-2 px-3">
                    {evalProgress.message}
                  </p>
                </div>
              </div>
            ) : results.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-16 text-center space-y-6 max-w-lg mx-auto">
                <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-3xl flex items-center justify-center text-slate-300 mx-auto shadow-sm1">
                  <Eye size={28} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">No Run Active</h3>
                  <p className="text-sm text-slate-500 font-medium">Refine your prompts and launch an evaluation test to see the structured comparison matrix here.</p>
                </div>
                <button
                  onClick={handleLaunchEvaluation}
                  className="px-6 py-2 bg-indigo-600 text-white text-xs font-black uppercase tracking-wider rounded-xl hover:bg-indigo-700 active:scale-95 transition-all"
                >
                  Launch Evaluation
                </button>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Metrics top banner */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-1.5">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Evaluated Runs</span>
                    <p className="text-3xl font-black text-slate-900 tracking-tight">{results.length}</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-1.5">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Passing Runs</span>
                    <p className="text-3xl font-black text-emerald-600 tracking-tight">
                      {results.filter(r => r.success).length} / {results.length}
                    </p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-1.5">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Failed Runs</span>
                    <p className="text-3xl font-black text-rose-600 tracking-tight">
                      {results.filter(r => !r.success).length} / {results.length}
                    </p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-1.5">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Avg Latency</span>
                    <p className="text-3xl font-black text-blue-600 tracking-tight">
                      {(results.reduce((acc, r) => acc + r.latencyMs, 0) / results.length).toFixed(0)}ms
                    </p>
                  </div>
                </div>

                {/* Grid Comparison Matrix */}
                <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                  <div className="bg-slate-50/50 border-b border-slate-200 px-6 py-4">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Prompt Performance Comparison Grid</h3>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <th className="px-6 py-4">Test Case & Variables</th>
                          {prompts.map(p => (
                            <th key={p.id} className="px-6 py-4 border-l border-slate-200 min-w-[300px]">
                              {p.id} (Template)
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {testCases.map((tc, tcIdx) => (
                          <tr key={tc.id} className="border-b border-slate-150 hover:bg-slate-50/20 transition-all">
                            {/* Test Case description header */}
                            <td className="px-6 py-6 space-y-2 max-w-[280px]">
                              <div>
                                <span className="font-extrabold text-slate-900 block text-xs">{tc.name}</span>
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider select-none">{tc.id}</span>
                              </div>
                              <div className="space-y-1 bg-slate-50/80 p-2.5 rounded-lg border border-slate-150 text-[10px]">
                                <p className="text-slate-500 truncate"><strong className="text-slate-700">query:</strong> {tc.vars.query}</p>
                                <p className="text-slate-500 line-clamp-2"><strong className="text-slate-700">web_content:</strong> {tc.vars.web_content}</p>
                              </div>
                            </td>

                            {/* Prompt outputs/matrix */}
                            {prompts.map(p => {
                              const match = results.find(r => r.promptId === p.id && r.testCaseId === tc.id);
                              if (!match) return <td key={p.id} className="px-6 py-6 border-l border-slate-200 text-slate-400 text-xs italic">Pending...</td>;

                              return (
                                <td key={p.id} className="px-6 py-6 border-l border-slate-200 align-top space-y-4">
                                  {/* Verdict Header */}
                                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                    <div className="flex items-center gap-1.5">
                                      {match.success ? (
                                        <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black uppercase tracking-wider">
                                          <CheckCircle2 size={10} />
                                          <span>Pass</span>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-1 px-2 py-0.5 bg-rose-50 text-rose-500 rounded-lg text-[9px] font-black uppercase tracking-wider">
                                          <XCircle size={10} />
                                          <span>Fail</span>
                                        </div>
                                      )}
                                      <span className="text-[9px] font-black text-slate-400 uppercase">
                                        {match.latencyMs}ms
                                      </span>
                                    </div>
                                  </div>

                                  {/* Actual Text Output box */}
                                  <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl space-y-2">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">LLM Response</span>
                                    <p className="text-xs text-slate-700 leading-relaxed font-mono line-clamp-4 hover:line-clamp-none transition-all cursor-pointer whitespace-pre-wrap">
                                      {match.output}
                                    </p>
                                  </div>

                                  {/* Assertion Breakdown list */}
                                  <div className="space-y-2">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Assertion Verifications</span>
                                    {match.assertionResults.map((ar, arIdx) => (
                                      <div key={arIdx} className="text-[10px] space-y-0.5 bg-white border border-slate-150 p-2 rounded-xl">
                                        <div className="flex items-center justify-between">
                                          <span className="font-bold text-slate-700">{ar.type}</span>
                                          <span className={`text-[9px] font-black uppercase ${ar.success ? 'text-emerald-600' : 'text-rose-500'}`}>
                                            {ar.success ? 'Success' : 'Fail'}
                                          </span>
                                        </div>
                                        <p className="text-slate-500 truncate">Expected: "{ar.expected}"</p>
                                        {ar.reasoning && (
                                          <p className="text-slate-400 italic text-[9px] leading-snug">{ar.reasoning}</p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
