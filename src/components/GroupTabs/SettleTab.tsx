import { useState, useEffect } from 'react';
import { useStore, VIRTUAL_FUND_ID } from '../../store';
import type { Group, Expense } from '../../store';
import { calculateSettlements, calculateRawDebts, getMemberLedger } from '../../utils/settlement';
import { cloudSettleAll, cloudBulkUpdateExpenses } from '../../utils/firestoreActions'; 
import { ArrowLeft, Scale, ShieldCheck, Zap, ChevronDown, CheckCircle2, Circle, Landmark } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Tab } from '../../pages/GroupMonitor';

export default function SettleTab({ group, setActiveTab }: { group: Group, setActiveTab: (t: Tab) => void }) {
  const settleAllExpenses = useStore(state => state.settleAllExpenses);
  const recordRepayments = useStore(state => state.recordRepayments);
  const cloudUser = useStore(state => state.cloudUser);
  
  const isAdmin = !group.isCollaborative || (cloudUser?.email && group.roles?.admin?.includes(cloudUser.email));
  const isEditor = group.isCollaborative && cloudUser?.email && group.roles?.editor?.includes(cloudUser.email);
  const canSettle = !group.isCollaborative || isAdmin || isEditor;
  const [isProcessing, setIsProcessing] = useState(false); 

  const activeExpensesAll = group.expenses.filter(e => !e.isSettled);
  
  // 🚨 THE PERFECT LEDGER MATH 
  // We feed ONLY human members into the Min-Cash Flow algorithm to calculate pure P2P debts.
  const p2pSettlements = calculateSettlements(group.members, activeExpensesAll);
  const rawDebts = calculateRawDebts(group.members, activeExpensesAll);
  
  const getMemberName = (memberId: string) => {
    if (memberId === VIRTUAL_FUND_ID) return 'Trip Fund 🏦';
    return group.members.find(m => m.id === memberId)?.name || 'Unknown';
  };

  const [expandedSettleIdx, setExpandedSettleIdx] = useState<number | null>(null);
  const [selectedSettlements, setSelectedSettlements] = useState<Set<number>>(new Set());

  useEffect(() => { 
    const indices = new Set<number>();
    p2pSettlements.forEach((_, i) => indices.add(i));
    setSelectedSettlements(indices); 
  }, [p2pSettlements.length]);

  const handleRecordSettlements = async () => {
    if (selectedSettlements.size === 0 || isProcessing) return;
    setIsProcessing(true);
    
    try {
      if (selectedSettlements.size === p2pSettlements.length && !group.isFundEnabled) {
        if (window.confirm("Record all settlements and move active expenses to history?")) {
          // 🚨 TRUE UDF ENFORCEMENT: Cloud OR Local, never both!
          if (group.isCollaborative && group.firebaseTripId) {
            await cloudSettleAll(group.firebaseTripId, activeExpensesAll);
          } else {
            settleAllExpenses(group.id);
          }
          setActiveTab('EXPENSES');
        }
      } else {
        if (window.confirm(`Record ${selectedSettlements.size} selected settlement(s)?\n\nThis will balance their debts while keeping the remaining ones active.`)) {
          
          const repaymentsToInject: Expense[] = Array.from(selectedSettlements).map(idx => {
            const s = p2pSettlements[idx];
            return {
              id: crypto.randomUUID(), // unified ID
              amount: s.amount, 
              paidBy: s.from, 
              splitType: 'ON_BEHALF' as const, 
              splits: [{ memberId: s.to, amount: s.amount }],
              description: `Repayment: ${getMemberName(s.from)} paid ${getMemberName(s.to)}`, 
              isSystemRepayment: true, 
              createdByEmail: cloudUser?.email || 'unknown',
              date: new Date().toISOString(),
              isSettled: false,
              updatedAt: Date.now()
            };
          });

          // 🚨 TRUE UDF ENFORCEMENT
          if (group.isCollaborative && group.firebaseTripId) {
            await cloudBulkUpdateExpenses(group.firebaseTripId, repaymentsToInject);
          } else {
            recordRepayments(group.id, repaymentsToInject as any);
          }
          setActiveTab('EXPENSES');
        }
      }
    } catch (err) {
      alert("Failed to sync settlements to cloud. Check internet connection.");
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleSettlementSelection = (idx: number) => {
    const newSet = new Set(selectedSettlements);
    if (newSet.has(idx)) newSet.delete(idx); else newSet.add(idx);
    setSelectedSettlements(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedSettlements.size === p2pSettlements.length) setSelectedSettlements(new Set());
    else setSelectedSettlements(new Set(p2pSettlements.map((_, i) => i)));
  };

  // 🚨 CALCULATE FINAL FUND PAYOUTS
  const allDeposits = activeExpensesAll.filter(e => e.splitType === 'FUND_DEPOSIT');
  const fundExpenses = activeExpensesAll.filter(e => e.paidBy === VIRTUAL_FUND_ID);
  const currentLiquidity = allDeposits.reduce((sum, d) => sum + d.amount, 0) - fundExpenses.reduce((sum, e) => sum + e.amount, 0);
  
  const finalPayouts: { memberId: string; amount: number }[] = [];
  if (group.isFundClosed && currentLiquidity > 0.01) {
    const balances: Record<string, number> = {};
    group.members.forEach(m => balances[m.id] = 0);
    
    // We calculate Absolute Net Balances (Deposits + OOP - Consumptions)
    activeExpensesAll.forEach(exp => {
      if (exp.paidBy !== VIRTUAL_FUND_ID && balances[exp.paidBy] !== undefined) balances[exp.paidBy] += exp.amount; 
      exp.splits.forEach(s => { if (balances[s.memberId] !== undefined) balances[s.memberId] -= s.amount; });
    });
    
    // Because the Fund is closed, the ONLY positive balances left *should* equal the Fund Liquidity!
    Object.entries(balances).forEach(([id, amt]) => {
      if (amt >= 0.01) finalPayouts.push({ memberId: id, amount: amt });
    });
  }

  // 🚨 MASTER ARCHIVE 
  const handleArchiveTrip = async () => {
    if(window.confirm("Archive all expenses completely?\n\nThis marks all P2P debts and Fund Payouts as fully resolved and clears your dashboard for the next leg of the trip.")) {
      setIsProcessing(true);
      try {
        // 🚨 TRUE UDF ENFORCEMENT
        if (group.isCollaborative && group.firebaseTripId) {
          await cloudSettleAll(group.firebaseTripId, activeExpensesAll);
        } else {
          settleAllExpenses(group.id);
        }
        setActiveTab('EXPENSES');
      } catch (err) {
        alert("Failed to archive on cloud. Try again.");
      } finally {
        setIsProcessing(false);
      }
    }
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
              <div className="flex items-end gap-2"><span className="text-2xl font-bold text-accent-400">{p2pSettlements.length}</span><span className="text-sm text-slate-400 line-through mb-1 opacity-70">was {rawDebts.length}</span></div>
            </div>
            <div className="bg-black/20 p-3 rounded-lg backdrop-blur-sm">
              <p className="text-[10px] text-brand-200 uppercase font-bold tracking-wider mb-1">Money Routed</p>
              <div className="flex items-end gap-2"><span className="text-2xl font-bold text-accent-400">₹{p2pSettlements.reduce((sum, s) => sum + s.amount, 0).toFixed(0)}</span><span className="text-sm text-slate-400 line-through mb-1 opacity-70">was ₹{rawDebts.reduce((sum, s) => sum + s.amount, 0).toFixed(0)}</span></div>
            </div>
          </div>
        </div>
      )}

      {/* 🚨 THE FINAL CASH REFUNDS (Only when Fund is Dissolved) */}
      {group.isFundEnabled && group.isFundClosed && finalPayouts.length > 0 && (
        <div className="space-y-3 pt-2">
          <h3 className="text-sm font-bold text-indigo-500 uppercase tracking-wider pl-1 mb-3 flex items-center gap-2">
            <Landmark className="w-4 h-4" /> Final Cash Refunds
          </h3>
          <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-200 dark:border-indigo-800 space-y-4">
            <p className="text-xs text-indigo-700 dark:text-indigo-300 font-medium">Distribute the remaining physical ₹{currentLiquidity.toFixed(2)} cash from the Fund Bag to the following people:</p>
            {finalPayouts.map((payout, idx) => (
              <div key={`payout-${idx}`} className="flex justify-between items-center bg-white dark:bg-slate-900 p-3 rounded-lg shadow-sm">
                <span className="font-bold text-slate-700 dark:text-slate-200">{getMemberName(payout.memberId)}</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">Receives ₹{payout.amount.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 🚨 NORMAL OUT-OF-POCKET TRANSFERS */}
      <div className="space-y-3">
        {p2pSettlements.length === 0 ? (
          <div className="text-center py-10 text-slate-400"><Scale className="w-12 h-12 mb-3 opacity-20 mx-auto" /><p>No out-of-pocket balances pending!</p></div>
        ) : (
          <>
            <div className="flex justify-between items-center px-1 mt-4">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{selectedSettlements.size} of {p2pSettlements.length} Selected</span>
              {canSettle && (
                <button onClick={toggleSelectAll} className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline">
                  {selectedSettlements.size === p2pSettlements.length ? 'Deselect All' : 'Select All'}
                </button>
              )}
            </div>

            {p2pSettlements.map((settlement, idx) => {
              const isExpanded = expandedSettleIdx === idx;
              const isSelected = selectedSettlements.has(idx);
              const debtorLedger = getMemberLedger(settlement.from, activeExpensesAll);
              const creditorLedger = getMemberLedger(settlement.to, activeExpensesAll);

              return (
                <div key={idx} className={`rounded-xl shadow-sm border transition-all duration-300 overflow-hidden ${isSelected ? 'border-accent-400 dark:border-accent-500/50 bg-white dark:bg-slate-900' : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 opacity-70'}`}>
                  
                  <div className="p-4 flex items-center gap-3 cursor-pointer" onClick={() => setExpandedSettleIdx(isExpanded ? null : idx)}>
                    <button onClick={(e) => { e.stopPropagation(); if (canSettle) toggleSettlementSelection(idx); }} className="p-1 active:scale-75 transition-transform" disabled={!canSettle}>
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
                            <div className="w-6 h-6 mx-auto bg-red-100 text-red-600 rounded-full text-xs font-bold flex items-center justify-center mb-2 shadow-sm border border-red-200 dark:border-red-900/50">-</div>
                            <div className="text-left bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                              <p className="text-[10px] font-bold mb-1 border-b dark:border-slate-700 pb-1">Why do they owe?</p>
                              {debtorLedger.consumedFromOthers.slice(0,2).map(e => (
                                <div key={e.id} className="text-[9px] text-slate-500 dark:text-slate-400 flex justify-between py-0.5"><span className="truncate pr-1">{e.description}</span><span className="font-bold text-slate-700 dark:text-slate-300">₹{e.splits.find(s=>s.memberId===settlement.from)?.amount.toFixed(0)}</span></div>
                              ))}
                            </div>
                          </div>
                          <div className="w-5/12 z-10 text-center">
                            <div className="w-6 h-6 mx-auto bg-accent-100 text-accent-600 rounded-full text-xs font-bold flex items-center justify-center mb-2 shadow-sm border border-accent-200 dark:border-accent-900/50">+</div>
                            <div className="text-left bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                              <p className="text-[10px] font-bold mb-1 border-b dark:border-slate-700 pb-1">Why are they owed?</p>
                              {creditorLedger.paidForOthers.slice(0,2).map(e => (
                                <div key={e.id} className="text-[9px] text-slate-500 dark:text-slate-400 flex justify-between py-0.5"><span className="truncate pr-1">{e.description}</span><span className="font-bold text-slate-700 dark:text-slate-300">₹{e.amount}</span></div>
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
      
      {/* 🚨 SAFETY LOCK: You CANNOT dissolve the fund until P2P debts are settled! */}
      {canSettle && group.isFundEnabled && !group.isFundClosed && p2pSettlements.length > 0 && (
        <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl border border-orange-200 dark:border-orange-800/50 mt-6 text-center">
          <p className="text-xs font-bold text-orange-700 dark:text-orange-400 mb-2">Fund Closure Locked</p>
          <p className="text-xs text-orange-600 dark:text-orange-300">You must record all {p2pSettlements.length} Out-of-Pocket settlements above before you can dissolve the Trip Fund and distribute the remaining physical cash.</p>
        </div>
      )}

      {canSettle && activeExpensesAll.length > 0 && p2pSettlements.length > 0 && (
        <button onClick={handleRecordSettlements} disabled={selectedSettlements.size === 0 || isProcessing} className="w-full bg-slate-800 dark:bg-brand-600 disabled:bg-slate-400 dark:disabled:bg-slate-800 disabled:text-slate-500 hover:bg-slate-700 dark:hover:bg-brand-500 text-white font-bold p-4 rounded-xl shadow-md transition-all active:scale-95 flex justify-center items-center gap-2 mt-4">
          <ShieldCheck className="w-5 h-5" /> {isProcessing ? "Processing..." : (selectedSettlements.size === p2pSettlements.length && !group.isFundEnabled ? 'Record All Settlements' : `Record ${selectedSettlements.size} Settlement(s)`)}
        </button>
      )}

      {/* 🚨 MASTER ARCHIVE (Only enabled when Fund is Dissolved and P2P is settled) */}
      {canSettle && group.isFundEnabled && group.isFundClosed && p2pSettlements.length === 0 && (
         <button onClick={handleArchiveTrip} disabled={isProcessing} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-400 text-white font-bold p-4 rounded-xl shadow-md transition-all active:scale-95 flex justify-center items-center gap-2 mt-4">
           <ShieldCheck className="w-5 h-5" /> {isProcessing ? "Archiving..." : "Archive Trip Permanently"}
         </button>
      )}
    </div>
  );
}