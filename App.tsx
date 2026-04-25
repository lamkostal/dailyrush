
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DailySelection, NumberRange } from './types';
import SelectionCard from './components/SelectionCard';
import HistoryChart from './components/HistoryChart';
import { Calendar, TrendingUp, Info, BookOpen, Clock, ChevronRight, PenLine, Zap } from 'lucide-react';

const STORAGE_KEY = 'daily_rush_data_v2';

const App: React.FC = () => {
  const [history, setHistory] = useState<DailySelection[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState<string>('');

  // Load data from local storage
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      setHistory(JSON.parse(savedData));
    }
  }, []);

  // Find selection for the currently focused date
  const currentEntry = useMemo(() => {
    return history.find(item => item.date === selectedDate) || null;
  }, [history, selectedDate]);

  // Sync note state when date changes
  useEffect(() => {
    if (currentEntry) {
      setNote(currentEntry.note || '');
    } else {
      setNote('');
    }
  }, [currentEntry, selectedDate]);

  const handleSelect = useCallback((value: NumberRange) => {
    const newEntry: DailySelection = {
      date: selectedDate,
      value: value,
      timestamp: currentEntry?.timestamp || Date.now(),
      note: note.trim()
    };

    const otherHistory = history.filter(item => item.date !== selectedDate);
    const updatedHistory = [...otherHistory, newEntry].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    
    setHistory(updatedHistory);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
  }, [history, selectedDate, note, currentEntry]);

  const handleNoteBlur = () => {
    if (currentEntry) {
      handleSelect(currentEntry.value as NumberRange);
    }
  };

  const deleteEntry = () => {
    if (window.confirm('Are you sure you want to remove this entry?')) {
      const updatedHistory = history.filter(item => item.date !== selectedDate);
      setHistory(updatedHistory);
      setNote('');
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 selection:bg-indigo-100">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm backdrop-blur-md bg-white/80">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-200">
              <Zap size={22} className="fill-current" />
            </div>
            <h1 className="text-xl font-black tracking-tighter text-slate-800 lowercase">dailyrush</h1>
          </div>
          <div className="flex items-center gap-3">
             <div className="hidden md:flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest mr-2">
              <Clock size={14} />
              <span>{history.length} Logs</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-2xl border border-slate-200 transition-all hover:border-indigo-300 group">
              <Calendar size={14} className="text-indigo-600 group-hover:scale-110 transition-transform" />
              <input 
                type="date" 
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="bg-transparent border-none text-[10px] font-black focus:outline-none cursor-pointer tracking-wider text-slate-700"
              />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 mt-6 space-y-6">
        {/* Entry Panel */}
        <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/40 overflow-hidden border border-slate-100 transition-all">
          <div className="p-8 pb-0">
            <div className="flex flex-col gap-1">
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">
                {selectedDate === new Date().toISOString().split('T')[0] ? "What's the rush today?" : "Reviewing this moment."}
              </h3>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest">Rate your experience 1-10</p>
            </div>
          </div>

          <div className="p-8 pt-4">
            <SelectionCard 
              onSelect={handleSelect} 
              currentSelection={currentEntry?.value as NumberRange | undefined} 
            />
            
            <div className="mt-6 pt-6 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <PenLine size={14} className="text-indigo-400" />
                  Quick Notes
                </label>
                {note.length > 0 && (
                   <span className="text-[10px] font-bold text-slate-300 italic">Saved</span>
                )}
              </div>
              <textarea 
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onBlur={handleNoteBlur}
                placeholder="Briefly, what happened?"
                className="w-full h-24 p-5 bg-slate-50 border border-slate-200 rounded-[1.5rem] focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white outline-none transition-all resize-none text-slate-700 leading-relaxed font-medium placeholder:text-slate-300 text-sm"
              />
            </div>
          </div>

          {currentEntry && (
            <div className="px-8 pb-6 flex justify-center">
              <button 
                onClick={deleteEntry}
                className="group flex items-center gap-2 text-[10px] font-black text-slate-300 hover:text-red-500 transition-all uppercase tracking-widest"
              >
                Reset entry
              </button>
            </div>
          )}
        </div>

        {/* Analytics Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
                <TrendingUp size={16} className="text-indigo-600" />
              </div>
              Pulse
            </h3>
          </div>
          
          <div className="bg-white rounded-[2rem] shadow-lg shadow-slate-200/40 p-6 border border-slate-100">
            {history.length > 0 ? (
              <HistoryChart data={history} />
            ) : (
              <div className="h-[250px] flex flex-col items-center justify-center text-slate-300 gap-4">
                <div className="bg-slate-50 p-6 rounded-full">
                  <Info size={32} className="text-slate-200" />
                </div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Recording data points...</p>
              </div>
            )}
          </div>
        </section>

        {/* History Grid */}
        {history.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
                  <BookOpen size={16} className="text-indigo-600" />
                </div>
                Journal
              </h3>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[...history].reverse().slice(0, 4).map((entry) => (
                <div 
                  key={entry.date} 
                  className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm flex gap-4 items-start group hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
                >
                  <div className={`
                    w-12 h-12 rounded-xl flex items-center justify-center shrink-0 font-black text-xl shadow-lg
                    ${entry.value > 7 ? 'bg-green-500 text-white' : entry.value > 4 ? 'bg-indigo-600 text-white' : 'bg-orange-500 text-white'}
                  `}>
                    {entry.value}
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-black text-slate-800 text-[11px] tracking-tight uppercase">
                        {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' })}
                      </h4>
                      <button 
                        onClick={() => setSelectedDate(entry.date)}
                        className="p-1 rounded text-indigo-500 opacity-0 group-hover:opacity-100 transition-all active:scale-95"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                    <p className="text-slate-500 text-[11px] line-clamp-2 leading-relaxed font-medium">
                      {entry.note ? `"${entry.note}"` : "Entry with no notes."}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="mt-12 text-center text-slate-300 text-[9px] pb-10 uppercase tracking-[0.4em] font-black opacity-40">
        <p>Private & Offline • dailyrush</p>
      </footer>
    </div>
  );
};

export default App;