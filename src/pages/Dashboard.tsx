import { useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { Plus, Users, ArrowRight, Receipt } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Dashboard() {
  const navigate = useNavigate();
  const groups = useStore((state) => state.groups);

  return (
    <div className="p-4 pb-24">
      {groups.length === 0 ? (
        <motion.div 
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center text-center mt-20"
        >
          <div className="bg-brand-100 p-4 rounded-full mb-4">
            <Receipt className="w-10 h-10 text-brand-600" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">No groups yet</h2>
          <p className="text-slate-500 mb-8 max-w-[250px]">
            Create a group for your trip, event, or apartment to start splitting bills.
          </p>
          <button
            onClick={() => navigate('/create')}
            className="bg-brand-600 hover:bg-brand-700 text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-colors active:scale-95"
          >
            <Plus className="w-5 h-5" />
            Create First Group
          </button>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-slate-800">Recent Groups</h2>
          </div>
          
          {groups.map((group, index) => {
            const totalSpent = group.expenses.reduce((sum, exp) => sum + exp.amount, 0);
            
            return (
              <motion.div
                key={group.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => navigate(`/group/${group.id}`)}
                className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 cursor-pointer hover:shadow-md transition-all active:scale-[0.98] group"
              >
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-bold text-lg text-slate-800">{group.name}</h3>
                  <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-brand-500 transition-colors" />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Users className="w-4 h-4" />
                    <span>{group.members.length} members</span>
                  </div>
                  <div className="font-semibold text-brand-700">
                    ₹{totalSpent.toFixed(2)} total
                  </div>
                </div>
              </motion.div>
            );
          })}

          {/* Floating Action Button for adding more groups */}
          <button
            onClick={() => navigate('/create')}
            className="fixed bottom-6 right-1/2 translate-x-[9rem] sm:translate-x-[11rem] bg-accent-500 text-white p-4 rounded-full shadow-lg hover:bg-accent-600 active:scale-90 transition-all z-20"
          >
            <Plus className="w-6 h-6" />
          </button>
        </motion.div>
      )}
    </div>
  );
}