import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// 🚨 NEW: Added 'SELECTIVE_EQUAL' to the allowed types
export type SplitType = 'EQUAL' | 'UNEQUAL' | 'ON_BEHALF' | 'SELECTIVE_EQUAL';
export type Theme = 'light' | 'dark' | 'system';

export interface SplitItem { memberId: string; amount: number; }
export interface Expense {
  id: string; description: string; amount: number; paidBy: string; 
  date: string; splitType: SplitType; splits: SplitItem[]; isSettled?: boolean;
  updatedAt?: number; 
  isSystemRepayment?: boolean; 
}
export interface Member { id: string; name: string; }
export interface Group {
  id: string; name: string; createdAt: string; isPinned?: boolean; members: Member[]; expenses: Expense[];
  updatedAt?: number; 
}

export interface CloudUser { name: string; email: string; picture: string; accessToken: string; tokenExpiry: number; }
export interface Tombstone { id: string; deletedAt: number; }

export interface AppState {
  theme: Theme; groups: Group[]; activeGroupId: string | null; cloudUser: CloudUser | null;
  lastSyncTime: string | null; deletedGroups: Tombstone[]; deletedExpenses: Tombstone[];
  
  setTheme: (theme: Theme) => void;
  setCloudUser: (user: CloudUser | null) => void;
  syncMergeData: (groups: Group[], deletedGroups: Tombstone[], deletedExpenses: Tombstone[], syncTime: string) => void;
  createGroup: (name: string, members: string[]) => string;
  setActiveGroup: (id: string | null) => void;
  importGroup: (group: Group) => void; 
  deleteGroup: (id: string) => void;
  togglePinGroup: (id: string) => void;
  renameGroup: (id: string, newName: string) => void;
  addExpense: (groupId: string, expense: Omit<Expense, 'id' | 'date' | 'updatedAt'>) => void;
  deleteExpense: (groupId: string, expenseId: string) => void;
  editExpense: (groupId: string, expenseId: string, updatedData: Omit<Expense, 'id' | 'date' | 'updatedAt'>) => void;
  settleAllExpenses: (groupId: string) => void;
  recordRepayments: (groupId: string, repayments: Omit<Expense, 'id' | 'date' | 'updatedAt'>[]) => void;
  addMember: (groupId: string, name: string) => void;
  removeMember: (groupId: string, memberId: string) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      theme: 'system', groups: [], activeGroupId: null, cloudUser: null, lastSyncTime: null, deletedGroups: [], deletedExpenses: [],
      setTheme: (theme) => set({ theme }),
      setCloudUser: (cloudUser) => set({ cloudUser }),
      syncMergeData: (groups, deletedGroups, deletedExpenses, lastSyncTime) => set({ groups, deletedGroups, deletedExpenses, lastSyncTime }),
      createGroup: (name, memberNames) => {
        const newGroup: Group = { id: crypto.randomUUID(), name, createdAt: new Date().toISOString(), isPinned: false, updatedAt: Date.now(), members: memberNames.map((n) => ({ id: crypto.randomUUID(), name: n })), expenses: [] };
        set((state) => ({ groups: [newGroup, ...state.groups] })); return newGroup.id;
      },
      setActiveGroup: (id) => set({ activeGroupId: id }),
      importGroup: (importedGroup) => set((state) => {
        importedGroup.updatedAt = Date.now();
        const exists = state.groups.some(g => g.id === importedGroup.id);
        if (exists) return { groups: state.groups.map(g => g.id === importedGroup.id ? importedGroup : g) };
        return { groups: [importedGroup, ...state.groups] };
      }),
      deleteGroup: (id) => set((state) => ({ groups: state.groups.filter((g) => g.id !== id), deletedGroups: [...state.deletedGroups, { id, deletedAt: Date.now() }] })),
      togglePinGroup: (id) => set((state) => ({ groups: state.groups.map((g) => g.id === id ? { ...g, isPinned: !g.isPinned, updatedAt: Date.now() } : g) })),
      renameGroup: (id, newName) => set((state) => ({ groups: state.groups.map((g) => g.id === id ? { ...g, name: newName, updatedAt: Date.now() } : g) })),
      addExpense: (groupId, newExpenseData) => set((state) => ({
        groups: state.groups.map((group) => {
          if (group.id !== groupId) return group;
          const newExpense: Expense = { ...newExpenseData, id: crypto.randomUUID(), date: new Date().toISOString(), isSettled: false, updatedAt: Date.now() };
          return { ...group, updatedAt: Date.now(), expenses: [newExpense, ...group.expenses] };
        }),
      })),
      deleteExpense: (groupId, expenseId) => set((state) => ({
        groups: state.groups.map((g) => g.id === groupId ? { ...g, updatedAt: Date.now(), expenses: g.expenses.filter((e) => e.id !== expenseId) } : g),
        deletedExpenses: [...state.deletedExpenses, { id: expenseId, deletedAt: Date.now() }]
      })),
      editExpense: (groupId, expenseId, updatedData) => set((state) => ({
        groups: state.groups.map((g) => {
          if (g.id !== groupId) return g;
          return { ...g, updatedAt: Date.now(), expenses: g.expenses.map((e) => e.id === expenseId ? { ...e, ...updatedData, updatedAt: Date.now() } : e) };
        })
      })),
      settleAllExpenses: (groupId) => set((state) => ({
        groups: state.groups.map((g) => {
          if (g.id !== groupId) return g;
          return { ...g, updatedAt: Date.now(), expenses: g.expenses.map((e) => ({ ...e, isSettled: true, updatedAt: Date.now() })) };
        })
      })),
      recordRepayments: (groupId, repayments) => set((state) => ({
        groups: state.groups.map((g) => {
          if (g.id !== groupId) return g;
          const newExpenses = repayments.map(r => ({
            ...r, id: crypto.randomUUID(), date: new Date().toISOString(), isSettled: false, updatedAt: Date.now()
          }));
          return { ...g, updatedAt: Date.now(), expenses: [...newExpenses, ...g.expenses] };
        })
      })),
      addMember: (groupId, name) => set((state) => ({
        groups: state.groups.map((g) => g.id === groupId ? { ...g, updatedAt: Date.now(), members: [...g.members, { id: crypto.randomUUID(), name }] } : g)
      })),
      removeMember: (groupId, memberId) => set((state) => ({
        groups: state.groups.map((g) => g.id === groupId ? { ...g, updatedAt: Date.now(), members: g.members.filter((m) => m.id !== memberId) } : g)
      })),
    }),
    { name: 'billblend-storage' }
  )
);