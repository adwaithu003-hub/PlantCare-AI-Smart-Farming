
import React, { useState, useRef, useEffect } from 'react';
import { HistoryItem, Message } from '../types';
import { analyzeSoilReport, chatWithSoilExpert, translateText } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface SoilAnalyzerProps {
  onAddToHistory: (item: HistoryItem) => void;
  initialData?: HistoryItem | null;
}

const SoilAnalyzer: React.FC<SoilAnalyzerProps> = ({ onAddToHistory, initialData }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<HistoryItem['soilData'] | null>(null);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [translatingIndex, setTranslatingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialData && initialData.type === 'soil-analysis' && initialData.soilData) {
      setResult(initialData.soilData);
      setCurrentImage(initialData.imageUrl || null);
      setChatMessages([{
        role: 'model',
        text: `I've reloaded your soil analysis from ${new Date(initialData.timestamp).toLocaleDateString()}. You can continue to ask questions about this specific report below.`
      }]);
    }
  }, [initialData]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = (reader.result as string).split(',')[1];
        setCurrentImage(base64String);
        await performAnalysis(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const performAnalysis = async (base64: string) => {
    setIsAnalyzing(true);
    setResult(null);
    setError(null);
    setChatMessages([]);
    try {
      const data = await analyzeSoilReport(base64);
      if (!data) throw new Error("Analysis returned empty data.");
      
      setResult(data);
      
      const welcomeMsg: Message = {
        role: 'model',
        text: `I've analyzed your soil report. The parameters are extracted above. You can now ask me any specific doubts about fertilizing, adjusting pH, or crop selection for this soil!`
      };
      setChatMessages([welcomeMsg]);

      const historyItem: HistoryItem = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        type: 'soil-analysis',
        plantName: 'Soil Test',
        imageUrl: base64,
        soilData: data
      };
      onAddToHistory(historyItem);
    } catch (err: any) {
      console.error("Soil analysis error:", err);
      setError("Failed to analyze soil report. Please ensure the photo is clear and contains text-based soil test data.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const userMsg: Message = { role: 'user', text: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const soilContext = result ? `User Soil Data: pH ${result.phValue}, N: ${result.nitrogen}, P: ${result.phosphorus}, K: ${result.potassium}. ` : "";
      const historyLog = chatMessages.map(m => ({ role: m.role, text: m.text }));
      const response = await chatWithSoilExpert(historyLog, soilContext + userMsg.text);
      
      setChatMessages(prev => [...prev, { role: 'model', text: response || "I'm sorry, I couldn't process your question." }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'model', text: "I'm having trouble connecting to my soil data bank. Please try again." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleTranslate = async (index: number, lang: 'hi' | 'ml') => {
    const msg = chatMessages[index];
    if (msg.translations?.[lang]) return;

    setTranslatingIndex(index);
    try {
      const targetLang = lang === 'hi' ? 'Hindi' : 'Malayalam';
      const translated = await translateText(msg.text, targetLang);
      if (translated) {
        const updatedMessages = [...chatMessages];
        updatedMessages[index] = {
          ...msg,
          translations: {
            ...msg.translations,
            [lang]: translated
          }
        };
        setChatMessages(updatedMessages);
      }
    } catch (err) {
      console.error("Translation failed", err);
    } finally {
      setTranslatingIndex(null);
    }
  };

  const resetAnalysis = () => {
    setResult(null);
    setError(null);
    setCurrentImage(null);
    setChatMessages([]);
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-500 py-10 pb-20">
      <div className="max-w-4xl mx-auto space-y-6 text-center">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">Soil Health Intelligence</h1>
        <p className="text-slate-500 max-w-2xl mx-auto">
          Upload your soil test report to receive instant crop recommendations and consult with our AI Soil Scientist.
        </p>
      </div>

      <div className="max-w-5xl mx-auto">
        {!result && !isAnalyzing && !error && (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="group relative border-4 border-dashed border-emerald-100 rounded-[3rem] p-16 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-300 hover:bg-emerald-50/30 transition-all duration-500 overflow-hidden"
          >
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
            <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center text-4xl mb-6 group-hover:scale-110 transition-transform">📄</div>
            <h3 className="text-xl font-bold text-slate-800">Upload Soil Report</h3>
            <p className="text-slate-400 mt-2">PDF, JPEG, or PNG formats supported</p>
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </div>
        )}

        {isAnalyzing && (
          <div className="bg-white rounded-[3rem] p-16 shadow-2xl border border-emerald-100 flex flex-col items-center justify-center space-y-6">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center text-2xl">🧪</div>
            </div>
            <div className="text-center">
              <h3 className="text-xl font-black text-slate-900 animate-pulse">Analyzing Soil Parameters...</h3>
              <p className="text-slate-500 text-sm mt-1">Extracting pH, N-P-K, and crop suitability data</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-white rounded-[3rem] p-16 shadow-xl border border-red-100 flex flex-col items-center justify-center space-y-6 text-center">
             <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center text-2xl">⚠️</div>
             <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-900">Analysis Failed</h3>
                <p className="text-slate-500 text-sm max-w-sm">{error}</p>
             </div>
             <button 
                onClick={resetAnalysis}
                className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all active:scale-95 shadow-lg"
             >
                Try Again
             </button>
          </div>
        )}

        {result && (
          <div className="space-y-10 animate-in slide-in-from-bottom-8 duration-700">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white p-4 rounded-3xl shadow-lg border border-slate-100">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Report Preview</p>
                  <div className="aspect-[3/4] rounded-2xl overflow-hidden bg-slate-50 border border-slate-100">
                    {currentImage && <img src={`data:image/jpeg;base64,${currentImage}`} className="w-full h-full object-cover" alt="Soil Report" />}
                  </div>
                </div>

                <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl">
                  <h4 className="text-xs font-black text-emerald-400 uppercase tracking-widest mb-6">Nutrient Profile</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">pH Level</p>
                      <p className="text-xl font-black text-emerald-400">{result.phValue || 'N/A'}</p>
                    </div>
                    <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Nitrogen (N)</p>
                      <p className="text-xl font-black text-white">{result.nitrogen || 'N/A'}</p>
                    </div>
                    <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Phosphorus (P)</p>
                      <p className="text-xl font-black text-white">{result.phosphorus || 'N/A'}</p>
                    </div>
                    <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Potassium (K)</p>
                      <p className="text-xl font-black text-white">{result.potassium || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-[2.5rem] p-8 shadow-lg border border-slate-100">
                  <div className="flex items-center space-x-3 mb-6">
                    <span className="text-2xl">🌾</span>
                    <h3 className="text-2xl font-black text-slate-900">Recommended Crops</h3>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {(result.suitableCrops || []).length > 0 ? (
                       (result.suitableCrops || []).map((crop, i) => (
                        <span key={i} className="px-5 py-2.5 bg-emerald-50 text-emerald-700 font-bold rounded-2xl border border-emerald-100 flex items-center shadow-sm">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full mr-3"></span>
                          {crop}
                        </span>
                      ))
                    ) : (
                      <p className="text-slate-400 italic text-sm">No specific recommendations extracted.</p>
                    )}
                  </div>
                </div>

                <div className="bg-amber-50 rounded-[2.5rem] p-8 border border-amber-100">
                  <div className="flex items-center space-x-3 mb-6">
                    <span className="text-2xl">💡</span>
                    <h3 className="text-2xl font-black text-amber-900">Improvement Tips</h3>
                  </div>
                  <ul className="space-y-4">
                    {(result.improvementTips || []).length > 0 ? (
                       (result.improvementTips || []).map((tip, i) => (
                        <li key={i} className="flex items-start space-x-4 bg-white/50 p-4 rounded-2xl border border-amber-200/50">
                          <span className="text-amber-600 font-black text-lg mt-0.5">•</span>
                          <p className="text-amber-900 text-sm leading-relaxed">{tip}</p>
                        </li>
                      ))
                    ) : (
                      <p className="text-amber-700 italic text-sm">No specific tips extracted.</p>
                    )}
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 rounded-[3rem] p-1 shadow-2xl overflow-hidden border border-amber-500/20">
              <div className="bg-slate-800 p-6 rounded-t-[2.8rem] flex items-center justify-between border-b border-white/5">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-2xl shadow-inner">
                    👨‍🔬
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-white">Consult Soil Expert</h2>
                    <p className="text-amber-400 text-[10px] font-bold uppercase tracking-widest">Agricultural Scientist • Online</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 h-[400px] overflow-y-auto p-6 space-y-6 flex flex-col scroll-smooth">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2`}>
                    <div className={`max-w-[85%] rounded-3xl p-5 ${
                      msg.role === 'user' 
                        ? 'bg-amber-600 text-white rounded-tr-none shadow-lg shadow-amber-900/20' 
                        : 'bg-white/10 text-slate-100 rounded-tl-none border border-white/5'
                    }`}>
                      <div className="text-sm prose prose-invert prose-sm max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                        {msg.translations?.hi && (
                          <div className="mt-4 pt-4 border-t border-white/10 opacity-70 italic">
                            <p className="text-[10px] font-black uppercase text-amber-400 mb-1">Hindi Translation</p>
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.translations.hi}</ReactMarkdown>
                          </div>
                        )}
                        {msg.translations?.ml && (
                          <div className="mt-4 pt-4 border-t border-white/10 opacity-70 italic">
                            <p className="text-[10px] font-black uppercase text-amber-400 mb-1">Malayalam Translation</p>
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.translations.ml}</ReactMarkdown>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {msg.role === 'model' && (
                      <div className="flex space-x-2 mt-2 ml-2">
                        <button 
                          onClick={() => handleTranslate(i, 'hi')}
                          disabled={translatingIndex === i}
                          className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded bg-slate-800 border border-white/5 hover:bg-slate-700 transition-all ${msg.translations?.hi ? 'text-amber-400 border-amber-500/30' : 'text-slate-400'}`}
                        >
                          {translatingIndex === i ? '...' : msg.translations?.hi ? 'Hindi ✓' : 'Translate to Hindi'}
                        </button>
                        <button 
                          onClick={() => handleTranslate(i, 'ml')}
                          disabled={translatingIndex === i}
                          className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded bg-slate-800 border border-white/5 hover:bg-slate-700 transition-all ${msg.translations?.ml ? 'text-amber-400 border-amber-500/30' : 'text-slate-400'}`}
                        >
                          {translatingIndex === i ? '...' : msg.translations?.ml ? 'Malayalam ✓' : 'Translate to Malayalam'}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {isChatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-white/5 rounded-2xl px-4 py-3 flex space-x-2">
                      <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                      <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <form onSubmit={handleChatSubmit} className="p-6 bg-slate-800 rounded-b-[2.8rem] flex items-center space-x-3">
                <input 
                  type="text" 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask a doubt about your results..."
                  className="flex-1 bg-slate-900/50 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-amber-500/50 transition-all shadow-inner"
                  disabled={isChatLoading}
                />
                <button 
                  type="submit"
                  disabled={isChatLoading || !chatInput.trim()}
                  className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white p-4 rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              </form>
            </div>

            <button 
              onClick={resetAnalysis}
              className="w-full py-5 bg-slate-200 text-slate-900 rounded-3xl font-black uppercase tracking-widest text-xs hover:bg-white transition-all shadow-md active:scale-[0.98] border border-slate-300"
            >
              Analyze Different Soil Report
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SoilAnalyzer;
