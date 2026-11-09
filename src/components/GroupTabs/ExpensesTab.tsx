import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, VIRTUAL_FUND_ID } from '../../store'; // 🚨 NEW: Imported VIRTUAL_FUND_ID
import type { Group, Expense } from '../../store';
import { cloudDeleteExpense } from '../../utils/firestoreActions';
import { ReceiptText, Trash2, Edit2, ShieldCheck, Eye, EyeOff, HandCoins, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ExpensesTab({ group }: { group: Group }) {
  const navigate = useNavigate();
  const deleteExpense = useStore(state => state.deleteExpense);
  const cloudUser = useStore(state => state.cloudUser);
  const [showRepayments, setShowRepayments] = useState(false);

  // 🚨 RBAC SECURITY ENGINE
  const userEmail = cloudUser?.email || '';
  const isAdmin = !group.isCollaborative || (group.roles?.admin?.includes(userEmail));
  const isViewer = group.isCollaborative && !isAdmin && group.roles?.viewer?.includes(userEmail);

  const canModifyExpense = (exp: Expense) => {
    if (!group.isCollaborative) return true; 
    if (isAdmin) return true; 
    if (isViewer) return false; 
    return exp.createdByEmail === userEmail; 
  };

  const activeExpensesAll = group.expenses.filter(e => !e.isSettled);
  const activeUserExpenses = activeExpensesAll.filter(e => !e.isSystemRepayment);
  const activeSystemRepayments = activeExpensesAll.filter(e => e.isSystemRepayment);
  const settledExpenses = group.expenses.filter(e => e.isSettled); 
  
  // 🚨 FIX: Explicitly recognize the Trip Fund!
  const getMemberName = (memberId: string) => {
    if (memberId === VIRTUAL_FUND_ID) return 'Trip Fund 🏦';
    return group.members.find(m => m.id === memberId)?.name || 'Unknown';
  };

  const handleDelete = async (expId: string, isRepay: boolean) => {
    if(window.confirm(isRepay ? 'Undo this partial repayment?' : 'Delete this expense?')) {
      if (group.isCollaborative && group.firebaseTripId) {
        try {
          await cloudDeleteExpense(group.firebaseTripId, expId, userEmail);
        } catch (err) {
          alert("Cloud delete failed. Try again.");
          return;
        }
      }
      deleteExpense(group.id, expId);
    }
  };

  const renderExpenseCard = (exp: Expense, isActive: boolean, isRepay = false) => {
    const hasPermission = canModifyExpense(exp);

    return (
      <div key={exp.id} className={`bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border flex justify-between items-center transition-colors duration-300 ${isActive ? (isRepay ? 'border-brand-200 dark:border-brand-800/50 bg-brand-50/30 dark:bg-brand-900/10' : 'border-slate-100 dark:border-slate-800') : 'border-slate-50 dark:border-slate-800/50 opacity-70'} print:border-slate-200 print:shadow-none print:opacity-100`}>
        <div>
          <h4 className={`font-bold transition-colors flex items-center gap-2 ${isActive ? (isRepay ? 'text-brand-700 dark:text-brand-400' : 'text-slate-800 dark:text-slate-100') : 'text-slate-500 dark:text-slate-500 line-through decoration-slate-300 dark:decoration-slate-600'} print:text-black print:no-underline`}>
            {isRepay && <HandCoins className="w-4 h-4 print:hidden" />} {exp.description}
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 transition-colors print:text-slate-600">
            {isRepay ? 'Recorded by System' : `Paid by `} 
            <span className={`font-semibold ${isActive ? (isRepay ? 'text-brand-600 dark:text-brand-300' : 'text-brand-600 dark:text-brand-400') : 'text-slate-500 dark:text-slate-500'} print:text-slate-800`}>
              {!isRepay && getMemberName(exp.paidBy)}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right mr-1 transition-colors">
            <span className={`font-bold text-lg ${isActive ? (isRepay ? 'text-brand-700 dark:text-brand-400' : 'text-slate-800 dark:text-slate-100') : 'text-slate-500 dark:text-slate-500'} print:text-black`}>₹{exp.amount.toFixed(2)}</span>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-1 print:text-slate-500">
              {isRepay ? new Date(exp.date).toLocaleDateString() : exp.splitType === 'SELECTIVE_EQUAL' ? 'Specific People' : exp.splitType.replace('_', ' ')}
            </p>
          </div>
          
          {isActive && hasPermission && (
            <div className="flex flex-col gap-1 border-l border-slate-100 dark:border-slate-800 pl-3 transition-colors print:hidden">
              {!isRepay && <button onClick={() => navigate(`/group/${group.id}/expense/${exp.id}/edit`)} className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-brand-600 active:scale-90 bg-slate-50 dark:bg-slate-800 rounded-md transition-all"><Edit2 className="w-3.5 h-3.5" /></button>}
              <button onClick={() => handleDelete(exp.id, isRepay)} className="p-1.5 text-slate-400 hover:text-red-500 active:scale-90 bg-slate-50 dark:bg-slate-800 rounded-md transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          )}
          
          {isActive && !hasPermission && (
            <Lock className="w-4 h-4 text-slate-300 dark:text-slate-700 ml-2" />
          )}

          {!isActive && <ShieldCheck className="w-5 h-5 text-accent-400 ml-2 print:hidden" />}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {activeUserExpenses.length === 0 && settledExpenses.length === 0 && (
        <div className="text-center py-10 text-slate-400 flex flex-col items-center print:hidden"><ReceiptText className="w-12 h-12 mb-3 opacity-20" /><p>No expenses logged.</p></div>
      )}
      {activeUserExpenses.length > 0 && <div className="space-y-3">{activeUserExpenses.map(exp => renderExpenseCard(exp, true))}</div>}
      
      {activeSystemRepayments.length > 0 && (
        <div className="pt-2 print:hidden">
          <button onClick={() => setShowRepayments(!showRepayments)} className="w-full flex items-center justify-between bg-brand-50 dark:bg-brand-900/10 border border-brand-100 p-3 rounded-xl text-brand-700 font-bold text-sm hover:bg-brand-100 dark:hover:bg-brand-900/20 transition-colors active:scale-[0.98]">
            <span className="flex items-center gap-2"><HandCoins className="w-4 h-4" /> {activeSystemRepayments.length} Partial Settlements</span>
            {showRepayments ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          <AnimatePresence>
            {showRepayments && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden mt-3 space-y-3">{activeSystemRepayments.map(exp => renderExpenseCard(exp, true, true))}</motion.div>}
          </AnimatePresence>
        </div>
      )}

      {settledExpenses.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-slate-800 print:border-none print:pt-0">
          <div className="flex items-center gap-2 pl-2 mb-4 print:mt-6"><ShieldCheck className="w-5 h-5 text-accent-500 dark:text-accent-600 print:hidden" /><h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider print:text-slate-800 print:text-lg">Settled History</h3></div>
          {settledExpenses.map(exp => renderExpenseCard(exp, false, exp.isSystemRepayment))}
        </div>
      )}
    </div>
  );
}