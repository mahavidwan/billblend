import { useStore } from '../store';
import type { Group, Tombstone, AppState } from '../store';
import { findBackupFileId, downloadBackup, uploadBackup } from './googleDriveApi';

// --- THE LWW MERGE ENGINE (Conflict Resolution) ---
function mergeTombstones(local: Tombstone[], remote: Tombstone[]) {
  const map = new Map<string, number>();
  [...local, ...remote].forEach(t => {
    const existing = map.get(t.id);
    if (!existing || t.deletedAt > existing) map.set(t.id, t.deletedAt);
  });
  return Array.from(map.entries()).map(([id, deletedAt]) => ({ id, deletedAt }));
}

async function executeCloudSync(localState: AppState, token: string) {
  const fileId = await findBackupFileId(token);
  const exportData = { groups: localState.groups, deletedGroups: localState.deletedGroups, deletedExpenses: localState.deletedExpenses };

  if (!fileId) {
    // First time syncing! Upload local data as the master backup.
    await uploadBackup(token, exportData, null);
    return exportData;
  }

  // Cloud backup exists. Download and merge.
  const remoteData = await downloadBackup(token, fileId);
  const remoteGroups: Group[] = remoteData.groups || [];
  
  const mergedDelGroups = mergeTombstones(localState.deletedGroups, remoteData.deletedGroups || []);
  const mergedDelExpenses = mergeTombstones(localState.deletedExpenses, remoteData.deletedExpenses || []);
  
  const deletedGroupIds = new Set(mergedDelGroups.map(t => t.id));
  const deletedExpenseIds = new Set(mergedDelExpenses.map(t => t.id));
  const allGroupIds = new Set([...localState.groups.map(g => g.id), ...remoteGroups.map(g => g.id)]);
  
  const mergedGroups: Group[] = [];

  for (const gId of allGroupIds) {
    if (deletedGroupIds.has(gId)) continue; 
    const localG = localState.groups.find(g => g.id === gId);
    const remoteG = remoteGroups.find(g => g.id === gId);

    if (localG && !remoteG) { mergedGroups.push(localG); continue; }
    if (!localG && remoteG) { mergedGroups.push(remoteG); continue; }
    if (localG && remoteG) {
      const localTime = localG.updatedAt || 0;
      const remoteTime = remoteG.updatedAt || 0;
      const baseGroup = localTime > remoteTime ? { ...localG } : { ...remoteG };

      const allExpIds = new Set([...localG.expenses.map(e => e.id), ...remoteG.expenses.map(e => e.id)]);
      const mergedExpenses = [];

      for (const eId of allExpIds) {
        if (deletedExpenseIds.has(eId)) continue; 
        const localE = localG.expenses.find(e => e.id === eId);
        const remoteE = remoteG.expenses.find(e => e.id === eId);

        if (localE && !remoteE) { mergedExpenses.push(localE); continue; }
        if (!localE && remoteE) { mergedExpenses.push(remoteE); continue; }
        if (localE && remoteE) {
          const lETime = localE.updatedAt || 0;
          const rETime = remoteE.updatedAt || 0;
          mergedExpenses.push(lETime > rETime ? localE : remoteE);
        }
      }
      baseGroup.expenses = mergedExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      mergedGroups.push(baseGroup);
    }
  }

  const finalMergedData = {
    groups: mergedGroups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    deletedGroups: mergedDelGroups,
    deletedExpenses: mergedDelExpenses
  };

  // Upload the perfectly merged state back to Google Drive
  await uploadBackup(token, finalMergedData, fileId);
  return finalMergedData;
}

// --- GLOBAL SYNC EXECUTOR (Called by UI & Auto-Sync) ---
export async function triggerGlobalSync(): Promise<{ success: boolean; error?: string }> {
  const state = useStore.getState();
  
  if (!state.cloudUser) return { success: false, error: 'Not logged in' };
  
  if (Date.now() > state.cloudUser.tokenExpiry) {
    return { success: false, error: 'SESSION_EXPIRED' };
  }

  try {
    const mergedData = await executeCloudSync(state, state.cloudUser.accessToken);
    const timeNow = new Date().toISOString();
    
    // Save to Zustand locally
    state.syncMergeData(mergedData.groups, mergedData.deletedGroups, mergedData.deletedExpenses, timeNow);
    return { success: true };
    
  } catch (err: any) {
    console.error("Sync Error:", err.message);
    
    // If Google specifically rejects the token (401), force the app state to 'Expired'
    if (err.message === "AUTH_EXPIRED") {
      useStore.setState({ 
        cloudUser: { ...state.cloudUser, tokenExpiry: 0 } 
      });
      return { success: false, error: 'SESSION_EXPIRED' };
    }
    
    // Return the actual Google Error to the UI (e.g. "Google Error: Drive API not enabled")
    return { success: false, error: err.message || 'Network error or Drive inaccessible' };
  }
}