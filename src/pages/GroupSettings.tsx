import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { ArrowLeft, UserPlus, Trash2, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';

export default function GroupSettings() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const group = useStore(state => state.groups.find(g => g.id === id));
  const addMember = useStore(state => state.addMember);
  const removeMember = useStore(state => state.removeMember);

  const [newMemberName, setNewMemberName] = useState('');

  if (!group) return null;

  const handleAddMember = () => {
    if (newMemberName.trim()) {
      addMember(group.id, newMemberName.trim());
      setNewMemberName('');
    }
  };

  const handleRemoveMember = (memberId: string, memberName: string) => {
    const isEngaged = group.expenses.some(exp => exp.paidBy === memberId || exp.splits.some(s => s.memberId === memberId));
    if (isEngaged) {
      alert(`Cannot remove ${memberName}.\n\nThey are part of existing expenses. You must delete or edit those expenses first.`);
      return;
    }
    if (group.members.length <= 2) {
      alert("A group must have at least 2 members.");
      return;
    }
    if (window.confirm(`Remove ${memberName} from this group?`)) removeMember(group.id, memberId);
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="pb-28 transition-colors duration-300 min-h-screen">
      <div className="bg-white dark:bg-slate-900 px-4 py-4 flex items-center gap-4 shadow-sm sticky top-0 z-10 border-b border-slate-100 dark:border-slate-800 transition-colors duration-300">
        <button onClick={() => navigate(-1)} className="text-slate-500 dark:text-slate-400 p-1 active:bg-slate-100 dark:active:bg-slate-800 rounded-full transition-colors"><ArrowLeft className="w-6 h-6" /></button>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 transition-colors">Group Settings</h2>
      </div>

      <div className="p-4 space-y-6">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors duration-300">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2 transition-colors"><UserPlus className="w-5 h-5 text-brand-500 dark:text-brand-400" /> Add New Member</h3>
          <div className="flex items-center gap-2 w-full">
            <input 
              type="text" value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} placeholder="Enter name..." 
              className="flex-1 min-w-0 p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 transition-colors" 
            />
            <button 
              onClick={handleAddMember} disabled={!newMemberName.trim()} 
              className="shrink-0 whitespace-nowrap bg-brand-600 dark:bg-brand-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:text-slate-500 text-white px-5 py-3 rounded-xl font-bold active:scale-95 transition-all"
            >
              Add
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors duration-300">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-1 transition-colors">Manage Members</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 flex items-start gap-1 transition-colors">
            <ShieldAlert className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" /> Members involved in expenses cannot be removed to protect calculation accuracy.
          </p>
          
          <div className="space-y-3">
            {group.members.map((member) => {
              const isEngaged = group.expenses.some(exp => exp.paidBy === member.id || exp.splits.some(s => s.memberId === member.id));
              return (
                <div key={member.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 transition-colors">
                  <span className="font-bold text-slate-700 dark:text-slate-300 transition-colors">{member.name}</span>
                  <button 
                    onClick={() => handleRemoveMember(member.id, member.name)}
                    className={`p-2 rounded-lg transition-all ${isEngaged ? 'text-slate-300 dark:text-slate-600 bg-slate-100 dark:bg-slate-800/50 cursor-not-allowed' : 'text-red-400 dark:text-red-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 active:scale-90'}`}
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}