import { useEffect } from 'react';
import { doc, onSnapshot, collection, query, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { useStore } from '../store';
import type { Group, Expense } from '../store';

export function useLiveSync(group: Group) {
  const updateGroupFromCloud = useStore(state => state.updateGroupFromCloud);

  useEffect(() => {
    if (!group.isCollaborative || !group.firebaseTripId) return;

    const tripRef = doc(db, 'trips', group.firebaseTripId);
    
    const unsubscribeTrip = onSnapshot(tripRef, async (docSnap) => {
      if (docSnap.exists()) {
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
          if (newUpdateTime > (group.updatedAt || 0)) {
            const updatedGroup: Group = {
              ...group,
              name: data.name,
              members: data.members,
              roles: data.roles, //  NEW: Stream RBAC Roles
              expenses: liveExpenses,
              updatedAt: newUpdateTime
            };
            updateGroupFromCloud(group.id, updatedGroup);
          }
        } catch (err) {
          console.error("Failed to sync live expenses", err);
        }
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