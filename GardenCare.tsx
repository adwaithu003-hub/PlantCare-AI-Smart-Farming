
import React, { useState, useRef, useEffect } from 'react';
import { Message, HistoryItem } from '../types';
import { chatWithGardenMaster, translateText } from '../services/geminiService';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface GardenCareProps {
  onAddToHistory?: (item: HistoryItem) => void;
  initialMessages?: Message[];
}

const GardenCare: React.FC<GardenCareProps> = ({ onAddToHistory, initialMessages }) => {
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [translatingIndex, setTranslatingIndex] = useState<number | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialMessages && initialMessages.length > 0) {
      setChatMessages(initialMessages);
    } else if (chatMessages.length === 0) {
      setChatMessages([
        { 
          role: 'model', 
          text: "Hi! I am your Garden Master. **Just type a plant name** (e.g., *Hibiscus*, *Rose*, *Tulsi*) and I will provide a complete guide on potting mix, watering, pests, and maintenance schedules." 
        }
      ]);
    }
  }, [initialMessages]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const plantName = chatInput.trim();
    const userMsg: Message = { role: 'user', text: plantName };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const history = chatMessages.map(m => ({ role: m.role, text: m.text }));
      const reply = await chatWithGardenMaster(history, plantName);
      
      const botMsg: Message = { role: 'model', text: reply || "I couldn't generate a guide for that plant. Please check the spelling!" };
      setChatMessages(prev => [...prev, botMsg]);

      // Save guide to common history
      if (onAddToHistory && reply) {
        onAddToHistory({
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          type: 'guide',
          plantName: plantName,
          guideContent: reply
        });
      }
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'model', text: "I'm having trouble connecting to my garden wisdom. Please try again later." }]);
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

  return (
    <div className="space-y-12 animate-in fade-in duration-500 py-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">FloraGuard Garden Care</h1>
          <p className="text-slate-500 mt-1">Get comprehensive soil, water, and pest details for any plant.</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="bg-slate-900 rounded-[2.5rem] p-1 shadow-2xl overflow-hidden border border-emerald-500/20">
          <div className="bg-slate-800 p-6 rounded-t-[2.2rem] flex items-center justify-between border-b border-white/5">
            <div className="flex items-center space-x-4">
               <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-3xl shadow-inner">
                 🧑‍🌾
               </div>
               <div>
                 <h2 className="text-xl font-black text-white">Plant Care Guide</h2>
                 <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest">AI Horticulture Expert • Online</p>
               </div>
            </div>
            <div className="hidden lg:flex space-x-2">
               <span className="px-3 py-1 bg-white/5 text-white/50 text-[10px] font-bold rounded-full">Potting Ratios</span>
               <span className="px-3 py-1 bg-white/5 text-white/50 text-[10px] font-bold rounded-full">Maintenance</span>
               <span className="px-3 py-1 bg-white/5 text-white/50 text-[10px] font-bold rounded-full">Pest Control</span>
            </div>
          </div>

          <div className="bg-slate-900 h-[550px] overflow-y-auto p-6 space-y-8 flex flex-col scroll-smooth">
             {chatMessages.map((msg, i) => (
               <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2`}>
                 <div className={`max-w-[90%] rounded-3xl p-6 ${
                   msg.role === 'user' 
                    ? 'bg-emerald-600 text-white rounded-tr-none shadow-lg shadow-emerald-900/20' 
                    : 'bg-white/10 text-slate-100 rounded-tl-none border border-white/5'
                 }`}>
                    <div className="text-sm prose prose-invert prose-emerald max-w-none prose-headings:font-black prose-headings:text-emerald-400 prose-headings:mt-6 prose-headings:mb-2">
                       <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h3: ({node, ...props}) => <h3 className="text-emerald-400 font-black mt-6 mb-3" {...props} />,
                          p: ({node, ...props}) => <p className="mb-4 last:mb-0 leading-relaxed" {...props} />,
                          ul: ({node, ...props}) => <ul className="mb-4 list-disc pl-5" {...props} />,
                          li: ({node, ...props}) => <li className="mb-1" {...props} />
                        }}
                       >
                        {msg.text}
                       </ReactMarkdown>
                       
                       {msg.translations?.hi && (
                         <div className="mt-8 pt-6 border-t border-white/10 opacity-80">
                            <p className="text-[10px] font-black uppercase text-emerald-400 mb-2">Hindi Guide</p>
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.translations.hi}</ReactMarkdown>
                         </div>
                       )}
                       {msg.translations?.ml && (
                         <div className="mt-8 pt-6 border-t border-white/10 opacity-80">
                            <p className="text-[10px] font-black uppercase text-emerald-400 mb-2">Malayalam Guide</p>
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
                       className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-white/10 hover:bg-emerald-600/20 transition-all ${msg.translations?.hi ? 'bg-emerald-600/30 text-emerald-400 border-emerald-500/50' : 'text-slate-400'}`}
                     >
                       {translatingIndex === i ? '...' : msg.translations?.hi ? 'Hindi ✓' : 'Translate to Hindi'}
                     </button>
                     <button 
                       onClick={() => handleTranslate(i, 'ml')}
                       disabled={translatingIndex === i}
                       className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-white/10 hover:bg-emerald-600/20 transition-all ${msg.translations?.ml ? 'bg-emerald-600/30 text-emerald-400 border-emerald-500/50' : 'text-slate-400'}`}
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
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                  </div>
               </div>
             )}
             <div ref={chatEndRef} />
          </div>

          <form onSubmit={handleChatSubmit} className="p-6 bg-slate-800 rounded-b-[2.2rem] flex items-center space-x-3">
             <input 
               type="text" 
               value={chatInput}
               onChange={(e) => setChatInput(e.target.value)}
               placeholder="Just type a plant name (e.g. Hibiscus, Rose, Tulsi)..."
               className="flex-1 bg-slate-900/50 border border-white/10 rounded-2xl px-6 py-4 text-sm text-white placeholder-white/30 outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all shadow-inner"
               disabled={isChatLoading}
             />
             <button 
               type="submit"
               disabled={isChatLoading || !chatInput.trim()}
               className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white p-4 rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center"
             >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
             </button>
          </form>
        </div>
      </div>
      
      <div className="text-center pt-10">
        <p className="text-slate-400 text-xs font-bold uppercase tracking-[0.2em]"> FloraGuard AI • Smart Agriculture & Gardening </p>
      </div>
    </div>
  );
};

export default GardenCare;
