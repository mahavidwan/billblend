import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SplitType = 'EQUAL' | 'UNEQUAL' | 'ON_BEHALF' | 'SELECTIVE_EQUAL' | 'FUND_DEPOSIT';
export type Theme = 'light' | 'dark' | 'system';

export interface SplitItem { memberId: string; amount: number; }
export interface Expense {
  id: string; description: string; amount: number; paidBy: string; 
  date: string; splitType: SplitType; splits: SplitItem[]; isSettled?: boolean;
  updatedAt?: number; isSystemRepayment?: boolean; createdByEmail?: string;
}
export interface Member { id: string; name: string; email?: string; }
export interface GroupRoles { admin: string[]; editor: string[]; viewer: string[]; }

export interface Group {
  id: string; name: string; createdAt: string; isPinned?: boolean; members: Member[]; expenses: Expense[];
  updatedAt?: number; isCollaborative?: boolean; firebaseTripId?: string; collabExpiresAt?: number; 
  roles?: GroupRoles; terminationMessage?: string; 
  isFundEnabled?: boolean; isFundClosed?: boolean;
}

export interface CloudUser { name: string; email: string; picture: string; accessToken: string; tokenExpiry: number; }
export interface Tombstone { id: string; deletedAt: number; }

export const VIRTUAL_FUND_ID = "VIRTUAL_TRIP_FUND";

export interface AppState {
  theme: Theme; groups: Group[]; activeGroupId: string | null; cloudUser: CloudUser | null;
  lastSyncTime: string | null; deletedGroups: Tombstone[]; deletedExpenses: Tombstone[];
  
  setTheme: (theme: Theme) => void;
  setCloudUser: (user: CloudUser | null) => void;
  updateGroupFromCloud: (groupId: string, updatedGroup: Group) => void;
  syncMergeData: (groups: Group[], deletedGroups: Tombstone[], deletedExpenses: Tombstone[], syncTime: string) => void;
  createGroup: (name: string, members: string[]) => string;
  setActiveGroup: (id: string | null) => void;
  importGroup: (group: Group) => void; 
  deleteGroup: (id: string) => void;
  togglePinGroup: (id: string) => void;
  renameGroup: (id: string, newName: string) => void;
  enableCollaboration: (groupId: string, firebaseTripId: string, expiresAt: number, adminEmail: string) => void;
  endCollaboration: (groupId: string, reasonMessage?: string) => void;
  extendCollaboration: (groupId: string, newExpiresAt: number) => void;
  changeUserRole: (groupId: string, targetEmail: string, newRole: 'admin' | 'editor' | 'viewer') => void;
  toggleFundFeature: (groupId: string, isEnabled: boolean) => void;
  toggleFundClosure: (groupId: string, isClosed: boolean) => void;

  addExpense: (groupId: string, expense: Omit<Expense, 'updatedAt'>) => void;
  deleteExpense: (groupId: string, expenseId: string) => void;
  editExpense: (groupId: string, expenseId: string, updatedData: Omit<Expense, 'updatedAt'>) => void;
  settleAllExpenses: (groupId: string) => void;
  recordRepayments: (groupId: string, repayments: Omit<Expense, 'updatedAt'>[]) => void;
  
  addMember: (groupId: string, name: string, email?: string) => void;
  removeMember: (groupId: string, memberId: string) => void;
  mergeMembers: (groupId: string, ghostId: string, targetId: string) => void; 
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      theme: 'system', groups: [], activeGroupId: null, cloudUser: null, lastSyncTime: null, deletedGroups: [], deletedExpenses: [],
      setTheme: (theme) => set({ theme }), setCloudUser: (cloudUser) => set({ cloudUser }),
      
