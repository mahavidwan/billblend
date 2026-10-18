import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SplitType = 'EQUAL' | 'UNEQUAL' | 'ON_BEHALF';

export interface SplitItem {
  memberId: string;
  amount: number; 
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  paidBy: string; 
  date: string; 
  splitType: SplitType;
  splits: SplitItem[]; 
}

export interface Member {
  id: string;
  name: string;
}

export interface Group {
  id: string;
  name: string;
  createdAt: string;
  isPinned?: boolean; // NEW: Pin state
  members: Member[];
  expenses: Expense[];
}

interface AppState {
  groups: Group[];
  activeGroupId: string | null;
  
  createGroup: (name: string, members: string[]) => string;
  setActiveGroup: (id: string | null) => void;
  addExpense: (groupId: string, expense: Omit<Expense, 'id' | 'date'>) => void;
  importGroup: (group: Group) => void; 
  
  // NEW BATCH 8 ACTIONS
  deleteGroup: (id: string) => void;
  togglePinGroup: (id: string) => void;
  deleteExpense: (groupId: string, expenseId: string) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      groups: [],
      activeGroupId: null,

      createGroup: (name, memberNames) => {
        const newGroup: Group = {
          id: crypto.randomUUID(), 
          name,
          createdAt: new Date().toISOString(),
          isPinned: false,
          members: memberNames.map((n) => ({ id: crypto.randomUUID(), name: n })),
          expenses: [],
        };
        set((state) => ({ groups: [newGroup, ...state.groups] }));
        return newGroup.id;
      },

      setActiveGroup: (id) => set({ activeGroupId: id }),

      addExpense: (groupId, newExpenseData) => {
        set((state) => ({
          groups: state.groups.map((group) => {
            if (group.id !== groupId) return group;
            const newExpense: Expense = {
              ...newExpenseData,
              id: crypto.randomUUID(),
              date: new Date().toISOString(),
            };
            return { ...group, expenses: [newExpense, ...group.expenses] };
          }),
        }));
      },

      importGroup: (importedGroup) => {
        set((state) => {
          const exists = state.groups.some(g => g.id === importedGroup.id);
          if (exists) {
            return { groups: state.groups.map(g => g.id === importedGroup.id ? importedGroup : g) };
          }
          return { groups: [importedGroup, ...state.groups] };
        });
      },

      // --- BATCH 8 ACTIONS ---
      deleteGroup: (id) => set((state) => ({
        groups: state.groups.filter((g) => g.id !== id)
      })),

      togglePinGroup: (id) => set((state) => ({
        groups: state.groups.map((g) => g.id === id ? { ...g, isPinned: !g.isPinned } : g)
      })),

      deleteExpense: (groupId, expenseId) => set((state) => ({
        groups: state.groups.map((g) => {
          if (g.id !== groupId) return g;
          return { ...g, expenses: g.expenses.filter((e) => e.id !== expenseId) };
        })
      })),
    }),
    { name: 'billblend-storage' }
  )
);