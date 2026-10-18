import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// --- DATA STRUCTURES ---

export type SplitType = 'EQUAL' | 'UNEQUAL' | 'ON_BEHALF';

export interface SplitItem {
  memberId: string;
  amount: number; // How much this specific person owes for this expense
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  paidBy: string; // memberId of the person who paid
  date: string; // ISO string
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
  members: Member[];
  expenses: Expense[];
}

// --- STATE STORE INTERFACE ---

interface AppState {
  groups: Group[];
  activeGroupId: string | null;
  
  // Actions
  createGroup: (name: string, members: string[]) => string;
  setActiveGroup: (id: string | null) => void;
  addExpense: (groupId: string, expense: Omit<Expense, 'id' | 'date'>) => void;
}

// --- ZUSTAND STORE IMPLEMENTATION ---
// We use the 'persist' middleware to automatically save this to localStorage

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      groups: [],
      activeGroupId: null,

      createGroup: (name, memberNames) => {
        const newGroup: Group = {
          id: crypto.randomUUID(), // Native browser UUID generator
          name,
          createdAt: new Date().toISOString(),
          members: memberNames.map((n) => ({ id: crypto.randomUUID(), name: n })),
          expenses: [],
        };

        set((state) => ({
          groups: [newGroup, ...state.groups],
        }));

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

            return {
              ...group,
              expenses: [newExpense, ...group.expenses],
            };
          }),
        }));
      },
    }),
    {
      name: 'billblend-storage', // The key used in localStorage
    }
  )
);