      updateGroupFromCloud: (groupId, updatedGroup) => set((state) => ({ groups: state.groups.map(g => g.id === groupId ? { ...updatedGroup, updatedAt: Date.now() } : g) })),
      syncMergeData: (cloudGroups, cloudDelGroups, cloudDelExpenses, lastSyncTime) => set((state) => {
        const newGroupsMap = new Map(cloudGroups.map(g => [g.id, g]));
        state.groups.forEach(localG => {
          const cloudG = newGroupsMap.get(localG.id);
          if (!cloudG || (localG.updatedAt || 0) > (cloudG?.updatedAt || 0)) newGroupsMap.set(localG.id, localG);
        });
        const mergeTombstones = (local: Tombstone[], cloud: Tombstone[]) => {
          const map = new Map(cloud.map(t => [t.id, t]));
          local.forEach(t => {
            const existing = map.get(t.id);
            if (!existing || t.deletedAt > existing.deletedAt) map.set(t.id, t);
          });
          return Array.from(map.values());
        };
        return { groups: Array.from(newGroupsMap.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), deletedGroups: mergeTombstones(state.deletedGroups, cloudDelGroups), deletedExpenses: mergeTombstones(state.deletedExpenses, cloudDelExpenses), lastSyncTime };
      }),
      createGroup: (name, memberNames) => {
        const newGroup: Group = { id: crypto.randomUUID(), name, createdAt: new Date().toISOString(), isPinned: false, updatedAt: Date.now(), members: memberNames.map((n) => ({ id: crypto.randomUUID(), name: n })), expenses: [] };
        set((state) => ({ groups: [newGroup, ...state.groups] })); return newGroup.id;
      },
      setActiveGroup: (id) => set({ activeGroupId: id }),
      importGroup: (importedGroup) => set((state) => {
        importedGroup.updatedAt = Date.now();
        const existsIdx = state.groups.findIndex(g => g.id === importedGroup.id || (importedGroup.firebaseTripId && g.firebaseTripId === importedGroup.firebaseTripId));
        if (existsIdx >= 0) { const newGroups = [...state.groups]; newGroups[existsIdx] = importedGroup; return { groups: newGroups }; }
        return { groups: [importedGroup, ...state.groups] };
      }),
      deleteGroup: (id) => set((state) => ({ groups: state.groups.filter((g) => g.id !== id), deletedGroups: [...state.deletedGroups, { id, deletedAt: Date.now() }] })),
      togglePinGroup: (id) => set((state) => ({ groups: state.groups.map((g) => g.id === id ? { ...g, isPinned: !g.isPinned, updatedAt: Date.now() } : g) })),
      renameGroup: (id, newName) => set((state) => ({ groups: state.groups.map((g) => g.id === id ? { ...g, name: newName, updatedAt: Date.now() } : g) })),
      enableCollaboration: (groupId, firebaseTripId, expiresAt, adminEmail) => set((state) => {
        const cloudUser = state.cloudUser;
        return {
          groups: state.groups.map((g) => {
            if (g.id !== groupId) return g;
            let updatedMembers = [...g.members];
            const isMember = updatedMembers.some(m => m.email === adminEmail);
            if (!isMember && cloudUser) { updatedMembers.push({ id: crypto.randomUUID(), name: cloudUser.name, email: adminEmail }); }
            return { ...g, members: updatedMembers, isCollaborative: true, firebaseTripId, collabExpiresAt: expiresAt, updatedAt: Date.now(), roles: { admin: [adminEmail], editor: [], viewer: [] } };
          }) 
        };
      }),
      endCollaboration: (groupId, reasonMessage?: string) => set((state) => ({
        groups: state.groups.map((g) => {
          if (g.id !== groupId) return g;
          const { isCollaborative, firebaseTripId, collabExpiresAt, roles, ...offlineGroup } = g;
          return { ...offlineGroup, updatedAt: Date.now(), terminationMessage: reasonMessage };
        })
      })),
      extendCollaboration: (groupId, newExpiresAt) => set((state) => ({ groups: state.groups.map(g => g.id === groupId ? { ...g, collabExpiresAt: newExpiresAt, updatedAt: Date.now() } : g) })),
      changeUserRole: (groupId, targetEmail, newRole) => set((state) => ({
        groups: state.groups.map(group => {
          if (group.id !== groupId || !group.roles) return group;
          const newRoles = { admin: group.roles.admin.filter(e => e !== targetEmail), editor: group.roles.editor?.filter(e => e !== targetEmail) || [], viewer: group.roles.viewer?.filter(e => e !== targetEmail) || [] };
          newRoles[newRole].push(targetEmail);
          return { ...group, roles: newRoles, updatedAt: Date.now() };
        })
      })),
      toggleFundFeature: (groupId, isEnabled) => set((state) => ({ groups: state.groups.map((g) => g.id === groupId ? { ...g, isFundEnabled: isEnabled, updatedAt: Date.now() } : g) })),
      toggleFundClosure: (groupId, isClosed) => set((state) => ({ groups: state.groups.map((g) => g.id === groupId ? { ...g, isFundClosed: isClosed, updatedAt: Date.now() } : g) })),

