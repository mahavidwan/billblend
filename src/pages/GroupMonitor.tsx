import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import type { Group, Expense } from '../store';
import { calculateSettlements, calculateRawDebts, getMemberLedger } from '../utils/settlement';
import { exportGroupToCSV, exportGroupToJSON } from '../utils/export';
import { ArrowLeft, Plus, ReceiptText, Scale, Share2, Check, Trash2, Edit2, Settings, ShieldCheck, Download, BarChart3, Zap, ChevronDown, CheckCircle2, Circle, Eye, EyeOff, HandCoins, FileText, Trophy, Target, FileDigit } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export type Tab = 'EXPENSES' | 'BALANCES' | 'SETTLE' | 'STATS';

// ============================================================================
// MAIN PARENT COMPONENT (The Shell & Header)
// ============================================================================
export default function GroupMonitor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const group = useStore(state => state.groups.find(g => g.id === id));
  const [activeTab, setActiveTab] = useState<Tab>('EXPENSES');
  const [copied, setCopied] = useState(false);

  if (!group) return <div className="p-8 text-center dark:text-slate-200"><h2 className="text-xl font-bold">Group not found</h2><button onClick={() => navigate('/')}>Go back</button></div>;

  const handleShare = async () => { 
    const encodedData = btoa(encodeURIComponent(JSON.stringify(group)));
    const shareUrl = `${window.location.origin}/import?data=${encodedData}`;
    if (shareUrl.length > 1800) {
      alert("⚠️ Trip too large for a Magic Link!\n\nInstead, we are downloading a secure .json Backup File. Send this to friends to import!");
      exportGroupToJSON(group); return;
    }
    try { await navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 3000); } catch { alert("Failed to copy link."); }
  };

  // Header Metrics
  const activeExpensesAll = group.expenses.filter(e => !e.isSettled);
  const totalSpent = activeExpensesAll.reduce((sum, exp) => exp.isSystemRepayment ? sum : sum + exp.amount, 0);
  const isFullySettled = activeExpensesAll.length === 0 && group.expenses.length > 0;

  return (
    <div className="flex flex-col h-full transition-colors duration-300 pb-24 print:pb-0 print:bg-white">
      
      {/* 🚨 PRINT-ONLY INVOICE HEADER */}
      <div className="hidden print:block p-8 border-b-2 border-slate-200 mb-6">
        <h1 className="text-4xl font-bold text-slate-900 mb-2">BillBlend Trip Report</h1>
        <h2 className="text-2xl font-semibold text-brand-700">{group.name}</h2>
        <p className="text-slate-500 mt-2">Generated on: {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</p>
        <p className="text-slate-500">Status: {isFullySettled ? 'Fully Settled ✓' : 'Active Debts Remaining'}</p>
      </div>

      {/* NORMAL APP HEADER (Hidden on print) */}
      <div className="bg-brand-700 dark:bg-slate-900 text-white px-4 py-6 rounded-b-3xl shadow-md relative border-b border-transparent dark:border-slate-800 transition-colors duration-300 print:hidden">
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-brand-100 dark:text-slate-300 hover:text-white transition-colors active:scale-95"><ArrowLeft className="w-5 h-5" /> <span className="font-medium">Dashboard</span></button>
          <div className="flex items-center gap-2">
            <button onClick={() => exportGroupToCSV(group)} className="bg-brand-600 dark:bg-slate-800 p-2 rounded-full hover:bg-brand-500 dark:hover:bg-slate-700 active:scale-95 transition-all text-white dark:text-brand-400" title="Export to Excel"><Download className="w-5 h-5" /></button>
            <button onClick={handleShare} className="bg-brand-600 dark:bg-slate-800 p-2 rounded-full hover:bg-brand-500 dark:hover:bg-slate-700 active:scale-95 transition-all text-white dark:text-brand-400" title="Share Trip">{copied ? <Check className="w-5 h-5 text-accent-500" /> : <Share2 className="w-5 h-5" />}</button>
            <button onClick={() => navigate(`/group/${group.id}/settings`)} className="bg-brand-600 dark:bg-slate-800 p-2 rounded-full hover:bg-brand-500 dark:hover:bg-slate-700 active:scale-95 transition-all text-white dark:text-brand-400"><Settings className="w-5 h-5" /></button>
          </div>
        </div>
        <h1 className="text-3xl font-bold mb-1 pr-10 text-white dark:text-slate-100">{group.name}</h1>
        <p className="text-brand-100 dark:text-slate-400 font-medium transition-colors">Active Unsettled: <span className="text-white dark:text-brand-400 font-bold text-lg">₹{totalSpent.toFixed(2)}</span></p>
      </div>

      <div className="flex mx-4 mt-4 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-1 transition-colors duration-300 print:hidden">
        {(['EXPENSES', 'BALANCES', 'SETTLE', 'STATS'] as Tab[]).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2.5 text-[10px] sm:text-xs font-bold rounded-lg uppercase tracking-wider transition-all ${activeTab === tab ? 'bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-400 shadow-sm dark:shadow-none' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>{tab}</button>
        ))}
      </div>

      <div className="p-4 flex-1 print:p-0">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="print:opacity-100 print:transform-none">
            {activeTab === 'EXPENSES' && <ExpensesTab group={group} />}
            {activeTab === 'BALANCES' && <BalancesTab group={group} />}
            {activeTab === 'SETTLE' && <SettleTab group={group} setActiveTab={setActiveTab} />}
            {activeTab === 'STATS' && <StatsTab group={group} />}
          </motion.div>
        </AnimatePresence>
      </div>

      <button onClick={() => navigate(`/group/${group.id}/add`)} className="fixed bottom-6 right-1/2 translate-x-[9rem] sm:translate-x-[11rem] bg-accent-500 dark:bg-accent-600 text-white p-4 rounded-full shadow-lg dark:shadow-none hover:bg-accent-600 dark:hover:bg-accent-500 active:scale-90 transition-all z-20 print:hidden">
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}


