import { useState, useMemo } from 'react';
import { X, Plus, Trash2, Calendar, Folder, Minus, Search } from 'lucide-react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { WebviewWindow } from '@tauri-apps/api/webviewWindow';
import { useAppStore } from '../store';
import { motion, AnimatePresence } from 'framer-motion';

const appWindow = getCurrentWindow();

export default function Dashboard() {
  const notes = useAppStore(state => state.notes);
  const rawCategories = useAppStore(state => state.categories);
  const categories = rawCategories.includes('General') ? ['☁️ General', '💻 Work', '🎀 Personal', '✨ Ideas'] : rawCategories;
  
  const rawActive = useAppStore(state => state.activeCategory);
  const activeCategory = rawActive === 'General' ? '☁️ General' : rawActive;

  const searchQuery = useAppStore(state => state.searchQuery);
  const noteOpacity = useAppStore(state => state.noteOpacity);
  
  const setActiveCategory = useAppStore(state => state.setActiveCategory);
  const setSearchQuery = useAppStore(state => state.setSearchQuery);
  const setNoteOpacity = useAppStore(state => state.setNoteOpacity);
  const createNote = useAppStore(state => state.createNote);
  const deleteNote = useAppStore(state => state.deleteNote);

  const [inputValue, setInputValue] = useState('');
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);

  const allNotes = useMemo(() => Object.values(notes), [notes]);
  
  const displayedNotes = useMemo(() => {
    return allNotes
      .filter(n => {
        if (searchQuery) {
          const q = searchQuery.toLowerCase().trim();
          if (q.startsWith('#')) {
            const tagQuery = q.slice(1);
            if (tagQuery === '') return (n.tags || []).length > 0; 
            return (n.tags || []).some(t => t.toLowerCase().includes(tagQuery));
          }
          const textMatch = n.text?.toLowerCase().includes(q);
          const taskMatch = n.tasks.some(t => t.text.toLowerCase().includes(q));
          const cheatMatch = n.cheatsheetText?.toLowerCase().includes(q);
          const countMatch = n.countdownTitle?.toLowerCase().includes(q);
          const tagMatch = (n.tags || []).some(t => t.toLowerCase().includes(q));
          return textMatch || taskMatch || cheatMatch || countMatch || tagMatch;
        }
        const nCat = n.category === 'General' ? '☁️ General' : n.category === 'Work' ? '💻 Work' : n.category === 'Personal' ? '🎀 Personal' : n.category === 'Ideas' ? '✨ Ideas' : n.category;
        if (nCat !== activeCategory) return false;
        if (activeTagFilter && !(n.tags || []).includes(activeTagFilter)) return false;
        return true;
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [allNotes, searchQuery, activeCategory, activeTagFilter]);

  const currentCategoryTags = useMemo(() => {
    return Array.from(new Set(allNotes.filter(n => {
      const nCat = n.category === 'General' ? '☁️ General' : n.category === 'Work' ? '💻 Work' : n.category === 'Personal' ? '🎀 Personal' : n.category === 'Ideas' ? '✨ Ideas' : n.category;
      return nCat === activeCategory;
    }).flatMap(n => n.tags || [])));
  }, [allNotes, activeCategory]);

  const handleQuickAdd = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim() !== '') {
      const newId = `note-${Date.now()}`;
      const scaleFactor = await appWindow.scaleFactor();
      const pos = (await appWindow.outerPosition()).toLogical(scaleFactor);
      const spawnX = pos.x + 350;
      const spawnY = pos.y;
      
      createNote(newId, activeCategory, inputValue, spawnX, spawnY);
      setInputValue('');
      
      if (activeTagFilter) {
        useAppStore.getState().updateNote(newId, { tags: [activeTagFilter] });
      }
      
      new WebviewWindow(newId, { url: '/', decorations: false, transparent: true, alwaysOnTop: true, width: 320, height: 400, x: spawnX, y: spawnY });
    }
  };

  const openNote = (id: string) => {
    const n = notes[id];
    new WebviewWindow(id, { url: '/', decorations: false, transparent: true, alwaysOnTop: n.alwaysOnTop !== false, width: 320, height: n.isCollapsed ? 42 : 400, x: n.x, y: n.y });
  };

  return (
    <div className="flex-1 flex flex-col bg-petal-bg rounded-3xl shadow-2xl border border-petal-border overflow-hidden">
      <div onPointerDown={() => appWindow.startDragging()} className="h-14 border-b border-petal-border flex items-center justify-between px-4 cursor-grab active:cursor-grabbing bg-white/40">
        <div className="flex-1 flex items-center mr-4">
          <div onPointerDown={(e) => e.stopPropagation()} className="flex items-center gap-2 bg-white/80 border border-petal-border rounded-xl px-3 py-1.5 w-full max-w-[250px] focus-within:bg-white focus-within:shadow-sm transition-all shadow-sm">
            <Search size={14} className="text-petal-text/40" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search or #tag..." className="bg-transparent outline-none text-sm font-medium text-petal-text w-full placeholder:text-petal-text/40" />
            {searchQuery && <button onClick={() => setSearchQuery('')} className="text-petal-text/40 hover:text-petal-text transition-colors"><X size={12}/></button>}
          </div>
        </div>

        <div className="flex items-center gap-1" onPointerDown={(e) => e.stopPropagation()}>
          <button onClick={() => appWindow.minimize()} className="p-1.5 hover:bg-black/5 rounded-xl text-petal-text/60 transition-colors pointer-events-auto cursor-pointer"><Minus size={18} /></button>
          <button onClick={() => appWindow.close()} className="p-1.5 hover:bg-red-500/10 hover:text-red-400 rounded-xl text-petal-text/60 transition-colors pointer-events-auto cursor-pointer"><X size={18} /></button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden pointer-events-auto">
        <div className="w-1/3 bg-white/40 border-r border-petal-border flex flex-col">
          <div className="p-3 flex flex-col gap-1.5 overflow-y-auto flex-1">
            {categories.map(cat => (
              <button key={cat} onClick={() => { setActiveCategory(cat); setActiveTagFilter(null); setSearchQuery(''); }} 
                className={`text-left px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 cursor-pointer ${activeCategory === cat && !searchQuery ? 'bg-white text-petal-text shadow-sm border border-black/5 scale-[1.02]' : 'text-petal-text/60 hover:bg-black/5'}`}>
                {cat}
              </button>
            ))}
          </div>
          <div className="p-4 border-t border-petal-border bg-white/30">
            <div className="flex justify-between text-[11px] uppercase tracking-widest font-bold text-petal-text/50 mb-3"><span>Opacity</span><span>{Math.round(noteOpacity * 100)}%</span></div>
            <input type="range" min="0.2" max="1" step="0.05" value={noteOpacity} onChange={(e) => setNoteOpacity(parseFloat(e.target.value))} className="w-full accent-stone-400 cursor-pointer" />
          </div>
        </div>

        <div className="w-2/3 flex flex-col bg-petal-bg bg-dot-grid">
          {!searchQuery && (
            <div className="border-b border-l border-petal-border bg-white/80 backdrop-blur-md flex flex-col rounded-tl-2xl -ml-[1px] shadow-sm z-10 overflow-hidden">
              <div className="p-3">
                <div className="flex items-center gap-2 bg-black/5 rounded-xl px-3 py-2.5 border border-transparent focus-within:border-petal-border focus-within:bg-white transition-all shadow-inner">
                  <Plus size={16} className="text-petal-text/50" />
                  <input type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={handleQuickAdd} placeholder={`New in ${activeTagFilter ? activeTagFilter : activeCategory}...`} className="bg-transparent flex-1 outline-none text-sm font-medium text-petal-text placeholder:text-petal-text/40" />
                </div>
              </div>
              {currentCategoryTags.length > 0 && (
                <div className="px-3 pb-3 flex gap-2 overflow-x-auto hide-scrollbar">
                  <button onClick={() => setActiveTagFilter(null)} className={`text-[11px] px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition-colors ${!activeTagFilter ? 'bg-petal-text text-white shadow-md' : 'bg-white border border-petal-border text-petal-text/60 hover:bg-black/5'}`}>All Notes</button>
                  {currentCategoryTags.map(tag => (
                    <button key={tag} onClick={() => setActiveTagFilter(tag)} className={`text-[11px] px-3 py-1.5 rounded-full font-bold flex items-center gap-1 whitespace-nowrap transition-colors ${activeTagFilter === tag ? 'bg-petal-text text-white shadow-md' : 'bg-white border border-petal-border text-petal-text/60 hover:bg-black/5'}`}>#{tag}</button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
            {searchQuery && <div className="text-[10px] font-bold text-petal-text/40 mb-1 px-2 uppercase tracking-widest mt-1">Search Results ✨</div>}
            
            {displayedNotes.length === 0 ? (
              <div className="flex flex-col items-center justify-center mt-12 text-center opacity-50">
                <Folder size={32} className="mb-3 text-petal-text/40" />
                <div className="text-sm font-semibold text-petal-text/60">{searchQuery ? 'Nothing found...' : 'It\'s quiet in here...'}</div>
                <div className="text-xs text-petal-text/40 mt-1">{searchQuery ? 'Try a different tag?' : 'Type above to add a note!'}</div>
              </div>
            ) : (
              <AnimatePresence>
                {displayedNotes.map(n => (
                  <motion.div layout initial={{ opacity: 0, scale: 0.9, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }} transition={{ type: "spring", stiffness: 400, damping: 25 }} key={n.id} className="group flex flex-col bg-white/80 hover:bg-white rounded-2xl p-3.5 cursor-pointer shadow-sm hover:shadow-md border border-petal-border/50 transition-all duration-300" onClick={() => openNote(n.id)}>
                    <div className="flex justify-between items-start mb-1.5">
                      <span className="text-[10px] font-bold tracking-wider uppercase text-petal-text/40 flex items-center gap-1"><Calendar size={10}/> {new Date(n.createdAt).toLocaleDateString()}</span>
                      <button onClick={(e) => { e.stopPropagation(); deleteNote(n.id); }} className="opacity-0 group-hover:opacity-100 p-1 bg-red-50 hover:bg-red-100 text-red-400 rounded-lg transition-all"><Trash2 size={12}/></button>
                    </div>
                    <div className="text-[14px] font-medium text-petal-text truncate mb-1">
                      {n.cardType === 'checklist' ? `${n.tasks.length} tasks` : n.cardType === 'cheatsheet' ? 'Cheatsheet' : n.cardType === 'countdown' ? (n.countdownTitle || 'Countdown') : (n.text || 'Empty note...')}
                    </div>
                    {(n.tags && n.tags.length > 0) && (
                      <div className="flex gap-1 overflow-hidden mt-1.5">
                        {n.tags.map(t => <span key={t} className="text-[10px] font-bold bg-black/5 border border-black/5 px-1.5 py-0.5 rounded-md text-petal-text/60">#{t}</span>)}
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}