import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DailySelection, Track, TrackMode } from './types';
import SelectionCard from './components/SelectionCard';
import HistoryChart from './HistoryChart';
import {
  Calendar,
  TrendingUp,
  Info,
  BookOpen,
  Clock,
  ChevronRight,
  PenLine,
  Zap,
  Download,
  FileSpreadsheet,
  Plus,
  Trash2,
  CheckCircle2,
  ListChecks,
  CircleDot,
  Pencil,
  Check,
  X,
  SlidersHorizontal
} from 'lucide-react';

const TRACKS_STORAGE_KEY = 'daily_rush_tracks_v1';
const LEGACY_STORAGE_KEY = 'daily_rush_data_v2';

type AppState = {
  tracks: Track[];
  activeTrackId: string;
};

const todayIso = () => new Date().toISOString().split('T')[0];

const createTrackId = () => `track-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createDefaultTrack = (history: DailySelection[] = []): Track => ({
  id: createTrackId(),
  name: 'Daily Rush',
  mode: 'score',
  minScore: 1,
  maxScore: 10,
  showLeastSquares: false,
  showEma: false,
  history,
  createdAt: Date.now()
});

const sortHistory = (history: DailySelection[]) => {
  return [...history].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
};

const normalizeNumber = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeHistory = (history: unknown, mode: TrackMode, minScore: number, maxScore: number) => {
  if (!Array.isArray(history)) return [];

  return sortHistory(
    history
      .filter((entry) => entry && typeof entry.date === 'string')
      .map((entry: any) => ({
        date: entry.date,
        value: mode === 'point'
          ? 1
          : Math.min(maxScore, Math.max(minScore, Math.round(normalizeNumber(entry.value, minScore)))),
        timestamp: normalizeNumber(entry.timestamp, Date.now()),
        note: typeof entry.note === 'string' ? entry.note : ''
      }))
  );
};

const normalizeTrack = (track: any): Track | null => {
  if (!track || typeof track !== 'object') return null;

  const mode: TrackMode = track.mode === 'point' ? 'point' : 'score';
  const rawMin = Math.round(normalizeNumber(track.minScore, mode === 'point' ? 0 : 1));
  const rawMax = Math.round(normalizeNumber(track.maxScore, mode === 'point' ? 1 : 10));
  const minScore = mode === 'point' ? 0 : Math.min(rawMin, rawMax);
  const maxScore = mode === 'point' ? 1 : Math.max(rawMin, rawMax, minScore + 1);

  return {
    id: typeof track.id === 'string' && track.id ? track.id : createTrackId(),
    name: typeof track.name === 'string' && track.name.trim() ? track.name.trim() : 'Untitled Track',
    mode,
    minScore,
    maxScore,
    showLeastSquares: Boolean(track.showLeastSquares),
    showEma: Boolean(track.showEma),
    history: normalizeHistory(track.history, mode, minScore, maxScore),
    createdAt: normalizeNumber(track.createdAt, Date.now())
  };
};

const loadAppState = (): AppState => {
  const fallbackTrack = createDefaultTrack();

  if (typeof localStorage === 'undefined') {
    return { tracks: [fallbackTrack], activeTrackId: fallbackTrack.id };
  }

  try {
    const savedTracks = localStorage.getItem(TRACKS_STORAGE_KEY);
    if (savedTracks) {
      const parsed = JSON.parse(savedTracks);
      const rawTracks = Array.isArray(parsed) ? parsed : parsed.tracks;
      const tracks = Array.isArray(rawTracks)
        ? rawTracks.map(normalizeTrack).filter((track): track is Track => Boolean(track))
        : [];

      if (tracks.length > 0) {
        const requestedActiveId = typeof parsed.activeTrackId === 'string' ? parsed.activeTrackId : tracks[0].id;
        const activeTrackId = tracks.some((track) => track.id === requestedActiveId) ? requestedActiveId : tracks[0].id;
        return { tracks, activeTrackId };
      }
    }
  } catch (error) {
    console.warn('Unable to load saved tracks.', error);
  }

  try {
    const legacyData = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacyData) {
      const legacyHistory = JSON.parse(legacyData);
      const migratedTrack = createDefaultTrack(normalizeHistory(legacyHistory, 'score', 1, 10));
      return { tracks: [migratedTrack], activeTrackId: migratedTrack.id };
    }
  } catch (error) {
    console.warn('Unable to migrate legacy history.', error);
  }

  return { tracks: [fallbackTrack], activeTrackId: fallbackTrack.id };
};

const escapeCsvCell = (value: string | number) => {
  const text = String(value ?? '');
  const escaped = text.replace(/"/g, '""');
  return /[",\n\r]/.test(text) ? `"${escaped}"` : escaped;
};

const escapeHtml = (value: string | number) => {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const downloadFile = (content: string, filename: string, type: string) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const slugify = (value: string) => {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'track';
};

const scoreColorClass = (value: number, minScore: number, maxScore: number) => {
  const ratio = (value - minScore) / Math.max(maxScore - minScore, 1);
  if (ratio > 0.7) return 'bg-green-500 text-white';
  if (ratio > 0.3) return 'bg-indigo-600 text-white';
  return 'bg-orange-500 text-white';
};

const getScoreBounds = (minValue: string, maxValue: string) => {
  const parsedMin = Math.round(normalizeNumber(minValue, 1));
  const parsedMax = Math.round(normalizeNumber(maxValue, 10));
  const boundedMin = Math.max(0, Math.min(100, Math.min(parsedMin, parsedMax)));
  const boundedMax = Math.max(boundedMin + 1, Math.min(100, Math.max(parsedMin, parsedMax)));

  return { minScore: boundedMin, maxScore: boundedMax };
};

const App: React.FC = () => {
  const [initialState] = useState<AppState>(loadAppState);
  const [tracks, setTracks] = useState<Track[]>(initialState.tracks);
  const [activeTrackId, setActiveTrackId] = useState<string>(initialState.activeTrackId);
  const [selectedDate, setSelectedDate] = useState<string>(todayIso());
  const [note, setNote] = useState<string>('');
  const [isCreatingTrack, setIsCreatingTrack] = useState(false);
  const [newTrackName, setNewTrackName] = useState('');
  const [newTrackMode, setNewTrackMode] = useState<TrackMode>('score');
  const [newMinScore, setNewMinScore] = useState('1');
  const [newMaxScore, setNewMaxScore] = useState('10');
  const [renamingTrackId, setRenamingTrackId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [isEditingTrack, setIsEditingTrack] = useState(false);
  const [settingsName, setSettingsName] = useState('');
  const [settingsMode, setSettingsMode] = useState<TrackMode>('score');
  const [settingsMinScore, setSettingsMinScore] = useState('1');
  const [settingsMaxScore, setSettingsMaxScore] = useState('10');

  const activeTrack = useMemo(() => {
    return tracks.find((track) => track.id === activeTrackId) || tracks[0];
  }, [tracks, activeTrackId]);

  const history = activeTrack?.history || [];

  useEffect(() => {
    if (!tracks.some((track) => track.id === activeTrackId) && tracks.length > 0) {
      setActiveTrackId(tracks[0].id);
    }
  }, [tracks, activeTrackId]);

  useEffect(() => {
    localStorage.setItem(TRACKS_STORAGE_KEY, JSON.stringify({ tracks, activeTrackId }));
  }, [tracks, activeTrackId]);

  const currentEntry = useMemo(() => {
    return history.find((item) => item.date === selectedDate) || null;
  }, [history, selectedDate]);

  useEffect(() => {
    setNote(currentEntry?.note || '');
  }, [currentEntry, selectedDate, activeTrackId]);

  useEffect(() => {
    if (!activeTrack) return;

    setIsEditingTrack(false);
    setRenamingTrackId(null);
    setRenameValue('');
    setSettingsName(activeTrack.name);
    setSettingsMode(activeTrack.mode);
    setSettingsMinScore(String(activeTrack.minScore || 1));
    setSettingsMaxScore(String(activeTrack.maxScore || 10));
  }, [activeTrackId]);

  const updateActiveTrack = useCallback((updater: (track: Track) => Track) => {
    setTracks((currentTracks) => currentTracks.map((track) => (
      track.id === activeTrackId ? updater(track) : track
    )));
  }, [activeTrackId]);

  const startRenamingTrack = (track: Track) => {
    setRenamingTrackId(track.id);
    setRenameValue(track.name);
  };

  const cancelRename = () => {
    setRenamingTrackId(null);
    setRenameValue('');
  };

  const saveRename = () => {
    if (!renamingTrackId) return;

    const nextName = renameValue.trim();
    if (!nextName) {
      cancelRename();
      return;
    }

    setTracks((currentTracks) => currentTracks.map((track) => (
      track.id === renamingTrackId ? { ...track, name: nextName } : track
    )));
    cancelRename();
  };

  const handleSelect = useCallback((value: number) => {
    if (!activeTrack) return;

    const normalizedValue = activeTrack.mode === 'point'
      ? 1
      : Math.min(activeTrack.maxScore, Math.max(activeTrack.minScore, Math.round(value)));

    const newEntry: DailySelection = {
      date: selectedDate,
      value: normalizedValue,
      timestamp: currentEntry?.timestamp || Date.now(),
      note: note.trim()
    };

    updateActiveTrack((track) => ({
      ...track,
      history: sortHistory([...track.history.filter((item) => item.date !== selectedDate), newEntry])
    }));
  }, [activeTrack, selectedDate, currentEntry, note, updateActiveTrack]);

  const handleNoteBlur = () => {
    if (currentEntry) {
      handleSelect(currentEntry.value);
    }
  };

  const deleteEntry = () => {
    if (!activeTrack) return;

    if (window.confirm('Are you sure you want to remove this entry?')) {
      updateActiveTrack((track) => ({
        ...track,
        history: track.history.filter((item) => item.date !== selectedDate)
      }));
      setNote('');
    }
  };

  const createTrack = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const id = createTrackId();
    const mode = newTrackMode;
    const { minScore, maxScore } = getScoreBounds(newMinScore, newMaxScore);
    const newTrack: Track = {
      id,
      name: newTrackName.trim() || (mode === 'point' ? 'New Habit' : 'New Score'),
      mode,
      minScore: mode === 'point' ? 0 : minScore,
      maxScore: mode === 'point' ? 1 : maxScore,
      showLeastSquares: false,
      showEma: false,
      history: [],
      createdAt: Date.now()
    };

    setTracks((currentTracks) => [...currentTracks, newTrack]);
    setActiveTrackId(id);
    setNewTrackName('');
    setNewTrackMode('score');
    setNewMinScore('1');
    setNewMaxScore('10');
    setIsCreatingTrack(false);
  };

  const openTrackSettings = () => {
    setSettingsName(activeTrack.name);
    setSettingsMode(activeTrack.mode);
    setSettingsMinScore(String(activeTrack.mode === 'point' ? 1 : activeTrack.minScore));
    setSettingsMaxScore(String(activeTrack.mode === 'point' ? 10 : activeTrack.maxScore));
    setIsEditingTrack(true);
  };

  const saveTrackSettings = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextMode = settingsMode;
    const { minScore, maxScore } = getScoreBounds(settingsMinScore, settingsMaxScore);
    const nextMinScore = nextMode === 'point' ? 0 : minScore;
    const nextMaxScore = nextMode === 'point' ? 1 : maxScore;

    updateActiveTrack((track) => ({
      ...track,
      name: settingsName.trim() || track.name,
      mode: nextMode,
      minScore: nextMinScore,
      maxScore: nextMaxScore,
      history: track.history.map((entry) => ({
        ...entry,
        value: nextMode === 'point'
          ? 1
          : Math.min(nextMaxScore, Math.max(nextMinScore, Math.round(entry.value)))
      }))
    }));
    setIsEditingTrack(false);
  };

  const deleteActiveTrack = () => {
    if (!activeTrack || tracks.length <= 1) return;

    if (window.confirm(`Delete "${activeTrack.name}" and all of its entries?`)) {
      const activeIndex = tracks.findIndex((track) => track.id === activeTrack.id);
      const remainingTracks = tracks.filter((track) => track.id !== activeTrack.id);
      setTracks(remainingTracks);
      setActiveTrackId(remainingTracks[Math.max(0, activeIndex - 1)]?.id || remainingTracks[0].id);
      setIsEditingTrack(false);
    }
  };

  const toggleLeastSquares = () => {
    updateActiveTrack((track) => ({
      ...track,
      showLeastSquares: !track.showLeastSquares
    }));
  };

  const toggleEma = () => {
    updateActiveTrack((track) => ({
      ...track,
      showEma: !track.showEma
    }));
  };

  const exportRows = useMemo(() => {
    return history.map((entry) => ({
      Track: activeTrack.name,
      Date: entry.date,
      Type: activeTrack.mode === 'point' ? 'Point' : 'Score',
      Value: activeTrack.mode === 'point' ? 'Logged' : entry.value,
      Note: entry.note || '',
      SubmittedAt: new Date(entry.timestamp).toISOString()
    }));
  }, [history, activeTrack]);

  const exportCsv = () => {
    const headers = ['Track', 'Date', 'Type', 'Value', 'Note', 'SubmittedAt'];
    const rows = exportRows.map((row) => headers.map((header) => escapeCsvCell(row[header as keyof typeof row])).join(','));
    const csv = `\uFEFF${headers.join(',')}\n${rows.join('\n')}`;
    downloadFile(csv, `dailyrush-${slugify(activeTrack.name)}-${todayIso()}.csv`, 'text/csv;charset=utf-8;');
  };

  const exportExcel = () => {
    const headers = ['Track', 'Date', 'Type', 'Value', 'Note', 'SubmittedAt'];
    const tableRows = exportRows.map((row) => (
      `<tr>${headers.map((header) => `<td>${escapeHtml(row[header as keyof typeof row])}</td>`).join('')}</tr>`
    )).join('');
    const tableHeaders = headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('');
    const sheet = `
      <html>
        <head>
          <meta charset="UTF-8" />
        </head>
        <body>
          <table>
            <thead><tr>${tableHeaders}</tr></thead>
            <tbody>${tableRows}</tbody>
          </table>
        </body>
      </html>
    `;
    downloadFile(sheet, `dailyrush-${slugify(activeTrack.name)}-${todayIso()}.xls`, 'application/vnd.ms-excel;charset=utf-8;');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 selection:bg-indigo-100">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm backdrop-blur-md bg-white/80">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
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
                onChange={(event) => setSelectedDate(event.target.value)}
                max={todayIso()}
                className="bg-transparent border-none text-[10px] font-black focus:outline-none cursor-pointer tracking-wider text-slate-700"
              />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 mt-6 space-y-6">
        <section className="space-y-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {tracks.map((track) => {
              const isActive = track.id === activeTrack.id;
              return (
                <button
                  key={track.id}
                  onClick={() => setActiveTrackId(track.id)}
                  className={`min-w-[150px] flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all ${
                    isActive
                      ? 'bg-slate-900 text-white border-slate-900 shadow-lg shadow-slate-300/60'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-200 hover:text-indigo-600'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${isActive ? 'bg-white/10' : 'bg-indigo-50 text-indigo-600'}`}>
                    {track.mode === 'point' ? <CircleDot size={17} /> : <ListChecks size={17} />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black truncate">{track.name}</p>
                    <p className={`text-[10px] font-bold uppercase tracking-widest ${isActive ? 'text-slate-300' : 'text-slate-400'}`}>
                      {track.mode === 'point' ? 'Points' : `${track.minScore}-${track.maxScore}`} - {track.history.length}
                    </p>
                  </div>
                </button>
              );
            })}
            <button
              onClick={() => setIsCreatingTrack(true)}
              className="h-[66px] w-[66px] rounded-2xl border border-dashed border-slate-300 bg-white text-slate-400 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 transition-all flex items-center justify-center shrink-0"
              title="Add track"
            >
              <Plus size={22} />
            </button>
          </div>

          {isCreatingTrack && (
            <form onSubmit={createTrack} className="bg-white rounded-[1.5rem] border border-slate-100 shadow-lg shadow-slate-200/40 p-5 grid gap-4 md:grid-cols-[1fr_auto_auto] md:items-end">
              <label className="space-y-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Track Name</span>
                <input
                  value={newTrackName}
                  onChange={(event) => setNewTrackName(event.target.value)}
                  placeholder="Sleep, Reading, Workout..."
                  className="w-full h-12 px-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white outline-none transition-all text-sm font-bold text-slate-700 placeholder:text-slate-300"
                  autoFocus
                />
              </label>

              <div className="space-y-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Mode</span>
                <div className="flex h-12 rounded-2xl bg-slate-100 border border-slate-200 p-1">
                  {(['score', 'point'] as TrackMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setNewTrackMode(mode)}
                      className={`px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        newTrackMode === mode ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {newTrackMode === 'score' && (
                <div className="grid grid-cols-2 gap-2">
                  <label className="space-y-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Min</span>
                    <input
                      type="number"
                      min="0"
                      max="99"
                      value={newMinScore}
                      onChange={(event) => setNewMinScore(event.target.value)}
                      className="w-full h-12 px-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white outline-none transition-all text-sm font-black text-slate-700"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Max</span>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={newMaxScore}
                      onChange={(event) => setNewMaxScore(event.target.value)}
                      className="w-full h-12 px-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white outline-none transition-all text-sm font-black text-slate-700"
                    />
                  </label>
                </div>
              )}

              <div className="flex items-center gap-2 md:col-start-1 md:col-end-4">
                <button
                  type="submit"
                  className="h-11 px-5 rounded-2xl bg-indigo-600 text-white hover:bg-indigo-700 transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                >
                  <Plus size={14} />
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreatingTrack(false)}
                  className="h-11 px-5 rounded-2xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all text-[10px] font-black uppercase tracking-widest"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </section>

        <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/40 overflow-hidden border border-slate-100 transition-all">
          <div className="p-8 pb-0">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex flex-col gap-1">
                {renamingTrackId === activeTrack.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      value={renameValue}
                      onChange={(event) => setRenameValue(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') saveRename();
                        if (event.key === 'Escape') cancelRename();
                      }}
                      onBlur={saveRename}
                      className="h-11 w-full max-w-sm rounded-2xl border border-indigo-200 bg-indigo-50/50 px-4 text-xl font-black tracking-tight text-slate-800 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
                      autoFocus
                    />
                    <button
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={saveRename}
                      title="Save name"
                      className="w-10 h-10 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-all flex items-center justify-center"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={cancelRename}
                      title="Cancel rename"
                      className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-all flex items-center justify-center"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight">
                      {activeTrack.name}
                    </h3>
                    <button
                      onClick={() => startRenamingTrack(activeTrack)}
                      title="Rename track"
                      className="w-9 h-9 rounded-xl text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all flex items-center justify-center"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={openTrackSettings}
                      title="Edit track options"
                      className={`w-9 h-9 rounded-xl transition-all flex items-center justify-center ${
                        isEditingTrack
                          ? 'bg-indigo-50 text-indigo-600'
                          : 'text-slate-300 hover:text-indigo-600 hover:bg-indigo-50'
                      }`}
                    >
                      <SlidersHorizontal size={16} />
                    </button>
                  </div>
                )}
                <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest">
                  {activeTrack.mode === 'point' ? 'Habit points' : `Score ${activeTrack.minScore}-${activeTrack.maxScore}`}
                </p>
              </div>
              <button
                onClick={deleteActiveTrack}
                disabled={tracks.length <= 1}
                title="Delete track"
                className="w-10 h-10 rounded-xl border border-slate-200 text-slate-300 hover:text-red-500 hover:border-red-200 hover:bg-red-50 disabled:opacity-30 disabled:hover:text-slate-300 disabled:hover:border-slate-200 disabled:hover:bg-white transition-all flex items-center justify-center"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          {isEditingTrack && (
            <form onSubmit={saveTrackSettings} className="mx-8 mt-6 rounded-[1.5rem] border border-slate-100 bg-slate-50 p-5 grid gap-4 md:grid-cols-[1fr_auto_auto] md:items-end">
              <label className="space-y-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Track Name</span>
                <input
                  value={settingsName}
                  onChange={(event) => setSettingsName(event.target.value)}
                  className="w-full h-12 px-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-bold text-slate-700"
                />
              </label>

              <div className="space-y-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Mode</span>
                <div className="flex h-12 rounded-2xl bg-white border border-slate-200 p-1">
                  {(['score', 'point'] as TrackMode[]).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setSettingsMode(mode)}
                      className={`px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                        settingsMode === mode ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {settingsMode === 'score' && (
                <div className="grid grid-cols-2 gap-2">
                  <label className="space-y-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Min</span>
                    <input
                      type="number"
                      min="0"
                      max="99"
                      value={settingsMinScore}
                      onChange={(event) => setSettingsMinScore(event.target.value)}
                      className="w-full h-12 px-3 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-black text-slate-700"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Max</span>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={settingsMaxScore}
                      onChange={(event) => setSettingsMaxScore(event.target.value)}
                      className="w-full h-12 px-3 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all text-sm font-black text-slate-700"
                    />
                  </label>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 md:col-start-1 md:col-end-4">
                <button
                  type="submit"
                  className="h-11 px-5 rounded-2xl bg-indigo-600 text-white hover:bg-indigo-700 transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                >
                  <Check size={14} />
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingTrack(false)}
                  className="h-11 px-5 rounded-2xl bg-white text-slate-500 hover:bg-slate-100 transition-all text-[10px] font-black uppercase tracking-widest"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={deleteActiveTrack}
                  disabled={tracks.length <= 1}
                  className="h-11 px-5 rounded-2xl bg-white border border-red-100 text-red-500 hover:bg-red-50 disabled:opacity-30 disabled:hover:bg-white transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                >
                  <Trash2 size={14} />
                  Delete Track
                </button>
              </div>
            </form>
          )}

          <div className="p-8 pt-4">
            {activeTrack.mode === 'score' ? (
              <SelectionCard
                onSelect={handleSelect}
                currentSelection={currentEntry?.value}
                minValue={activeTrack.minScore}
                maxValue={activeTrack.maxScore}
              />
            ) : (
              <div className="py-8 flex flex-col items-center">
                <button
                  onClick={() => handleSelect(1)}
                  className={`w-36 h-36 rounded-[2rem] flex flex-col items-center justify-center gap-3 shadow-2xl transition-all active:scale-95 ${
                    currentEntry
                      ? 'bg-emerald-500 text-white shadow-emerald-200'
                      : 'bg-slate-100 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 shadow-slate-200/60'
                  }`}
                >
                  <CheckCircle2 size={42} />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]">
                    {currentEntry ? 'Logged' : 'Log Point'}
                  </span>
                </button>
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <PenLine size={14} className="text-indigo-400" />
                  Quick Notes
                </label>
                {note.length > 0 && currentEntry && (
                  <span className="text-[10px] font-bold text-slate-300 italic">Saved</span>
                )}
              </div>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
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

        <section className="space-y-4">
          <div className="flex flex-col gap-3 px-2 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
                <TrendingUp size={16} className="text-indigo-600" />
              </div>
              Pulse
            </h3>
            {history.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={toggleLeastSquares}
                  disabled={history.length < 2}
                  title={history.length < 2 ? 'Add at least two entries to show least squares' : 'Toggle least squares trend'}
                  className={`h-9 px-3 rounded-xl border transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${
                    activeTrack.showLeastSquares
                      ? 'bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50'
                  } disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-600 disabled:hover:border-slate-200`}
                >
                  <TrendingUp size={14} />
                  Least Squares
                </button>
                <button
                  onClick={toggleEma}
                  disabled={history.length < 2}
                  title={history.length < 2 ? 'Add at least two entries to show EMA' : 'Toggle EMA trend'}
                  className={`h-9 px-3 rounded-xl border transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${
                    activeTrack.showEma
                      ? 'bg-teal-600 border-teal-600 text-white hover:bg-teal-700'
                      : 'bg-white border-slate-200 text-slate-600 hover:text-teal-600 hover:border-teal-200 hover:bg-teal-50'
                  } disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-600 disabled:hover:border-slate-200`}
                >
                  <TrendingUp size={14} />
                  EMA
                </button>
                <button
                  onClick={exportCsv}
                  title="Download CSV"
                  className="h-9 px-3 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                >
                  <Download size={14} />
                  CSV
                </button>
                <button
                  onClick={exportExcel}
                  title="Download Excel sheet"
                  className="h-9 px-3 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-green-600 hover:border-green-200 hover:bg-green-50 transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                >
                  <FileSpreadsheet size={14} />
                  Excel
                </button>
              </div>
            )}
          </div>

          <div className="bg-white rounded-[2rem] shadow-lg shadow-slate-200/40 p-6 border border-slate-100">
            {history.length > 0 ? (
              <HistoryChart
                data={history}
                mode={activeTrack.mode}
                minValue={activeTrack.minScore}
                maxValue={activeTrack.maxScore}
                trackName={activeTrack.name}
                showLeastSquares={activeTrack.showLeastSquares}
                showEma={activeTrack.showEma}
              />
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
                    ${activeTrack.mode === 'point' ? 'bg-emerald-500 text-white' : scoreColorClass(entry.value, activeTrack.minScore, activeTrack.maxScore)}
                  `}>
                    {activeTrack.mode === 'point' ? <CheckCircle2 size={24} /> : entry.value}
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
        <p>Private & Offline - dailyrush</p>
      </footer>
    </div>
  );
};

export default App;
