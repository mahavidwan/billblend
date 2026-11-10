import { useEffect } from 'react';
import { doc, onSnapshot, collection, query, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { useStore } from '../store';
import type { Group, Expense } from '../store';

export function useLiveSync(group: Group) {
  const updateGroupFromCloud = useStore(state => state.updateGroupFromCloud);
  const endCollaboration = useStore(state => state.endCollaboration);
  const deleteGroup = useStore(state => state.deleteGroup); // 🚨 NEW
  const cloudUser = useStore(state => state.cloudUser);

  useEffect(() => {
    if (!group.isCollaborative || !group.firebaseTripId) return;

    const tripRef = doc(db, 'trips', group.firebaseTripId);
    
    const unsubscribeTrip = onSnapshot(tripRef, async (docSnap) => {
      if (!docSnap.exists()) {
        let reason = "An Admin ended the collaboration.";
        if (group.collabExpiresAt && Date.now() > group.collabExpiresAt) reason = "The collaboration time-limit naturally expired.";
        endCollaboration(group.id, reason);
        return;
      }

      const data = docSnap.data();
      
      // 🚨 NEW SECURITY CHECK: If this user was kicked from the trip, DELETE it from their device!
      if (cloudUser?.email) {
        const isStillMember = data.members.some((m: any) => m.email === cloudUser.email);
        if (!isStillMember) {
          console.warn("You were removed from this trip.");
          deleteGroup(group.id); // Wipe it from their local app entirely
          return;
        }
      }
      
      const expensesRef = collection(db, `trips/${group.firebaseTripId}/expenses`);
      const q = query(expensesRef);
      
      try {
        const expSnap = await getDocs(q);
        const liveExpenses: Expense[] = [];
        
        expSnap.forEach((eDoc) => {
          const expData = eDoc.data() as any;
          if (expData.status !== 'deleted') {
            liveExpenses.push(expData as Expense);
          }
        });

        const newUpdateTime = data.updatedAt || Date.now();
        if (newUpdateTime >= (group.updatedAt || 0) || data.members.length !== group.members.length) {
          const updatedGroup: Group = {
            ...group, name: data.name, members: data.members, roles: data.roles,
            isFundEnabled: data.isFundEnabled, isFundClosed: data.isFundClosed, // Keep fund states synced
            expenses: liveExpenses, updatedAt: newUpdateTime
          };
          updateGroupFromCloud(group.id, updatedGroup);
        }
      } catch (err) {
        console.error("Failed to sync live expenses", err);
      }
    });

    return () => unsubscribeTrip(); 
  }, [group.id, group.firebaseTripId, group.isCollaborative, group.updatedAt, cloudUser?.email]); 
}

export function GlobalLiveSyncManager() {
  const groups = useStore(state => state.groups);
  const liveGroups = groups.filter(g => g.isCollaborative);
  return <>{liveGroups.map(group => <LiveTripWatcher key={group.id} group={group} />)}</>;
}

function LiveTripWatcher({ group }: { group: Group }) {
  useLiveSync(group);
  return null;
}