import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import type { Expense } from '../store';
import { calculateSettlements, calculateRawDebts, getMemberLedger } from '../utils/settlement';
import { exportGroupToCSV, exportGroupToJSON } from '../utils/export';
import { ArrowLeft, Plus, ReceiptText, Scale, Share2, Check, Trash2, Edit2, Settings, ShieldCheck, Download, BarChart3, Zap, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Tab = 'EXPENSES' | 'BALANCES' | 'SETTLE' | 'STATS';

export default function GroupMonitor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const group = useStore(state => state.groups.find(g => g.id === id));
  const deleteExpense = useStore(state => state.deleteExpense);
  const settleAllExpenses = useStore(state => state.settleAllExpenses);
  
  const [activeTab, setActiveTab] = useState<Tab>('EXPENSES');
  const [copied, setCopied] = useState(false);
  const [expandedSettleIdx, setExpandedSettleIdx] = useState<number | null>(null);

  if (!group) return <div className="p-8 text-center dark:text-slate-200"><h2 className="text-xl font-bold">Group not found</h2><button onClick={() => navigate('/')}>Go back</button></div>;

  const handleShare = async () => {
    const encodedData = btoa(encodeURIComponent(JSON.stringify(group)));
    const shareUrl = `${window.location.origin}/import?data=${encodedData}`;

    if (shareUrl.length > 1800) {
      alert("⚠️ Trip too large for a Magic Link!\n\nMessaging apps limit link lengths. Instead, we are downloading a secure .json Backup File. Send this file to your friends to import!");
      exportGroupToJSON(group); 
      return;
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true); setTimeout(() => setCopied(false), 3000);
    } catch { alert("Failed to copy link."); }
  };

  const activeExpenses = group.expenses.filter(e => !e.isSettled);
  const settledExpenses = group.expenses.filter(e => e.isSettled);
  const totalSpent = group.expenses.reduce((sum, exp) => sum + exp.amount, 0);
  
  const settlements = calculateSettlements(group.members, activeExpenses);
  const rawDebts = calculateRawDebts(group.members, activeExpenses); // Hardcore DSA metric
  
  const getMemberName = (memberId: string) => group.members.find(m => m.id === memberId)?.name || 'Unknown';

  const memberStats = group.members.map(member => {
    let paid = 0; let consumed = 0;
    activeExpenses.forEach(exp => {
      if (exp.paidBy === member.id) paid += exp.amount;
      const split = exp.splits.find(s => s.memberId === member.id);
      if (split) consumed += split.amount;
    });
    return { ...member, paid, consumed, net: paid - consumed };
  });
  
  const maxAmount = Math.max(...memberStats.map(m => Math.max(m.paid, m.consumed)), 1);

  const renderExpenseCard = (exp: Expense, isActive: boolean) => (
    <div key={exp.id} className={`bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border flex justify-between items-center transition-colors duration-300 ${isActive ? 'border-slate-100 dark:border-slate-800' : 'border-slate-50 dark:border-slate-800/50 opacity-70'}`}>
      <div>
        <h4 className={`font-bold transition-colors ${isActive ? 'text-slate-800 dark:text-slate-100' : 'text-slate-500 dark:text-slate-500 line-through decoration-slate-300 dark:decoration-slate-600'}`}>{exp.description}</h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 transition-colors">Paid by <span className={`font-semibold ${isActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-500 dark:text-slate-500'}`}>{getMemberName(exp.paidBy)}</span></p>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right mr-1 transition-colors">
          <span className={`font-bold text-lg ${isActive ? 'text-slate-800 dark:text-slate-100' : 'text-slate-500 dark:text-slate-500'}`}>₹{exp.amount.toFixed(2)}</span>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-1">{exp.splitType.replace('_', ' ')}</p>
        </div>
        {isActive && (
          <div className="flex flex-col gap-1 border-l border-slate-100 dark:border-slate-800 pl-3 transition-colors">
            <button onClick={() => navigate(`/group/${group.id}/expense/${exp.id}/edit`)} className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-brand-600 dark:hover:text-brand-400 active:scale-90 bg-slate-50 dark:bg-slate-800 rounded-md transition-all"><Edit2 className="w-3.5 h-3.5" /></button>
            <button onClick={() => { if(window.confirm('Delete this expense?')) deleteExpense(group.id, exp.id) }} className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 active:scale-90 bg-slate-50 dark:bg-slate-800 rounded-md transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        )}
        {!isActive && <ShieldCheck className="w-5 h-5 text-accent-400 ml-2" />}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full transition-colors duration-300 pb-24">
      {/* Header logic remains the same */}
      <div className="bg-brand-700 dark:bg-slate-900 text-white px-4 py-6 rounded-b-3xl shadow-md relative border-b border-transparent dark:border-slate-800 transition-colors duration-300">
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-brand-100 dark:text-slate-300 hover:text-white transition-colors active:scale-95"><ArrowLeft className="w-5 h-5" /> <span className="font-medium">Dashboard</span></button>
          
          <div className="flex items-center gap-2">
            <button onClick={() => exportGroupToCSV(group)} className="bg-brand-600 dark:bg-slate-800 p-2 rounded-full hover:bg-brand-500 dark:hover:bg-slate-700 active:scale-95 transition-all text-white dark:text-brand-400" title="Export to Excel"><Download className="w-5 h-5" /></button>
            <button onClick={handleShare} className="bg-brand-600 dark:bg-slate-800 p-2 rounded-full hover:bg-brand-500 dark:hover:bg-slate-700 active:scale-95 transition-all text-white dark:text-brand-400" title="Share Trip">{copied ? <Check className="w-5 h-5 text-accent-500" /> : <Share2 className="w-5 h-5" />}</button>
            <button onClick={() => navigate(`/group/${group.id}/settings`)} className="bg-brand-600 dark:bg-slate-800 p-2 rounded-full hover:bg-brand-500 dark:hover:bg-slate-700 active:scale-95 transition-all text-white dark:text-brand-400"><Settings className="w-5 h-5" /></button>
          </div>
        </div>
        <h1 className="text-3xl font-bold mb-1 pr-10 text-white dark:text-slate-100">{group.name}</h1>
        <p className="text-brand-100 dark:text-slate-400 font-medium transition-colors">Trip Total: <span className="text-white dark:text-brand-400 font-bold text-lg">₹{totalSpent.toFixed(2)}</span></p>
      </div>

      <div className="flex mx-4 mt-4 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-1 transition-colors duration-300">
        {(['EXPENSES', 'BALANCES', 'SETTLE', 'STATS'] as Tab[]).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2.5 text-[10px] sm:text-xs font-bold rounded-lg uppercase tracking-wider transition-all ${activeTab === tab ? 'bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-400 shadow-sm dark:shadow-none' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
            {tab}
          </button>
        ))}
      </div>

      <div className="p-4 flex-1">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
            
            {activeTab === 'EXPENSES' && (
              <div className="space-y-6">
                {activeExpenses.length === 0 && settledExpenses.length === 0 && (
                  <div className="text-center py-10 text-slate-400 flex flex-col items-center"><ReceiptText className="w-12 h-12 mb-3 opacity-20" /><p>No expenses logged.</p></div>
                )}
                {activeExpenses.length > 0 && <div className="space-y-3">{activeExpenses.map(exp => renderExpenseCard(exp, true))}</div>}
                {settledExpenses.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-2 pl-2 mb-4"><ShieldCheck className="w-5 h-5 text-accent-500 dark:text-accent-600" /><h3 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Settled History</h3></div>
                    {settledExpenses.map(exp => renderExpenseCard(exp, false))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'BALANCES' && (
              <div className="space-y-3">
                {group.members.map(member => {
                  const stat = memberStats.find(m => m.id === member.id);
                  const balance = stat ? stat.net : 0;
                  const isPos = balance > 0; const isNeg = balance < 0;
                  return (
                    <div key={member.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border flex justify-between items-center transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold">{member.name.charAt(0).toUpperCase()}</div>
                        <span className="font-bold">{member.name}</span>
                      </div>
                      <div className={`text-right font-bold ${isPos ? 'text-accent-500' : isNeg ? 'text-red-500' : 'text-slate-400'}`}>
                        {isPos ? '+' : ''}₹{balance.toFixed(2)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 🚨 THE UPGRADED SETTLE TAB WITH GRANULAR TRACE ENGINE */}
            {activeTab === 'SETTLE' && (
              <div className="space-y-6">
                
                {/* 1. The Optimization Engine Metrics */}
                {activeExpenses.length > 0 && (
                  <div className="bg-gradient-to-br from-brand-600 to-brand-800 p-4 rounded-xl shadow-lg text-white relative overflow-hidden">
                    <Zap className="absolute -right-4 -bottom-4 w-24 h-24 text-white/10" />
                    <h3 className="text-sm font-bold text-brand-100 flex items-center gap-2 mb-3"><Zap className="w-4 h-4 text-accent-400" /> BillBlend Optimization</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-black/20 p-3 rounded-lg backdrop-blur-sm">
                        <p className="text-[10px] text-brand-200 uppercase font-bold tracking-wider mb-1">Total Transactions</p>
                        <div className="flex items-end gap-2">
                          <span className="text-2xl font-bold text-accent-400">{settlements.length}</span>
                          <span className="text-sm text-slate-400 line-through mb-1 opacity-70">was {rawDebts.length}</span>
                        </div>
                      </div>
                      <div className="bg-black/20 p-3 rounded-lg backdrop-blur-sm">
                        <p className="text-[10px] text-brand-200 uppercase font-bold tracking-wider mb-1">Money Routed</p>
                        <div className="flex items-end gap-2">
                          <span className="text-2xl font-bold text-accent-400">₹{settlements.reduce((sum, s) => sum + s.amount, 0).toFixed(0)}</span>
                          <span className="text-sm text-slate-400 line-through mb-1 opacity-70">was ₹{rawDebts.reduce((sum, s) => sum + s.amount, 0).toFixed(0)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {settlements.length === 0 ? (
                    <div className="text-center py-10 text-slate-400"><Scale className="w-12 h-12 mb-3 opacity-20 mx-auto" /><p>All active balances are settled!</p></div>
                  ) : (
                    settlements.map((settlement, idx) => {
                      const isExpanded = expandedSettleIdx === idx;
                      const debtorLedger = getMemberLedger(settlement.from, activeExpenses);
                      const creditorLedger = getMemberLedger(settlement.to, activeExpenses);

                      return (
                        <div key={idx} className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 transition-all duration-300 overflow-hidden">
                          
                          {/* Main Settlement Card (Clickable) */}
                          <div 
                            onClick={() => setExpandedSettleIdx(isExpanded ? null : idx)}
                            className="p-4 flex items-center gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                          >
                            <div className="flex-1 text-right font-bold text-slate-700 dark:text-slate-200">{getMemberName(settlement.from)}</div>
                            <div className="flex flex-col items-center px-2">
                              <span className="text-xs font-bold text-accent-500 dark:text-accent-400 mb-1 bg-accent-50 dark:bg-accent-900/20 px-2 py-0.5 rounded-full transition-colors z-10">₹{settlement.amount.toFixed(2)}</span>
                              <div className="w-full h-[1px] bg-slate-200 dark:bg-slate-700 relative flex items-center justify-center">
                                <ArrowLeft className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute rotate-180" />
                              </div>
                            </div>
                            <div className="flex-1 text-left font-bold text-brand-700 dark:text-brand-400">{getMemberName(settlement.to)}</div>
                            <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </div>

                          {/* 2. THE GRANULAR TRACE VISUALIZATION */}
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 overflow-hidden">
                                
                                <div className="p-4 text-center pb-2">
                                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Live Debt Routing Trace</p>
                                </div>

                                <div className="flex justify-between px-4 pb-6 relative">
                                  
                                  {/* THE GLOWING ANIMATED FLOW LINE */}
                                  <div className="absolute top-3 left-[20%] right-[20%] h-1 bg-slate-200 dark:bg-slate-800 rounded-full animate-flow-line"></div>

                                  {/* Debtor Breakdown */}
                                  <div className="w-5/12 z-10 text-center">
                                    <div className="w-6 h-6 mx-auto bg-red-100 dark:bg-red-900/40 text-red-600 rounded-full text-xs font-bold flex items-center justify-center mb-2 shadow-sm border border-red-200 dark:border-red-800">-</div>
                                    <p className="text-[10px] text-slate-500 mb-2">Total Pool Debt: <span className="font-bold text-red-500">₹{Math.abs(debtorLedger.netBalance).toFixed(2)}</span></p>
                                    <div className="text-left bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                                      <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1 border-b pb-1">Why do they owe?</p>
                                      {debtorLedger.consumedFromOthers.slice(0,2).map(e => (
                                        <div key={e.id} className="text-[9px] text-slate-500 flex justify-between py-0.5">
                                          <span className="truncate pr-1">{e.description}</span>
                                          <span className="font-bold text-slate-700 dark:text-slate-400">₹{e.splits.find(s=>s.memberId===settlement.from)?.amount.toFixed(0)}</span>
                                        </div>
                                      ))}
                                      {debtorLedger.consumedFromOthers.length > 2 && <p className="text-[9px] text-slate-400 italic">...and more</p>}
                                    </div>
                                  </div>

                                  {/* Creditor Breakdown */}
                                  <div className="w-5/12 z-10 text-center">
                                    <div className="w-6 h-6 mx-auto bg-accent-100 dark:bg-accent-900/40 text-accent-600 rounded-full text-xs font-bold flex items-center justify-center mb-2 shadow-sm border border-accent-200 dark:border-accent-800">+</div>
                                    <p className="text-[10px] text-slate-500 mb-2">Total Pool Credit: <span className="font-bold text-accent-500">₹{creditorLedger.netBalance.toFixed(2)}</span></p>
                                    <div className="text-left bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm">
                                      <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300 mb-1 border-b pb-1">Why are they owed?</p>
                                      {creditorLedger.paidForOthers.slice(0,2).map(e => (
                                        <div key={e.id} className="text-[9px] text-slate-500 flex justify-between py-0.5">
                                          <span className="truncate pr-1">{e.description}</span>
                                          <span className="font-bold text-slate-700 dark:text-slate-400">₹{e.amount} total</span>
                                        </div>
                                      ))}
                                      {creditorLedger.paidForOthers.length > 2 && <p className="text-[9px] text-slate-400 italic">...and more</p>}
                                    </div>
                                  </div>

                                </div>
                                <div className="bg-brand-50 dark:bg-brand-900/20 p-2 text-center text-[10px] font-medium text-brand-700 dark:text-brand-400 border-t border-brand-100 dark:border-brand-800">
                                  The engine automatically paired their net balances to save time!
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })
                  )}
                </div>
                
                {activeExpenses.length > 0 && (
                  <button onClick={() => { if(window.confirm("Mark as Settled?")) { settleAllExpenses(group.id); setActiveTab('EXPENSES'); } }} className="w-full bg-slate-800 dark:bg-brand-600 hover:bg-slate-700 text-white font-bold p-4 rounded-xl shadow-md transition-all active:scale-95 flex justify-center items-center gap-2">
                    <ShieldCheck className="w-5 h-5" /> Mark Balances as Settled
                  </button>
                )}
              </div>
            )}

            {/* STATS TAB */}
            {activeTab === 'STATS' && (
               <div className="space-y-4">
                  {memberStats.map(stat => (
                    <div key={stat.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
                      <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-slate-400" /> {stat.name}
                      </h4>
                      <div className="mb-3">
                        <div className="flex justify-between text-xs mb-1.5"><span className="text-slate-500 font-medium">Total Paid</span><span className="font-bold text-accent-600">₹{stat.paid.toFixed(2)}</span></div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${(stat.paid / maxAmount) * 100}%` }} transition={{ duration: 0.8, ease: "easeOut" }} className="bg-accent-500 h-full rounded-full" />
                        </div>
                      </div>
                      <div className="mb-4">
                        <div className="flex justify-between text-xs mb-1.5"><span className="text-slate-500 font-medium">Their Share (Consumed)</span><span className="font-bold text-orange-500">₹{stat.consumed.toFixed(2)}</span></div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${(stat.consumed / maxAmount) * 100}%` }} transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }} className="bg-orange-500 h-full rounded-full" />
                        </div>
                      </div>
                      <div className={`p-3 rounded-lg text-xs leading-relaxed font-medium text-center ${stat.net > 0 ? 'bg-accent-50 text-accent-700' : stat.net < 0 ? 'bg-red-50 text-red-700' : 'bg-slate-50 text-slate-600'}`}>
                        {stat.net > 0 ? `${stat.name} paid more than their share. The group owes them ₹${stat.net.toFixed(2)}.` : stat.net < 0 ? `${stat.name}'s share is larger than what they paid. They owe the group ₹${Math.abs(stat.net).toFixed(2)}.` : `${stat.name} paid exactly for their share. Perfectly balanced!`}
                      </div>
                    </div>
                  ))}
               </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <button onClick={() => navigate(`/group/${group.id}/add`)} className="fixed bottom-6 right-1/2 translate-x-[9rem] sm:translate-x-[11rem] bg-accent-500 text-white p-4 rounded-full shadow-lg hover:bg-accent-600 active:scale-90 z-20">
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}