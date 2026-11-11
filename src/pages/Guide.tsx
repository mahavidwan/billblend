import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { motion } from 'framer-motion';

// 🚨 MODULAR IMPORTS
import WelcomeModule from '../components/GuideModules/WelcomeModule';
import SplitModule from '../components/GuideModules/SplitModule';
import TripFundModule from '../components/GuideModules/TripFundModule'; 
import CollabModule from '../components/GuideModules/CollabModule'; 
import SettlementModule from '../components/GuideModules/SettlementModule';

export default function Guide() {
  const navigate = useNavigate();

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-28 bg-slate-50 dark:bg-slate-950 min-h-screen transition-colors duration-300 relative">
      
      {/* GLOWING STICKY HEADER */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl px-4 py-4 flex items-center justify-between shadow-sm sticky top-0 z-50 border-b border-slate-200/50 dark:border-slate-800/50 transition-colors duration-300">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-400 active:scale-95 transition-all">
          <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-full"><ArrowLeft className="w-5 h-5" /></div>
          <span className="font-bold text-sm">Dashboard</span>
        </button>
        <div className="flex items-center gap-2 text-brand-700 dark:text-brand-400 font-bold bg-brand-50 dark:bg-brand-900/20 px-3 py-1.5 rounded-full border border-brand-100 dark:border-brand-800/50">
          <BookOpen className="w-4 h-4" /> <span className="text-xs uppercase tracking-widest">Tutorial</span>
        </div>
      </div>

      {/* THE MODULAR CONTENT STACK */}
      <div className="px-4 py-2 max-w-md mx-auto">
        <WelcomeModule />
        <SplitModule />
        <TripFundModule />
        <CollabModule /> 
        <SettlementModule /> {/* 🚨 RENDERED! */}
      </div>

    </motion.div>
  );
}