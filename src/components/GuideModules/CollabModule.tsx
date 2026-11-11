import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { Globe, Users, Shield, Clock, Zap, Lock } from 'lucide-react';

export default function CollabModule() {
  const slideUp: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
  };

  return (
    <div className="space-y-6 py-8 border-b border-slate-200 dark:border-slate-800">
      <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2 flex items-center gap-2">
          <Globe className="w-6 h-6 text-brand-500" /> Real-Time Sync
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
          BillBlend is private and local by default. But when you need friends to add expenses from their own phones, you can instantly turn your local trip into a secure, live workspace.
        </p>
      </motion.div>

      <div className="space-y-4">
        
        {/* Step 1: Going Live */}
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={slideUp} className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-brand-50 dark:bg-brand-900/30 rounded-lg text-brand-600 dark:text-brand-400">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-700 dark:text-slate-200">Going Live & The Timer</h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
            In Group Settings, you can choose a duration (e.g., 15 Days) to push the trip to the cloud. You get a secure Invite Link to send via WhatsApp. 
          </p>
          <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800/50 flex items-start gap-2">
            <Clock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              <b>Why a timer?</b> To protect your data footprint. When the timer expires (or you end it manually), the trip instantly deletes itself from the cloud and reverts to a safe, offline local copy on everyone's phones. This ensures your financial data privacy!
            </p>
          </div>
        </motion.div>

        {/* Step 2: RBAC Roles */}
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={slideUp} className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-orange-50 dark:bg-orange-900/30 rounded-lg text-orange-600 dark:text-orange-400">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-700 dark:text-slate-200">Roles & Permissions</h3>
          </div>
          
          <div className="space-y-3">
            <div className="border-l-2 border-brand-500 pl-3">
              <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 mb-1">Admin (The Creator)</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">Total control. Can rename the trip, manage the Trip Fund, assign roles to others, edit ANY expense, and end the collaboration globally. An Admin can assign 'ADMIN' role to any of the other authenticated member(s) of the trip.</p>
            </div>
            <div className="border-l-2 border-slate-300 dark:border-slate-600 pl-3">
              <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 mb-1">Editor</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">Can add new expenses. Can ONLY edit or delete the specific expenses they created.</p>
            </div>
            <div className="border-l-2 border-slate-200 dark:border-slate-700 pl-3">
              <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-1">Viewer <Lock className="w-3 h-3 text-slate-400" /></h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">Read-only. They can watch the numbers update live on their screen, but cannot add or modify any data.</p>
            </div>
          </div>
        </motion.div>

        {/* Step 3: Identity Merging */}
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={slideUp} className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-700 dark:text-slate-200">Merging Identities</h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            If you created a dummy profile for "John" for recording his part of expenses (as he is a member of your trip) while initially John not having his own account on BillBlend, and then John later joins the trip using the invite link with his real Google account, you will have two Johns! 
            <br/><br/>
            The Admin can use the <b>Merge tool</b> in Group Settings to flawlessly combine John's old dummy profile into his new, authenticated account without losing a single penny of history. The settlements remain fully accurate!
          </p>
        </motion.div>

      </div>
    </div>
  );
}