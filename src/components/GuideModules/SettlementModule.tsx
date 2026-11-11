import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { Scale, Zap, ShieldCheck, Activity, Search } from 'lucide-react';

export default function SettlementModule() {
  const slideUp: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
  };

  return (
    <div className="space-y-6 py-8 pb-16">
      <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2 flex items-center gap-2">
          <Scale className="w-6 h-6 text-brand-600 dark:text-brand-400" /> Settling Up
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
          BillBlend doesn't just calculate who owes what; it actively optimizes your debts to save you from making dozens of unnecessary bank transfers.
        </p>
      </motion.div>

      <div className="space-y-4">
        
        {/* Step 1: The Greedy Algorithm */}
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={slideUp} className="bg-gradient-to-br from-brand-600 to-brand-800 p-5 rounded-2xl shadow-lg text-white">
          <div className="flex items-center gap-3 mb-3">
            <Zap className="w-6 h-6 text-accent-400" />
            <h3 className="font-bold text-brand-50">The Optimization Engine</h3>
          </div>
          <p className="text-xs text-brand-100 mb-4 leading-relaxed">
            If Alice owes Bob ₹500, and Bob owes Charlie ₹500, making two separate transfers is a waste of time. BillBlend's <b>Min-Cash Flow Algorithm</b> detects this and simply tells Alice to pay Charlie directly!
          </p>
          <div className="bg-black/20 p-3 rounded-xl backdrop-blur-sm flex items-start gap-2">
            <Activity className="w-4 h-4 text-brand-300 shrink-0 mt-0.5" />
            <p className="text-[11px] text-brand-100 leading-relaxed font-medium">
              At the top of the SETTLE tab, the app proves its worth by showing you exactly how many transactions (and how much money) it just saved you from routing!
            </p>
          </div>
        </motion.div>

        {/* Step 2: The Granular Trace */}
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={slideUp} className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400">
              <Search className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-700 dark:text-slate-200">The Live Debt Trace</h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
            Because the algorithm reroutes money, you might be asked to pay someone you didn't directly eat dinner with! 
            <br/><br/>
            Simply <b>tap on any settlement card</b>. It will smoothly expand to reveal a glowing data stream, showing you exactly which specific expenses caused you to be in debt, and why the other person is owed money.
          </p>
        </motion.div>

        {/* Step 3: Partial Settlements & Archiving */}
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={slideUp} className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-accent-50 dark:bg-accent-900/20 rounded-lg text-accent-600 dark:text-accent-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-700 dark:text-slate-200">Partial Settlements & Checkpoints</h3>
          </div>
          
          <div className="space-y-3">
            <div className="border-l-2 border-accent-500 pl-3">
              <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 mb-1">Recording Payments</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">Tap the circular checkbox next to a transfer. When you click "Record", the app secretly injects a repayment into the ledger, balancing those specific people to zero while letting the trip continue uninterrupted.</p>
            </div>
            <div className="border-l-2 border-slate-300 dark:border-slate-700 pl-3">
              <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 mb-1">Permanent Archival</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">When the trip is over and everyone has settled up, you can generate your final PDF report from the STATS tab. Then, hit <b>Archive Trip Permanently</b> to clear your dashboard and save the history!</p>
            </div>
          </div>
        </motion.div>

      </div>
      
      <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} className="pt-10 text-center">
        <p className="text-sm font-bold text-brand-600 dark:text-brand-400">Now you are ready to blend some bills! 🎉</p>
      </motion.div>
    </div>
  );
}