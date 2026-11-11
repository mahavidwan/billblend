import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../store';
import { isValidName, isDuplicateName, formatName } from '../utils/validation'; 
import { exportGroupToJSON } from '../utils/export';
import { createLiveTripInFirestore } from '../utils/collabSync';
import { cloudBulkUpdateExpenses, cloudUpdateGroup, cloudEndCollaboration } from '../utils/firestoreActions';
import { ArrowLeft, UserPlus, Trash2, ShieldAlert, FileJson, Edit2, Check, PenLine, Globe, Zap, Link as LinkIcon, Clock, Merge, Lock, ShieldCheck, ServerOff, Landmark, CalendarClock, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function formatExpiryDate(ms: number | undefined) {
  if (!ms) return "Unknown Date";
  const d = new Date(ms);
  const dateStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const timeStr = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${dateStr} at ${timeStr}`;
}

export default function GroupSettings() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const group = useStore(state => state.groups.find(g => g.id === id));
  const cloudUser = useStore(state => state.cloudUser); 
  
  const addMember = useStore(state => state.addMember);
  const removeMember = useStore(state => state.removeMember);
  const renameGroup = useStore(state => state.renameGroup);
  const renameMember = useStore(state => state.renameMember); // 🚨 Needed for Edit Pencil
  const enableCollaboration = useStore(state => state.enableCollaboration);
  const endCollaboration = useStore(state => state.endCollaboration);
  const extendCollaboration = useStore(state => state.extendCollaboration);
  const mergeMembers = useStore(state => state.mergeMembers); 
  const changeUserRole = useStore(state => state.changeUserRole);
  const toggleFundFeature = useStore(state => state.toggleFundFeature);

  const [newMemberName, setNewMemberName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(group?.name || '');
  
  const [isEnablingCollab, setIsEnablingCollab] = useState(false);
  const [collabDuration, setCollabDuration] = useState<number>(30);
  const [copiedLink, setCopiedLink] = useState(false);

  const [extendDays, setExtendDays] = useState<number>(7);
  const [isExtending, setIsExtending] = useState(false);

  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeGhostId, setMergeGhostId] = useState('');
  const [mergeTargetId, setMergeTargetId] = useState('');
  const [isMerging, setIsMerging] = useState(false);
  
  // 🚨 FIX 3: RESTORED INLINE EDIT STATE
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editingMemberName, setEditingMemberName] = useState('');

  if (!group) return null;

  const isAdmin = !group.isCollaborative || (cloudUser?.email && group.roles?.admin?.includes(cloudUser.email));
  const isExtensionAllowed = group.collabExpiresAt ? (group.collabExpiresAt - Date.now()) <= 604800000 : false;

  const handleRename = async () => {
    const safeName = editedName.trim();
    if (safeName && safeName !== group.name) {
      renameGroup(group.id, safeName);
      if (group.isCollaborative && group.firebaseTripId) await cloudUpdateGroup(group.firebaseTripId, { name: safeName });
    }
    setIsEditingName(false); 
  };

  const handleAddMember = async () => {
    const cleanName = formatName(newMemberName);
    if (!isValidName(cleanName)) { alert("Name must have at least 3 letters/numbers."); return; }
    
    const existingNames = group.members.map(m => m.name);
    if (isDuplicateName(cleanName, existingNames)) { alert("This name already exists! Choose a unique name."); return; }

    addMember(group.id, cleanName); setNewMemberName('');
    
    if (group.isCollaborative && group.firebaseTripId) {
      const latestGroup = useStore.getState().groups.find(g => g.id === group.id);
      if (latestGroup) await cloudUpdateGroup(group.firebaseTripId, { members: latestGroup.members });
    }
  };

  // 🚨 RESTORED EDIT PENCIL FUNCTION
  const handleRenameMemberSave = async (memberId: string) => {
    const cleanName = formatName(editingMemberName);
    if (!isValidName(cleanName)) { alert("Name must have at least 3 letters/numbers."); return; }
    
    const otherNames = group.members.filter(m => m.id !== memberId).map(m => m.name);
    if (isDuplicateName(cleanName, otherNames)) { alert("This name is already used by someone else!"); return; }

    renameMember(group.id, memberId, cleanName);
    setEditingMemberId(null);

    if (group.isCollaborative && group.firebaseTripId) {
      const latestGroup = useStore.getState().groups.find(g => g.id === group.id);
      if (latestGroup) await cloudUpdateGroup(group.firebaseTripId, { members: latestGroup.members });
    }
  };
  
  const handleRemoveMember = async (memberId: string, memberName: string) => {
    const isEngaged = group.expenses.some(exp => exp.paidBy === memberId || exp.splits.some(s => s.memberId === memberId));
    if (isEngaged) { alert(`Cannot remove ${memberName}.\n\nThey are part of existing expenses.`); return; }
    if (group.members.length <= 1) { alert("A group must have at least 1 member."); return; }
    
    if (window.confirm(`Remove ${memberName} from this group?`)) {
      removeMember(group.id, memberId);
      if (group.isCollaborative && group.firebaseTripId) {
        const latestGroup = useStore.getState().groups.find(g => g.id === group.id);
        if (latestGroup) await cloudUpdateGroup(group.firebaseTripId, { members: latestGroup.members });
      }
    }
  };

  const handleTurnOnCollab = async () => {
    if (!cloudUser) { alert("You must connect your Google account in the sidebar first to be the Admin of this Live Trip!"); return; }
    if (window.confirm(`Push this trip to the cloud for ${collabDuration} days?\n\nThis will generate a secure link for friends to join and edit live.`)) {
      try {
        setIsEnablingCollab(true);
        const { firebaseTripId, expiresAt } = await createLiveTripInFirestore(group, collabDuration, cloudUser.email);
        enableCollaboration(group.id, firebaseTripId, expiresAt, cloudUser.email);
        
        const updatedGroup = useStore.getState().groups.find(g => g.id === group.id);
        if (updatedGroup) await cloudUpdateGroup(firebaseTripId, { members: updatedGroup.members, roles: updatedGroup.roles });
      } catch (err: any) { alert(`Failed to create live trip.\n\nReason: ${err.message || 'Network disconnected'}`); } 
      finally { setIsEnablingCollab(false); }
    }
  };

  const handleEndCollab = async () => {
    if (!isAdmin) return;
    if (window.confirm("CRITICAL WARNING:\n\nAre you sure you want to permanently end Live Collaboration?\n\nThis will instantly delete the trip from the cloud. Other users will lose access. Your local copy will be safely retained.")) {
      try {
        setIsEnablingCollab(true); 
        if (group.firebaseTripId) await cloudEndCollaboration(group.firebaseTripId);
        endCollaboration(group.id, "You manually ended the collaboration.");
      } catch (err) {
        alert("Failed to delete trip from cloud.");
      } finally {
        setIsEnablingCollab(false);
      }
    }
  };

  const handleExtendCollab = async () => {
    if (!isAdmin || !group.collabExpiresAt || !group.firebaseTripId) return;
    if (window.confirm(`Extend collaboration by ${extendDays} days?`)) {
      setIsExtending(true);
      try {
        const newExpiresAt = group.collabExpiresAt + (extendDays * 24 * 60 * 60 * 1000);
        await cloudUpdateGroup(group.firebaseTripId, { expiresAt: new Date(newExpiresAt) } as any);
        extendCollaboration(group.id, newExpiresAt);
        alert("Trip successfully extended!");
      } catch (e) {
        alert("Failed to extend collaboration. Check connection.");
      } finally {
        setIsExtending(false);
      }
    }
  };

  const copyInviteLink = () => {
    const inviteUrl = `${window.location.origin}/join/${group.firebaseTripId}`;
    navigator.clipboard.writeText(inviteUrl); setCopiedLink(true); setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleExecuteMerge = async () => {
    if (!mergeGhostId || !mergeTargetId || mergeGhostId === mergeTargetId) { alert("Select distinct members."); return; }
    const ghostName = group.members.find(m => m.id === mergeGhostId)?.name;
    const targetName = group.members.find(m => m.id === mergeTargetId)?.name;

    if (window.confirm(`Merge all expenses from "${ghostName}" into "${targetName}"?\n\n"${ghostName}" will be permanently deleted.`)) {
      setIsMerging(true);
      mergeMembers(group.id, mergeGhostId, mergeTargetId);
      const updatedGroup = useStore.getState().groups.find(g => g.id === group.id);
      
      if (updatedGroup && updatedGroup.isCollaborative && updatedGroup.firebaseTripId) {
        try {
          const recentlyModified = updatedGroup.expenses.filter(e => (Date.now() - (e.updatedAt || 0)) < 5000);
          if (recentlyModified.length > 0) await cloudBulkUpdateExpenses(updatedGroup.firebaseTripId, recentlyModified);
          await cloudUpdateGroup(updatedGroup.firebaseTripId, { members: updatedGroup.members });
        } catch (err) { alert("Merge succeeded locally, but failed to sync to cloud."); }
      }
      setIsMerging(false); setShowMergeModal(false); setMergeGhostId(''); setMergeTargetId(''); alert("Merge complete!");
    }
  };

  const handleRoleChange = async (memberEmail: string, newRole: 'admin' | 'editor' | 'viewer') => {
    if (!isAdmin) return;
    if (newRole !== 'admin' && group.roles?.admin.length === 1 && group.roles.admin.includes(memberEmail)) {
      alert("Action Denied: A live trip must have at least 1 Admin."); return;
    }
    if (window.confirm(`Change role to ${newRole.toUpperCase()}?`)) {
      changeUserRole(group.id, memberEmail, newRole);
      if (group.isCollaborative && group.firebaseTripId) {
        const updatedGroup = useStore.getState().groups.find(g => g.id === group.id);
        if (updatedGroup?.roles) await cloudUpdateGroup(group.firebaseTripId, { roles: updatedGroup.roles });
      }
    }
  };

  const handleToggleFund = async () => {
    if (!isAdmin) return;
    const newState = !group.isFundEnabled;
    toggleFundFeature(group.id, newState);
    if (group.isCollaborative && group.firebaseTripId) await cloudUpdateGroup(group.firebaseTripId, { isFundEnabled: newState });
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="pb-28 transition-colors duration-300 min-h-screen relative">
      <AnimatePresence>
        {showMergeModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-xl text-slate-800 dark:text-slate-100 mb-2 flex items-center gap-2"><Merge className="w-6 h-6 text-brand-500" /> Merge Identities</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">Transfer all debts and payments from a temporary ghost profile into a newly joined user.</p>
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">1. Select Ghost Profile (Will be deleted)</label>
                  <select value={mergeGhostId} onChange={e => setMergeGhostId(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-800 dark:text-slate-100">
                    <option value="">-- Select Ghost --</option>
                    {group.members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">2. Select Real Account (Keeps everything)</label>
                  <select value={mergeTargetId} onChange={e => setMergeTargetId(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-800 dark:text-slate-100">
                    <option value="">-- Select Real Account --</option>
                    {group.members.map(m => <option key={m.id} value={m.id} disabled={m.id === mergeGhostId}>{m.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowMergeModal(false)} className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold py-3 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Cancel</button>
                <button onClick={handleExecuteMerge} disabled={!mergeGhostId || !mergeTargetId || isMerging} className="flex-1 bg-brand-600 disabled:bg-slate-400 text-white font-bold py-3 rounded-xl shadow-md active:scale-95 transition-all">
                  {isMerging ? 'Merging...' : 'Execute Merge'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="bg-white dark:bg-slate-900 px-4 py-4 flex items-center gap-4 shadow-sm sticky top-0 z-10 border-b border-slate-100 dark:border-slate-800 transition-colors duration-300">
        <button onClick={() => navigate(-1)} className="text-slate-500 dark:text-slate-400 p-1 active:bg-slate-100 dark:active:bg-slate-800 rounded-full transition-colors"><ArrowLeft className="w-6 h-6" /></button>
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 transition-colors">Group Settings</h2>
      </div>

      <div className="p-4 space-y-6">
        
        <AnimatePresence>
          {group.terminationMessage && !group.isCollaborative && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="bg-red-50 dark:bg-red-900/20 p-4 rounded-2xl border border-red-200 dark:border-red-800/50 flex gap-3">
              <ServerOff className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-red-800 dark:text-red-400 mb-1">Live Sync Disconnected</h3>
                <p className="text-xs text-red-600 dark:text-red-300 leading-relaxed">{group.terminationMessage}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className={`p-5 rounded-2xl shadow-sm border transition-colors duration-300 ${group.isCollaborative ? 'bg-gradient-to-br from-brand-600 to-brand-800 border-brand-800 text-white' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'}`}>
          <div className="flex justify-between items-start mb-2">
            <h3 className={`font-bold flex items-center gap-2 ${group.isCollaborative ? 'text-white' : 'text-slate-800 dark:text-slate-200'}`}>
              {group.isCollaborative ? <Zap className="w-5 h-5 text-accent-400" /> : <Globe className="w-5 h-5 text-brand-500" />} Real-Time Sync
            </h3>
            {group.isCollaborative && <span className="bg-accent-500 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider animate-pulse shadow-md">Live</span>}
          </div>
          
          <p className={`text-xs mb-4 leading-relaxed ${group.isCollaborative ? 'text-brand-100' : 'text-slate-500 dark:text-slate-400'}`}>
            {group.isCollaborative 
              ? `This trip is live! Friends can join via link. Auto-closes on ${formatExpiryDate(group.collabExpiresAt)}.` 
              : "Enable this to allow friends to add expenses live from their own phones. Select an initial time-span for which you want Real-Time sync to remain enabled on this trip. Later you can extend this time! After this time, the trip details still remain safely saved on your local device and Google Drive."}
          </p>

          {!group.isCollaborative ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
                <Clock className="w-4 h-4 text-slate-400 ml-2" />
                <select value={collabDuration} onChange={(e) => setCollabDuration(Number(e.target.value))} className="flex-1 bg-transparent text-sm font-bold text-slate-700 dark:text-slate-300 outline-none cursor-pointer py-1">
                  <option value={7}>Active for 7 Days</option>
                  <option value={15}>Active for 15 Days</option>
                  <option value={30}>Active for 30 Days</option>
                  <option value={45}>Active for 45 Days</option> 
                </select>
              </div>
              <button onClick={handleTurnOnCollab} disabled={isEnablingCollab} className="w-full bg-slate-800 dark:bg-brand-600 hover:bg-slate-700 text-white font-bold py-3 rounded-xl shadow-md transition-all active:scale-95 flex justify-center items-center gap-2">
                {isEnablingCollab ? "Initializing Database..." : "Enable Collaboration"}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <button onClick={copyInviteLink} className="w-full bg-white text-brand-700 font-bold py-3 rounded-xl shadow-md hover:bg-slate-50 transition-all active:scale-95 flex justify-center items-center gap-2">
                {copiedLink ? <Check className="w-5 h-5 text-accent-500" /> : <LinkIcon className="w-5 h-5" />} {copiedLink ? "Link Copied!" : "Copy Live Invite Link"}
              </button>

              {isAdmin && (
                <div className="border-t border-brand-500/50 pt-3 mt-3">
                  {isExtensionAllowed ? (
                    <div className="flex items-center gap-2">
                      <select value={extendDays} onChange={(e) => setExtendDays(Number(e.target.value))} className="bg-brand-900/40 text-white border border-brand-500/50 rounded-lg p-2 text-xs font-bold outline-none cursor-pointer">
                        <option value={7}>+7 Days</option>
                        <option value={15}>+15 Days</option>
                      </select>
                      <button onClick={handleExtendCollab} disabled={isExtending} className="flex-1 bg-brand-500 hover:bg-brand-400 text-white font-bold py-2 rounded-lg text-sm transition-all active:scale-95 flex items-center justify-center gap-2 shadow-sm">
                        <CalendarClock className="w-4 h-4" /> {isExtending ? "Extending..." : "Extend Time"}
                      </button>
                    </div>
                  ) : (
                    <p className="text-[10px] text-brand-200 text-center opacity-80">
                      You can extend this collaboration time when there are 7 or fewer days remaining.
                    </p>
                  )}
                </div>
              )}

              {isAdmin && (
                <button onClick={handleEndCollab} disabled={isEnablingCollab} className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-all active:scale-95 flex justify-center items-center gap-2 shadow-md mt-2">
                  <ServerOff className="w-5 h-5" /> End Collaboration Globally
                </button>
              )}
            </div>
          )}
        </div>

        <div className={`bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors duration-300 ${!isAdmin && 'opacity-60 pointer-events-none'}`}>
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-2 transition-colors">
                <Landmark className="w-5 h-5 text-indigo-500 dark:text-indigo-400" /> Trip Fund Pooling
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 transition-colors leading-relaxed pr-4">
                Allow members to deposit money upfront into a central "Trip Fund" to pay for common expenses, rather than paying out of pocket each time.
              </p>
            </div>
            
            <div onClick={handleToggleFund} className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ${group.isFundEnabled ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-700'}`}>
              <motion.div className="bg-white w-4 h-4 rounded-full shadow-sm" animate={{ x: group.isFundEnabled ? 24 : 0 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} />
            </div>
          </div>
        </div>

        {!isAdmin && (
          <div className="bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 p-4 rounded-xl text-sm font-medium flex items-center gap-3 border border-orange-200 dark:border-orange-800/50">
            <Lock className="w-5 h-5 shrink-0" /> Only Admins can modify settings, manage members, or assign roles.
          </div>
        )}

        <div className={`bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors duration-300 ${!isAdmin && 'opacity-60 pointer-events-none'}`}>
          <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-1 flex items-center gap-2 transition-colors"><PenLine className="w-4 h-4 text-brand-500 dark:text-brand-400" /> Trip Name</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 transition-colors">Tap the pencil to rename this trip.</p>
          <div className="flex items-center gap-2 w-full">
            <input type="text" value={editedName} onChange={(e) => setEditedName(e.target.value)} disabled={!isEditingName} className={`flex-1 min-w-0 p-3 rounded-xl border focus:outline-none transition-all duration-300 ${isEditingName ? 'bg-white dark:bg-slate-950 border-brand-500 text-slate-800 dark:text-slate-100 ring-2 ring-brand-500/20 shadow-sm' : 'bg-slate-100 dark:bg-slate-800/50 border-transparent text-slate-500 dark:text-slate-400 cursor-not-allowed opacity-80'}`} />
            {isEditingName ? <button onClick={handleRename} className="shrink-0 bg-accent-500 hover:bg-accent-600 text-white p-3.5 rounded-xl font-bold active:scale-95 transition-all"><Check className="w-5 h-5" /></button> : <button onClick={() => setIsEditingName(true)} className="shrink-0 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 p-3.5 rounded-xl font-bold active:scale-95 transition-all"><Edit2 className="w-5 h-5" /></button>}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors duration-300">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-2 transition-colors">Export & Share Data</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 transition-colors">Download the raw Trip Data file here and share it with friends to import locally!</p>
          <button onClick={() => exportGroupToJSON(group)} className="w-full bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 text-white font-bold py-3 rounded-xl active:scale-95 transition-all flex items-center justify-center gap-2"><FileJson className="w-5 h-5" /> Download Trip File (.json)</button>
        </div>

        <div className={`bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors duration-300 ${!isAdmin && 'opacity-60 pointer-events-none'}`}>
          <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2 transition-colors"><UserPlus className="w-5 h-5 text-brand-500 dark:text-brand-400" /> Add New Member</h3>
          <div className="flex items-center gap-2 w-full">
            <input type="text" value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} placeholder="Enter name..." className="flex-1 min-w-0 p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 transition-colors" />
            <button onClick={handleAddMember} disabled={!newMemberName.trim()} className="shrink-0 bg-brand-600 dark:bg-brand-700 disabled:bg-slate-300 text-white px-5 py-3 rounded-xl font-bold active:scale-95 transition-all">Add</button>
          </div>
        </div>

        <div className={`bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-colors duration-300 ${!isAdmin && 'opacity-60 pointer-events-none'}`}>
          <div className="flex justify-between items-end mb-4">
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-1 transition-colors">Manage Members</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 transition-colors max-w-[200px]">Manage roles, rename members, or merge a ghost profile.</p>
            </div>
            <button onClick={() => setShowMergeModal(true)} disabled={group.members.length < 2} className="bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 disabled:opacity-50 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-brand-200 dark:border-brand-800/50 hover:bg-brand-100 transition-colors active:scale-95">
              <Merge className="w-4 h-4" /> Merge
            </button>
          </div>
          
          <div className="space-y-3">
            {group.members.map((member) => {
              const isEngaged = group.expenses.some(exp => exp.paidBy === member.id || exp.splits.some(s => s.memberId === member.id));
              const isEditingThis = editingMemberId === member.id;
              
              let currentRole = 'Ghost';
              if (member.email) {
                if (group.roles?.admin?.includes(member.email)) currentRole = 'admin';
                else if (group.roles?.editor?.includes(member.email)) currentRole = 'editor';
                else currentRole = 'viewer';
              }

              return (
                <div key={member.id} className="flex flex-col gap-2 p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 transition-colors">
                  
                  {/* 🚨 RESTORED: INLINE EDIT STATE */}
                  {isEditingThis ? (
                    <div className="flex items-center gap-2 w-full">
                      <input 
                        type="text" autoFocus
                        value={editingMemberName} 
                        onChange={(e) => setEditingMemberName(e.target.value)} 
                        className="flex-1 min-w-0 p-2 bg-white dark:bg-slate-900 border border-brand-500 rounded-lg focus:outline-none text-slate-800 dark:text-slate-100 text-sm font-bold shadow-sm" 
                      />
                      <button onClick={() => handleRenameMemberSave(member.id)} className="p-2 bg-accent-500 text-white rounded-lg active:scale-95"><Check className="w-4 h-4" /></button>
                      <button onClick={() => setEditingMemberId(null)} className="p-2 bg-slate-200 dark:bg-slate-800 text-slate-500 rounded-lg active:scale-95"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center w-full">
                      <div>
                        <p className="font-bold text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-2">
                          {member.name} 
                          {member.email && <span className="bg-accent-100 text-accent-700 text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wider">Linked</span>}
                        </p>
                        {member.email && <p className="text-[10px] text-slate-400">{member.email}</p>}
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => { setEditingMemberId(member.id); setEditingMemberName(member.name); }} 
                          className="p-2 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 active:scale-90 transition-all"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleRemoveMember(member.id, member.name)} 
                          className={`p-2 rounded-lg transition-all ${isEngaged ? 'text-slate-300 bg-slate-100 dark:bg-slate-800/50 cursor-not-allowed' : 'text-red-400 hover:text-red-500 hover:bg-red-50 active:scale-90'}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {group.isCollaborative && member.email && !isEditingThis && (
                    <div className="flex items-center gap-2 mt-1 border-t border-slate-200 dark:border-slate-800 pt-2">
                      <ShieldCheck className="w-3 h-3 text-slate-400" />
                      <select 
                        value={currentRole}
                        onChange={(e) => handleRoleChange(member.email!, e.target.value as any)}
                        className="text-xs bg-transparent font-bold text-slate-600 dark:text-slate-400 outline-none cursor-pointer"
                      >
                        <option value="admin">Admin</option>
                        <option value="editor">Editor</option>
                        <option value="viewer">Viewer (Read-Only)</option>
                      </select>
                    </div>
                  )}
                </div>
              );
            })}
            
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-4 flex items-start gap-1 transition-colors">
              <ShieldAlert className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" /> Members involved in expenses cannot be removed to protect calculation accuracy.
            </p>
          </div>
        </div>

      </div>
    </motion.div>
  );
}