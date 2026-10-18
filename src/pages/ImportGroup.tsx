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
      // Decode Base64 and parse JSON safely
      const jsonString = decodeURIComponent(atob(rawData));
      const groupData = JSON.parse(jsonString) as Group;
      
      if (!groupData.id || !groupData.name || !groupData.members) {
        throw new Error("Invalid format");
      }
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
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <h2 className="text-xl font-bold text-slate-800 mb-2">Oops!</h2>
        <p className="text-slate-500 mb-6">{error}</p>
        <button onClick={() => navigate('/')} className="text-brand-600 font-bold">Go to Dashboard</button>
      </div>
    );
  }

  if (!previewGroup) return <div className="min-h-screen flex items-center justify-center text-slate-500 font-medium">Reading Magic Link...</div>;

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-slate-50">
      <div className="bg-white p-8 rounded-3xl shadow-lg border border-slate-100 max-w-sm w-full">
        <div className="bg-brand-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
          <DownloadCloud className="w-8 h-8 text-brand-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Trip Invite!</h2>
        <p className="text-slate-500 mb-6">Someone shared a BillBlend group with you.</p>
        
        <div className="bg-slate-50 p-4 rounded-xl text-left mb-8 border border-slate-100">
          <h3 className="font-bold text-lg text-brand-700">{previewGroup.name}</h3>
          <p className="text-sm text-slate-500 mt-1">{previewGroup.members.length} members • {previewGroup.expenses.length} expenses logged</p>
        </div>

        <button onClick={handleSave} className="w-full bg-accent-500 hover:bg-accent-600 text-white font-bold text-lg py-4 rounded-xl shadow-md active:scale-95 transition-all mb-4">
          Save to My BillBlend
        </button>
        <button onClick={() => navigate('/')} className="text-slate-500 font-medium hover:text-slate-700">
          Cancel
        </button>
      </div>
    </motion.div>
  );
}