import { motion } from 'framer-motion';
import { SplitSquareHorizontal, Users, Scissors, UserCheck } from 'lucide-react';

export default function SplitModule() {
  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.5 } }
  };

  return (
    <div className="space-y-6 py-8 border-b border-slate-200 dark:border-slate-800">
      <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">The Splitting Engine</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
          BillBlend is equipped with a high-precision decimal absorber. Whether sharing a cab or buying individual dinners, we guarantee the math balances to the exact penny.
        </p>
      </motion.div>

      <div className="space-y-4">
        {/* Split 1: Equal */}
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={itemVariants} className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-brand-50 dark:bg-brand-900/30 rounded-lg"><SplitSquareHorizontal className="w-5 h-5 text-brand-600 dark:text-brand-400" /></div>
            <h3 className="font-bold text-slate-700 dark:text-slate-200">Equally (Everyone)</h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">The classic split. The total bill is divided perfectly among every single member of the group.</p>
          <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800/50 text-[11px] text-slate-600 dark:text-slate-400">
            <span className="font-bold text-brand-600 dark:text-brand-400">Example:</span> 4 friends share a ₹1000 taxi. Everyone gets charged exactly ₹250.
          </div>
        </motion.div>

        {/* Split 2: Selective Equal */}
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={itemVariants} className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg"><Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /></div>
            <h3 className="font-bold text-slate-700 dark:text-slate-200">Specific People</h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Use this when some members skip an activity. You select exactly who was involved, and the app splits the cost equally just among them.</p>
          <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800/50 text-[11px] text-slate-600 dark:text-slate-400">
            <span className="font-bold text-indigo-600 dark:text-indigo-400">Example:</span> 8 people on a trip, but only 3 go to a museum for ₹900. Only those 3 are charged ₹300.
          </div>
        </motion.div>

        {/* Split 3: Exact Amounts */}
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={itemVariants} className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-orange-50 dark:bg-orange-900/30 rounded-lg"><Scissors className="w-5 h-5 text-orange-600 dark:text-orange-400" /></div>
            <h3 className="font-bold text-slate-700 dark:text-slate-200">Exact Amounts</h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Used for uneven expenses where everyone ordered different things. The app ensures your manual entries perfectly match the total bill.</p>
          <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800/50 text-[11px] text-slate-600 dark:text-slate-400">
            <span className="font-bold text-orange-600 dark:text-orange-400">Example:</span> A ₹800 dinner. You had a ₹500 pizza, your friend had a ₹300 burger.
          </div>
        </motion.div>

        {/* Split 4: On Behalf */}
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={itemVariants} className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-accent-50 dark:bg-accent-900/30 rounded-lg"><UserCheck className="w-5 h-5 text-accent-600 dark:text-accent-400" /></div>
            <h3 className="font-bold text-slate-700 dark:text-slate-200">On Behalf Of</h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">The easiest way to record a direct debt. Used when you pay the entire cost of an item strictly for one other person.</p>
          <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800/50 text-[11px] text-slate-600 dark:text-slate-400">
            <span className="font-bold text-accent-600 dark:text-accent-400">Example:</span> You buy a ₹500 product for John (for reasons like: during that time John didn't have cash, and his UPI wasn't working as well!). John instantly owes you exactly ₹500.
          </div>
        </motion.div>
      </div>
    </div>
  );
}