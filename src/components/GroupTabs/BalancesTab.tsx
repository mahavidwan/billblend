import type { Group } from '../../store';

export default function BalancesTab({ group }: { group: Group }) {
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
        const isPos = stat.currentNet > 0; 
        const isNeg = stat.currentNet < 0;
        return (
          <div key={stat.id} className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 flex justify-between items-center transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300">
                {stat.name.charAt(0).toUpperCase()}
              </div>
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