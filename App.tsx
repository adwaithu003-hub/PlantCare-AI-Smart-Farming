
import React, { useState, useEffect } from 'react';
import { Message, HistoryItem, AppView, User, Reminder } from './types';
import { analyzePlantImage, chatWithBotanist } from './services/geminiService';
import ChatWindow from './components/ChatWindow';
import Sidebar from './components/Sidebar';
import GardenCare from './components/GardenCare';
import SoilAnalyzer from './components/SoilAnalyzer';
import SeedDetector from './components/SeedDetector';
import Reminders from './components/Reminders';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('home');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isChatting, setIsChatting] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<HistoryItem | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<User>({
    name: '',
    email: '',
    photoUrl: '',
    isLoggedIn: false
  });

  // Load state from local storage
  useEffect(() => {
    const savedHistory = localStorage.getItem('flora_guard_history');
    if (savedHistory) setHistory(JSON.parse(savedHistory));

    const savedUser = localStorage.getItem('flora_guard_user');
    if (savedUser) setUser(JSON.parse(savedUser));

    const savedReminders = localStorage.getItem('flora_guard_reminders');
    if (savedReminders) setReminders(JSON.parse(savedReminders));

    // Request notification permission
    if ("Notification" in window) {
      Notification.requestPermission();
    }
  }, []);

  // Periodic reminder check
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      const todayStr = now.toDateString();
      
      reminders.forEach(reminder => {
        const reminderDate = new Date(reminder.date);
        if (reminderDate.toDateString() === todayStr && !reminder.completed) {
          // Trigger notification
          if (Notification.permission === "granted") {
            const lastNotified = localStorage.getItem(`notified_${reminder.id}`);
            if (lastNotified !== todayStr) {
              new Notification(`FloraGuard: ${reminder.title}`, {
                body: `Don't forget to take care of your ${reminder.plantName || 'plants'} today!`,
                icon: '/favicon.ico'
              });
              localStorage.setItem(`notified_${reminder.id}`, todayStr);
            }
          }
        }
      });
    };

    const interval = setInterval(checkReminders, 60000); // Check every minute
    checkReminders(); // Initial check
    return () => clearInterval(interval);
  }, [reminders]);

  const saveToHistory = (item: HistoryItem) => {
    const updatedHistory = [item, ...history];
    setHistory(updatedHistory);
    localStorage.setItem('flora_guard_history', JSON.stringify(updatedHistory));
  };

  const saveReminders = (updated: Reminder[]) => {
    setReminders(updated);
    localStorage.setItem('flora_guard_reminders', JSON.stringify(updated));
  };

  const handleAddReminder = (reminder: Reminder) => {
    saveReminders([...reminders, reminder]);
  };

  const handleToggleReminder = (id: string) => {
    saveReminders(reminders.map(r => r.id === id ? { ...r, completed: !r.completed } : r));
  };

  const handleDeleteReminder = (id: string) => {
    saveReminders(reminders.filter(r => r.id !== id));
  };

  const handleViewChange = (newView: AppView) => {
    setView(newView);
    setSelectedHistoryItem(null); 
    setIsMobileMenuOpen(false); 
  };

  const handleGoogleLogin = () => {
    const mockUser: User = {
      name: 'Agro Enthusiast',
      email: 'agro.enthusiast@gmail.com',
      photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Agro',
      isLoggedIn: true
    };
    setUser(mockUser);
    localStorage.setItem('flora_guard_user', JSON.stringify(mockUser));
  };

  const handleSignOut = () => {
    const loggedOutUser = { name: '', email: '', photoUrl: '', isLoggedIn: false };
    setUser(loggedOutUser);
    localStorage.removeItem('flora_guard_user');
    setView('home');
  };

  const handleUpdateMessage = (index: number, updatedMessage: Message) => {
    const updatedMessages = [...messages];
    updatedMessages[index] = updatedMessage;
    setMessages(updatedMessages);
  };

  const handleImageAnalysis = async (base64: string) => {
    setIsAnalyzing(true);
    try {
      const resultRaw = await analyzePlantImage(base64);
      const result: HistoryItem = {
        ...resultRaw,
        id: crypto.randomUUID(),
        type: 'analysis',
        timestamp: Date.now(),
        imageUrl: base64,
        plantName: resultRaw.plantName || 'Unknown Plant'
      } as HistoryItem;
      saveToHistory(result);
      setMessages(prev => [...prev, {
        role: 'model',
        text: `I've completed the diagnostic scan for your plant.`,
        isAnalysis: true,
        analysis: result,
        image: base64
      }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'model', text: "I'm sorry, I couldn't identify any issues in that photo. Could you try a clearer image?" }]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSendMessage = async (text: string) => {
    const userMsg: Message = { role: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setIsChatting(true);
    try {
      const historyLog = messages.map(m => ({ role: m.role, text: m.text }));
      const responseText = await chatWithBotanist(historyLog, text);
      setMessages(prev => [...prev, { role: 'model', text: responseText || "I'm sorry, I couldn't process that request." }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'model', text: "I'm having trouble connecting right now. Please try again." }]);
    } finally {
      setIsChatting(false);
    }
  };

  const renderHome = () => (
    <div className="space-y-8 animate-in fade-in duration-500 py-6 md:py-10">
      <div className="text-center space-y-3 max-w-2xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 leading-tight">
          Flora<span className="text-emerald-600">Guard</span> AI Plant Assistant
        </h1>
        <p className="text-slate-600 text-sm md:text-base">
          Identify pests, diseases, and bugs on your vegetables and fruits plants instantly.
        </p>
      </div>
      <div className="flex justify-center pb-20">
        <div className="w-full max-w-3xl">
          <ChatWindow 
            messages={messages} 
            onSendMessage={handleSendMessage}
            onImageUpload={handleImageAnalysis}
            isLoading={isChatting || isAnalyzing}
            onUpdateMessage={handleUpdateMessage}
          />
        </div>
      </div>
      {isAnalyzing && (
        <div className="fixed inset-0 bg-slate-900/10 backdrop-blur-sm z-50 flex flex-col items-center justify-center space-y-4">
          <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center space-y-4 border border-emerald-100">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center"><span className="text-xl">🐛</span></div>
            </div>
            <p className="text-slate-900 font-bold animate-pulse">Running AI Diagnostics...</p>
            <p className="text-slate-500 text-xs">Scanning for diseases, pests, and bug signs</p>
          </div>
        </div>
      )}
    </div>
  );

  const renderHistory = () => (
    <div className="space-y-8 animate-in fade-in duration-500 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Unified History</h1>
          <p className="text-slate-500 mt-1">Disease analyses, garden care guides, soil tests, and seed detections.</p>
        </div>
        <button 
          onClick={() => { if(confirm("Are you sure?")) { setHistory([]); localStorage.removeItem('flora_guard_history'); } }}
          className="text-sm text-red-500 hover:text-red-700 font-medium px-4 py-2 border border-red-100 rounded-lg hover:bg-red-50"
        >
          Clear All
        </button>
      </div>
      {history.length === 0 ? (
        <div className="text-center py-24 bg-white rounded-[2.5rem] border border-dashed border-slate-200">
          <div className="text-4xl mb-4">📜</div>
          <p className="text-slate-400 font-medium">No history found yet.</p>
          <button onClick={() => handleViewChange('home')} className="mt-6 px-8 py-3 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20">Start Analyzing</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {history.map((item) => (
            <div 
              key={item.id} 
              className="bg-white rounded-[2rem] overflow-hidden shadow-sm border border-slate-100 hover:shadow-xl transition-all duration-300 group cursor-pointer flex flex-col"
              onClick={() => {
                if (item.type === 'analysis') {
                  setMessages([{ role: 'model', text: `I've reloaded the analysis for your **${item.plantName}**.`, isAnalysis: true, analysis: item, image: item.imageUrl }]);
                  setView('home');
                } else if (item.type === 'soil-analysis') { setSelectedHistoryItem(item); setView('soil-analyzer');
                } else if (item.type === 'seed-analysis') { setSelectedHistoryItem(item); setView('seed-detector');
                } else { setMessages([{ role: 'model', text: item.guideContent || "" }]); setView('garden-care'); }
              }}
            >
              <div className="h-44 bg-slate-50 relative overflow-hidden">
                {item.imageUrl ? <img src={`data:image/jpeg;base64,${item.imageUrl}`} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt={item.plantName} /> : <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 space-y-2"><span className="text-4xl">{item.type === 'guide' ? '🪴' : item.type === 'soil-analysis' ? '🔬' : item.type === 'seed-analysis' ? '🌱' : '🔬'}</span></div>}
                <div className="absolute top-4 left-4"><span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg ${item.type === 'analysis' ? 'bg-blue-600 text-white' : item.type === 'soil-analysis' ? 'bg-amber-600 text-white' : item.type === 'seed-analysis' ? 'bg-emerald-800 text-white' : 'bg-emerald-600 text-white'}`}>{item.type.replace('-', ' ')}</span></div>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <div className="mb-4"><p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{item.plantName}</p><h3 className="font-black text-slate-900 mt-1 line-clamp-1">{item.type === 'analysis' ? item.diseaseName : item.type === 'soil-analysis' ? `Soil Health: pH ${item.soilData?.phValue}` : item.type === 'seed-analysis' ? `Seed: ${item.seedData?.seedName}` : `Care Guide: ${item.plantName}`}</h3></div>
                <div className="mt-auto flex items-center justify-between"><span className="text-[10px] font-bold text-slate-400">{new Date(item.timestamp).toLocaleDateString()}</span><div className="flex items-center text-[10px] font-black text-emerald-600 uppercase tracking-widest group-hover:translate-x-1 transition-transform"><span>View Result</span><svg className="w-3 h-3 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg></div></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderAccount = () => (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500 py-10">
      <div className="text-center md:text-left"><h1 className="text-3xl font-black text-slate-900 tracking-tight">FloraGuard Profile</h1><p className="text-slate-500 mt-1">Manage your identity and personalized plant wisdom.</p></div>
      {!user.isLoggedIn ? (
        <div className="bg-white rounded-[3rem] p-12 shadow-2xl border border-emerald-100 flex flex-col items-center text-center space-y-8"><div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center text-4xl shadow-inner">🔒</div><div className="space-y-3"><h3 className="text-2xl font-black text-slate-900">Sign in to FloraGuard</h3><p className="text-slate-500 max-w-sm mx-auto">Access your scan history, soil reports, and personalized gardening advice across all devices.</p></div><button onClick={handleGoogleLogin} className="flex items-center space-x-3 px-8 py-4 bg-white border-2 border-slate-200 rounded-2xl hover:bg-slate-50 hover:border-emerald-500/30 transition-all duration-300 group shadow-sm active:scale-95"><svg className="w-6 h-6" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg><span className="font-bold text-slate-700 group-hover:text-slate-900">Sign in with Google</span></button><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Secured by Google Identity Services</p></div>
      ) : (
        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl divide-y divide-slate-50 overflow-hidden">
          <div className="p-10 flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8"><div className="relative group"><img src={user.photoUrl} className="w-28 h-28 rounded-[2rem] border-4 border-emerald-100 shadow-xl" alt="Profile" /><div className="absolute inset-0 bg-emerald-600/20 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><span className="text-white text-xs font-black uppercase tracking-widest">Edit</span></div></div><div className="text-center md:text-left flex-1"><h3 className="text-3xl font-black text-slate-900 tracking-tight">{user.name}</h3><p className="text-slate-500 font-medium">{user.email}</p><div className="mt-4 flex flex-wrap justify-center md:justify-start gap-2"><span className="inline-flex items-center px-4 py-1.5 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-100">Premium Member</span><span className="inline-flex items-center px-4 py-1.5 bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-full border border-slate-100">Joined {new Date().getFullYear()}</span></div></div></div>
          <div className="p-10 bg-slate-50/50 flex flex-col md:flex-row gap-4"><button onClick={handleSignOut} className="flex-1 py-5 bg-white border-2 border-slate-200 text-slate-700 rounded-3xl font-black uppercase tracking-[0.2em] text-[10px] hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all active:scale-95 shadow-sm">Log Out of Account</button><button className="flex-1 py-5 bg-slate-900 text-white rounded-3xl font-black uppercase tracking-[0.2em] text-[10px] hover:bg-slate-800 transition-all active:scale-95 shadow-xl">Export Profile Data</button></div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
      <Sidebar currentView={view} onViewChange={handleViewChange} isMobileOpen={isMobileMenuOpen} onCloseMobile={() => setIsMobileMenuOpen(false)} user={user} />
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        <header className="md:hidden bg-white border-b border-emerald-100 p-4 flex items-center justify-between sticky top-0 z-40 shadow-sm">
           <div className="flex items-center space-x-2"><div className="bg-emerald-600 p-1.5 rounded-lg text-white"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg></div><span className="text-xl font-black text-slate-800 tracking-tight">FloraGuard</span></div>
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"><svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg></button>
        </header>
        <main className="max-w-7xl mx-auto px-4 md:px-10 w-full flex-1">
          {view === 'home' && renderHome()}
          {view === 'garden-care' && <GardenCare onAddToHistory={saveToHistory} initialMessages={messages} />}
          {view === 'soil-analyzer' && <SoilAnalyzer onAddToHistory={saveToHistory} initialData={selectedHistoryItem} />}
          {view === 'seed-detector' && <SeedDetector onAddToHistory={saveToHistory} initialData={selectedHistoryItem} />}
          {view === 'reminders' && <Reminders reminders={reminders} onAddReminder={handleAddReminder} onToggleReminder={handleToggleReminder} onDeleteReminder={handleDeleteReminder} />}
          {view === 'history' && renderHistory()}
          {view === 'account' && renderAccount()}
        </main>
        <footer className="px-4 py-8 text-center text-slate-300 text-[10px] uppercase tracking-[0.3em] font-black">FloraGuard AI • Intelligence for Earth</footer>
      </div>
    </div>
  );
};

export default App;
