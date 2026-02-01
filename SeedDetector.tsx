
import React, { useState, useRef, useEffect } from 'react';
import { HistoryItem } from '../types';
import { analyzeSeedImage } from '../services/geminiService';

interface SeedDetectorProps {
  onAddToHistory: (item: HistoryItem) => void;
  initialData?: HistoryItem | null;
}

const SeedDetector: React.FC<SeedDetectorProps> = ({ onAddToHistory, initialData }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<HistoryItem['seedData'] | null>(null);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialData && initialData.type === 'seed-analysis' && initialData.seedData) {
      setResult(initialData.seedData);
      setCurrentImage(initialData.imageUrl || null);
    }
  }, [initialData]);

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
    try {
      const data = await analyzeSeedImage(base64);
      if (!data) throw new Error("Seed analysis returned empty data.");
      
      setResult(data);
      
      const historyItem: HistoryItem = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        type: 'seed-analysis',
        plantName: data.seedName || "Unknown Seed",
        imageUrl: base64,
        seedData: data
      };
      onAddToHistory(historyItem);
    } catch (err) {
      console.error("Seed detection error:", err);
      setError("Failed to identify the seed. Please try a clearer image or ensure the seed is centered in the photo.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resetAnalysis = () => {
    setResult(null);
    setError(null);
    setCurrentImage(null);
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-500 py-10 pb-20">
      <div className="max-w-4xl mx-auto space-y-6 text-center">
        <h1 className="text-4xl font-black text-slate-900 tracking-tight">AI Seed Detector</h1>
        <p className="text-slate-500 max-w-2xl mx-auto">
          Upload an image of a seed to identify its name, parent plant, best soil, and ideal cultivation regions.
        </p>
      </div>

      <div className="max-w-5xl mx-auto">
        {!result && !isAnalyzing && !error && (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="group relative border-4 border-dashed border-emerald-100 rounded-[3rem] p-16 flex flex-col items-center justify-center cursor-pointer hover:border-emerald-300 hover:bg-emerald-50/30 transition-all duration-500 overflow-hidden"
          >
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept="image/*" />
            <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center text-4xl mb-6 group-hover:scale-110 transition-transform">🌱</div>
            <h3 className="text-xl font-bold text-slate-800">Identify a Seed</h3>
            <p className="text-slate-400 mt-2">Upload a clear photo of the seed</p>
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </div>
        )}

        {isAnalyzing && (
          <div className="bg-white rounded-[3rem] p-16 shadow-2xl border border-emerald-100 flex flex-col items-center justify-center space-y-6">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center text-2xl">🔬</div>
            </div>
            <div className="text-center">
              <h3 className="text-xl font-black text-slate-900 animate-pulse">Detecting Seed Type...</h3>
              <p className="text-slate-500 text-sm mt-1">Analyzing botanical features and cultivation data</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-white rounded-[3rem] p-16 shadow-xl border border-red-100 flex flex-col items-center justify-center space-y-6 text-center">
             <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center text-2xl">⚠️</div>
             <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-900">Detection Failed</h3>
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-bottom-8 duration-700">
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white p-4 rounded-3xl shadow-lg border border-slate-100">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Seed Photo</p>
                <div className="aspect-square rounded-2xl overflow-hidden bg-slate-50 border border-slate-100">
                  {currentImage && <img src={`data:image/jpeg;base64,${currentImage}`} className="w-full h-full object-cover" alt="Detected Seed" />}
                </div>
              </div>

              <div className="bg-emerald-900 rounded-3xl p-6 text-white shadow-xl">
                 <h4 className="text-xs font-black text-emerald-400 uppercase tracking-widest mb-2">Identification</h4>
                 <h2 className="text-2xl font-black mb-1">{result.seedName || "Unknown Seed"}</h2>
                 <p className="text-emerald-300 text-sm font-bold">{result.plantName || "Unknown Plant"}</p>
                 <div className="mt-6 space-y-4">
                    <div className="border-t border-white/10 pt-4">
                       <p className="text-[10px] text-white/50 font-black uppercase tracking-widest mb-1">Description</p>
                       <p className="text-xs text-slate-200 leading-relaxed">{result.description || "No description available."}</p>
                    </div>
                 </div>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
               <div className="bg-white rounded-[2.5rem] p-8 shadow-lg border border-slate-100">
                  <div className="flex items-center space-x-3 mb-6">
                    <span className="text-2xl">🌍</span>
                    <h3 className="text-2xl font-black text-slate-900">Cultivation Regions</h3>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {(result.cultivationPlaces || []).length > 0 ? (
                      (result.cultivationPlaces || []).map((place, i) => (
                        <span key={i} className="px-5 py-2.5 bg-blue-50 text-blue-700 font-bold rounded-2xl border border-blue-100 flex items-center shadow-sm">
                          <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                          {place}
                        </span>
                      ))
                    ) : (
                      <p className="text-slate-400 italic text-sm">No regions identified.</p>
                    )}
                  </div>
               </div>

               <div className="bg-amber-50 rounded-[2.5rem] p-8 border border-amber-100 shadow-sm">
                  <div className="flex items-center space-x-3 mb-6">
                    <span className="text-2xl">🪴</span>
                    <h3 className="text-2xl font-black text-amber-900">Best Soil Type</h3>
                  </div>
                  <div className="bg-white/60 p-5 rounded-2xl border border-amber-200">
                    <p className="text-amber-950 font-bold leading-relaxed">{result.bestSoil || "Soil details not available."}</p>
                  </div>
               </div>

               <div className="bg-emerald-50 rounded-[2.5rem] p-8 border border-emerald-100 shadow-sm">
                  <div className="flex items-center space-x-3 mb-6">
                    <span className="text-2xl">🌱</span>
                    <h3 className="text-2xl font-black text-emerald-900">Sowing & Growth Tips</h3>
                  </div>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(result.growthTips || []).length > 0 ? (
                      (result.growthTips || []).map((tip, i) => (
                        <li key={i} className="flex items-start space-x-3 bg-white p-4 rounded-xl border border-emerald-100">
                          <span className="text-emerald-600 font-black">✓</span>
                          <p className="text-slate-700 text-xs leading-relaxed">{tip}</p>
                        </li>
                      ))
                    ) : (
                      <p className="text-emerald-700 italic text-sm col-span-2">No growth tips available.</p>
                    )}
                  </ul>
               </div>

               <button 
                onClick={resetAnalysis}
                className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black uppercase tracking-widest text-sm hover:bg-slate-800 transition-all shadow-xl active:scale-[0.98]"
               >
                 Detect Another Seed
               </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SeedDetector;
