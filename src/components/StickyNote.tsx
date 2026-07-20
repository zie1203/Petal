import { useState, useEffect, lazy, Suspense } from 'react';
import { GripHorizontal, X, Plus, Check, Loader2, FileText, ListTodo, Code2, Timer, Eye, Edit3, Palette, Tag, Pin, PinOff, ChevronDown } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { LogicalSize, PhysicalPosition } from '@tauri-apps/api/dpi';
import { useAppStore, Task, ThemeColor, NoteData, themeClasses } from '../store';
import { motion, AnimatePresence } from 'framer-motion';

const ReactMarkdown = lazy(() => import('react-markdown'));
const appWindow = getCurrentWindow();

export default function StickyNote({ noteId }: { noteId: string }) {
  const note = useAppStore(state => state.notes[noteId]);
  const noteOpacity = useAppStore(state => state.noteOpacity);
  const globalUpdateNote = useAppStore(state => state.updateNote);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isPreview, setIsPreview] = useState(true);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, mins: 0 });
  const [showTagInput, setShowTagInput] = useState(false);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => { if (!note) appWindow.close(); }, [note]);

  useEffect(() => {
    setIsSaving(true);
    const timeout = window.setTimeout(() => setIsSaving(false), 500);
    return () => window.clearTimeout(timeout);
  }, [note]);

  useEffect(() => {
    if (!note) return;
    appWindow.setAlwaysOnTop(note.alwaysOnTop !== false);
  }, [note?.alwaysOnTop]);

  useEffect(() => {
    let timeoutId: number;
    const unlistenPromise = appWindow.onMoved(async ({ payload }) => {
      window.clearTimeout(timeoutId);
      const scaleFactor = await appWindow.scaleFactor();
      const logicalPos = new PhysicalPosition(payload.x, payload.y).toLogical(scaleFactor);
      timeoutId = window.setTimeout(() => globalUpdateNote(noteId, { x: logicalPos.x, y: logicalPos.y }), 500); 
    });
    return () => { unlistenPromise.then(f => f()); window.clearTimeout(timeoutId); };
  }, [noteId, globalUpdateNote]);

  useEffect(() => {
    if (note?.cardType !== 'countdown' || !note?.countdownDate) return;
    const calculateTime = () => {
      const diff = new Date(note.countdownDate).getTime() - new Date().getTime();
      if (diff > 0) setTimeLeft({ days: Math.floor(diff / (1000 * 60 * 60 * 24)), hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)), mins: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)) });
      else setTimeLeft({ days: 0, hours: 0, mins: 0 });
    };
    calculateTime();
    const interval = window.setInterval(calculateTime, 60000);
    return () => window.clearInterval(interval);
  }, [note?.countdownDate, note?.cardType]);

  if (!note) return null;

  const currentTheme = themeClasses[note.color];
  const updateNote = (updates: Partial<NoteData>) => globalUpdateNote(noteId, updates);
  
  const cycleColor = () => { const colors: ThemeColor[] = ['default', 'yellow', 'purple', 'blue', 'rose']; updateNote({ color: colors[(colors.indexOf(note.color) + 1) % colors.length] }); };
  const updateTask = (taskId: string, updates: Partial<Task>) => updateNote({ tasks: note.tasks.map(t => t.id === taskId ? { ...t, ...updates } : t) });

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      const safeTags = note.tags || [];
      if (!safeTags.includes(tagInput.trim())) updateNote({ tags: [...safeTags, tagInput.trim()] });
      setTagInput(''); setShowTagInput(false);
    }
  };

  const removeTag = (tagToRemove: string) => updateNote({ tags: (note.tags || []).filter(t => t !== tagToRemove) });

  const toggleCollapse = async () => {
    const newCollapsed = !note.isCollapsed;
    updateNote({ isCollapsed: newCollapsed });
    await appWindow.setSize(new LogicalSize(320, newCollapsed ? 42 : 400));
  };

  const isPinned = note.alwaysOnTop !== false;

  const getSnippet = () => {
    if (note.cardType === 'note') return note.text || 'Empty...';
    if (note.cardType === 'checklist') return note.tasks[0]?.text ? `[] ${note.tasks[0].text}` : `${note.tasks.length} tasks`;
    if (note.cardType === 'cheatsheet') return 'Cheatsheet';
    if (note.cardType === 'countdown') return note.countdownTitle || 'Countdown';
    return '';
  };

  return (
    <div style={{ opacity: noteOpacity }} className={`flex-1 flex flex-col ${currentTheme.bg} rounded-2xl shadow-xl border ${currentTheme.border} overflow-hidden transition-all duration-300`}>
      <div onDoubleClick={toggleCollapse} onPointerDown={() => appWindow.startDragging()} className={`group h-10 border-b ${currentTheme.border} flex items-center justify-between px-3 cursor-grab active:cursor-grabbing`}>
        
        <div className="flex items-center gap-1 overflow-hidden pointer-events-auto">
          <div className="pointer-events-none text-petal-text/40 mr-1"><GripHorizontal size={16} strokeWidth={2.5} /></div>
          
          {note.isCollapsed ? (
            <div onPointerDown={(e) => { e.stopPropagation(); toggleCollapse(); }} className="flex items-center gap-2 overflow-hidden px-2 py-1 rounded-md hover:bg-black/10 cursor-pointer transition-colors group/preview" title="Click to expand">
              {(note.tags && note.tags.length > 0) && <span className="text-[10px] font-bold bg-white/50 px-1.5 py-0.5 rounded-md text-petal-text/80 whitespace-nowrap shadow-sm border border-black/5">#{note.tags[0]}</span>}
              <span className="text-xs font-medium text-petal-text/60 truncate max-w-[100px]">{getSnippet()}</span>
              <ChevronDown size={12} className="text-petal-text/40 group-hover/preview:text-petal-text/80 transition-colors" />
            </div>
          ) : (
            [ { id: 'note', icon: FileText }, { id: 'checklist', icon: ListTodo }, { id: 'cheatsheet', icon: Code2 }, { id: 'countdown', icon: Timer } ].map((btn) => (
              <button key={btn.id} onPointerDown={(e) => e.stopPropagation()} onClick={() => updateNote({ cardType: btn.id as any })} className={`p-1.5 rounded-md transition-colors cursor-pointer ${note.cardType === btn.id ? 'bg-black/10 text-petal-text' : 'text-petal-text/40 hover:bg-black/5'}`}>
                <btn.icon size={14} />
              </button>
            ))
          )}
        </div>
        
        <div className="flex items-center gap-1 flex-shrink-0" onPointerDown={(e) => e.stopPropagation()}>
          <button onClick={() => updateNote({ alwaysOnTop: !isPinned })} className={`p-1 rounded-md transition-all duration-300 ${isPinned ? 'text-petal-text hover:bg-black/10 opacity-100' : 'text-petal-text/40 hover:bg-black/5 opacity-0 group-hover:opacity-100'}`} title={isPinned ? "Unpin" : "Pin to Top"}>
            {isPinned ? <Pin size={14} className="fill-current text-petal-text/70" /> : <PinOff size={14} />}
          </button>
          <button onClick={() => setShowTagInput(!showTagInput)} className={`opacity-0 group-hover:opacity-100 p-1 rounded-md transition-all duration-300 ${showTagInput ? 'bg-black/10 text-petal-text' : 'hover:bg-black/5 text-petal-text/60'}`}><Tag size={14} /></button>
          <button onClick={cycleColor} className="opacity-0 group-hover:opacity-100 p-1 hover:bg-black/5 rounded-md text-petal-text/60 transition-all duration-300"><Palette size={16} /></button>
          
          <div className="text-xs text-petal-text/40 ml-1 mr-0.5 w-3 flex justify-center pointer-events-none">
            {isSaving ? <Loader2 size={12} className="animate-spin text-petal-text/60" /> : <Check size={12} className="text-petal-text/60" />}
          </div>
          <button onClick={() => appWindow.close()} className="p-1 hover:bg-red-500/10 hover:text-red-500 rounded-md text-petal-text/60 transition-all"><X size={16} /></button>
        </div>
      </div>

      {!note.isCollapsed && (
        <div className="p-4 flex-1 flex flex-col overflow-y-auto bg-dot-grid">
          {(showTagInput || (note.tags && note.tags.length > 0)) && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="flex flex-wrap gap-2 mb-3 pb-3 border-b border-black/5">
              {(note.tags || []).map(t => (
                <span key={t} className="bg-white/60 shadow-sm border border-black/5 text-petal-text px-2 py-0.5 rounded-md text-xs font-medium flex items-center gap-1 group/tag">
                  #{t} <button onClick={() => removeTag(t)} className="opacity-0 group-hover/tag:opacity-100 text-red-400 hover:text-red-600 transition-opacity"><X size={10}/></button>
                </span>
              ))}
              {showTagInput && (
                <input type="text" autoFocus value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={handleAddTag} onBlur={() => setShowTagInput(false)} placeholder="Type tag + Enter" className="bg-black/5 rounded-md px-2 py-0.5 text-xs text-petal-text outline-none w-24 placeholder:text-petal-text/40" />
              )}
            </motion.div>
          )}

          {note.cardType === 'note' && ( <textarea className="w-full h-full bg-transparent resize-none outline-none text-petal-text placeholder:text-petal-text/40 text-[15px] leading-relaxed" placeholder="Jot something down..." autoFocus value={note.text} onChange={(e) => updateNote({ text: e.target.value })} /> )}
          
          {note.cardType === 'checklist' && (
            <div className="flex flex-col gap-2">
              <AnimatePresence>
                {note.tasks.map(task => (
                  <motion.div layout initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} key={task.id} className="flex items-start gap-3 group/task">
                    <input type="checkbox" checked={task.done} onChange={(e) => updateTask(task.id, { done: e.target.checked })} />
                    <input type="text" value={task.text} onChange={(e) => updateTask(task.id, { text: e.target.value })} className={`flex-1 bg-transparent outline-none transition-all duration-300 mt-0.5 ${task.done ? 'line-through text-petal-text/30' : 'text-petal-text'}`} placeholder="Empty task..." />
                    <button onClick={() => updateNote({ tasks: note.tasks.filter(t => t.id !== task.id) })} className="opacity-0 mt-0.5 group-hover/task:opacity-100 p-1 text-red-400 hover:bg-red-50 rounded-md transition-all"><X size={14} /></button>
                  </motion.div>
                ))}
              </AnimatePresence>
              <button onClick={() => updateNote({ tasks: [...note.tasks, { id: Date.now().toString(), text: '', done: false }] })} className="flex items-center gap-2 text-[14px] font-medium text-petal-text/40 hover:text-petal-text mt-2 p-1 transition-colors"><Plus size={16} /> Add item</button>
            </div>
          )}

          {note.cardType === 'cheatsheet' && (
            <div className="flex flex-col h-full">
              <div className="flex justify-end mb-2"><button onClick={() => setIsPreview(!isPreview)} className="flex items-center gap-1 text-xs text-petal-text/60 hover:text-petal-text bg-black/5 px-2 py-1 rounded-md cursor-pointer">{isPreview ? <><Edit3 size={12}/> Edit</> : <><Eye size={12}/> View</>}</button></div>
              {isPreview ? (
                <div className="flex-1 overflow-y-auto text-[15px] text-petal-text leading-relaxed [&>h1]:text-xl [&>h1]:font-bold [&>h1]:mb-2 [&>h1]:text-petal-text/80 [&>h2]:text-lg [&>h2]:font-bold [&>h2]:mb-2 [&>h2]:mt-4 [&>p]:mb-3 [&>ul]:list-disc [&>ul]:ml-4 [&>ul]:mb-3 [&>pre]:bg-black/5 [&>pre]:p-3 [&>pre]:rounded-xl [&>pre]:shadow-inner [&>pre]:text-sm [&>pre]:overflow-x-auto [&>code]:bg-black/5 [&>code]:px-1.5 [&>code]:py-0.5 [&>code]:rounded-md text-sm"><Suspense fallback={<div className="text-center text-petal-text/40 mt-4"><Loader2 className="animate-spin inline mr-2" size={14} />Loading renderer...</div>}><ReactMarkdown>{note.cheatsheetText}</ReactMarkdown></Suspense></div>
              ) : (
                <textarea className="w-full h-full bg-transparent resize-none outline-none text-petal-text font-mono text-sm placeholder:text-petal-text/30" placeholder="# Enter Markdown..." value={note.cheatsheetText} onChange={(e) => updateNote({cheatsheetText: e.target.value})} autoFocus />
              )}
            </div>
          )}

          {note.cardType === 'countdown' && (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <input type="text" value={note.countdownTitle} onChange={(e) => updateNote({countdownTitle: e.target.value})} placeholder="Event name..." className="bg-transparent outline-none text-center text-xl font-bold text-petal-text placeholder:text-petal-text/40 w-full" />
              {note.countdownDate ? (
                <div className="flex gap-3 text-center">
                  <div className="bg-white/60 shadow-sm border border-black/5 px-3 py-2 rounded-2xl min-w-[70px]"><div className="text-2xl font-bold text-petal-text/80">{timeLeft.days}</div><div className="text-[10px] text-petal-text/60 uppercase tracking-widest font-bold mt-1">Days</div></div>
                  <div className="bg-white/60 shadow-sm border border-black/5 px-3 py-2 rounded-2xl min-w-[70px]"><div className="text-2xl font-bold text-petal-text/80">{timeLeft.hours}</div><div className="text-[10px] text-petal-text/60 uppercase tracking-widest font-bold mt-1">Hrs</div></div>
                  <div className="bg-white/60 shadow-sm border border-black/5 px-3 py-2 rounded-2xl min-w-[70px]"><div className="text-2xl font-bold text-petal-text/80">{timeLeft.mins}</div><div className="text-[10px] text-petal-text/60 uppercase tracking-widest font-bold mt-1">Min</div></div>
                </div>
              ) : ( <div className="text-sm font-medium text-petal-text/50">Pick a date below</div> )}
              <input type="date" value={note.countdownDate} onChange={(e) => updateNote({countdownDate: e.target.value})} className="mt-4 bg-white/60 border border-black/5 shadow-sm px-3 py-2 rounded-xl text-sm font-medium text-petal-text outline-none cursor-pointer" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}