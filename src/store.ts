import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type CardType = 'note' | 'checklist' | 'cheatsheet' | 'countdown';
export type ThemeColor = 'default' | 'yellow' | 'purple' | 'blue' | 'rose';

export const themeClasses: Record<ThemeColor, { bg: string, border: string }> = {
  default: { bg: 'bg-petal-bg', border: 'border-petal-border' },
  yellow: { bg: 'bg-amber-50', border: 'border-amber-100' },
  blue: { bg: 'bg-blue-50', border: 'border-blue-100' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-100' },
  rose: { bg: 'bg-rose-50', border: 'border-rose-100' },
};

export interface Task {
  id: string;
  text: string;
  done: boolean;
}

export interface NoteData {
  id: string;
  category: string;
  createdAt: number;
  cardType: CardType;
  color: ThemeColor;
  text: string;
  tasks: Task[];
  cheatsheetText: string;
  countdownTitle: string;
  countdownDate: string;
  isCollapsed: boolean;
  alwaysOnTop: boolean; // <--- NEW PROPERTY
  x?: number;
  y?: number;
  tags: string[]; 
}

interface AppState {
  notes: Record<string, NoteData>;
  categories: string[];
  activeCategory: string;
  noteOpacity: number;
  searchQuery: string;
  
  setSearchQuery: (query: string) => void;
  setNoteOpacity: (opacity: number) => void;
  setActiveCategory: (category: string) => void;
  createNote: (id: string, category: string, initialText: string, x?: number, y?: number) => void;
  updateNote: (id: string, updates: Partial<NoteData>) => void;
  deleteNote: (id: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      notes: {},
      categories: ['☁️ General', '💻 Work', '🎀 Personal', '✨ Ideas'],
      activeCategory: '☁️ General',
      noteOpacity: 0.95, 
      searchQuery: '',
      
      setSearchQuery: (query) => set({ searchQuery: query }),
      setNoteOpacity: (opacity) => set({ noteOpacity: opacity }),
      setActiveCategory: (category) => set({ activeCategory: category }),
      
      createNote: (id, category, initialText, x, y) => set((state) => ({
        notes: {
          ...state.notes,
          [id]: {
            id, category, createdAt: Date.now(), cardType: 'note', color: 'default',
            text: initialText, tasks: [], cheatsheetText: '# Cheatsheet\n',
            countdownTitle: '', countdownDate: '', isCollapsed: false, 
            alwaysOnTop: true, // <--- NOTES ARE PINNED BY DEFAULT
            x, y, tags: [] 
          }
        }
      })),

      updateNote: (id, updates) => set((state) => ({
        notes: {
          ...state.notes,
          [id]: { ...state.notes[id], ...updates }
        }
      })),

      deleteNote: (id) => set((state) => {
        const newNotes = { ...state.notes };
        delete newNotes[id];
        return { notes: newNotes };
      })
    }),
    { name: 'petal-global-database' }
  )
);