import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { ArrowLeft, Plus, Trash2, Users } from 'lucide-react';
import { motion } from 'framer-motion';

export default function CreateGroup() {
  const navigate = useNavigate();
  const createGroup = useStore((state) => state.createGroup);
  
  const [groupName, setGroupName] = useState('');
  const [members, setMembers] = useState(['', '', '']); // Start with 3 empty slots

  const handleAddMember = () => setMembers([...members, '']);
  
  const handleRemoveMember = (index: number) => {
    if (members.length <= 2) return; // Force at least 2 members
    const newMembers = members.filter((_, i) => i !== index);
    setMembers(newMembers);
  };

  const handleMemberChange = (index: number, value: string) => {
    const newMembers = [...members];
    newMembers[index] = value;
    setMembers(newMembers);
  };

  const handleSave = () => {
    const validMembers = members.filter(m => m.trim() !== '');
    if (groupName.trim() === '' || validMembers.length < 2) {
      alert("Please enter a group name and at least 2 members!");
      return;
    }
    
    // Call our Zustand state engine to save it locally
    const newGroupId = createGroup(groupName.trim(), validMembers);
    
    // Redirect to the new group's monitor page
    navigate(`/group/${newGroupId}`, { replace: true });
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="p-4 pb-24">
      {/* Header Area */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 mb-6 active:text-brand-600">
        <ArrowLeft className="w-5 h-5" />
        <span className="font-medium">Back</span>
      </button>

      <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
        <Users className="w-6 h-6 text-brand-500" />
        New Group
      </h2>

      {/* Form Area */}
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Group Name (e.g. Darjeeling Trip)</label>
          <input
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Enter group name..."
            className="w-full p-4 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Group Members</label>
          <div className="space-y-3">
            {members.map((member, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={member}
                  onChange={(e) => handleMemberChange(index, e.target.value)}
                  placeholder={`Member ${index + 1} name`}
                  className="flex-1 p-3.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 shadow-sm transition-all"
                />
                <button
                  onClick={() => handleRemoveMember(index)}
                  disabled={members.length <= 2}
                  className="p-3.5 text-red-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed bg-red-50 rounded-xl"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
          
          <button
            onClick={handleAddMember}
            className="mt-4 flex items-center gap-2 text-brand-600 font-medium hover:text-brand-700 p-2"
          >
            <Plus className="w-4 h-4" /> Add another person
          </button>
        </div>
      </div>

      {/* Save Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-slate-100 flex justify-center z-10">
        <div className="w-full max-w-md">
          <button
            onClick={handleSave}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold text-lg py-4 rounded-xl shadow-lg active:scale-[0.98] transition-all"
          >
            Create Group
          </button>
        </div>
      </div>
    </motion.div>
  );
}