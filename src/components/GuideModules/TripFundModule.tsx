import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { Landmark, ArrowDownCircle, Info, Calculator } from 'lucide-react';

export default function TripFundModule() {
  const slideUp: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
  };

  return (
    <div className="space-y-6 py-8 border-b border-slate-200 dark:border-slate-800">
      <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2 flex items-center gap-2">
          <Landmark className="w-6 h-6 text-indigo-500" /> The Trip Fund
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
          For long group trips, it's annoying to have everyone pay out-of-pocket for every single meal. BillBlend's <b>Trip Fund Pooling</b> solves this by acting like a virtual bank account.
        </p>
      </motion.div>

      <div className="space-y-4">
        
        {/* Step 1: Depositing */}
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={slideUp} className="bg-indigo-50 dark:bg-indigo-900/10 p-5 rounded-2xl border border-indigo-200 dark:border-indigo-800/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg text-indigo-600 dark:text-indigo-400">
              <ArrowDownCircle className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-indigo-900 dark:text-indigo-200">1. Making a Deposit</h3>
          </div>
          <p className="text-xs text-indigo-700 dark:text-indigo-300/80 mb-3 leading-relaxed">
            In Group Settings, an Admin can enable the Trip Fund. When enabled, a new <b>FUND</b> tab appears besides the <b>SETTLE</b> and <b>STATS</b> tab. On the new <b>FUND</b> tab, members record how much cash they handed to the group manager (e.g., ₹2000 each).
          </p>
          <p className="text-xs text-indigo-700 dark:text-indigo-300/80 mb-3 leading-relaxed">
            Recorded a Deposit by mistake? Don't worry. You can easily delete any recorded deposit. For added safety, a deposit recorded can only be deleted if its deposit value is less than or equal to current available liquidity.
          </p>
        </motion.div>

        {/* Step 2: Spending */}
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={slideUp} className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-brand-50 dark:bg-brand-900/30 rounded-lg text-brand-600 dark:text-brand-400">
              <Calculator className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-700 dark:text-slate-200">2. Spending the Fund</h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
            When you add a new expense (like a ₹1000 dinner), you can now select <b>Trip Fund 🏦</b> as the Payer! 
            The app deducts the money from the pool's liquidity and charges everyone their fair share.
          </p>
          
          {/* Visual Overdraft Warning */}
          <div className="bg-red-50 dark:bg-red-900/10 p-3 rounded-lg border border-red-100 dark:border-red-900/30 flex gap-2">
            <Info className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-[10px] text-red-600 dark:text-red-400 leading-relaxed font-medium">
              <b>Overdraft Protection:</b> The app mathematically prevents you from spending more money than the Fund physically holds. You cannot record a ₹1000 expense if the fund only has ₹800 left!
            </p>
          </div>
        </motion.div>

        {/* Step 3: Dissolving */}
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={slideUp} className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400">
              <Landmark className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-700 dark:text-slate-200">3. Dissolving & Payouts</h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
            At the end of the trip, the Admin clicks <b>Dissolve Trip Fund</b>.
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            The math engine analyzes everything, forces members to settle any out-of-pocket debts first, and then tells the manager exactly how to distribute the remaining physical cash back to the members who over-deposited!
          </p>
        </motion.div>
      </div>
    </div>
  );
}