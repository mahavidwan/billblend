import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import type { Group } from '../store';
import { Plus, Users, Receipt, Heart, Pin, Trash2, Lightbulb, ArrowRight, FileJson } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRef } from 'react';

export default function Dashboard() {
  const navigate = useNavigate();
  const groups = useStore((state) => state.groups);
  const deleteGroup = useStore((state) => state.deleteGroup);
  const togglePinGroup = useStore((state) => state.togglePinGroup);
  const importGroup = useStore((state) => state.importGroup);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const sortedGroups = [...groups].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const handleDeleteGroup = (e: React.MouseEvent, group: Group) => {
    e.stopPropagation(); 
    // 🚨 FIX 1: Prevent deletion of active Live Trips!
    if (group.isCollaborative) {
      alert("⚠️ You cannot delete a Live Collaborative Trip from the Dashboard.\n\nTo delete this trip, please open it, go to Group Settings, and click 'End Collaboration Globally' first.");
      return;
    }
    
    if (window.confirm(`Are you sure you want to permanently delete "${group.name}"?`)) {
      deleteGroup(group.id);
    }
  };

  const handlePinGroup = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    togglePinGroup(id);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const jsonString = event.target?.result as string;
        const groupData = JSON.parse(jsonString) as Group;
        
        if (!groupData.id || !groupData.name || !groupData.members) {
          throw new Error("Invalid structure");
        }
        
        importGroup(groupData);
        alert(`Successfully imported "${groupData.name}"!`);
      } catch (err) {
        alert("Invalid file format. Please upload a valid BillBlend .json file.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="p-4 pb-28 flex flex-col min-h-[calc(100vh-80px)] transition-colors duration-300">
      
      <input type="file" accept=".json" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />

      <motion.button 
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
        onClick={() => navigate('/guide')}
        className="w-full mb-6 bg-gradient-to-r from-brand-600 to-accent-500 dark:from-brand-800 dark:to-accent-700 p-4 rounded-2xl shadow-lg shadow-brand-500/20 dark:shadow-none text-white flex items-center justify-between group overflow-hidden relative"
      >
        <motion.div animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} className="absolute inset-0 bg-gradient-to-r from-brand-500 to-accent-400 dark:from-brand-600 dark:to-accent-600 opacity-50" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="bg-white/20 dark:bg-black/20 p-2.5 rounded-xl backdrop-blur-sm border border-white/10"><Lightbulb className="w-6 h-6 text-white" /></div>
          <div className="text-left">
            <h3 className="font-bold text-lg leading-tight tracking-wide">App Guide & Tutorial</h3>
            <p className="text-brand-50 dark:text-slate-200 text-xs mt-0.5 opacity-90 font-medium">Learn how to split bills perfectly</p>
          </div>
        </div>
        <ArrowRight className="w-5 h-5 text-white/80 group-hover:translate-x-1 transition-transform relative z-10" />
      </motion.button>

      <div className="flex-1">
        {groups.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center text-center mt-10">
            <div className="bg-brand-100 dark:bg-slate-800 p-4 rounded-full mb-4 transition-colors"><Receipt className="w-10 h-10 text-brand-600 dark:text-brand-400" /></div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2 transition-colors">No groups yet</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-[250px] transition-colors">Create a group for your trip, event, or apartment to start splitting bills.</p>
            <div className="flex flex-col gap-3 w-full max-w-[250px]">
              <button onClick={() => navigate('/create')} className="w-full bg-brand-600 dark:bg-brand-700 hover:bg-brand-700 dark:hover:bg-brand-600 text-white px-6 py-3 rounded-xl font-medium flex justify-center items-center gap-2 transition-colors active:scale-95"><Plus className="w-5 h-5" /> Create First Group</button>
              <button onClick={() => fileInputRef.current?.click()} className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 px-6 py-3 rounded-xl font-medium flex justify-center items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors active:scale-95"><FileJson className="w-5 h-5 text-brand-500" /> Import Trip File</button>
            </div>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 transition-colors">Your Trips & Groups</h2>
              <button onClick={() => fileInputRef.current?.click()} className="text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-brand-100 dark:hover:bg-brand-900/40 transition-colors active:scale-95"><FileJson className="w-4 h-4" /> Import</button>
            </div>
            
            {sortedGroups.map((group, index) => {
              // Ignore Repayments AND Fund Deposits so Dashboard accurately reflects actual trip costs
              const totalSpent = group.expenses.reduce((sum, exp) => (exp.isSystemRepayment || exp.splitType === 'FUND_DEPOSIT') ? sum : sum + exp.amount, 0);
              
              return (
                <motion.div
                  key={group.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
                  onClick={() => navigate(`/group/${group.id}`)}
                  className={`bg-white dark:bg-slate-900 p-5 rounded-2xl border cursor-pointer hover:shadow-md dark:hover:border-slate-700 transition-all active:scale-[0.98] group relative ${group.isPinned ? 'border-brand-300 dark:border-brand-700 bg-brand-50/30 dark:bg-brand-900/10' : 'border-slate-100 dark:border-slate-800 shadow-sm dark:shadow-none'}`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 pr-16 leading-tight transition-colors">
                      {group.name} {group.isCollaborative && <span className="ml-2 bg-accent-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider relative -top-0.5">Live</span>}
                    </h3>
                    <div className="flex items-center gap-3 absolute top-5 right-4">
                      <button onClick={(e) => handlePinGroup(e, group.id)} className="active:scale-75 transition-transform"><Pin className={`w-5 h-5 ${group.isPinned ? 'fill-brand-500 text-brand-500 dark:fill-brand-400 dark:text-brand-400' : 'text-slate-300 dark:text-slate-600 hover:text-brand-400 dark:hover:text-brand-300'}`} /></button>
                      
                      {/* 🚨 Pass the whole group object so we can check if it's Live! */}
                      <button onClick={(e) => handleDeleteGroup(e, group)} className="active:scale-75 transition-transform text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400"><Trash2 className="w-5 h-5" /></button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm mt-4">
                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 transition-colors"><Users className="w-4 h-4" /><span>{group.members.length} members</span></div>
                    <div className="font-semibold text-brand-700 dark:text-accent-400 transition-colors">₹{totalSpent.toFixed(2)} total</div>
                  </div>
                </motion.div>
              );
            })}
            
            <button onClick={() => navigate('/create')} className="fixed bottom-6 right-1/2 translate-x-[9rem] sm:translate-x-[11rem] bg-accent-500 dark:bg-accent-600 text-white p-4 rounded-full shadow-lg dark:shadow-none hover:bg-accent-600 dark:hover:bg-accent-500 active:scale-90 transition-all z-20"><Plus className="w-6 h-6" /></button>
          </motion.div>
        )}
      </div>

      <div className="pt-10 pb-4 flex flex-col items-center opacity-80">
        <p className="text-sm text-slate-400 dark:text-slate-500 flex items-center justify-center gap-1.5 mb-1.5 transition-colors">Built with <Heart className="w-4 h-4 text-red-500 fill-red-500" /> by <span className="font-bold text-slate-600 dark:text-slate-400 tracking-wide transition-colors">Debanjan Sarkar</span></p>
        <div className="bg-slate-200/70 dark:bg-slate-800/80 text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md transition-colors">Version 7.3.1</div>
      </div>
    </div>
  );
}