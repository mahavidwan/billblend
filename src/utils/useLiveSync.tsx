import { useEffect } from 'react';
import { doc, onSnapshot, collection, query, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { useStore } from '../store';
import type { Group, Expense } from '../store';

export function useLiveSync(group: Group) {
  const updateGroupFromCloud = useStore(state => state.updateGroupFromCloud);
  const endCollaboration = useStore(state => state.endCollaboration); // 🚨 NEW

  useEffect(() => {
    if (!group.isCollaborative || !group.firebaseTripId) return;

    const tripRef = doc(db, 'trips', group.firebaseTripId);
    
    const unsubscribeTrip = onSnapshot(tripRef, async (docSnap) => {
      
      // 🚨 THE FIX: What happens if the document is deleted by an Admin or TTL expiration?
      if (!docSnap.exists()) {
        console.warn(`Live Trip ${group.firebaseTripId} was deleted from Firestore.`);
        
        // Determine the reason based on the TTL
        let reason = "An Admin ended the collaboration.";
        if (group.collabExpiresAt && Date.now() > group.collabExpiresAt) {
          reason = "The collaboration time-limit naturally expired.";
        }
        
        // Force the app to safely sever the connection and revert to offline mode!
        endCollaboration(group.id, reason);
        return;
      }

      // ... If the document still exists, process updates normally ...
      const data = docSnap.data();
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
            ...group,
            name: data.name,
            members: data.members,
            roles: data.roles,
            expenses: liveExpenses,
            updatedAt: newUpdateTime
          };
          updateGroupFromCloud(group.id, updatedGroup);
        }
      } catch (err) {
        console.error("Failed to sync live expenses", err);
      }
    });

    return () => unsubscribeTrip(); 
  }, [group.id, group.firebaseTripId, group.isCollaborative, group.updatedAt]); 
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