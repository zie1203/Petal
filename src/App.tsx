import { useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { useAppStore } from './store';
import Dashboard from './components/Dashboard';
import StickyNote from './components/StickyNote';

const appWindow = getCurrentWindow();

export default function App() {
  const isMain = appWindow.label === 'main';

  useEffect(() => {
    let timeoutId: number;
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'petal-global-database') {
        window.clearTimeout(timeoutId);
        // Changed to 25ms! Feels instantaneous but protects the CPU.
        timeoutId = window.setTimeout(() => {
          useAppStore.persist.rehydrate();
        }, 25);
      }
    };
    
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.clearTimeout(timeoutId);
    };
  }, []);

  return (
    <div className="h-screen w-screen flex flex-col bg-transparent">
      {isMain ? <Dashboard /> : <StickyNote noteId={appWindow.label} />}
    </div>
  );
}