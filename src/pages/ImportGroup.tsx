import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../store';
import type { Group } from '../store';
import { DownloadCloud, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ImportGroup() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const importGroup = useStore(state => state.importGroup);
  
  const [previewGroup, setPreviewGroup] = useState<Group | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const rawData = searchParams.get('data');
    if (!rawData) {
      setError("No group data found in the link.");
      return;
    }

    try {
      const jsonString = decodeURIComponent(atob(rawData));
      const groupData = JSON.parse(jsonString) as Group;
      if (!groupData.id || !groupData.name || !groupData.members) throw new Error("Invalid format");
      setPreviewGroup(groupData);
    } catch (err) {
      setError("This share link is invalid or corrupted.");
    }
  }, [searchParams]);

  const handleSave = () => {
    if (previewGroup) {
      importGroup(previewGroup);
      navigate(`/group/${previewGroup.id}`, { replace: true });
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center transition-colors duration-300">
        <AlertCircle className="w-12 h-12 text-red-400 dark:text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2 transition-colors">Oops!</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-6 transition-colors">{error}</p>
        <button onClick={() => navigate('/')} className="text-brand-600 dark:text-brand-400 font-bold hover:underline transition-colors">Go to Dashboard</button>
      </div>
    );
  }

  if (!previewGroup) return <div className="min-h-screen flex items-center justify-center text-slate-500 dark:text-slate-400 font-medium transition-colors">Reading Magic Link...</div>;

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center min-h-screen p-6 text-center transition-colors duration-300">
      <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-lg dark:shadow-none border border-slate-100 dark:border-slate-800 max-w-sm w-full transition-colors duration-300">
        <div className="bg-brand-50 dark:bg-brand-900/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 transition-colors">
          <DownloadCloud className="w-8 h-8 text-brand-600 dark:text-brand-400" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2 transition-colors">Trip Invite!</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-6 transition-colors">Someone shared a BillBlend group with you.</p>
        
        <div className="bg-slate-50 dark:bg-slate-950/50 p-4 rounded-xl text-left mb-8 border border-slate-100 dark:border-slate-800/50 transition-colors">
          <h3 className="font-bold text-lg text-brand-700 dark:text-brand-400 transition-colors">{previewGroup.name}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 transition-colors">{previewGroup.members.length} members • {previewGroup.expenses.length} expenses logged</p>
        </div>

        <button onClick={handleSave} className="w-full bg-accent-500 dark:bg-accent-600 hover:bg-accent-600 dark:hover:bg-accent-500 text-white font-bold text-lg py-4 rounded-xl shadow-md dark:shadow-none active:scale-95 transition-all mb-4">
          Save to My BillBlend
        </button>
        <button onClick={() => navigate('/')} className="text-slate-500 dark:text-slate-400 font-medium hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
          Cancel
        </button>
      </div>
    </motion.div>
  );
}