import { VIRTUAL_FUND_ID } from '../store';
import type { Member, Expense } from '../store';

export interface Transaction {
  from: string; // memberId
  to: string;   // memberId
  amount: number;
}

// 🚨 THE NEW PERFECT LEDGER ALGORITHM
export function calculateSettlements(members: Member[], expenses: Expense[]): Transaction[] {
  const balances: Record<string, number> = {};
  
  // Initialize only human members
  members.forEach(m => {
    if (m.id !== VIRTUAL_FUND_ID) balances[m.id] = 0;
  });

  // Calculate absolute net standing
  expenses.forEach(exp => {
    // If a human paid OOP or made a deposit, they get positive credit
    if (exp.paidBy !== VIRTUAL_FUND_ID && balances[exp.paidBy] !== undefined) {
      balances[exp.paidBy] += exp.amount; 
    }
    
    // Anyone who consumed a split gets negative debt
    // (Even if the Fund paid for it, the humans still consumed it!)
    exp.splits.forEach(split => {
      if (balances[split.memberId] !== undefined) {
        balances[split.memberId] -= split.amount;
      }
    });
  });

  // Separate humans into Debtors (owe money) and Creditors (owed money)
  const debtors = Object.keys(balances)
    .map(id => ({ id, amount: balances[id] }))
    .filter(x => x.amount <= -0.01)
    .sort((a, b) => a.amount - b.amount);

  const creditors = Object.keys(balances)
    .map(id => ({ id, amount: balances[id] }))
    .filter(x => x.amount >= 0.01)
    .sort((a, b) => b.amount - a.amount);

  // Greedy matching: Route all human debts directly to human creditors!
  const transactions: Transaction[] = [];
  let i = 0; 
  let j = 0; 

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    
    const settlementAmount = Math.min(Math.abs(debtor.amount), creditor.amount);
    const roundedAmount = Math.round(settlementAmount * 100) / 100;

    if (roundedAmount > 0) {
      transactions.push({ from: debtor.id, to: creditor.id, amount: roundedAmount });
    }

    debtor.amount += settlementAmount;
    creditor.amount -= settlementAmount;

    if (Math.abs(debtor.amount) < 0.01) i++;
    if (Math.abs(creditor.amount) < 0.01) j++;
  }

  return transactions;
}

export function calculateRawDebts(members: Member[], expenses: Expense[]): Transaction[] {
  // Raw debts should also ignore the Fund to show true P2P transaction savings
  const humanMembers = members.filter(m => m.id !== VIRTUAL_FUND_ID);
  const graph: Record<string, Record<string, number>> = {};
  
  humanMembers.forEach(m => {
    graph[m.id] = {};
    humanMembers.forEach(m2 => graph[m.id][m2.id] = 0);
  });

  expenses.forEach(exp => {
    // If the fund paid, the debt is distributed proportionally to who deposited to the fund.
    // For raw visual analytics, we just skip Fund expenses to show pure OOP routing savings.
    if (exp.paidBy !== VIRTUAL_FUND_ID) {
      const payer = exp.paidBy;
      exp.splits.forEach(split => {
        if (split.memberId !== payer && graph[split.memberId] && graph[split.memberId][payer] !== undefined) {
          graph[split.memberId][payer] += split.amount;
        }
      });
    }
  });

  const rawTrans: Transaction[] = [];
  for(let i = 0; i < humanMembers.length; i++) {
    for(let j = i + 1; j < humanMembers.length; j++) {
      const m1 = humanMembers[i].id;
      const m2 = humanMembers[j].id;
      const net = graph[m1][m2] - graph[m2][m1];
      
      if (net > 0.01) rawTrans.push({ from: m1, to: m2, amount: net });
      else if (net < -0.01) rawTrans.push({ from: m2, to: m1, amount: Math.abs(net) });
    }
  }
  return rawTrans;
}

export function getMemberLedger(memberId: string, expenses: Expense[]) {
  // Ignore deposits when looking at pure expense consumption
  const standardExpenses = expenses.filter(e => e.splitType !== 'FUND_DEPOSIT');
  
  const paidForOthers = standardExpenses.filter(e => e.paidBy === memberId && e.splits.some(s => s.memberId !== memberId));
  const consumedFromOthers = standardExpenses.filter(e => e.paidBy !== memberId && e.splits.some(s => s.memberId === memberId));
  
  let netBalance = 0;
  expenses.forEach(exp => {
    if (exp.paidBy === memberId) netBalance += exp.amount;
    const split = exp.splits.find(s => s.memberId === memberId);
    if (split) netBalance -= split.amount;
  });

  return { paidForOthers, consumedFromOthers, netBalance };
}