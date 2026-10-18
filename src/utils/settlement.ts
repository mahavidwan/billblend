// FIX: Added 'type' keyword here!
import type { Group } from '../store';

export interface Transaction {
  from: string; // memberId
  to: string;   // memberId
  amount: number;
}

export function calculateSettlements(group: Group): Transaction[] {
  // Step 1: Calculate net balance for each person
  const balances: Record<string, number> = {};
  
  group.members.forEach(m => balances[m.id] = 0);

  group.expenses.forEach(exp => {
    if (balances[exp.paidBy] !== undefined) {
      balances[exp.paidBy] += exp.amount; 
    }
    exp.splits.forEach(split => {
      if (balances[split.memberId] !== undefined) {
        balances[split.memberId] -= split.amount;
      }
    });
  });

  // Step 2: Separate into Debtors and Creditors
  const debtors = Object.keys(balances)
    .map(id => ({ id, amount: balances[id] }))
    .filter(x => x.amount <= -0.01)
    .sort((a, b) => a.amount - b.amount);

  const creditors = Object.keys(balances)
    .map(id => ({ id, amount: balances[id] }))
    .filter(x => x.amount >= 0.01)
    .sort((a, b) => b.amount - a.amount);

  // Step 3: Greedy matching
  const transactions: Transaction[] = [];
  let i = 0; 
  let j = 0; 

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];

    const settlementAmount = Math.min(Math.abs(debtor.amount), creditor.amount);
    const roundedAmount = Math.round(settlementAmount * 100) / 100;

    if (roundedAmount > 0) {
      transactions.push({
        from: debtor.id,
        to: creditor.id,
        amount: roundedAmount
      });
    }

    debtor.amount += settlementAmount;
    creditor.amount -= settlementAmount;

    if (Math.abs(debtor.amount) < 0.01) i++;
    if (Math.abs(creditor.amount) < 0.01) j++;
  }

  return transactions;
}