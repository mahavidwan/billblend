import { useState } from 'react';
import { useStore, VIRTUAL_FUND_ID } from '../../store';
import type { Group } from '../../store';
import { cloudSaveExpense, cloudUpdateGroup, cloudDeleteExpense } from '../../utils/firestoreActions';
import { Landmark, Plus, ArrowDownCircle, ShieldCheck, AlertTriangle, RefreshCcw, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Tab } from '../../pages/GroupMonitor';

export default function FundTab({ group, setActiveTab }: { group: Group, setActiveTab: (t: Tab) => void }) {
  const cloudUser = useStore(state => state.cloudUser);
  const addExpense = useStore(state => state.addExpense);
  const deleteExpense = useStore(state => state.deleteExpense); // 🚨 NEW
  const toggleFundClosure = useStore(state => state.toggleFundClosure);
  
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState(''); 
  const [depositorId, setDepositorId] = useState(group.members[0]?.id || '');
  const [isSaving, setIsSaving] = useState(false);

  const isAdmin = !group.isCollaborative || (cloudUser?.email && group.roles?.admin?.includes(cloudUser.email));
  const isEditor = group.isCollaborative && cloudUser?.email && group.roles?.editor?.includes(cloudUser.email);
  const canModifyFund = !group.isCollaborative || isAdmin || isEditor;

  const allDeposits = group.expenses.filter(e => e.splitType === 'FUND_DEPOSIT' && !e.isSettled);
  const totalDeposited = allDeposits.reduce((sum, d) => sum + d.amount, 0);
  const fundExpenses = group.expenses.filter(e => e.paidBy === VIRTUAL_FUND_ID && !e.isSettled);
  const totalSpentFromFund = fundExpenses.reduce((sum, e) => sum + e.amount, 0);
  
  const currentLiquidity = totalDeposited - totalSpentFromFund;
  const getMemberName = (id: string) => group.members.find(m => m.id === id)?.name || 'Unknown';

  const handleRecordDeposit = async () => {
    const amt = parseFloat(depositAmount);
    if (!amt || amt <= 0) { alert("Enter a valid amount."); return; }
    
    setIsSaving(true);
    
    // 🚨 FIX: Generate the unified ID here!
    const masterDepositId = crypto.randomUUID();
    
    const payload = {
      id: masterDepositId,
      description: `Fund Deposit by ${getMemberName(depositorId)}`,
      amount: amt,
      paidBy: depositorId,
      splitType: 'FUND_DEPOSIT' as const,
      splits: [], 
    };

    try {
      if (group.isCollaborative && group.firebaseTripId) {
        await cloudSaveExpense(group.firebaseTripId, {
          ...payload, date: new Date().toISOString(),
          isSettled: false, updatedAt: Date.now(), createdByEmail: cloudUser?.email || 'unknown'
        });
      }
      addExpense(group.id, payload, cloudUser?.email);
      setDepositAmount('');
      setShowDepositModal(false);
    } catch (err) { alert("Failed to save deposit."); }
    finally { setIsSaving(false); }
  };

  // 🚨 NEW: Safe Deposit Deletion Logic
  const handleDeleteDeposit = async (depositId: string, amount: number) => {
    if (!canModifyFund) { alert("You don't have permission to modify the fund."); return; }
    
    // MATHEMATICAL SAFEGUARD
    if (currentLiquidity - amount < 0) {
      alert(`⚠️ Cannot delete this deposit!\n\nThe group has already spent this money. Deleting this would cause the Trip Fund to go negative by ₹${Math.abs(currentLiquidity - amount).toFixed(2)}.\n\nYou must delete some expenses first before removing this deposit.`);
      return;
    }

    if (window.confirm(`Delete this ₹${amount.toFixed(2)} deposit?`)) {
      if (group.isCollaborative && group.firebaseTripId) {
        try {
          await cloudDeleteExpense(group.firebaseTripId, depositId, cloudUser?.email || 'unknown');
        } catch (err) {
          alert("Cloud delete failed. Try again.");
          return;
        }
      }
      deleteExpense(group.id, depositId);
    }
  };

  const handleDissolveFund = async () => {
    if (!isAdmin) { alert("Only Admins can dissolve the fund."); return; }
    if (window.confirm("Dissolve Trip Fund?\n\nThis will trigger the final settlement payouts, calculating exactly who gets the remaining ₹" + currentLiquidity.toFixed(0) + " cash back.")) {
      toggleFundClosure(group.id, true);
      if (group.isCollaborative && group.firebaseTripId) await cloudUpdateGroup(group.firebaseTripId, { isFundClosed: true });
      setActiveTab('SETTLE'); 
    }
  };

  const handleReopenFund = async () => {
    if (!isAdmin) { alert("Only Admins can modify the fund."); return; }
    if (window.confirm("Reopen Trip Fund?\n\nThis will resume pooling and allow new deposits.")) {
      toggleFundClosure(group.id, false);
      if (group.isCollaborative && group.firebaseTripId) await cloudUpdateGroup(group.firebaseTripId, { isFundClosed: false });
    }
  };

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {showDepositModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-xl text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2"><ArrowDownCircle className="w-6 h-6 text-indigo-500" /> Record Deposit</h3>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Who deposited money?</label>
                  <select value={depositorId} onChange={e => setDepositorId(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100">
                    {group.members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Amount (₹)</label>
                  <input type="number" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} placeholder="0.00" className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-800 dark:text-slate-100" />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowDepositModal(false)} className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold py-3 rounded-xl hover:bg-slate-200 transition-colors">Cancel</button>
                <button onClick={handleRecordDeposit} disabled={isSaving || !depositAmount} className="flex-1 bg-indigo-600 disabled:bg-slate-400 text-white font-bold py-3 rounded-xl shadow-md active:scale-95 transition-all">
                  {isSaving ? 'Saving...' : 'Add to Fund'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="bg-gradient-to-br from-indigo-600 to-indigo-900 p-6 rounded-2xl shadow-lg text-white relative overflow-hidden">
        <Landmark className="absolute -right-4 -bottom-4 w-32 h-32 text-white/10" />
        <h3 className="text-sm font-bold text-indigo-100 flex items-center gap-2 mb-4"><Landmark className="w-4 h-4 text-indigo-300" /> Central Trip Fund</h3>
        <div className="mb-6">
          <p className="text-xs text-indigo-200 uppercase font-bold tracking-wider mb-1">Available Liquidity</p>
          <div className="text-4xl font-bold text-white">₹{currentLiquidity.toFixed(2)}</div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-black/20 p-3 rounded-xl backdrop-blur-sm"><p className="text-[10px] text-indigo-200 uppercase font-bold tracking-wider mb-1">Total Collected</p><p className="text-lg font-bold">₹{totalDeposited.toFixed(0)}</p></div>
          <div className="bg-black/20 p-3 rounded-xl backdrop-blur-sm"><p className="text-[10px] text-indigo-200 uppercase font-bold tracking-wider mb-1">Total Spent</p><p className="text-lg font-bold">₹{totalSpentFromFund.toFixed(0)}</p></div>
        </div>
      </div>

      {canModifyFund && !group.isFundClosed && (
        <button onClick={() => setShowDepositModal(true)} className="w-full bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800/50 text-indigo-700 dark:text-indigo-400 font-bold p-4 rounded-xl transition-all active:scale-95 flex justify-center items-center gap-2 shadow-sm">
          <Plus className="w-5 h-5" /> Record New Deposit
        </button>
      )}

      {allDeposits.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider pl-1 mt-4 mb-2">Deposit Ledger</h3>
          {allDeposits.map(dep => (
            <div key={dep.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 flex justify-between items-center transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold"><ArrowDownCircle className="w-5 h-5" /></div>
                <div>
                  <span className="font-bold text-slate-800 dark:text-slate-100 block">{getMemberName(dep.paidBy)}</span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider">{new Date(dep.date).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-bold text-indigo-600 dark:text-indigo-400 text-lg">+₹{dep.amount.toFixed(2)}</span>
                
                {/* 🚨 NEW: DELETE DEPOSIT BUTTON (RBAC Enforced) */}
                {canModifyFund && !group.isFundClosed && (
                  <button onClick={() => handleDeleteDeposit(dep.id, dep.amount)} className="p-1.5 text-slate-400 hover:text-red-500 active:scale-90 bg-slate-50 dark:bg-slate-800 rounded-md transition-all border-l border-slate-100 dark:border-slate-700 ml-2 pl-3">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {group.isFundClosed ? (
        <div className="bg-slate-100 dark:bg-slate-800/50 p-5 rounded-xl border border-slate-200 dark:border-slate-700 text-center space-y-4">
          <div>
            <ShieldCheck className="w-6 h-6 text-slate-400 mx-auto mb-2" />
            <h3 className="font-bold text-slate-600 dark:text-slate-300">Fund is Closed</h3>
            <p className="text-xs text-slate-500 mt-1">Remaining balances have been pushed to the Settle tab for payout.</p>
          </div>
          {canModifyFund && (
            <button onClick={handleReopenFund} className="w-full bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm text-sm">
              <RefreshCcw className="w-4 h-4" /> Reopen Trip Fund
            </button>
          )}
        </div>
      ) : (
        <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
          <div className="bg-orange-50 dark:bg-orange-900/10 p-4 rounded-xl border border-orange-200 dark:border-orange-800/50">
            <h3 className="font-bold text-orange-800 dark:text-orange-400 mb-2 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> End of Trip?</h3>
            <p className="text-xs text-orange-700 dark:text-orange-300 mb-4 leading-relaxed">If the trip is over, dissolving the fund will calculate exactly how much of the remaining ₹{currentLiquidity.toFixed(0)} cash each person gets back as a refund.</p>
            <button onClick={handleDissolveFund} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold p-3 rounded-lg shadow-sm transition-all active:scale-95">Dissolve & Close Trip Fund</button>
          </div>
        </div>
      )}
    </div>
  );
}