import type { Member, Expense } from '../store';

export interface Transaction {
  from: string; // memberId
  to: string;   // memberId
  amount: number;
}

// 1. THE GREEDY OPTIMIZED ALGORITHM (Min-Cash Flow)
export function calculateSettlements(members: Member[], expenses: Expense[]): Transaction[] {
  const balances: Record<string, number> = {};
  members.forEach(m => balances[m.id] = 0);

  expenses.forEach(exp => {
    if (balances[exp.paidBy] !== undefined) balances[exp.paidBy] += exp.amount; 
    exp.splits.forEach(split => {
      if (balances[split.memberId] !== undefined) balances[split.memberId] -= split.amount;
    });
  });

  const debtors = Object.keys(balances).map(id => ({ id, amount: balances[id] })).filter(x => x.amount <= -0.01).sort((a, b) => a.amount - b.amount);
  const creditors = Object.keys(balances).map(id => ({ id, amount: balances[id] })).filter(x => x.amount >= 0.01).sort((a, b) => b.amount - a.amount);

  const transactions: Transaction[] = [];
  let i = 0; let j = 0; 

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const settlementAmount = Math.min(Math.abs(debtor.amount), creditor.amount);
    const roundedAmount = Math.round(settlementAmount * 100) / 100;

    if (roundedAmount > 0) transactions.push({ from: debtor.id, to: creditor.id, amount: roundedAmount });

    debtor.amount += settlementAmount;
    creditor.amount -= settlementAmount;

    if (Math.abs(debtor.amount) < 0.01) i++;
    if (Math.abs(creditor.amount) < 0.01) j++;
  }
  return transactions;
}

// 2. THE UNOPTIMIZED ALGORITHM (Raw Directed Graph IOUs)
// This calculates exactly what would happen without BillBlend's smart routing.
export function calculateRawDebts(members: Member[], expenses: Expense[]): Transaction[] {
  const graph: Record<string, Record<string, number>> = {};
  members.forEach(m => {
    graph[m.id] = {};
    members.forEach(m2 => graph[m.id][m2.id] = 0);
  });

  // Build the direct debt edges
  expenses.forEach(exp => {
    const payer = exp.paidBy;
    exp.splits.forEach(split => {
      if (split.memberId !== payer) {
        graph[split.memberId][payer] += split.amount;
      }
    });
  });

  // Net out mutual debts (A->B and B->A)
  const rawTrans: Transaction[] = [];
  for(let i = 0; i < members.length; i++) {
    for(let j = i + 1; j < members.length; j++) {
      const m1 = members[i].id;
      const m2 = members[j].id;
      const net = graph[m1][m2] - graph[m2][m1];
      
      if (net > 0.01) rawTrans.push({ from: m1, to: m2, amount: net });
      else if (net < -0.01) rawTrans.push({ from: m2, to: m1, amount: Math.abs(net) });
    }
  }
  return rawTrans;
}

// 3. THE GRANULAR LEDGER EXTRACTOR (For the Interactive Trace)
// Extracts exactly which specific expenses caused a user to owe or be owed money.
export function getMemberLedger(memberId: string, expenses: Expense[]) {
  const paidForOthers = expenses.filter(e => e.paidBy === memberId && e.splits.some(s => s.memberId !== memberId));
  const consumedFromOthers = expenses.filter(e => e.paidBy !== memberId && e.splits.some(s => s.memberId === memberId));
  
  let netBalance = 0;
  expenses.forEach(exp => {
    if (exp.paidBy === memberId) netBalance += exp.amount;
    const split = exp.splits.find(s => s.memberId === memberId);
    if (split) netBalance -= split.amount;
  });

  return { paidForOthers, consumedFromOthers, netBalance };
}