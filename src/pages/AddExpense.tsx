import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import type { SplitType, SplitItem } from '../store';
import { cloudSaveExpense } from '../utils/firestoreActions'; // 🚨 NEW
import { ArrowLeft, CheckCircle2, AlertCircle, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AddExpense() {
  const { id, expenseId } = useParams<{ id: string; expenseId?: string }>();
  const navigate = useNavigate();
  
  const group = useStore((state) => state.groups.find((g) => g.id === id));
  const addExpense = useStore((state) => state.addExpense);
  const editExpense = useStore((state) => state.editExpense);
  const cloudUser = useStore((state) => state.cloudUser);

  const [description, setDescription] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [paidBy, setPaidBy] = useState<string>('');
  const [splitType, setSplitType] = useState<SplitType>('EQUAL');
  
  const [unequalSplits, setUnequalSplits] = useState<Record<string, string>>({});
  const [onBehalfOf, setOnBehalfOf] = useState<string>('');
  const [selectedForSplit, setSelectedForSplit] = useState<string[]>([]);

  // 🚨 UI States for Cloud pushing
  const [isSaving, setIsSaving] = useState(false);

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
        } else if (existing.splitType === 'SELECTIVE_EQUAL') {
          setSelectedForSplit(existing.splits.map(s => s.memberId));
        }
      }
    } else if (group) {
      if (!paidBy) setPaidBy(group.members[0]?.id || '');
      if (selectedForSplit.length === 0) setSelectedForSplit(group.members.map(m => m.id)); 
    }
  }, [group, expenseId]);

  if (!group) return null;

  const totalAmount = parseFloat(amountStr) || 0;
  const unequalSum = useMemo(() => Object.values(unequalSplits).reduce((sum, val) => sum + (parseFloat(val) || 0), 0), [unequalSplits]);
  const isUnequalBalanced = Math.abs(totalAmount - unequalSum) < 0.01;
  const remainingUnequal = totalAmount - unequalSum;

  const getValidationMessage = () => {
    if (totalAmount <= 0) return "Please enter a valid amount.";
    if (!description.trim()) return "Don't forget to add a description!";
    if (splitType === 'UNEQUAL' && !isUnequalBalanced) {
      if (remainingUnequal > 0) return `Assign the remaining ₹${remainingUnequal.toFixed(2)}`;
      return `Amounts exceed total by ₹${Math.abs(remainingUnequal).toFixed(2)}`;
    }
    if (splitType === 'ON_BEHALF' && !onBehalfOf) return "Please select who this was paid for.";
    if (splitType === 'SELECTIVE_EQUAL' && selectedForSplit.length === 0) return "Select at least one person to share the cost.";
    return null; 
  };

  const validationMsg = getValidationMessage();

  const handleSave = async () => {
    if (validationMsg || !group) return;
    setIsSaving(true);
    let splits: SplitItem[] = [];

    if (splitType === 'EQUAL') {
      const splitAmount = Math.round((totalAmount / group.members.length) * 100) / 100;
      splits = group.members.map(m => ({ memberId: m.id, amount: splitAmount }));
      
    } else if (splitType === 'UNEQUAL') {
      splits = Object.entries(unequalSplits).map(([memberId, amt]) => ({ memberId, amount: parseFloat(amt) || 0 })).filter(s => s.amount > 0);
      
    } else if (splitType === 'ON_BEHALF') {
      splits = [{ memberId: onBehalfOf, amount: totalAmount }];
      
    } else if (splitType === 'SELECTIVE_EQUAL') {
      const count = selectedForSplit.length;
      const baseSplit = Math.round((totalAmount / count) * 100) / 100;
      let assignedSoFar = 0;
      
      selectedForSplit.forEach((memberId, idx) => {
        if (idx === count - 1) splits.push({ memberId, amount: Math.round((totalAmount - assignedSoFar) * 100) / 100 });
        else { splits.push({ memberId, amount: baseSplit }); assignedSoFar += baseSplit; }
      });
    }

    try {
      const activeExpenseId = expenseId || crypto.randomUUID();
      const payload = { 
        description: description.trim(), 
        amount: totalAmount, 
        paidBy, 
        splitType, 
        splits 
      };

      // 🚨 BRIDGE FIX: If the trip is collaborative, push to Firebase BEFORE local save!
      if (group.isCollaborative && group.firebaseTripId) {
        await cloudSaveExpense(group.firebaseTripId, {
          ...payload,
          id: activeExpenseId,
          date: new Date().toISOString(),
          isSettled: false,
          updatedAt: Date.now(),
          createdByEmail: cloudUser?.email || 'unknown' // Audit Trail!
        });
      }

      // Update Local State
      if (expenseId) editExpense(group.id, expenseId, payload);
      else addExpense(group.id, payload, cloudUser?.email);
      
      navigate(`/group/${group.id}`);
    } catch (err) {
      console.error(err);
      alert("Failed to save to cloud. Check internet connection.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pb-36 min-h-screen transition-colors duration-300">
      <div className="bg-white dark:bg-slate-900 px-4 py-4 flex items-center gap-4 shadow-sm sticky top-0 z-10 border-b border-slate-100 dark:border-slate-800 transition-colors duration-300">
        <button onClick={() => navigate(-1)} className="text-slate-500 dark:text-slate-400 p-1 active:bg-slate-100 dark:active:bg-slate-800 rounded-full transition-colors"><ArrowLeft className="w-6 h-6" /></button>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 transition-colors">{expenseId ? 'Edit Expense' : 'Add Expense'}</h2>
      </div>

      <div className="p-4 space-y-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 text-center transition-colors duration-300">
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider transition-colors">Total Amount</p>
          <div className="flex items-center justify-center text-5xl font-bold text-slate-800 dark:text-slate-100 transition-colors">
            <span className="text-slate-300 dark:text-slate-600 mr-1">₹</span>
            <input type="number" value={amountStr} onChange={(e) => setAmountStr(e.target.value)} placeholder="0.00" className="w-full max-w-[200px] bg-transparent outline-none text-center placeholder:text-slate-200 dark:placeholder:text-slate-700" />
          </div>
          <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What was this for? (e.g. Taxi Fare)" className="mt-6 w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-center font-medium focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400 text-slate-800 dark:text-slate-100 transition-colors placeholder:text-slate-400 dark:placeholder:text-slate-600" />
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 transition-colors">Who paid?</label>
          <div className="flex flex-wrap gap-2">
            {group.members.map(member => (
              <button key={member.id} onClick={() => setPaidBy(member.id)} className={`px-4 py-2 rounded-full font-semibold text-sm transition-all ${paidBy === member.id ? 'bg-brand-600 dark:bg-brand-500/20 text-white dark:text-brand-400 dark:border-brand-500/50 shadow-md dark:shadow-none border border-transparent' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>{member.name}</button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 transition-colors">How to split?</label>
          <div className="flex flex-wrap gap-1 bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-xl transition-colors duration-300">
            {(['EQUAL', 'SELECTIVE_EQUAL', 'UNEQUAL', 'ON_BEHALF'] as SplitType[]).map((type) => (
              <button key={type} onClick={() => setSplitType(type)} className={`flex-1 py-2 text-[10px] sm:text-xs font-bold rounded-lg transition-all min-w-[70px] ${splitType === type ? 'bg-white dark:bg-slate-700 text-brand-700 dark:text-brand-400 shadow-sm dark:shadow-none' : 'text-slate-500 dark:text-slate-500'}`}>
                {type === 'EQUAL' ? 'Everyone' : type === 'SELECTIVE_EQUAL' ? 'Specific People' : type === 'UNEQUAL' ? 'Exact Amts' : 'On Behalf'}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors duration-300">
          {splitType === 'EQUAL' && (
            <div className="text-center py-4">
              <div className="text-3xl font-bold text-brand-600 dark:text-brand-400 mb-1 transition-colors">₹{totalAmount > 0 ? (totalAmount / group.members.length).toFixed(2) : '0.00'}</div>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-500 transition-colors">per person ({group.members.length} people)</p>
            </div>
          )}

          {splitType === 'SELECTIVE_EQUAL' && (
            <div className="space-y-4">
              <div className="text-center py-2">
                <div className="text-3xl font-bold text-brand-600 dark:text-brand-400 mb-1 transition-colors">₹{selectedForSplit.length > 0 ? (totalAmount / selectedForSplit.length).toFixed(2) : '0.00'}</div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-500 transition-colors">per selected person ({selectedForSplit.length} selected)</p>
              </div>
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center mb-2 px-1">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Who shares this cost?</p>
                  <button onClick={() => { if (selectedForSplit.length === group.members.length) setSelectedForSplit([]); else setSelectedForSplit(group.members.map(m => m.id)); }} className="text-xs font-bold text-brand-600 dark:text-brand-400 hover:underline">
                    {selectedForSplit.length === group.members.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>
                {group.members.map(member => {
                  const isSelected = selectedForSplit.includes(member.id);
                  return (
                    <div key={member.id} onClick={() => { if (isSelected) setSelectedForSplit(selectedForSplit.filter(id => id !== member.id)); else setSelectedForSplit([...selectedForSplit, member.id]); }} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors border ${isSelected ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-200 dark:border-brand-800' : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 opacity-70'}`}>
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${isSelected ? 'bg-brand-500 border-brand-500 text-white' : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600'}`}>
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                      <span className={`font-bold ${isSelected ? 'text-brand-700 dark:text-brand-400' : 'text-slate-500 dark:text-slate-400'}`}>{member.name}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {splitType === 'UNEQUAL' && (
            <div className="space-y-3">
              <div className={`text-center text-sm font-bold mb-4 p-2 rounded-lg transition-colors ${remainingUnequal === 0 ? 'bg-accent-50 dark:bg-accent-900/20 text-accent-600 dark:text-accent-400' : 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400'}`}>
                {remainingUnequal === 0 ? 'Amounts match perfectly!' : `Remaining to assign: ₹${remainingUnequal.toFixed(2)}`}
              </div>
              {group.members.map(member => (
                <div key={member.id} className="flex items-center justify-between gap-4">
                  <span className="font-semibold text-slate-700 dark:text-slate-200 transition-colors">{member.name}</span>
                  <div className="relative w-32">
                    <span className="absolute left-3 top-2.5 text-slate-400 dark:text-slate-500 font-medium transition-colors">₹</span>
                    <input type="number" value={unequalSplits[member.id] || ''} onChange={(e) => setUnequalSplits({...unequalSplits, [member.id]: e.target.value})} placeholder="0.00" className="w-full pl-7 p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-right font-bold focus:outline-none focus:ring-2 focus:ring-brand-500 dark:focus:ring-brand-400 text-slate-800 dark:text-slate-100 transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {splitType === 'ON_BEHALF' && (
            <div className="py-2">
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-3 transition-colors">Who was this paid for entirely?</p>
              <div className="grid grid-cols-2 gap-2">
                {group.members.map(member => (
                  <button key={member.id} onClick={() => setOnBehalfOf(member.id)} className={`p-3 rounded-xl font-bold text-sm transition-all border ${onBehalfOf === member.id ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-500 text-brand-700 dark:text-brand-400' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
                    {member.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-t border-slate-100 dark:border-slate-800 flex flex-col items-center z-20 transition-colors duration-300">
        <div className="w-full max-w-md relative">
          <AnimatePresence>
            {validationMsg && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute -top-12 left-0 right-0 flex justify-center">
                <div className="bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 px-4 py-2 rounded-full text-xs font-bold shadow-sm flex items-center gap-1.5 border border-red-200 dark:border-red-800/50">
                  <AlertCircle className="w-4 h-4" /> {validationMsg}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <button onClick={handleSave} disabled={!!validationMsg || isSaving} className="w-full bg-accent-500 dark:bg-accent-600 disabled:bg-slate-300 dark:disabled:bg-slate-800 hover:bg-accent-600 dark:hover:bg-accent-500 text-white disabled:text-slate-500 font-bold text-lg py-4 rounded-xl shadow-lg dark:shadow-none active:scale-[0.98] transition-all flex justify-center items-center gap-2">
            <CheckCircle2 className="w-6 h-6" /> {isSaving ? 'Syncing...' : (expenseId ? 'Update Expense' : 'Save Expense')}
          </button>
        </div>
      </div>
    </motion.div>
  );
}