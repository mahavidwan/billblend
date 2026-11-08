import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, getDocs, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../utils/firebase';
import { useStore } from '../store';
import type { Group, Expense } from '../store';
import { Cloud, AlertCircle, Users, Zap, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function JoinTrip() {
  const { tripId } = useParams<{ tripId: string }>();
  const navigate = useNavigate();
  
  const cloudUser = useStore(state => state.cloudUser);
  const importGroup = useStore(state => state.importGroup);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tripPreview, setTripPreview] = useState<any>(null);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    const existingGroup = useStore.getState().groups.find(g => g.firebaseTripId === tripId);
    if (existingGroup) {
      navigate(`/group/${existingGroup.id}`, { replace: true });
      return;
    }

    async function fetchTripDetails() {
      if (!tripId) return;
      try {
        const tripRef = doc(db, 'trips', tripId);
        const tripSnap = await getDoc(tripRef);
        if (!tripSnap.exists()) { setError("Live trip not found."); setLoading(false); return; }

        const data = tripSnap.data();
        if (data.expiresAt && data.expiresAt.toMillis() < Date.now()) {
          setError("This collaboration session has expired."); setLoading(false); return;
        }
        setTripPreview({ name: data.name, membersCount: data.members.length, expiresAt: data.expiresAt.toMillis(), admin: data.roles?.admin?.[0] || 'Unknown', rawMembers: data.members, createdAt: data.createdAt });
      } catch (err) { setError("Failed to connect to the secure server."); } finally { setLoading(false); }
    }
    fetchTripDetails();
  }, [tripId, navigate]);

  const handleJoin = async () => {
    if (!cloudUser) { alert("Please connect your Google account in the sidebar first."); return; }
    if (!tripId || !tripPreview) return;

    try {
      setJoining(true);
      
      // 🚨 NEW: Add the new user's Email and Name to the Firestore Members List!
      const tripRef = doc(db, 'trips', tripId);
      const newMember = { id: crypto.randomUUID(), name: cloudUser.name, email: cloudUser.email };
      
      await updateDoc(tripRef, {
        members: arrayUnion(newMember), // Atomically pushes to array
        'roles.viewer': arrayUnion(cloudUser.email) // RBAC: Add as viewer/editor by default
      });
      
      // Fetch Expenses
      const expensesRef = collection(db, `trips/${tripId}/expenses`);
      const expensesSnap = await getDocs(expensesRef);
      const liveExpenses: Expense[] = [];
      expensesSnap.forEach((d) => liveExpenses.push(d.data() as Expense));

      const newGroup: Group = {
        id: crypto.randomUUID(), name: tripPreview.name, createdAt: tripPreview.createdAt,
        members: [...tripPreview.rawMembers, newMember], // Include themselves!
        expenses: liveExpenses, isCollaborative: true, firebaseTripId: tripId,
        collabExpiresAt: tripPreview.expiresAt, updatedAt: Date.now()
      };

      importGroup(newGroup);
      navigate(`/group/${newGroup.id}`, { replace: true });
      
    } catch (err) {
      console.error(err);
      alert("Failed to join trip.");
      setJoining(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-500 font-medium">Connecting...</div>;
  if (error) return <div className="flex flex-col items-center justify-center min-h-screen text-center"><AlertCircle className="w-12 h-12 text-red-500 mb-4" /><h2>Trip Unavailable</h2><p>{error}</p></div>;

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
      <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-lg border border-slate-100 dark:border-slate-800 max-w-sm w-full">
        <div className="bg-brand-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 relative">
          <Cloud className="w-8 h-8 text-brand-600" /><Zap className="w-4 h-4 text-accent-500 absolute bottom-0 right-0" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Live Trip Invite!</h2>
        
        <div className="bg-slate-50 p-5 rounded-2xl text-left mb-8 border border-slate-100">
          <h3 className="font-bold text-xl text-brand-700 mb-3">{tripPreview.name}</h3>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm"><Users className="w-4 h-4" /><span>{tripPreview.membersCount} Members</span></div>
            <div className="flex items-center gap-2 text-sm"><CheckCircle2 className="w-4 h-4 text-accent-500" /><span className="truncate">Admin: {tripPreview.admin}</span></div>
          </div>
        </div>

        {!cloudUser ? (
          <div className="bg-orange-50 text-orange-700 p-4 rounded-xl text-sm font-medium mb-4">Connect Google Account in sidebar to join.</div>
        ) : (
          <button onClick={handleJoin} disabled={joining} className="w-full bg-accent-500 hover:bg-accent-600 text-white font-bold text-lg py-4 rounded-xl shadow-md active:scale-95 transition-all mb-4">
            {joining ? "Joining..." : `Join as ${cloudUser.name}`}
          </button>
        )}
      </div>
    </motion.div>
  );
}