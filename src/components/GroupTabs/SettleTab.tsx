import { useState, useEffect } from 'react';
import { useStore, VIRTUAL_FUND_ID } from '../../store';
import type { Group } from '../../store';
import { calculateSettlements, calculateRawDebts, getMemberLedger } from '../../utils/settlement';
import { ArrowLeft, Scale, ShieldCheck, Zap, ChevronDown, CheckCircle2, Circle, Landmark } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SettleTab({ group, setActiveTab }: { group: Group, setActiveTab: (t: any) => void }) {
  const settleAllExpenses = useStore(state => state.settleAllExpenses);
  const recordRepayments = useStore(state => state.recordRepayments);
  const cloudUser = useStore(state => state.cloudUser);
  
  // RBAC for Settlements
  const isAdmin = !group.isCollaborative || (cloudUser?.email && group.roles?.admin?.includes(cloudUser.email));
  const isEditor = group.isCollaborative && cloudUser?.email && group.roles?.editor?.includes(cloudUser.email);
  const canSettle = !group.isCollaborative || isAdmin || isEditor;

  const activeExpensesAll = group.expenses.filter(e => !e.isSettled);
  
  // 🚨 Inject the Virtual Fund into the member list for the greedy algorithm
  const membersWithFund = [...group.members];
  if (group.isFundEnabled) {
    membersWithFund.push({ id: VIRTUAL_FUND_ID, name: 'Trip Fund 🏦' });
  }

  const allSettlements = calculateSettlements(membersWithFund, activeExpensesAll);
  const rawDebts = calculateRawDebts(membersWithFund, activeExpensesAll);
  
  // 🚨 Split the settlements for the UI
  const fundPayouts = allSettlements.filter(s => s.from === VIRTUAL_FUND_ID || s.to === VIRTUAL_FUND_ID);
  const userTransfers = allSettlements.filter(s => s.from !== VIRTUAL_FUND_ID && s.to !== VIRTUAL_FUND_ID);

  const getMemberName = (memberId: string) => {
    if (memberId === VIRTUAL_FUND_ID) return 'Trip Fund 🏦';
    return group.members.find(m => m.id === memberId)?.name || 'Unknown';
  };

  const [expandedSettleIdx, setExpandedSettleIdx] = useState<number | null>(null);
  const [selectedSettlements, setSelectedSettlements] = useState<Set<number>>(new Set());

  // Auto-select all user transfers by default
  useEffect(() => { 
    const indices = new Set<number>();
    userTransfers.forEach((_, i) => indices.add(i));
    setSelectedSettlements(indices); 
  }, [userTransfers.length]);

  const handleRecordSettlements = () => {
    if (selectedSettlements.size === 0) return;
    
    if (selectedSettlements.size === userTransfers.length && !group.isFundEnabled) {
      if (window.confirm("Record all settlements and move active expenses to history?")) {
        settleAllExpenses(group.id);
        setActiveTab('EXPENSES');
      }
    } else {
      if (window.confirm(`Record ${selectedSettlements.size} selected settlement(s)?\n\nThis will balance their debts while keeping the remaining ones active.`)) {
        const repaymentsToInject = Array.from(selectedSettlements).map(idx => {
          const s = userTransfers[idx];
          return {
            amount: s.amount, paidBy: s.from, splitType: 'ON_BEHALF' as const, splits: [{ memberId: s.to, amount: s.amount }],
            description: `Repayment: ${getMemberName(s.from)} paid ${getMemberName(s.to)}`, isSystemRepayment: true, createdByEmail: cloudUser?.email || 'unknown'
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
    if (selectedSettlements.size === userTransfers.length) setSelectedSettlements(new Set());
    else setSelectedSettlements(new Set(userTransfers.map((_, i) => i)));
  };

  return (
    <div className="space-y-6">
      
      {/* Optimization Metrics (Ignore Fund in metrics) */}
      {activeExpensesAll.length > 0 && (
        <div className="bg-gradient-to-br from-brand-600 to-brand-800 p-4 rounded-xl shadow-lg text-white relative overflow-hidden">
          <Zap className="absolute -right-4 -bottom-4 w-24 h-24 text-white/10" />
          <h3 className="text-sm font-bold text-brand-100 flex items-center gap-2 mb-3"><Zap className="w-4 h-4 text-accent-400" /> BillBlend Optimization</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-black/20 p-3 rounded-lg backdrop-blur-sm">
              <p className="text-[10px] text-brand-200 uppercase font-bold tracking-wider mb-1">Total Transactions</p>
              <div className="flex items-end gap-2"><span className="text-2xl font-bold text-accent-400">{userTransfers.length}</span><span className="text-sm text-slate-400 line-through mb-1 opacity-70">was {rawDebts.filter(s => s.from !== VIRTUAL_FUND_ID && s.to !== VIRTUAL_FUND_ID).length}</span></div>
            </div>
            <div className="bg-black/20 p-3 rounded-lg backdrop-blur-sm">
              <p className="text-[10px] text-brand-200 uppercase font-bold tracking-wider mb-1">Money Routed</p>
              <div className="flex items-end gap-2"><span className="text-2xl font-bold text-accent-400">₹{userTransfers.reduce((sum, s) => sum + s.amount, 0).toFixed(0)}</span><span className="text-sm text-slate-400 line-through mb-1 opacity-70">was ₹{rawDebts.filter(s => s.from !== VIRTUAL_FUND_ID && s.to !== VIRTUAL_FUND_ID).reduce((sum, s) => sum + s.amount, 0).toFixed(0)}</span></div>
            </div>
          </div>
        </div>
      )}

      {/* 🚨 FUND PAYOUTS (Only visible if the Fund is Closed by Admin) */}
      {group.isFundEnabled && group.isFundClosed && fundPayouts.length > 0 && (
        <div className="space-y-3 pt-2">
          <h3 className="text-sm font-bold text-indigo-500 uppercase tracking-wider pl-1 mb-3 flex items-center gap-2">
            <Landmark className="w-4 h-4" /> Final Fund Payouts
          </h3>
          {fundPayouts.map((payout, idx) => (
            <div key={`fund-${idx}`} className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-xl border border-indigo-200 dark:border-indigo-800 flex items-center gap-4">
              <div className="flex-1 text-right font-bold text-slate-700 dark:text-slate-200">{getMemberName(payout.from)}</div>
              <div className="flex flex-col items-center px-2">
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-1 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-full shadow-sm">₹{payout.amount.toFixed(2)}</span>
                <div className="w-full h-[1px] bg-indigo-200 dark:bg-indigo-800 relative flex items-center justify-center"><ArrowLeft className="w-4 h-4 text-indigo-400 absolute rotate-180" /></div>
              </div>
              <div className="flex-1 text-left font-bold text-brand-700 dark:text-brand-400">{getMemberName(payout.to)}</div>
            </div>
          ))}
          <p className="text-[10px] text-slate-500 text-center mt-2 px-4">These payouts represent the physical cash left in the fund that needs to be handed back to members.</p>
        </div>
      )}

      {/* NORMAL USER TRANSFERS */}
      <div className="space-y-3">
        {userTransfers.length === 0 ? (
          <div className="text-center py-10 text-slate-400"><Scale className="w-12 h-12 mb-3 opacity-20 mx-auto" /><p>No out-of-pocket balances pending!</p></div>
        ) : (
          <>
            <div className="flex justify-between items-center px-1 mt-4">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{selectedSettlements.size} of {userTransfers.length} Selected</span>
              {canSettle && (
                <button onClick={toggleSelectAll} className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline">
                  {selectedSettlements.size === userTransfers.length ? 'Deselect All' : 'Select All'}
                </button>
              )}
            </div>

            {userTransfers.map((settlement, idx) => {
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

                  {/* The Granular Trace Animation */}
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
      
      {canSettle && activeExpensesAll.length > 0 && userTransfers.length > 0 && (
        <button onClick={handleRecordSettlements} disabled={selectedSettlements.size === 0} className="w-full bg-slate-800 dark:bg-brand-600 disabled:bg-slate-400 dark:disabled:bg-slate-800 disabled:text-slate-500 hover:bg-slate-700 dark:hover:bg-brand-500 text-white font-bold p-4 rounded-xl shadow-md transition-all active:scale-95 flex justify-center items-center gap-2">
          <ShieldCheck className="w-5 h-5" /> {selectedSettlements.size === userTransfers.length && !group.isFundEnabled ? 'Record All Settlements' : `Record ${selectedSettlements.size} Settlement(s)`}
        </button>
      )}

      {/* 🚨 Full Final Settle Button for Fund Users */}
      {canSettle && group.isFundEnabled && group.isFundClosed && (
         <button onClick={() => { if(window.confirm("Archive all expenses completely?")) { settleAllExpenses(group.id); setActiveTab('EXPENSES'); } }} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold p-4 rounded-xl shadow-md transition-all active:scale-95 flex justify-center items-center gap-2 mt-4">
           <ShieldCheck className="w-5 h-5" /> Archive Trip Permanently
         </button>
      )}
    </div>
  );
}