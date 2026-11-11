import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { Rocket, Shield, CloudLightning } from 'lucide-react';

export default function WelcomeModule() {
  const cardVariants: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  return (
    <div className="space-y-8 pb-8 border-b border-slate-200 dark:border-slate-800">
      <motion.div 
        initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={cardVariants}
        className="text-center space-y-4 pt-6"
      >
        <div className="w-20 h-20 bg-brand-100 dark:bg-brand-900/30 rounded-full flex items-center justify-center mx-auto shadow-inner border border-brand-200 dark:border-brand-800">
          <Rocket className="w-10 h-10 text-brand-600 dark:text-brand-400" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">Master BillBlend</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[280px] mx-auto leading-relaxed">
          From weekend getaways to month-long international trips, learn how to budget and settle up flawlessly.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 gap-4">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={cardVariants} className="bg-gradient-to-br from-slate-800 to-slate-900 p-5 rounded-2xl shadow-lg text-white">
          <Shield className="w-6 h-6 text-brand-400 mb-3" />
          <h3 className="font-bold text-lg mb-2">100% Private by Default</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Unlike other apps, BillBlend does not store your financial data on central servers. Everything lives locally on your phone and backs up securely to your own Google Drive.
          </p>
        </motion.div>

        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={cardVariants} className="bg-gradient-to-br from-brand-600 to-brand-800 p-5 rounded-2xl shadow-lg text-white">
          <CloudLightning className="w-6 h-6 text-accent-400 mb-3" />
          <h3 className="font-bold text-lg mb-2">Real-Time Collaboration</h3>
          <p className="text-xs text-brand-100 leading-relaxed">
            Need friends to add expenses too? Upgrade any trip to "Live" to temporarily activate our enterprise-grade WebSocket engine. Your group's screens will sync instantly.
          </p>
        </motion.div>
      </div>
    </div>
  );
}