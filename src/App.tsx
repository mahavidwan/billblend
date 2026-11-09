import { useEffect, useState } from 'react';
// 🚨 FIX: Ensure BrowserRouter is imported as Router and USED!
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { WalletCards, Sun, Moon, Monitor, User, AlertTriangle } from 'lucide-react';
import { useStore } from './store';
// 🚨 FIX: Explicitly importing useGoogleLogin
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';
import { triggerGlobalSync } from './utils/cloudSync';
import { GlobalLiveSyncManager } from './utils/useLiveSync'; 
import ReactGA from "react-ga4";
import { motion, AnimatePresence } from 'framer-motion';

import Dashboard from './pages/Dashboard';
import CreateGroup from './pages/CreateGroup';
import GroupMonitor from './pages/GroupMonitor';
import AddExpense from './pages/AddExpense';
import ImportGroup from './pages/ImportGroup';
import GroupSettings from './pages/GroupSettings';
import Guide from './pages/Guide';
import Sidebar from './components/Sidebar';
import JoinTrip from './pages/JoinTrip';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

if (GA_MEASUREMENT_ID) ReactGA.initialize(GA_MEASUREMENT_ID);

function RouteTracker() {
  const location = useLocation();
  useEffect(() => {
    if (GA_MEASUREMENT_ID) ReactGA.send({ hitType: "pageview", page: location.pathname + location.search });
  }, [location]);
  return null;
}

function AutoSyncManager() {
  const cloudUser = useStore(state => state.cloudUser);
  useEffect(() => {
    if (!cloudUser) return;
    triggerGlobalSync();
    const intervalId = setInterval(() => { triggerGlobalSync(); }, 2 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, [cloudUser]);
  return null;
}

function ThemeManager() {
  const theme = useStore(state => state.theme);
  useEffect(() => {
    const root = window.document.documentElement;
    const applyTheme = () => {
      root.classList.remove('light', 'dark');
      if (theme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        root.classList.add(systemTheme);
      } else root.classList.add(theme);
    };
    applyTheme();
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => applyTheme();
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    }
  }, [theme]);
  return null;
}

// --- THE MAIN APP SHELL ---
function AppShell() {
  const theme = useStore(state => state.theme);
  const setTheme = useStore(state => state.setTheme);
  const cloudUser = useStore(state => state.cloudUser);
  const setCloudUser = useStore(state => state.setCloudUser);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Helper to process successful Google Logins (used by both buttons)
  const handleLoginSuccess = async (tokenResponse: any) => {
    const grantedScopes = tokenResponse.scope || '';
    if (!grantedScopes.includes('drive.appdata')) {
      alert("Permission Denied: You must check the box to allow access to your Google Drive AppData folder.");
      return;
    }
    try {
      const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
      });
      const userInfo = await userInfoRes.json();
      
      setCloudUser({
        name: userInfo.name, email: userInfo.email, picture: userInfo.picture,
        accessToken: tokenResponse.access_token,
        tokenExpiry: Date.now() + (tokenResponse.expires_in * 1000),
      });
      triggerGlobalSync(); // Instantly resume auto-sync
    } catch (err) { alert("Failed to fetch Google Profile."); }
  };

  // 1. Silent JIT Login (Skips selector if email is known)
  const login = useGoogleLogin({
    scope: 'openid profile email https://www.googleapis.com/auth/drive.appdata',
    // @ts-ignore
    login_hint: cloudUser?.email, 
    onSuccess: handleLoginSuccess,
    onError: () => alert("Google Login Failed.")
  });

  // 2. 🚨 NEW: Switch Account Login (Forces Google Account Chooser)
  const switchAccount = useGoogleLogin({
    scope: 'openid profile email https://www.googleapis.com/auth/drive.appdata',
    prompt: 'select_account', // This tells Google to ALWAYS show the account picker!
    onSuccess: handleLoginSuccess,
    onError: () => alert("Account switch canceled.")
  });

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  const isTokenExpired = cloudUser && Date.now() > cloudUser.tokenExpiry;

  return (
    <>
      <ThemeManager />
      <AutoSyncManager /> 
      <GlobalLiveSyncManager />
      <RouteTracker /> 
      
      {/* 🚨 Pass both login methods to the Sidebar */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} onLogin={login} onSwitchAccount={switchAccount} />

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
              <button onClick={cycleTheme} className="p-2 rounded-full hover:bg-brand-600 dark:hover:bg-slate-800 transition-all text-brand-100 hover:text-white dark:text-slate-400 dark:hover:text-brand-400 active:scale-90">
                {theme === 'light' && <Sun className="w-5 h-5" />}
                {theme === 'dark' && <Moon className="w-5 h-5" />}
                {theme === 'system' && <Monitor className="w-5 h-5" />}
              </button>
              
              <button onClick={() => setIsSidebarOpen(true)} className="w-8 h-8 rounded-full bg-brand-600/50 dark:bg-slate-800 border border-brand-500 dark:border-slate-700 flex items-center justify-center text-xs font-bold text-brand-50 dark:text-slate-300 hover:bg-brand-600 transition-all active:scale-90 overflow-hidden">
                {cloudUser ? <img src={cloudUser.picture} alt="Profile" referrerPolicy="no-referrer" className="w-full h-full object-cover" /> : <User className="w-4 h-4" />}
              </button>
            </div>
          </header>

          <AnimatePresence>
            {isTokenExpired && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-orange-500 text-white px-4 py-2.5 text-xs font-bold flex justify-between items-center shadow-md z-10">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Cloud Sync Paused
                </div>
                <button onClick={() => login()} className="bg-white text-orange-600 px-3 py-1 rounded-full active:scale-95 transition-transform shadow-sm">
                  Tap to Resume
                </button>
              </motion.div>
            )}
          </AnimatePresence>

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
              <Route path="/join/:tripId" element={<JoinTrip />} /> 
            </Routes>
          </main>
        </div>
      </div>
    </>
  );
}

// 🚨 WRAP THE APP IN ROUTER AND PROVIDER HERE
export default function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <Router>
        <AppShell />
      </Router>
    </GoogleOAuthProvider>
  );
}