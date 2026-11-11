import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { exportGroupToCSV, exportGroupToJSON } from '../utils/export';
import { ArrowLeft, Share2, Check, Settings, Download, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import ExpensesTab from '../components/GroupTabs/ExpensesTab';
import BalancesTab from '../components/GroupTabs/BalancesTab';
import SettleTab from '../components/GroupTabs/SettleTab';
import StatsTab from '../components/GroupTabs/StatsTab';
import FundTab from '../components/GroupTabs/FundTab'; 

export type Tab = 'EXPENSES' | 'BALANCES' | 'SETTLE' | 'STATS' | 'FUND';

export default function GroupMonitor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const group = useStore(state => state.groups.find(g => g.id === id));
  const cloudUser = useStore(state => state.cloudUser); 
  
  const [activeTab, setActiveTab] = useState<Tab>('EXPENSES');
  const [copied, setCopied] = useState(false);

  if (!group) return <div className="p-8 text-center dark:text-slate-200"><h2 className="text-xl font-bold">Group not found</h2><button onClick={() => navigate('/')}>Go back</button></div>;

  const isAdmin = !group.isCollaborative || (cloudUser?.email && group.roles?.admin?.includes(cloudUser.email));
  const isEditor = group.isCollaborative && cloudUser?.email && group.roles?.editor?.includes(cloudUser.email);
  const canAddExpense = !group.isCollaborative || isAdmin || isEditor;

  const handleShare = async () => { 
    const encodedData = btoa(encodeURIComponent(JSON.stringify(group)));
    const shareUrl = `${window.location.origin}/import?data=${encodedData}`;
    if (shareUrl.length > 1800) {
      alert("⚠️ Trip too large for a Magic Link!\n\nInstead, we are downloading a secure .json Backup File. Send this to friends to import!");
      exportGroupToJSON(group); return;
    }
    try { await navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 3000); } catch { alert("Failed to copy link."); }
  };

  const activeExpensesAll = group.expenses.filter(e => !e.isSettled);
  const isFullySettled = activeExpensesAll.length === 0 && group.expenses.length > 0;
  
  // 🚨 FIX 2: Header Math - Ignore Fund Deposits and System Repayments!
  const trueActiveCost = activeExpensesAll.reduce((sum, exp) => {
    if (exp.isSystemRepayment || exp.splitType === 'FUND_DEPOSIT') return sum;
    return sum + exp.amount;
  }, 0);

  return (
    <div className="flex flex-col h-full transition-colors duration-300 pb-24 print:pb-0 print:bg-white">
      
      <div className="hidden print:block p-8 border-b-2 border-slate-200 mb-6">
        <h1 className="text-4xl font-bold text-slate-900 mb-2">BillBlend Trip Report</h1>
        <h2 className="text-2xl font-semibold text-brand-700">{group.name}</h2>
        <p className="text-slate-500 mt-2">Generated on: {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</p>
        <p className="text-slate-500">Status: {isFullySettled ? 'Fully Settled ✓' : 'Active Debts Remaining'}</p>
      </div>

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
        <p className="text-brand-100 dark:text-slate-400 font-medium transition-colors">
          Active Trip Cost: <span className="text-white dark:text-brand-400 font-bold text-lg">₹{trueActiveCost.toFixed(2)}</span>
        </p>
      </div>

      <div className="flex mx-4 mt-4 bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 p-1 transition-colors duration-300 print:hidden overflow-x-auto">
        {(['EXPENSES', 'BALANCES', 'SETTLE', 'STATS', ...(group.isFundEnabled ? ['FUND'] : [])] as Tab[]).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 min-w-[70px] py-2.5 text-[10px] sm:text-xs font-bold rounded-lg uppercase tracking-wider transition-all ${activeTab === tab ? 'bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-400 shadow-sm dark:shadow-none' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>{tab}</button>
        ))}
      </div>

      <div className="p-4 flex-1 print:p-0">
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="print:opacity-100 print:transform-none">
            {activeTab === 'EXPENSES' && <ExpensesTab group={group} />}
            {activeTab === 'BALANCES' && <BalancesTab group={group} />}
            {activeTab === 'SETTLE' && <SettleTab group={group} setActiveTab={setActiveTab} />}
            {activeTab === 'STATS' && <StatsTab group={group} />}
            {activeTab === 'FUND' && <FundTab group={group} setActiveTab={setActiveTab} />}
          </motion.div>
        </AnimatePresence>
      </div>

      {canAddExpense && (
        <button onClick={() => navigate(`/group/${group.id}/add`)} className="fixed bottom-6 right-1/2 translate-x-[9rem] sm:translate-x-[11rem] bg-accent-500 dark:bg-accent-600 text-white p-4 rounded-full shadow-lg dark:shadow-none hover:bg-accent-600 dark:hover:bg-accent-500 active:scale-90 transition-all z-20 print:hidden">
          <Plus className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}