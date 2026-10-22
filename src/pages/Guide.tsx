import { useNavigate } from 'react-router-dom';
import { ArrowLeft, SplitSquareHorizontal, UserCheck, ShieldCheck, Share2, Download, Receipt } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Guide() {
  const navigate = useNavigate();

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="pb-28 min-h-screen transition-colors duration-300">
      <div className="bg-white dark:bg-slate-900 px-4 py-4 flex items-center gap-4 shadow-sm sticky top-0 z-10 border-b border-slate-100 dark:border-slate-800 transition-colors duration-300">
        <button onClick={() => navigate(-1)} className="text-slate-500 dark:text-slate-400 p-1 active:bg-slate-100 dark:active:bg-slate-800 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 transition-colors">How BillBlend Works</h2>
      </div>

      <div className="p-4 space-y-6">
        <div className="text-center py-4">
          <div className="bg-brand-100 dark:bg-slate-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 transition-colors">
            <Receipt className="w-8 h-8 text-brand-600 dark:text-brand-400" />
          </div>
          <p className="text-slate-600 dark:text-slate-300 font-medium leading-relaxed transition-colors">
            BillBlend takes the awkward math out of group trips. Just log who paid, and we figure out exactly who owes whom the absolute minimum number of transfers!
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-lg ml-1 transition-colors">Types of Splits</h3>
          
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <SplitSquareHorizontal className="w-5 h-5 text-brand-500 dark:text-brand-400" />
              <h4 className="font-bold text-slate-700 dark:text-slate-200 transition-colors">Equally</h4>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-2 transition-colors">The classic split. The total bill is divided perfectly among everyone in the group.</p>
            <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-lg text-xs text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-800/50 transition-colors">
              <span className="font-bold text-slate-700 dark:text-slate-300">Example:</span> 4 friends share a ₹1000 taxi. Everyone owes ₹250.
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <Receipt className="w-5 h-5 text-orange-500 dark:text-orange-400" />
              <h4 className="font-bold text-slate-700 dark:text-slate-200 transition-colors">Exact Amounts (Unequal)</h4>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-2 transition-colors">Used when people order different things. You type in exactly how much each person spent.</p>
            <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-lg text-xs text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-800/50 transition-colors">
              <span className="font-bold text-slate-700 dark:text-slate-300">Example:</span> Dinner bill is ₹800. You had a ₹500 pizza, your friend had a ₹300 burger.
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <UserCheck className="w-5 h-5 text-accent-500 dark:text-accent-400" />
              <h4 className="font-bold text-slate-700 dark:text-slate-200 transition-colors">On Behalf Of</h4>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-2 transition-colors">When someone covers the <b>entire</b> cost for one specific person who forgot their wallet.</p>
            <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-lg text-xs text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-800/50 transition-colors">
              <span className="font-bold text-slate-700 dark:text-slate-300">Example:</span> You buy a ₹500 souvenir for John. The app knows John now owes you exactly ₹500.
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 text-lg ml-1 transition-colors">Pro Features</h3>

          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
            <div className="flex items-center gap-3 mb-2">
              <ShieldCheck className="w-5 h-5 text-slate-700 dark:text-slate-300" />
              <h4 className="font-bold text-slate-700 dark:text-slate-200 transition-colors">Mark Balances as Settled</h4>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 transition-colors">
              Going on a long 10-day trip? Use this button mid-trip after everyone pays each other back. It clears active debts back to zero and moves older expenses to "History", giving you a fresh start without deleting data!
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 text-center transition-colors">
              <Share2 className="w-6 h-6 text-brand-500 dark:text-brand-400 mx-auto mb-2" />
              <h4 className="font-bold text-slate-700 dark:text-slate-200 text-sm mb-1 transition-colors">Magic Link</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 transition-colors">Tap the share icon to send the whole trip to a friend's phone instantly.</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 text-center transition-colors">
              <Download className="w-6 h-6 text-brand-500 dark:text-brand-400 mx-auto mb-2" />
              <h4 className="font-bold text-slate-700 dark:text-slate-200 text-sm mb-1 transition-colors">Export Excel</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 transition-colors">Download a full spreadsheet of everything spent to share in WhatsApp.</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}