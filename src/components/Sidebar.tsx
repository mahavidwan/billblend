import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Cloud, LogOut, User, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useStore } from '../store';
import { useGoogleLogin } from '@react-oauth/google';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const user = useStore(state => state.cloudUser);
  const setCloudUser = useStore(state => state.setCloudUser);
  
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // The Google Login Function
  const login = useGoogleLogin({
    scope: 'openid profile email https://www.googleapis.com/auth/drive.appdata',
    onSuccess: async (tokenResponse) => {
      try {
        setIsLoggingIn(true);
        // Fetch user profile info from Google
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        const userInfo = await userInfoRes.json();

        // Save to persistent Zustand state
        setCloudUser({
          name: userInfo.name,
          email: userInfo.email,
          picture: userInfo.picture,
          accessToken: tokenResponse.access_token,
          // Token expires in 1 hour (3600 seconds)
          tokenExpiry: Date.now() + (tokenResponse.expires_in * 1000),
        });
      } catch (err) {
        alert("Failed to fetch Google Profile.");
      } finally {
        setIsLoggingIn(false);
      }
    },
    onError: (error) => {
      console.error('Login Failed:', error);
      alert("Google Login Failed or was canceled.");
    }
  });

  const handleLogout = () => {
    if (window.confirm("Disconnect Google Drive? Your local trips will remain, but cloud sync will stop.")) {
      setCloudUser(null);
    }
  };

  const handleSync = () => {
    // Placeholder for Batch 16!
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 1500);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
            className="fixed inset-0 bg-slate-900/50 dark:bg-black/60 backdrop-blur-sm z-40"
          />

          <motion.div 
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 w-80 h-full bg-slate-50 dark:bg-slate-950 shadow-2xl z-50 flex flex-col border-l border-slate-200 dark:border-slate-800 transition-colors duration-300"
          >
            <div className="p-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
              <h2 className="font-bold text-lg text-slate-800 dark:text-slate-100">Account & Cloud</h2>
              <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 active:scale-95 transition-all text-slate-500 dark:text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-8">
              {/* PROFILE SECTION */}
              <div className="flex flex-col items-center text-center">
                {user ? (
                  <>
                    <img src={user.picture} alt="Profile" className="w-20 h-20 rounded-full shadow-md border-4 border-white dark:border-slate-800 mb-3 object-cover" />
                    <h3 className="font-bold text-xl text-slate-800 dark:text-slate-100">{user.name}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
                  </>
                ) : (
                  <>
                    <div className="w-20 h-20 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center mb-3 transition-colors">
                      <User className="w-10 h-10 text-slate-400 dark:text-slate-500" />
                    </div>
                    <h3 className="font-bold text-xl text-slate-800 dark:text-slate-100 mb-1">Not logged in</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 text-center max-w-[200px] mb-4">
                      Log in to securely backup and sync your trips across devices.
                    </p>
                    <button 
                      onClick={() => login()} 
                      disabled={isLoggingIn}
                      className="w-full bg-brand-600 hover:bg-brand-500 disabled:bg-slate-400 text-white font-bold py-3 rounded-xl shadow-md transition-all active:scale-95 flex justify-center items-center gap-2"
                    >
                      <Cloud className="w-5 h-5" /> {isLoggingIn ? 'Connecting...' : 'Connect Google Drive'}
                    </button>
                  </>
                )}
              </div>

              {/* SYNC STATUS */}
              {user && (
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 space-y-4 transition-colors">
                  <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                    <CheckCircle2 className="w-5 h-5 text-accent-500 dark:text-accent-400" />
                    <div className="flex-1">
                      <p className="font-bold text-sm">Cloud Linked</p>
                      <p className="text-[11px] text-slate-500">Sync engine coming in Batch 16!</p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={handleSync}
                    className="w-full bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 font-bold py-2.5 rounded-xl border border-brand-200 dark:border-brand-800/50 hover:bg-brand-100 dark:hover:bg-brand-900/40 transition-all active:scale-95 flex justify-center items-center gap-2"
                  >
                    <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} /> 
                    {isSyncing ? 'Syncing...' : 'Sync Now'}
                  </button>
                </div>
              )}
            </div>

            {/* DANGER ZONE (Log out) */}
            {user && (
              <div className="p-6 border-t border-slate-100 dark:border-slate-800 transition-colors">
                <button 
                  onClick={handleLogout}
                  className="w-full text-red-500 dark:text-red-400 font-bold py-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/10 transition-all active:scale-95 flex justify-center items-center gap-2"
                >
                  <LogOut className="w-5 h-5" /> Disconnect Drive
                </button>
                <p className="text-[10px] text-slate-400 text-center mt-3 flex items-center justify-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Keeps local data, removes cloud link.
                </p>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}