
import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message } from '../types';
import AnalysisDisplay from './AnalysisDisplay';
import { translateText } from '../services/geminiService';

interface ChatWindowProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  onImageUpload?: (base64: string) => void;
  isLoading: boolean;
  onUpdateMessage?: (index: number, updatedMessage: Message) => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ messages, onSendMessage, onImageUpload, isLoading, onUpdateMessage }) => {
  const [input, setInput] = useState('');
  const [translatingIndex, setTranslatingIndex] = useState<number | null>(null);
  const [activeLangMenu, setActiveLangMenu] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImageUpload) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        onImageUpload(base64String);
      };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const triggerUpload = () => {
    fileInputRef.current?.click();
  };

  const handleTranslate = async (index: number, lang: 'hi' | 'ml') => {
    const msg = messages[index];
    setActiveLangMenu(null);
    if (msg.translations?.[lang]) return;

    setTranslatingIndex(index);
    try {
      const targetLang = lang === 'hi' ? 'Hindi' : 'Malayalam';
      const translated = await translateText(msg.text, targetLang);
      if (translated && onUpdateMessage) {
        const updatedMsg = {
          ...msg,
          translations: {
            ...msg.translations,
            [lang]: translated
          }
        };
        onUpdateMessage(index, updatedMsg);
      }
    } catch (err) {
      console.error("Translation failed", err);
    } finally {
      setTranslatingIndex(null);
    }
  };

  // Helper to ensure we don't render JSON-like strings as plain text in bubbles
  const cleanText = (text: string) => {
    if (text.trim().startsWith('{') && text.trim().endsWith('}')) {
      return "_Botanist is compiling technical data... Ask a specific question for a textual answer._";
    }
    return text;
  };

  return (
    <div className="flex flex-col h-[700px] bg-white rounded-3xl shadow-2xl border border-slate-200/60 overflow-hidden">
      {/* Header */}
      <div className="p-4 bg-emerald-600 text-white flex items-center justify-between shadow-md z-10">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500/50 flex items-center justify-center text-xl border border-white/20">👨‍🌾</div>
          <div>
            <h3 className="font-bold text-white text-sm">FloraGuard Plant Assistant</h3>
            <div className="flex items-center space-x-1">
              <span className="w-2 h-2 bg-emerald-300 rounded-full animate-pulse"></span>
              <p className="text-[10px] text-emerald-100 font-medium uppercase tracking-wider">Online • AI Specialist</p>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-slate-50/80 scroll-smooth">
        {messages.map((msg, i) => (
          <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2 duration-300`}>
            <div className={`group relative max-w-[95%] sm:max-w-[85%] rounded-3xl overflow-hidden shadow-sm ${
              msg.role === 'user' 
                ? 'bg-emerald-600 text-white rounded-tr-none' 
                : 'bg-white text-slate-800 rounded-tl-none border border-slate-200/60'
            }`}>
              {msg.analysis ? (
                <div className="w-full">
                   <AnalysisDisplay analysis={msg.analysis} imageUrl={msg.analysis.imageUrl} />
                </div>
              ) : (
                <div className="p-4">
                  {msg.image && !msg.analysis && (
                    <div className="mb-3 rounded-xl overflow-hidden border border-slate-100 shadow-inner">
                       <img src={`data:image/jpeg;base64,${msg.image}`} alt="Uploaded" className="max-h-60 w-full object-cover" />
                    </div>
                  )}
                  {msg.text && (
                    <div className={`text-sm leading-relaxed prose prose-sm max-w-none ${msg.role === 'user' ? 'prose-invert' : 'prose-emerald'}`}>
                      <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={{
                          strong: ({node, ...props}) => <strong className="font-bold text-inherit underline decoration-emerald-500/30" {...props} />,
                          p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                        }}
                      >
                        {cleanText(msg.text)}
                      </ReactMarkdown>
                      
                      {/* Translated sections */}
                      {msg.translations?.hi && (
                        <div className="mt-4 pt-4 border-t border-slate-100 italic text-slate-500">
                           <p className="text-[10px] font-black uppercase text-emerald-600 mb-1">Hindi Translation</p>
                           <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.translations.hi}</ReactMarkdown>
                        </div>
                      )}
                      {msg.translations?.ml && (
                        <div className="mt-4 pt-4 border-t border-slate-100 italic text-slate-500">
                           <p className="text-[10px] font-black uppercase text-emerald-600 mb-1">Malayalam Translation</p>
                           <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.translations.ml}</ReactMarkdown>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Translation Selection UI */}
            {msg.role === 'model' && !msg.analysis && (
              <div className="relative mt-2 ml-2">
                <button 
                  onClick={() => setActiveLangMenu(activeLangMenu === i ? null : i)}
                  className="flex items-center space-x-1.5 px-3 py-1 bg-white border border-slate-200 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-emerald-50 hover:text-emerald-600 transition-all shadow-sm"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 9.97 8.743 14.429 5.5 17.5" />
                  </svg>
                  <span>{translatingIndex === i ? 'Translating...' : 'Translate'}</span>
                  <svg className={`w-2.5 h-2.5 transition-transform ${activeLangMenu === i ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {activeLangMenu === i && (
                  <div className="absolute left-0 bottom-full mb-2 w-36 bg-white border border-slate-100 rounded-2xl shadow-xl z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-1">
                      <button 
                        onClick={() => handleTranslate(i, 'hi')}
                        className={`w-full text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all ${msg.translations?.hi ? 'bg-emerald-50 text-emerald-600' : 'text-slate-600 hover:bg-slate-50'}`}
                      >
                        Hindi {msg.translations?.hi ? '✓' : ''}
                      </button>
                      <button 
                        onClick={() => handleTranslate(i, 'ml')}
                        className={`w-full text-left px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all ${msg.translations?.ml ? 'bg-emerald-50 text-emerald-600' : 'text-slate-600 hover:bg-slate-50'}`}
                      >
                        Malayalam {msg.translations?.ml ? '✓' : ''}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-slate-200/60 flex space-x-2 items-center">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
              <div className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce [animation-delay:0.4s]"></div>
            </div>
          </div>
        )}
      </div>

      {/* Input Section */}
      <form onSubmit={handleSubmit} className="p-4 bg-white border-t border-slate-200/60 flex items-center space-x-2">
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*" 
          onChange={handleFileChange}
          disabled={isLoading}
        />
        <button
          type="button"
          onClick={triggerUpload}
          disabled={isLoading}
          className="p-3 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-2xl transition-all disabled:opacity-50 border border-transparent hover:border-emerald-100"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
        <div className="flex-1 relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask or upload photo..."
            className="w-full bg-slate-100 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm text-slate-900 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-white transition-all outline-none"
            disabled={isLoading}
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white p-3.5 rounded-2xl shadow-lg transition-all active:scale-95"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </form>
    </div>
  );
};

export default ChatWindow;
