
import React, { useState, useEffect } from 'react';
import { Reminder } from '../types';

interface RemindersProps {
  reminders: Reminder[];
  onAddReminder: (reminder: Reminder) => void;
  onToggleReminder: (id: string) => void;
  onDeleteReminder: (id: string) => void;
}

const Reminders: React.FC<RemindersProps> = ({ reminders, onAddReminder, onToggleReminder, onDeleteReminder }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);
  const [newReminder, setNewReminder] = useState({
    title: '',
    type: 'fertilizer' as Reminder['type'],
    plantName: ''
  });

  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1));
  };

  const isToday = (day: number) => {
    const today = new Date();
    return today.getDate() === day && 
           today.getMonth() === selectedDate.getMonth() && 
           today.getFullYear() === selectedDate.getFullYear();
  };

  const hasReminder = (day: number) => {
    const dateStr = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day).toDateString();
    return reminders.some(r => new Date(r.date).toDateString() === dateStr);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const reminder: Reminder = {
      id: crypto.randomUUID(),
      title: newReminder.title,
      type: newReminder.type,
      plantName: newReminder.plantName,
      date: selectedDate.toISOString(),
      completed: false
    };
    onAddReminder(reminder);
    setShowAddModal(false);
    setNewReminder({ title: '', type: 'fertilizer', plantName: '' });
  };

  const filteredReminders = reminders.filter(r => 
    new Date(r.date).getMonth() === selectedDate.getMonth() && 
    new Date(r.date).getFullYear() === selectedDate.getFullYear()
  ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const days = Array.from({ length: daysInMonth(selectedDate.getFullYear(), selectedDate.getMonth()) }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDayOfMonth(selectedDate.getFullYear(), selectedDate.getMonth()) }, (_, i) => i);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 py-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Care Calendar</h1>
          <p className="text-slate-500 mt-1">Schedule and track your plant treatments.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center space-x-2 shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
          </svg>
          <span>Schedule Task</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] shadow-xl border border-slate-100 p-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-black text-slate-800">
              {selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h2>
            <div className="flex space-x-2">
              <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-50 rounded-xl border border-slate-100 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
              </button>
              <button onClick={handleNextMonth} className="p-2 hover:bg-slate-50 rounded-xl border border-slate-100 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 mb-4 text-center">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {blanks.map(b => <div key={`b-${b}`} className="aspect-square"></div>)}
            {days.map(d => (
              <button 
                key={d}
                onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), d))}
                className={`aspect-square rounded-2xl flex flex-col items-center justify-center relative transition-all group ${
                  isToday(d) 
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 ring-4 ring-emerald-50' 
                    : selectedDate.getDate() === d 
                      ? 'bg-slate-900 text-white' 
                      : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span className="text-sm font-bold">{d}</span>
                {hasReminder(d) && (
                  <div className={`w-1 h-1 rounded-full mt-1 ${isToday(d) || selectedDate.getDate() === d ? 'bg-white' : 'bg-emerald-500'}`}></div>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-[2.5rem] p-8 text-slate-900 shadow-xl border border-slate-100">
            <h3 className="text-xs font-black text-emerald-600 uppercase tracking-[0.2em] mb-6">Upcoming Tasks</h3>
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200">
              {filteredReminders.length === 0 ? (
                <div className="text-center py-10 opacity-40">
                  <span className="text-4xl block mb-2">📅</span>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No tasks scheduled</p>
                </div>
              ) : (
                filteredReminders.map(r => (
                  <div 
                    key={r.id} 
                    className={`group flex items-start space-x-4 bg-slate-50 border border-slate-100 rounded-2xl p-4 transition-all hover:bg-slate-100 ${r.completed ? 'opacity-50' : ''}`}
                  >
                    <button 
                      onClick={() => onToggleReminder(r.id)}
                      className={`w-6 h-6 rounded-lg border-2 mt-1 flex items-center justify-center transition-all ${
                        r.completed ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 hover:border-emerald-500'
                      }`}
                    >
                      {r.completed && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-black text-slate-900 truncate ${r.completed ? 'line-through' : ''}`}>{r.title}</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                        {r.plantName && `${r.plantName} • `}{new Date(r.date).toLocaleDateString()}
                      </p>
                    </div>
                    <button 
                      onClick={() => onDeleteReminder(r.id)}
                      className="opacity-0 group-hover:opacity-100 p-2 text-slate-400 hover:text-red-400 transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="bg-emerald-600 p-8 text-white relative">
              <h2 className="text-2xl font-black">Schedule Treatment</h2>
              <p className="text-emerald-100 text-sm mt-1">Plan your next gardening step.</p>
              <button onClick={() => setShowAddModal(false)} className="absolute top-8 right-8 text-white/50 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={handleAddSubmit} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</label>
                <input 
                  type="date"
                  value={selectedDate.toISOString().split('T')[0]}
                  onChange={e => setSelectedDate(new Date(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-900 font-bold"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Task Name</label>
                <input 
                  autoFocus
                  required
                  type="text" 
                  value={newReminder.title}
                  onChange={e => setNewReminder(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Fertilize Tomatoes"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-900 font-bold"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Plant (Optional)</label>
                <input 
                  type="text" 
                  value={newReminder.plantName}
                  onChange={e => setNewReminder(prev => ({ ...prev, plantName: e.target.value }))}
                  placeholder="e.g., Cherry Tomato"
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-900 font-bold"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['fertilizer', 'pesticide', 'watering', 'other'] as Reminder['type'][]).map(type => (
                    <button 
                      key={type}
                      type="button"
                      onClick={() => setNewReminder(prev => ({ ...prev, type }))}
                      className={`px-4 py-3 rounded-2xl border-2 text-[10px] font-black uppercase tracking-widest transition-all ${
                        newReminder.type === type 
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-700' 
                          : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              <button className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all shadow-xl active:scale-[0.98] mt-4">
                Save Task
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reminders;
