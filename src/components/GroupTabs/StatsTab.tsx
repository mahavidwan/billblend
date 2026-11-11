import { motion } from 'framer-motion';
import { BarChart3, FileText, Trophy, Target, FileDigit } from 'lucide-react';
import type { Group, Expense } from '../../store';
import { VIRTUAL_FUND_ID } from '../../store';

export default function StatsTab({ group }: { group: Group }) {
  const activeExpensesAll = group.expenses.filter(e => !e.isSettled);
  
  // 🚨 GLOBAL METRICS: STRICTLY exclude System Repayments and Deposits so "Total Trip Cost" is accurate!
  const trueExpenses = group.expenses.filter(e => !e.isSystemRepayment && e.splitType !== 'FUND_DEPOSIT');
  const lifetimeTripCost = trueExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const avgCostPerPerson = group.members.length > 0 ? lifetimeTripCost / group.members.length : 0;
  
  let biggestExpense: Expense | null = null;
  if (trueExpenses.length > 0) biggestExpense = trueExpenses.reduce((prev, curr) => (prev.amount > curr.amount) ? prev : curr);
  
  const getMemberName = (memberId: string) => {
    if (memberId === VIRTUAL_FUND_ID) return 'Trip Fund 🏦';
    return group.members.find(m => m.id === memberId)?.name || 'Unknown';
  };

  // 🚨 INDIVIDUAL METRICS: MUST include everything (including Repayments) so the bars perfectly balance!
  const lifetimeMemberStats = group.members.map(member => {
    let lifetimePaid = 0; 
    let lifetimeConsumed = 0;
    let fundDeposited = 0;

    // We iterate over ALL expenses the group ever made (active or settled)
    group.expenses.forEach(exp => {
      // 1. Track Fund Deposits separately for the distinct blue bar
      if (exp.splitType === 'FUND_DEPOSIT' && exp.paidBy === member.id) {
        fundDeposited += exp.amount;
        return; // Skip the rest of the loop for deposits
      }

      // 2. Track Out-of-Pocket Payments (Including System Repayments!)
      if (exp.paidBy === member.id) {
        lifetimePaid += exp.amount;
      }

      // 3. Track Consumption / Received Cash (Including System Repayments!)
      const split = exp.splits.find(s => s.memberId === member.id);
      if (split) {
        lifetimeConsumed += split.amount;
      }
    });

    // Current Net (For the "Fully Settled" badge) only looks at ACTIVE expenses
    let currentNet = 0;
    activeExpensesAll.forEach(exp => {
      if (exp.paidBy === member.id) currentNet += exp.amount;
      const split = exp.splits.find(s => s.memberId === member.id);
      if (split) currentNet -= split.amount;
    });

    return { ...member, lifetimePaid, lifetimeConsumed, fundDeposited, currentNet };
  });

  const maxLifetimeAmount = Math.max(...lifetimeMemberStats.map(m => Math.max(m.lifetimePaid + m.fundDeposited, m.lifetimeConsumed)), 1);
  
  // Top spender excludes deposits and repayments, just purely who bought the most stuff
  const topSpenderStats = group.members.map(member => {
    let pureOOP = 0;
    trueExpenses.forEach(exp => { if (exp.paidBy === member.id) pureOOP += exp.amount; });
    return { name: member.name, pureOOP };
  }).sort((a, b) => b.pureOOP - a.pureOOP)[0];

  const generatePDF = () => setTimeout(() => window.print(), 500);

  return (
    <div className="space-y-6 print:space-y-8">
      <button onClick={generatePDF} className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 rounded-xl active:scale-95 transition-all flex items-center justify-center gap-2 print:hidden shadow-md">
        <FileText className="w-5 h-5" /> Generate PDF Report
      </button>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm print:border-slate-200">
          <Target className="w-5 h-5 text-brand-500 mb-2" />
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Total True Cost</p>
          <p className="text-xl font-bold text-slate-800 dark:text-slate-100">₹{lifetimeTripCost.toFixed(0)}</p>
          <p className="text-[10px] text-slate-400 mt-1">₹{avgCostPerPerson.toFixed(0)} avg / person</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm print:border-slate-200">
          <Trophy className="w-5 h-5 text-orange-500 mb-2" />
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">Top Contributor</p>
          <p className="text-xl font-bold text-slate-800 dark:text-slate-100 truncate">{topSpenderStats?.name || '-'}</p>
          <p className="text-[10px] text-slate-400 mt-1">paid ₹{(topSpenderStats?.pureOOP || 0).toFixed(0)} OOP</p>
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
              <span className={`text-xs px-2 py-1 rounded-md ${Math.abs(stat.currentNet) < 0.01 ? 'bg-slate-100 text-slate-600' : stat.currentNet > 0 ? 'bg-accent-100 text-accent-700' : 'bg-red-100 text-red-700'}`}>
                {Math.abs(stat.currentNet) < 0.01 ? 'Fully Settled' : stat.currentNet > 0 ? `Currently Owed ₹${stat.currentNet.toFixed(0)}` : `Currently Owes ₹${Math.abs(stat.currentNet).toFixed(0)}`}
              </span>
            </h4>
            
            <div className="mb-3">
              <div className="flex justify-between text-xs mb-1.5"><span className="text-slate-500 font-medium">Out-of-pocket + Deposits</span><span className="font-bold text-accent-600">₹{(stat.lifetimePaid + stat.fundDeposited).toFixed(2)}</span></div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden print:border print:border-slate-200 flex">
                <motion.div initial={{ width: 0 }} animate={{ width: `${(stat.lifetimePaid / maxLifetimeAmount) * 100}%` }} transition={{ duration: 0.8, ease: "easeOut" }} className="bg-accent-500 h-full print:bg-accent-500" style={{ width: `${(stat.lifetimePaid / maxLifetimeAmount) * 100}%` }} title="Out-of-Pocket" />
                <motion.div initial={{ width: 0 }} animate={{ width: `${(stat.fundDeposited / maxLifetimeAmount) * 100}%` }} transition={{ duration: 0.8, ease: "easeOut" }} className="bg-indigo-500 h-full print:bg-indigo-500" style={{ width: `${(stat.fundDeposited / maxLifetimeAmount) * 100}%` }} title="Deposited to Fund" />
              </div>
            </div>
            
            <div className="mb-4">
              <div className="flex justify-between text-xs mb-1.5"><span className="text-slate-500 font-medium">Trip Share + Received Back</span><span className="font-bold text-orange-500">₹{stat.lifetimeConsumed.toFixed(2)}</span></div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden print:border print:border-slate-200">
                <motion.div initial={{ width: 0 }} animate={{ width: `${(stat.lifetimeConsumed / maxLifetimeAmount) * 100}%` }} transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }} className="bg-orange-500 h-full rounded-full print:bg-orange-500" style={{ width: `${(stat.lifetimeConsumed / maxLifetimeAmount) * 100}%` }} />
              </div>
            </div>
            
            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg text-xs leading-relaxed font-medium text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-800 print:border-slate-200 print:text-black">
              {stat.name} deposited <b>₹{stat.fundDeposited.toFixed(0)}</b> into the Trip Fund, and paid <b>₹{stat.lifetimePaid.toFixed(0)}</b> out-of-pocket (including P2P settlements). Their actual share of the true trip cost was <b>{((stat.lifetimeConsumed / lifetimeTripCost) * 100 || 0).toFixed(1)}%</b>.
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}