// ============================================================================
// MODULAR COMPONENT 1: EXPENSES TAB
// ============================================================================
function ExpensesTab({ group }: { group: Group }) {
  const navigate = useNavigate();
  const deleteExpense = useStore(state => state.deleteExpense);
  const [showRepayments, setShowRepayments] = useState(false);

  const activeExpensesAll = group.expenses.filter(e => !e.isSettled);
  const activeUserExpenses = activeExpensesAll.filter(e => !e.isSystemRepayment);
  const activeSystemRepayments = activeExpensesAll.filter(e => e.isSystemRepayment);
  const settledExpenses = group.expenses.filter(e => e.isSettled); 
  const getMemberName = (memberId: string) => group.members.find(m => m.id === memberId)?.name || 'Unknown';

  const renderExpenseCard = (exp: Expense, isActive: boolean, isRepay = false) => (
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
          <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-1 print:text-slate-500">{isRepay ? new Date(exp.date).toLocaleDateString() : exp.splitType.replace('_', ' ')}</p>
        </div>
        {isActive && (
          <div className="flex flex-col gap-1 border-l border-slate-100 dark:border-slate-800 pl-3 transition-colors print:hidden">
            {!isRepay && <button onClick={() => navigate(`/group/${group.id}/expense/${exp.id}/edit`)} className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-brand-600 active:scale-90 bg-slate-50 dark:bg-slate-800 rounded-md transition-all"><Edit2 className="w-3.5 h-3.5" /></button>}
            <button onClick={() => { if(window.confirm(isRepay ? 'Undo this partial repayment?' : 'Delete this expense?')) deleteExpense(group.id, exp.id) }} className="p-1.5 text-slate-400 hover:text-red-500 active:scale-90 bg-slate-50 dark:bg-slate-800 rounded-md transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        )}
        {!isActive && <ShieldCheck className="w-5 h-5 text-accent-400 ml-2 print:hidden" />}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {activeUserExpenses.length === 0 && settledExpenses.length === 0 && (
        <div className="text-center py-10 text-slate-400 flex flex-col items-center print:hidden"><ReceiptText className="w-12 h-12 mb-3 opacity-20" /><p>No expenses logged.</p></div>
      )}
      {activeUserExpenses.length > 0 && <div className="space-y-3">{activeUserExpenses.map(exp => renderExpenseCard(exp, true))}</div>}
      
      {activeSystemRepayments.length > 0 && (
        <div className="pt-2 print:hidden">
          <button onClick={() => setShowRepayments(!showRepayments)} className="w-full flex items-center justify-between bg-brand-50 dark:bg-brand-900/10 border border-brand-100 p-3 rounded-xl text-brand-700 font-bold text-sm">
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


// ============================================================================
// MODULAR COMPONENT 2: BALANCES TAB
// ============================================================================
function BalancesTab({ group }: { group: Group }) {
  const activeExpensesAll = group.expenses.filter(e => !e.isSettled);

  const memberStats = group.members.map(member => {
    let currentNet = 0;
    activeExpensesAll.forEach(exp => {
      if (exp.paidBy === member.id) currentNet += exp.amount;
      const split = exp.splits.find(s => s.memberId === member.id);
      if (split) currentNet -= split.amount;
    });
    return { ...member, currentNet };
  });

  return (
    <div className="space-y-3">
      {memberStats.map(stat => {
        const isPos = stat.currentNet > 0; const isNeg = stat.currentNet < 0;
        return (
          <div key={stat.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 flex justify-between items-center transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300">{stat.name.charAt(0).toUpperCase()}</div>
              <span className="font-bold text-slate-800 dark:text-slate-100">{stat.name}</span>
            </div>
            <div className={`text-right font-bold ${isPos ? 'text-accent-500' : isNeg ? 'text-red-500' : 'text-slate-400'}`}>
              {isPos ? '+' : ''}₹{stat.currentNet.toFixed(2)}
            </div>
          </div>
        );
      })}
    </div>
  );
}


// ============================================================================
// MODULAR COMPONENT 3: SETTLE TAB (With Trace Animations)
// ============================================================================
function SettleTab({ group, setActiveTab }: { group: Group, setActiveTab: (t: Tab) => void }) {
  const settleAllExpenses = useStore(state => state.settleAllExpenses);
  const recordRepayments = useStore(state => state.recordRepayments);
  
  const activeExpensesAll = group.expenses.filter(e => !e.isSettled);
  const settlements = calculateSettlements(group.members, activeExpensesAll);
  const rawDebts = calculateRawDebts(group.members, activeExpensesAll);
  const getMemberName = (memberId: string) => group.members.find(m => m.id === memberId)?.name || 'Unknown';

  const [expandedSettleIdx, setExpandedSettleIdx] = useState<number | null>(null);
  const [selectedSettlements, setSelectedSettlements] = useState<Set<number>>(new Set());

  useEffect(() => { setSelectedSettlements(new Set(settlements.map((_, i) => i))); }, [settlements.length]);

  const handleRecordSettlements = () => {
    if (selectedSettlements.size === 0) return;
    if (selectedSettlements.size === settlements.length) {
      if (window.confirm("Record all settlements and move active expenses to history?")) {
        settleAllExpenses(group.id);
        setActiveTab('EXPENSES');
      }
    } else {
      if (window.confirm(`Record ${selectedSettlements.size} selected settlement(s)?\n\nThis will balance their debts while keeping the remaining ones active.`)) {
        const repaymentsToInject = Array.from(selectedSettlements).map(idx => {
          const s = settlements[idx];
          return {
            amount: s.amount, paidBy: s.from, splitType: 'ON_BEHALF' as const, splits: [{ memberId: s.to, amount: s.amount }],
            description: `Repayment: ${getMemberName(s.from)} paid ${getMemberName(s.to)}`, isSystemRepayment: true
          };
        });
        recordRepayments(group.id, repaymentsToInject);
        setActiveTab('EXPENSES');
      }
    }
  };

  const toggleSettlementSelection = (idx: number) => {
    const newSet = new Set(selectedSettlements);
    if (newSet.has(idx)) newSet.delete(idx); else newSet.add(idx);
    setSelectedSettlements(newSet);
  };
  const toggleSelectAll = () => {
    if (selectedSettlements.size === settlements.length) setSelectedSettlements(new Set());
    else setSelectedSettlements(new Set(settlements.map((_, i) => i)));
  };

  return (
    <div className="space-y-6">
      {activeExpensesAll.length > 0 && (
        <div className="bg-gradient-to-br from-brand-600 to-brand-800 p-4 rounded-xl shadow-lg text-white relative overflow-hidden">
          <Zap className="absolute -right-4 -bottom-4 w-24 h-24 text-white/10" />
          <h3 className="text-sm font-bold text-brand-100 flex items-center gap-2 mb-3"><Zap className="w-4 h-4 text-accent-400" /> BillBlend Optimization</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-black/20 p-3 rounded-lg backdrop-blur-sm">
              <p className="text-[10px] text-brand-200 uppercase font-bold tracking-wider mb-1">Total Transactions</p>
              <div className="flex items-end gap-2"><span className="text-2xl font-bold text-accent-400">{settlements.length}</span><span className="text-sm text-slate-400 line-through mb-1 opacity-70">was {rawDebts.length}</span></div>
            </div>
            <div className="bg-black/20 p-3 rounded-lg backdrop-blur-sm">
              <p className="text-[10px] text-brand-200 uppercase font-bold tracking-wider mb-1">Money Routed</p>
              <div className="flex items-end gap-2"><span className="text-2xl font-bold text-accent-400">₹{settlements.reduce((sum, s) => sum + s.amount, 0).toFixed(0)}</span><span className="text-sm text-slate-400 line-through mb-1 opacity-70">was ₹{rawDebts.reduce((sum, s) => sum + s.amount, 0).toFixed(0)}</span></div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {settlements.length === 0 ? (
          <div className="text-center py-10 text-slate-400"><Scale className="w-12 h-12 mb-3 opacity-20 mx-auto" /><p>All active balances are settled!</p></div>
        ) : (
          <>
            <div className="flex justify-between items-center px-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{selectedSettlements.size} of {settlements.length} Selected</span>
              <button onClick={toggleSelectAll} className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline">
                {selectedSettlements.size === settlements.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            {settlements.map((settlement, idx) => {
              const isExpanded = expandedSettleIdx === idx;
              const isSelected = selectedSettlements.has(idx);
              const debtorLedger = getMemberLedger(settlement.from, activeExpensesAll);
              const creditorLedger = getMemberLedger(settlement.to, activeExpensesAll);

              return (
                <div key={idx} className={`rounded-xl shadow-sm border transition-all duration-300 overflow-hidden ${isSelected ? 'border-accent-400 dark:border-accent-500/50 bg-white dark:bg-slate-900' : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 opacity-70'}`}>
                  
                  <div className="p-4 flex items-center gap-3 cursor-pointer" onClick={() => setExpandedSettleIdx(isExpanded ? null : idx)}>
                    <button onClick={(e) => { e.stopPropagation(); toggleSettlementSelection(idx); }} className="p-1 active:scale-75 transition-transform">
                      {isSelected ? <CheckCircle2 className="w-6 h-6 text-accent-500 fill-accent-100 dark:fill-accent-900/50" /> : <Circle className="w-6 h-6 text-slate-300 dark:text-slate-600" />}
                    </button>
                    <div className="flex-1 text-right font-bold text-slate-700 dark:text-slate-200">{getMemberName(settlement.from)}</div>
                    <div className="flex flex-col items-center px-2 relative group">
                      <span className={`text-xs font-bold mb-1 px-2 py-0.5 rounded-full transition-colors z-10 ${isSelected ? 'bg-accent-50 text-accent-500 dark:bg-accent-900/30' : 'bg-slate-200 text-slate-500 dark:bg-slate-800'}`}>₹{settlement.amount.toFixed(2)}</span>
                      <div className="w-full h-[1px] bg-slate-200 dark:bg-slate-700 relative flex items-center justify-center"><ArrowLeft className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute rotate-180" /></div>
                    </div>
                    <div className="flex-1 text-left font-bold text-brand-700 dark:text-brand-400">{getMemberName(settlement.to)}</div>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 overflow-hidden">
                        <div className="p-4 text-center pb-2"><p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Live Debt Routing Trace</p></div>
                        <div className="flex justify-between px-4 pb-6 relative">
                          <div className="absolute top-3 left-[20%] right-[20%] h-1 bg-slate-200 dark:bg-slate-800 rounded-full animate-flow-line"></div>
                          <div className="w-5/12 z-10 text-center">
                            <div className="w-6 h-6 mx-auto bg-red-100 text-red-600 rounded-full text-xs font-bold flex items-center justify-center mb-2">-</div>
                            <div className="text-left bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                              <p className="text-[10px] font-bold mb-1 border-b pb-1">Why do they owe?</p>
                              {debtorLedger.consumedFromOthers.slice(0,2).map(e => (
                                <div key={e.id} className="text-[9px] text-slate-500 flex justify-between py-0.5"><span className="truncate pr-1">{e.description}</span><span className="font-bold">₹{e.splits.find(s=>s.memberId===settlement.from)?.amount.toFixed(0)}</span></div>
                              ))}
                            </div>
                          </div>
                          <div className="w-5/12 z-10 text-center">
                            <div className="w-6 h-6 mx-auto bg-accent-100 text-accent-600 rounded-full text-xs font-bold flex items-center justify-center mb-2">+</div>
                            <div className="text-left bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                              <p className="text-[10px] font-bold mb-1 border-b pb-1">Why are they owed?</p>
                              {creditorLedger.paidForOthers.slice(0,2).map(e => (
                                <div key={e.id} className="text-[9px] text-slate-500 flex justify-between py-0.5"><span className="truncate pr-1">{e.description}</span><span className="font-bold">₹{e.amount}</span></div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </>
        )}
      </div>
      
      {activeExpensesAll.length > 0 && settlements.length > 0 && (
        <button onClick={handleRecordSettlements} disabled={selectedSettlements.size === 0} className="w-full bg-slate-800 dark:bg-brand-600 disabled:bg-slate-400 dark:disabled:bg-slate-800 disabled:text-slate-300 hover:bg-slate-700 text-white font-bold p-4 rounded-xl shadow-md transition-all active:scale-95 flex justify-center items-center gap-2">
          <ShieldCheck className="w-5 h-5" /> {selectedSettlements.size === settlements.length ? 'Record All Settlements' : `Record ${selectedSettlements.size} Settlement(s)`}
        </button>
      )}
    </div>
  );
}


// ============================================================================
// MODULAR COMPONENT 4: STATS & PDF TAB (Bug Fixed 🚨)
// ============================================================================
function StatsTab({ group }: { group: Group }) {
  const activeExpensesAll = group.expenses.filter(e => !e.isSettled);
  
  // Lifetime ignores system repayments completely for true insights
  const allRealExpenses = group.expenses.filter(e => !e.isSystemRepayment);
  const lifetimeTripCost = allRealExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const avgCostPerPerson = group.members.length > 0 ? lifetimeTripCost / group.members.length : 0;
  
  let biggestExpense: Expense | null = null;
  if (allRealExpenses.length > 0) {
    biggestExpense = allRealExpenses.reduce((prev, curr) => (prev.amount > curr.amount) ? prev : curr);
  }
  const getMemberName = (memberId: string) => group.members.find(m => m.id === memberId)?.name || 'Unknown';

  const lifetimeMemberStats = group.members.map(member => {
    let lifetimePaid = 0; let lifetimeConsumed = 0;
    allRealExpenses.forEach(exp => {
      if (exp.paidBy === member.id) lifetimePaid += exp.amount;
      const split = exp.splits.find(s => s.memberId === member.id);
      if (split) lifetimeConsumed += split.amount;
    });

    let currentNet = 0;
    activeExpensesAll.forEach(exp => {
      if (exp.paidBy === member.id) currentNet += exp.amount;
      const split = exp.splits.find(s => s.memberId === member.id);
      if (split) currentNet -= split.amount;
    });

    return { ...member, lifetimePaid, lifetimeConsumed, currentNet };
  });

  // 🚨 FIXED: Now explicitly referencing maxLifetimeAmount!
  const maxLifetimeAmount = Math.max(...lifetimeMemberStats.map(m => Math.max(m.lifetimePaid, m.lifetimeConsumed)), 1);
  const topSpender = [...lifetimeMemberStats].sort((a, b) => b.lifetimePaid - a.lifetimePaid)[0];

  const generatePDF = () => {
    setTimeout(() => window.print(), 500); 
  };

  return (
    <div className="space-y-6 print:space-y-8">
      <button onClick={generatePDF} className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 rounded-xl active:scale-95 transition-all flex items-center justify-center gap-2 print:hidden shadow-md">
        <FileText className="w-5 h-5" /> Generate PDF Report
      </button>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm print:border-slate-200">
          <Target className="w-5 h-5 text-brand-500 mb-2" />
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Total Trip Cost</p>
          <p className="text-xl font-bold text-slate-800 dark:text-slate-100">₹{lifetimeTripCost.toFixed(0)}</p>
          <p className="text-[10px] text-slate-400 mt-1">₹{avgCostPerPerson.toFixed(0)} avg / person</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm print:border-slate-200">
          <Trophy className="w-5 h-5 text-orange-500 mb-2" />
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Top Spender</p>
          <p className="text-xl font-bold text-slate-800 dark:text-slate-100 truncate">{topSpender?.name || '-'}</p>
          <p className="text-[10px] text-slate-400 mt-1">paid ₹{(topSpender?.lifetimePaid || 0).toFixed(0)} overall</p>
        </div>
      </div>

      {biggestExpense && (
        <div className="bg-gradient-to-r from-brand-50 to-accent-50 dark:from-brand-900/20 dark:to-accent-900/20 p-4 rounded-xl border border-brand-100 dark:border-brand-800/50 flex items-center justify-between print:border-brand-200 print:bg-brand-50">
          <div>
            <p className="text-xs text-brand-600 dark:text-brand-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5"><FileDigit className="w-3.5 h-3.5" /> Largest Expense</p>
            <p className="font-bold text-slate-800 dark:text-slate-100">{biggestExpense.description}</p>
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-brand-700 dark:text-brand-400">₹{biggestExpense.amount.toFixed(0)}</p>
            <p className="text-[10px] text-slate-500">by {getMemberName(biggestExpense.paidBy)}</p>
          </div>
        </div>
      )}

      <h3 className="font-bold text-slate-800 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800 pb-2 mt-6 print:text-black">Individual Analytics Breakdown</h3>
      
      <div className="space-y-4">
        {lifetimeMemberStats.map(stat => (
          <div key={stat.id} className="bg-white dark:bg-slate-900 p-5 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors print:border-slate-200 print:shadow-none">
            <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center justify-between print:text-black">
              <span className="flex items-center gap-2"><BarChart3 className="w-4 h-4 text-slate-400" /> {stat.name}</span>
              <span className={`text-xs px-2 py-1 rounded-md ${stat.currentNet === 0 ? 'bg-slate-100 text-slate-600' : stat.currentNet > 0 ? 'bg-accent-100 text-accent-700' : 'bg-red-100 text-red-700'}`}>
                {stat.currentNet === 0 ? 'Fully Settled' : stat.currentNet > 0 ? `Currently Owed ₹${stat.currentNet.toFixed(0)}` : `Currently Owes ₹${Math.abs(stat.currentNet).toFixed(0)}`}
              </span>
            </h4>
            
            <div className="mb-3">
              <div className="flex justify-between text-xs mb-1.5"><span className="text-slate-500 font-medium">Total Lifetime Paid</span><span className="font-bold text-accent-600">₹{stat.lifetimePaid.toFixed(2)}</span></div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden print:border print:border-slate-200">
                {/* 🚨 FIXED: maxLifetimeAmount used here perfectly! */}
                <motion.div initial={{ width: 0 }} animate={{ width: `${(stat.lifetimePaid / maxLifetimeAmount) * 100}%` }} transition={{ duration: 0.8, ease: "easeOut" }} className="bg-accent-500 h-full rounded-full print:bg-accent-500" style={{ width: `${(stat.lifetimePaid / maxLifetimeAmount) * 100}%` }} />
              </div>
            </div>
            
            <div className="mb-4">
              <div className="flex justify-between text-xs mb-1.5"><span className="text-slate-500 font-medium">Actual Cost (Consumed)</span><span className="font-bold text-orange-500">₹{stat.lifetimeConsumed.toFixed(2)}</span></div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden print:border print:border-slate-200">
                {/* 🚨 FIXED: maxLifetimeAmount used here perfectly! */}
                <motion.div initial={{ width: 0 }} animate={{ width: `${(stat.lifetimeConsumed / maxLifetimeAmount) * 100}%` }} transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }} className="bg-orange-500 h-full rounded-full print:bg-orange-500" style={{ width: `${(stat.lifetimeConsumed / maxLifetimeAmount) * 100}%` }} />
              </div>
            </div>
            
            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg text-xs leading-relaxed font-medium text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-800 print:border-slate-200 print:text-black">
              {stat.name} was responsible for <b>{((stat.lifetimeConsumed / lifetimeTripCost) * 100 || 0).toFixed(1)}%</b> of the total trip cost. They physically paid out <b>₹{stat.lifetimePaid.toFixed(0)}</b> overall.
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}