import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import type { SplitType, SplitItem } from '../store';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AddExpense() {
  const { id, expenseId } = useParams<{ id: string; expenseId?: string }>();
  const navigate = useNavigate();
  
  const group = useStore((state) => state.groups.find((g) => g.id === id));
  const addExpense = useStore((state) => state.addExpense);
  const editExpense = useStore((state) => state.editExpense);

  const [description, setDescription] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [paidBy, setPaidBy] = useState<string>('');
  const [splitType, setSplitType] = useState<SplitType>('EQUAL');
  const [unequalSplits, setUnequalSplits] = useState<Record<string, string>>({});
  const [onBehalfOf, setOnBehalfOf] = useState<string>('');

  // PRE-FILL IF EDITING
  useEffect(() => {
    if (group && expenseId) {
      const existing = group.expenses.find(e => e.id === expenseId);
      if (existing) {
        setDescription(existing.description);
        setAmountStr(existing.amount.toString());
        setPaidBy(existing.paidBy);
        setSplitType(existing.splitType);
        if (existing.splitType === 'UNEQUAL') {
          const uSplits: Record<string, string> = {};
          existing.splits.forEach(s => uSplits[s.memberId] = s.amount.toString());
          setUnequalSplits(uSplits);
        } else if (existing.splitType === 'ON_BEHALF') {
          setOnBehalfOf(existing.splits[0]?.memberId || '');
        }
      }
    } else if (group && !paidBy) {
      setPaidBy(group.members[0]?.id || '');
    }
  }, [group, expenseId]);

  if (!group) return null;

  const totalAmount = parseFloat(amountStr) || 0;
  const unequalSum = useMemo(() => Object.values(unequalSplits).reduce((sum, val) => sum + (parseFloat(val) || 0), 0), [unequalSplits]);
  const isUnequalBalanced = Math.abs(totalAmount - unequalSum) < 0.01;
  const remainingUnequal = totalAmount - unequalSum;

  const isFormValid = () => {
    if (!description.trim() || totalAmount <= 0) return false;
    if (splitType === 'UNEQUAL' && !isUnequalBalanced) return false;
    if (splitType === 'ON_BEHALF' && !onBehalfOf) return false;
    return true;
  };

  const handleSave = () => {
    if (!isFormValid()) return;
    let splits: SplitItem[] = [];

    if (splitType === 'EQUAL') {
      const splitAmount = Math.round((totalAmount / group.members.length) * 100) / 100;
      splits = group.members.map(m => ({ memberId: m.id, amount: splitAmount }));
    } else if (splitType === 'UNEQUAL') {
      splits = Object.entries(unequalSplits).map(([memberId, amt]) => ({ memberId, amount: parseFloat(amt) || 0 })).filter(s => s.amount > 0);
    } else if (splitType === 'ON_BEHALF') {
      splits = [{ memberId: onBehalfOf, amount: totalAmount }];
    }

    const payload = { description: description.trim(), amount: totalAmount, paidBy, splitType, splits };

    if (expenseId) {
      editExpense(group.id, expenseId, payload);
    } else {
      addExpense(group.id, payload);
    }
    navigate(`/group/${group.id}`);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pb-28 bg-slate-50 min-h-screen">
      <div className="bg-white px-4 py-4 flex items-center gap-4 shadow-sm sticky top-0 z-10 border-b border-slate-100">
        <button onClick={() => navigate(-1)} className="text-slate-500 p-1 active:bg-slate-100 rounded-full"><ArrowLeft className="w-6 h-6" /></button>
        <h2 className="text-xl font-bold text-slate-800">{expenseId ? 'Edit Expense' : 'Add Expense'}</h2>
      </div>

      <div className="p-4 space-y-6">
        {/* BIG AMOUNT INPUT */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 text-center">
          <p className="text-sm font-semibold text-slate-500 mb-2 uppercase tracking-wider">Total Amount</p>
          <div className="flex items-center justify-center text-5xl font-bold text-slate-800">
            <span className="text-slate-300 mr-1">₹</span>
            <input type="number" value={amountStr} onChange={(e) => setAmountStr(e.target.value)} placeholder="0.00" className="w-full max-w-[200px] bg-transparent outline-none text-center placeholder:text-slate-200" />
          </div>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What was this for? (e.g. Lunch)" className="mt-6 w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-center font-medium focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>

        {/* WHO PAID */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-3">Who paid?</label>
          <div className="flex flex-wrap gap-2">
            {group.members.map(member => (
              <button key={member.id} onClick={() => setPaidBy(member.id)} className={`px-4 py-2 rounded-full font-semibold text-sm transition-all ${paidBy === member.id ? 'bg-brand-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                {member.name}
              </button>
            ))}
          </div>
        </div>

        {/* SPLIT TYPE TABS */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-3">How to split?</label>
          <div className="flex bg-slate-200/50 p-1 rounded-xl">
            {(['EQUAL', 'UNEQUAL', 'ON_BEHALF'] as SplitType[]).map((type) => (
              <button key={type} onClick={() => setSplitType(type)} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${splitType === type ? 'bg-white text-brand-700 shadow-sm' : 'text-slate-500'}`}>
                {type === 'EQUAL' ? 'Equally' : type === 'UNEQUAL' ? 'Exact Amounts' : 'On Behalf Of'}
              </button>
            ))}
          </div>
        </div>

        {/* DYNAMIC SPLIT UI */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          {splitType === 'EQUAL' && (
            <div className="text-center py-4">
              <div className="text-3xl font-bold text-brand-600 mb-1">₹{totalAmount > 0 ? (totalAmount / group.members.length).toFixed(2) : '0.00'}</div>
              <p className="text-sm font-medium text-slate-500">per person ({group.members.length} people)</p>
            </div>
          )}
          {splitType === 'UNEQUAL' && (
            <div className="space-y-3">
              <div className={`text-center text-sm font-bold mb-4 p-2 rounded-lg ${remainingUnequal === 0 ? 'bg-accent-50 text-accent-600' : 'bg-orange-50 text-orange-600'}`}>
                {remainingUnequal === 0 ? 'Amounts match perfectly!' : `Remaining to assign: ₹${remainingUnequal.toFixed(2)}`}
              </div>
              {group.members.map(member => (
                <div key={member.id} className="flex items-center justify-between gap-4">
                  <span className="font-semibold text-slate-700">{member.name}</span>
                  <div className="relative w-32">
                    <span className="absolute left-3 top-2.5 text-slate-400 font-medium">₹</span>
                    <input type="number" value={unequalSplits[member.id] || ''} onChange={(e) => setUnequalSplits({...unequalSplits, [member.id]: e.target.value})} placeholder="0.00" className="w-full pl-7 p-2 bg-slate-50 border border-slate-200 rounded-lg text-right font-bold focus:outline-none focus:ring-2 focus:ring-brand-500" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {splitType === 'ON_BEHALF' && (
            <div className="py-2">
              <p className="text-sm text-slate-500 font-medium mb-3">Who was this paid for entirely?</p>
              <div className="grid grid-cols-2 gap-2">
                {group.members.map(member => (
                  <button key={member.id} onClick={() => setOnBehalfOf(member.id)} className={`p-3 rounded-xl font-bold text-sm transition-all border ${onBehalfOf === member.id ? 'bg-brand-50 border-brand-500 text-brand-700' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                    {member.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-slate-100 flex justify-center z-20">
        <div className="w-full max-w-md">
          <button onClick={handleSave} disabled={!isFormValid()} className="w-full bg-accent-500 disabled:bg-slate-300 hover:bg-accent-600 text-white font-bold text-lg py-4 rounded-xl shadow-lg active:scale-[0.98] transition-all flex justify-center items-center gap-2">
            <CheckCircle2 className="w-6 h-6" /> {expenseId ? 'Update Expense' : 'Save Expense'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}