      // 🚨 FIX 1: Rigidly relies on the UI's payload without regenerating core properties!
      addExpense: (groupId, newExpenseData) => set((state) => ({
        groups: state.groups.map((group) => {
          if (group.id !== groupId) return group;
          const newExpense: Expense = { ...newExpenseData, updatedAt: Date.now() };
          return { ...group, updatedAt: Date.now(), expenses: [newExpense, ...group.expenses] };
        }),
      })),
      deleteExpense: (groupId, expenseId) => set((state) => ({ groups: state.groups.map((g) => g.id === groupId ? { ...g, updatedAt: Date.now(), expenses: g.expenses.filter((e) => e.id !== expenseId) } : g), deletedExpenses: [...state.deletedExpenses, { id: expenseId, deletedAt: Date.now() }] })),
      
      // 🚨 FIX 2: Editing relies purely on payload updates
      editExpense: (groupId, expenseId, updatedData) => set((state) => ({
        groups: state.groups.map((g) => {
          if (g.id !== groupId) return g;
          return { ...g, updatedAt: Date.now(), expenses: g.expenses.map((e) => e.id === expenseId ? { ...e, ...updatedData, updatedAt: Date.now() } : e) };
        })
      })),
      settleAllExpenses: (groupId) => set((state) => ({ groups: state.groups.map((g) => { if (g.id !== groupId) return g; return { ...g, updatedAt: Date.now(), expenses: g.expenses.map((e) => ({ ...e, isSettled: true, updatedAt: Date.now() })) }; }) })),
      
      // 🚨 FIX 3: Repayments rely entirely on the exact payload passed from SettleTab!
      recordRepayments: (groupId, repayments) => set((state) => ({
        groups: state.groups.map((g) => {
          if (g.id !== groupId) return g;
          const newExpenses = repayments.map(r => ({ ...r, updatedAt: Date.now() }));
          return { ...g, updatedAt: Date.now(), expenses: [...newExpenses, ...g.expenses] };
        })
      })),

      addMember: (groupId, name, email) => set((state) => ({ groups: state.groups.map((g) => g.id === groupId ? { ...g, updatedAt: Date.now(), members: [...g.members, { id: crypto.randomUUID(), name, email }] } : g) })),
      removeMember: (groupId, memberId) => set((state) => ({ groups: state.groups.map((g) => g.id === groupId ? { ...g, updatedAt: Date.now(), members: g.members.filter((m) => m.id !== memberId) } : g) })),
      mergeMembers: (groupId, ghostId, targetId) => set((state) => ({ groups: state.groups.map(group => { if (group.id !== groupId) return group; const updatedExpenses = group.expenses.map(exp => { let isModified = false; let newPaidBy = exp.paidBy; if (newPaidBy === ghostId) { newPaidBy = targetId; isModified = true; } let newSplits = [...exp.splits]; const ghostSplitIdx = newSplits.findIndex(s => s.memberId === ghostId); if (ghostSplitIdx !== -1) { isModified = true; const ghostAmount = newSplits[ghostSplitIdx].amount; newSplits.splice(ghostSplitIdx, 1); const targetSplitIdx = newSplits.findIndex(s => s.memberId === targetId); if (targetSplitIdx !== -1) newSplits[targetSplitIdx].amount += ghostAmount; else newSplits.push({ memberId: targetId, amount: ghostAmount }); } if (isModified) return { ...exp, paidBy: newPaidBy, splits: newSplits, updatedAt: Date.now() }; return exp; }); const updatedMembers = group.members.filter(m => m.id !== ghostId); return { ...group, members: updatedMembers, expenses: updatedExpenses, updatedAt: Date.now() }; }) })),
    }),
    { name: 'billblend-storage' }
  )
);