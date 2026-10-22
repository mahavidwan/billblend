import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { ArrowLeft, Plus, Trash2, Users, Download } from 'lucide-react';
import { motion } from 'framer-motion';

export default function CreateGroup() {
  const navigate = useNavigate();
  const createGroup = useStore((state) => state.createGroup);
  const pastGroups = useStore((state) => state.groups); 
  
  const [groupName, setGroupName] = useState('');
  const [members, setMembers] = useState(['', '', '']); 

  const handleAddMember = () => setMembers([...members, '']);
  const handleRemoveMember = (index: number) => {
    if (members.length <= 2) return;
    setMembers(members.filter((_, i) => i !== index));
  };
  const handleMemberChange = (index: number, value: string) => {
    const newMembers = [...members];
    newMembers[index] = value;
    setMembers(newMembers);
  };

  const handleImportFromPastGroup = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const groupId = e.target.value;
    if (!groupId) return;
    const groupToImport = pastGroups.find(g => g.id === groupId);
    if (groupToImport) {
      const names = groupToImport.members.map(m => m.name);
      setMembers(names.length >= 2 ? names : [...names, '', '']);
    }
    e.target.value = ""; 
  };

  const handleSave = () => {
    const validMembers = members.filter(m => m.trim() !== '');
    if (groupName.trim() === '' || validMembers.length < 2) {
      alert("Please enter a group name and at least 2 members!");
      return;
    }
    const newGroupId = createGroup(groupName.trim(), validMembers);
    navigate(`/group/${newGroupId}`, { replace: true });
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="pb-28 min-h-screen transition-colors duration-300">
      <div className="bg-white dark:bg-slate-900 px-4 py-4 flex items-center gap-4 shadow-sm sticky top-0 z-10 border-b border-slate-100 dark:border-slate-800 transition-colors duration-300">
        <button onClick={() => navigate(-1)} className="text-slate-500 dark:text-slate-400 p-1 active:bg-slate-100 dark:active:bg-slate-800 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6" /> 
        </button>
        <span className="font-bold text-slate-500 dark:text-slate-400 transition-colors">Back</span>
      </div>

      <div className="p-4 space-y-6">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2 transition-colors">
          <Users className="w-6 h-6 text-brand-500 dark:text-brand-400" /> New Trip
        </h2>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 transition-colors">Group Name (e.g. Darjeeling Trip)</label>
            <input type="text" value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Enter group name..." 
                   className="w-full p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400 shadow-sm dark:shadow-none text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 transition-colors" />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 transition-colors">Group Members</label>
              
              {pastGroups.length > 0 && (
                <div className="relative">
                  <select 
                    onChange={handleImportFromPastGroup}
                    className="appearance-none bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-400 font-bold text-xs py-1.5 pl-3 pr-8 rounded-lg outline-none cursor-pointer border border-brand-100 dark:border-brand-800/50 transition-colors"
                  >
                    <option value="">+ Copy Past Trip</option>
                    {pastGroups.map(g => <option key={g.id} value={g.id}>{g.name} ({g.members.length})</option>)}
                  </select>
                  <Download className="w-3 h-3 text-brand-600 dark:text-brand-400 absolute right-2.5 top-2 pointer-events-none" />
                </div>
              )}
            </div>

            <div className="space-y-3">
              {members.map((member, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input type="text" value={member} onChange={(e) => handleMemberChange(index, e.target.value)} placeholder={`Member ${index + 1} name`} 
                         className="flex-1 p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400 shadow-sm dark:shadow-none text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 transition-colors" />
                  <button onClick={() => handleRemoveMember(index)} disabled={members.length <= 2} 
                          className="p-3.5 text-red-400 dark:text-red-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-30 disabled:cursor-not-allowed bg-red-50 dark:bg-red-900/10 rounded-xl transition-all">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
            <button onClick={handleAddMember} className="mt-4 flex items-center gap-2 text-brand-600 dark:text-brand-400 font-medium hover:text-brand-700 dark:hover:text-brand-300 p-2 transition-colors">
              <Plus className="w-4 h-4" /> Add another person
            </button>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-t border-slate-100 dark:border-slate-800 flex justify-center z-10 transition-colors duration-300">
          <div className="w-full max-w-md">
            <button onClick={handleSave} className="w-full bg-brand-600 dark:bg-brand-700 hover:bg-brand-700 dark:hover:bg-brand-600 text-white font-bold text-lg py-4 rounded-xl shadow-lg dark:shadow-none active:scale-[0.98] transition-all">
              Create Group
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}