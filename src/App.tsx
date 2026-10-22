import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { WalletCards, Sun, Moon, Monitor } from 'lucide-react';
import { useStore } from './store';

import Dashboard from './pages/Dashboard';
import CreateGroup from './pages/CreateGroup';
import GroupMonitor from './pages/GroupMonitor';
import AddExpense from './pages/AddExpense';
import ImportGroup from './pages/ImportGroup';
import GroupSettings from './pages/GroupSettings';
import Guide from './pages/Guide';

function ThemeManager() {
  const theme = useStore(state => state.theme);

  useEffect(() => {
    const root = window.document.documentElement;
    const applyTheme = () => {
      root.classList.remove('light', 'dark');
      if (theme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        root.classList.add(systemTheme);
      } else {
        root.classList.add(theme);
      }
    };

    applyTheme();

    // Listen for OS theme changes if set to system
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => applyTheme();
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [theme]);

  return null;
}

export default function App() {
  const theme = useStore(state => state.theme);
  const setTheme = useStore(state => state.setTheme);

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  return (
    <Router>
      <ThemeManager />
      {/* App wrapper updated with dark mode backgrounds */}
      <div className="min-h-screen bg-slate-200 dark:bg-black flex justify-center font-sans transition-colors duration-300">
        <div className="w-full max-w-md bg-slate-50 dark:bg-slate-950 min-h-screen shadow-2xl relative overflow-x-hidden flex flex-col transition-colors duration-300">
          
          <header className="bg-brand-700 dark:bg-slate-900 text-white px-4 py-4 flex items-center justify-between shadow-md z-20 border-b border-transparent dark:border-slate-800 transition-colors duration-300">
            <Link to="/" className="flex items-center gap-2 active:scale-95 transition-transform">
              <div className="bg-white dark:bg-slate-800 p-1.5 rounded-lg shadow-sm flex items-center justify-center transition-colors">
                <WalletCards className="w-5 h-5 text-brand-700 dark:text-brand-400" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-white dark:text-slate-100">BillBlend</h1>
            </Link>
            
            <div className="flex items-center gap-3">
              {/* 3-WAY THEME TOGGLE BUTTON */}
              <button 
                onClick={cycleTheme} 
                className="p-2 rounded-full hover:bg-brand-600 dark:hover:bg-slate-800 transition-all text-brand-100 hover:text-white dark:text-slate-400 dark:hover:text-brand-400 active:scale-90"
                title={`Current Theme: ${theme}`}
              >
                {theme === 'light' && <Sun className="w-5 h-5" />}
                {theme === 'dark' && <Moon className="w-5 h-5" />}
                {theme === 'system' && <Monitor className="w-5 h-5" />}
              </button>
              
              <div className="w-8 h-8 rounded-full bg-brand-600/50 dark:bg-slate-800 border border-brand-500 dark:border-slate-700 flex items-center justify-center text-xs font-bold text-brand-50 dark:text-slate-300 transition-colors">
                ME
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/create" element={<CreateGroup />} />
              <Route path="/group/:id" element={<GroupMonitor />} />
              <Route path="/group/:id/settings" element={<GroupSettings />} />
              <Route path="/group/:id/add" element={<AddExpense />} />
              <Route path="/group/:id/expense/:expenseId/edit" element={<AddExpense />} />
              <Route path="/import" element={<ImportGroup />} />
              <Route path="/guide" element={<Guide />} /> 
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}