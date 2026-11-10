import { motion, AnimatePresence } from 'framer-motion';
import { X, Cloud, LogOut, User, RefreshCw, AlertTriangle, CheckCircle2, XCircle, Users } from 'lucide-react';
import { useStore } from '../store';
import { triggerGlobalSync } from '../utils/cloudSync';
import { useAuth } from '../utils/useAuth'; // 🚨 NEW
import { useState } from 'react';

interface SidebarProps { isOpen: boolean; onClose: () => void; }

function formatTime(isoString: string | null) {
  if (!isoString) return "Never";
  const d = new Date(isoString);
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const user = useStore(state => state.cloudUser);
  const setCloudUser = useStore(state => state.setCloudUser);
  const lastSyncTime = useStore(state => state.lastSyncTime);
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // 🚨 USE THE NEW HOOK
  const { login, switchAccount, isLoggingIn } = useAuth();

  const handleManualSync = async () => {
    setIsSyncing(true); setSyncError(null);
    const result = await triggerGlobalSync();
    if (!result.success) {
      if (result.error === 'SESSION_EXPIRED') setSyncError("Session expired. Please click reconnect.");
      else setSyncError(result.error || "Sync failed. Check internet connection.");
    }
    setIsSyncing(false);
  };

  const handleLogout = () => {
    if (window.confirm("Disconnect Google Drive?\n\nYour local trips will remain safely on this device, but they will no longer back up to the cloud.")) {
      setCloudUser(null); useStore.setState({ lastSyncTime: null }); 
    }
  };

  const isExpired = user ? Date.now() > user.tokenExpiry : false;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-slate-900/50 dark:bg-black/60 backdrop-blur-sm z-40" />
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed top-0 right-0 w-80 h-full bg-slate-50 dark:bg-slate-950 shadow-2xl z-50 flex flex-col border-l border-slate-200 dark:border-slate-800 transition-colors duration-300">
            <div className="p-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
              <h2 className="font-bold text-lg text-slate-800 dark:text-slate-100">Account & Cloud</h2>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 active:scale-95 transition-all text-slate-500 dark:text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 flex-1 overflow-y-auto space-y-8">
              <div className="flex flex-col items-center text-center">
                {user ? (
                  <>
                    <img src={user.picture} alt="Profile" referrerPolicy="no-referrer" className="w-20 h-20 rounded-full shadow-md border-4 border-white dark:border-slate-800 mb-3 object-cover" />
                    <h3 className="font-bold text-xl text-slate-800 dark:text-slate-100">{user.name}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
                    <div className="flex gap-2 mt-4">
                      {isExpired && <button onClick={() => login()} className="bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors"><AlertTriangle className="w-4 h-4" /> Reconnect</button>}
                      <button onClick={() => switchAccount()} className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"><Users className="w-4 h-4" /> Switch Account</button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-20 h-20 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center mb-3 transition-colors"><User className="w-10 h-10 text-slate-400 dark:text-slate-500" /></div>
                    <h3 className="font-bold text-xl text-slate-800 dark:text-slate-100 mb-1">Not logged in</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-[200px] mb-4">Log in to securely backup and sync your trips across devices.</p>
                    <button onClick={() => login()} disabled={isLoggingIn} className="w-full bg-brand-600 hover:bg-brand-500 disabled:bg-slate-400 text-white font-bold py-3 rounded-xl shadow-md transition-all active:scale-95 flex justify-center items-center gap-2">
                      <Cloud className="w-5 h-5" /> {isLoggingIn ? 'Connecting...' : 'Connect Google Drive'}
                    </button>
                  </>
                )}
              </div>
              {user && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 space-y-4 transition-colors">
                  <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                    {syncError ? <XCircle className="w-5 h-5 text-red-500" /> : <CheckCircle2 className="w-5 h-5 text-accent-500 dark:text-accent-400" />}
                    <div className="flex-1">
                      <p className="font-bold text-sm">Cloud Linked</p>
                      <p className={`text-[11px] font-medium ${syncError ? 'text-red-500' : 'text-slate-500 dark:text-slate-400'}`}>{syncError ? syncError : `Last synced: ${formatTime(lastSyncTime)}`}</p>
                    </div>
                  </div>
                  <button onClick={handleManualSync} disabled={isSyncing || isExpired} className="w-full bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 font-bold py-2.5 rounded-xl border border-brand-200 dark:border-brand-800/50 hover:bg-brand-100 dark:hover:bg-brand-900/40 disabled:opacity-50 transition-all active:scale-95 flex justify-center items-center gap-2">
                    <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} /> {isSyncing ? 'Syncing...' : 'Sync Now'}
                  </button>
                </div>
              )}
            </div>
            {user && (
              <div className="p-6 border-t border-slate-100 dark:border-slate-800 transition-colors">
                <button onClick={handleLogout} className="w-full text-red-500 dark:text-red-400 font-bold py-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/10 transition-all active:scale-95 flex justify-center items-center gap-2">
                  <LogOut className="w-5 h-5" /> Disconnect Drive
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}