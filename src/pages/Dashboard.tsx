import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { Plus, Users, Receipt, Heart, Pin, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Dashboard() {
  const navigate = useNavigate();
  const groups = useStore((state) => state.groups);
  const deleteGroup = useStore((state) => state.deleteGroup);
  const togglePinGroup = useStore((state) => state.togglePinGroup);

  // Sort groups: Pinned first, then by creation date (newest first)
  const sortedGroups = [...groups].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const handleDeleteGroup = (e: React.MouseEvent, id: string, name: string) => {
    e.stopPropagation(); // Prevents clicking the card
    if (window.confirm(`Are you sure you want to permanently delete "${name}"?`)) {
      deleteGroup(id);
    }
  };

  const handlePinGroup = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    togglePinGroup(id);
  };

  return (
    <div className="p-4 pb-28 flex flex-col min-h-[calc(100vh-80px)]">
      <div className="flex-1">
        {groups.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center text-center mt-20">
            <div className="bg-brand-100 p-4 rounded-full mb-4">
              <Receipt className="w-10 h-10 text-brand-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">No groups yet</h2>
            <p className="text-slate-500 mb-8 max-w-[250px]">Create a group for your trip, event, or apartment to start splitting bills.</p>
            <button onClick={() => navigate('/create')} className="bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-colors active:scale-95">
              <Plus className="w-5 h-5" /> Create First Group
            </button>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-800 mb-2">Your Trips & Groups</h2>
            
            {sortedGroups.map((group, index) => {
              const totalSpent = group.expenses.reduce((sum, exp) => sum + exp.amount, 0);
              return (
                <motion.div
                  key={group.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
                  onClick={() => navigate(`/group/${group.id}`)}
                  className={`bg-white p-5 rounded-2xl shadow-sm border cursor-pointer hover:shadow-md transition-all active:scale-[0.98] group relative ${group.isPinned ? 'border-brand-300 bg-brand-50/30' : 'border-slate-100'}`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-lg text-slate-800 pr-16 leading-tight">{group.name}</h3>
                    
                    {/* Quick Action Buttons */}
                    <div className="flex items-center gap-3 absolute top-5 right-4">
                      <button onClick={(e) => handlePinGroup(e, group.id)} className="active:scale-75 transition-transform">
                        <Pin className={`w-5 h-5 ${group.isPinned ? 'fill-brand-500 text-brand-500' : 'text-slate-300 hover:text-brand-400'}`} />
                      </button>
                      <button onClick={(e) => handleDeleteGroup(e, group.id, group.name)} className="active:scale-75 transition-transform text-slate-300 hover:text-red-500">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm mt-4">
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Users className="w-4 h-4" /><span>{group.members.length} members</span>
                    </div>
                    <div className="font-semibold text-brand-700">₹{totalSpent.toFixed(2)} total</div>
                  </div>
                </motion.div>
              );
            })}
            
            <button onClick={() => navigate('/create')} className="fixed bottom-6 right-1/2 translate-x-[9rem] sm:translate-x-[11rem] bg-accent-500 text-white p-4 rounded-full shadow-lg hover:bg-accent-600 active:scale-90 transition-all z-20">
              <Plus className="w-6 h-6" />
            </button>
          </motion.div>
        )}
      </div>

      <div className="pt-10 pb-4 text-center opacity-80">
        <p className="text-sm text-slate-400 flex items-center justify-center gap-1.5">
          Built with <Heart className="w-4 h-4 text-red-500 fill-red-500" /> by 
          <span className="font-bold text-slate-600 tracking-wide">Debanjan Sarkar</span>
        </p>
      </div>
    </div>
  );
}