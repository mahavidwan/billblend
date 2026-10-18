import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import type { Expense } from '../store';
import { calculateSettlements } from '../utils/settlement';
import { ArrowLeft, Plus, ReceiptText, Scale, Share2, Check, Trash2, Edit2, Settings, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Tab = 'EXPENSES' | 'BALANCES' | 'SETTLE';

export default function GroupMonitor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const group = useStore(state => state.groups.find(g => g.id === id));
  const deleteExpense = useStore(state => state.deleteExpense);
  const settleAllExpenses = useStore(state => state.settleAllExpenses);
  
  const [activeTab, setActiveTab] = useState<Tab>('EXPENSES');
  const [copied, setCopied] = useState(false);

  if (!group) return <div className="p-8 text-center"><h2 className="text-xl font-bold">Group not found</h2><button onClick={() => navigate('/')}>Go back</button></div>;

  const handleShare = async () => {
    const encodedData = btoa(encodeURIComponent(JSON.stringify(group)));
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/import?data=${encodedData}`);
      setCopied(true); setTimeout(() => setCopied(false), 3000);
    } catch { alert("Failed to copy link."); }
  };

  const handleSettleUp = () => {
    if (window.confirm("Mark all current balances as settled? This will move these expenses to history and reset active balances to zero.")) {
      settleAllExpenses(group.id);
      setActiveTab('EXPENSES'); // Send them back to expenses to see the magic
    }
  };

  // --- THE MAGIC DATA PARTITION ---
  const activeExpenses = group.expenses.filter(e => !e.isSettled);
  const settledExpenses = group.expenses.filter(e => e.isSettled);

  // Total spent remains the lifetime total of the trip
  const totalSpent = group.expenses.reduce((sum, exp) => sum + exp.amount, 0);
  
  // Settlements are ONLY calculated on active, unsettled expenses
  const settlements = calculateSettlements(group.members, activeExpenses);
  const getMemberName = (memberId: string) => group.members.find(m => m.id === memberId)?.name || 'Unknown';

  // Helper function to render an expense card beautifully
  const renderExpenseCard = (exp: Expense, isActive: boolean) => (
    <div key={exp.id} className={`bg-white p-4 rounded-xl shadow-sm border flex justify-between items-center ${isActive ? 'border-slate-100' : 'border-slate-50 opacity-70'}`}>
      <div>
        <h4 className={`font-bold ${isActive ? 'text-slate-800' : 'text-slate-500 line-through decoration-slate-300'}`}>{exp.description}</h4>
        <p className="text-xs text-slate-500 mt-1">Paid by <span className={`font-semibold ${isActive ? 'text-brand-600' : 'text-slate-500'}`}>{getMemberName(exp.paidBy)}</span></p>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right mr-1">
          <span className={`font-bold text-lg ${isActive ? 'text-slate-800' : 'text-slate-500'}`}>₹{exp.amount.toFixed(2)}</span>
          <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-1">{exp.splitType.replace('_', ' ')}</p>
        </div>
        
        {/* We hide Edit/Delete for settled expenses to enforce data integrity */}
        {isActive && (
          <div className="flex flex-col gap-1 border-l border-slate-100 pl-3">
            <button onClick={() => navigate(`/group/${group.id}/expense/${exp.id}/edit`)} className="p-1.5 text-slate-400 hover:text-brand-600 active:scale-90 bg-slate-50 rounded-md"><Edit2 className="w-3.5 h-3.5" /></button>
            <button onClick={() => { if(window.confirm('Delete this expense?')) deleteExpense(group.id, exp.id) }} className="p-1.5 text-slate-400 hover:text-red-500 active:scale-90 bg-slate-50 rounded-md"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        )}
        {!isActive && <ShieldCheck className="w-5 h-5 text-accent-400 ml-2" />}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-slate-50 pb-24">
      <div className="bg-brand-700 text-white p-4 pt-6 rounded-b-3xl shadow-md relative">
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-brand-100 active:scale-95"><ArrowLeft className="w-5 h-5" /> <span className="font-medium">Dashboard</span></button>
          <div className="flex items-center gap-3">
            <button onClick={handleShare} className="bg-brand-600 p-2 rounded-full hover:bg-brand-500 active:scale-95 transition-all">
              {copied ? <Check className="w-5 h-5 text-accent-500" /> : <Share2 className="w-5 h-5" />}
            </button>
            <button onClick={() => navigate(`/group/${group.id}/settings`)} className="bg-brand-600 p-2 rounded-full hover:bg-brand-500 active:scale-95 transition-all"><Settings className="w-5 h-5" /></button>
          </div>
        </div>
        <h1 className="text-3xl font-bold mb-1 pr-10">{group.name}</h1>
        <p className="text-brand-100 font-medium">Trip Total: <span className="text-white font-bold text-lg">₹{totalSpent.toFixed(2)}</span></p>
      </div>

      <div className="flex mx-4 mt-4 bg-white rounded-xl shadow-sm border border-slate-100 p-1">
        {(['EXPENSES', 'BALANCES', 'SETTLE'] as Tab[]).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2.5 text-sm font-semibold rounded-lg capitalize transition-all ${activeTab === tab ? 'bg-brand-50 text-brand-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>
            {tab.toLowerCase()}
          </button>
        ))}
      </div>

      <div className="p-4 flex-1">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            
            {/* EXPENSES TAB WITH PARTITIONS */}
            {activeTab === 'EXPENSES' && (
              <div className="space-y-6">
                {group.expenses.length === 0 && (
                  <div className="text-center py-10 text-slate-400 flex flex-col items-center">
                    <ReceiptText className="w-12 h-12 mb-3 opacity-20" />
                    <p>No expenses logged yet.</p>
                  </div>
                )}
                
                {activeExpenses.length > 0 && (
                  <div className="space-y-3">
                    {settledExpenses.length > 0 && <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider pl-2">Current Expenses</h3>}
                    {activeExpenses.map(exp => renderExpenseCard(exp, true))}
                  </div>
                )}

                {settledExpenses.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-2 pl-2 mb-4">
                      <ShieldCheck className="w-5 h-5 text-accent-500" />
                      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Settled History</h3>
                    </div>
                    {settledExpenses.map(exp => renderExpenseCard(exp, false))}
                  </div>
                )}
              </div>
            )}

            {/* BALANCES TAB (Calculated ONLY on activeExpenses) */}
            {activeTab === 'BALANCES' && (
              <div className="space-y-3">
                {group.members.map(member => {
                  let balance = 0;
                  activeExpenses.forEach(exp => {
                    if (exp.paidBy === member.id) balance += exp.amount;
                    const split = exp.splits.find(s => s.memberId === member.id);
                    if (split) balance -= split.amount;
                  });
                  const isPos = balance > 0; const isNeg = balance < 0;
                  return (
                    <div key={member.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600">{member.name.charAt(0).toUpperCase()}</div>
                        <span className="font-bold text-slate-800">{member.name}</span>
                      </div>
                      <div className={`text-right font-bold ${isPos ? 'text-accent-500' : isNeg ? 'text-red-500' : 'text-slate-400'}`}>
                        {isPos ? '+' : ''}₹{balance.toFixed(2)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* SETTLE UP TAB */}
            {activeTab === 'SETTLE' && (
              <div className="space-y-6">
                <div className="space-y-3">
                  {settlements.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 flex flex-col items-center">
                      <Scale className="w-12 h-12 mb-3 opacity-20" />
                      <p>All active balances are settled!</p>
                    </div>
                  ) : (
                    settlements.map((settlement, idx) => (
                      <div key={idx} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4">
                        <div className="flex-1 text-right font-bold text-slate-700">{getMemberName(settlement.from)}</div>
                        <div className="flex flex-col items-center px-2">
                          <span className="text-xs font-bold text-accent-500 mb-1 bg-accent-50 px-2 py-0.5 rounded-full">₹{settlement.amount.toFixed(2)}</span>
                          <ArrowLeft className="w-4 h-4 text-slate-300 rotate-180" />
                        </div>
                        <div className="flex-1 text-left font-bold text-brand-700">{getMemberName(settlement.to)}</div>
                      </div>
                    ))
                  )}
                </div>
                
                {/* MID-WAY SETTLEMENT CHECKPOINT BUTTON */}
                {activeExpenses.length > 0 && (
                  <button onClick={handleSettleUp} className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold p-4 rounded-xl shadow-md transition-all active:scale-95 flex justify-center items-center gap-2">
                    <ShieldCheck className="w-5 h-5" /> Mark Balances as Settled
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <button onClick={() => navigate(`/group/${group.id}/add`)} className="fixed bottom-6 right-1/2 translate-x-[9rem] sm:translate-x-[11rem] bg-accent-500 text-white p-4 rounded-full shadow-lg hover:bg-accent-600 active:scale-90 transition-all z-20">
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}