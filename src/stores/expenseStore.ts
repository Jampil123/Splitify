import { Expense } from '@/types';
import { create } from 'zustand';

interface ExpenseState {
  // State
  currentExpense: Expense | null;
  expenses: Expense[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setCurrentExpense: (expense: Expense | null) => void;
  setExpenses: (expenses: Expense[]) => void;
  addExpense: (expense: Expense) => void;
  updateExpense: (expenseId: string, updates: Partial<Expense>) => void;
  removeExpense: (expenseId: string) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  clearExpenses: () => void;
  
  // Computed
  getTotalExpenses: () => number;
  getExpensesByPayer: (payerId: string) => Expense[];
  getRecentExpenses: (limit: number) => Expense[];
}

export const useExpenseStore = create<ExpenseState>((set, get) => ({
  // Initial state
  currentExpense: null,
  expenses: [],
  isLoading: false,
  error: null,

  // Actions
  setCurrentExpense: (expense) => set({ currentExpense: expense }),
  
  setExpenses: (expenses) => set({ expenses }),
  
  addExpense: (expense) => set((state) => ({ 
    expenses: [expense, ...state.expenses] 
  })),
  
  updateExpense: (expenseId, updates) => set((state) => ({
    expenses: state.expenses.map((e) => 
      e.id === expenseId ? { ...e, ...updates } : e
    ),
    currentExpense: state.currentExpense?.id === expenseId 
      ? { ...state.currentExpense, ...updates } 
      : state.currentExpense,
  })),
  
  removeExpense: (expenseId) => set((state) => ({
    expenses: state.expenses.filter((e) => e.id !== expenseId),
    currentExpense: state.currentExpense?.id === expenseId ? null : state.currentExpense,
  })),
  
  setLoading: (isLoading) => set({ isLoading }),
  
  setError: (error) => set({ error }),
  
  clearExpenses: () => set({ expenses: [], currentExpense: null }),
  
  // Computed
  getTotalExpenses: () => {
    return get().expenses.reduce((sum, e) => sum + e.amount, 0);
  },
  
  getExpensesByPayer: (payerId) => {
    return get().expenses.filter((e) => e.payerId === payerId);
  },
  
  getRecentExpenses: (limit) => {
    return get().expenses.slice(0, limit);
  },
}));