import { CreateExpenseData, Expense, ExpenseFilters, UpdateExpenseData } from '@/types';
import { useCallback, useEffect, useState } from 'react';
import {
    addExpense,
    deleteExpense,
    getExpense,
    getExpensesByPayer,
    getFilteredExpenses,
    getGroupExpenses,
    updateExpense,
} from '../api/expenses';

interface UseExpensesOptions {
  autoFetch?: boolean;
}

export function useExpenses(groupId: string | undefined, options: UseExpensesOptions = { autoFetch: true }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExpenses = useCallback(async () => {
    if (!groupId) {
      setExpenses([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await getGroupExpenses(groupId);
      setExpenses(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [groupId]);

  const fetchFilteredExpenses = useCallback(async (filters: ExpenseFilters) => {
    if (!groupId) return [];

    setIsLoading(true);
    setError(null);
    try {
      const data = await getFilteredExpenses(groupId, filters);
      return data;
    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [groupId]);

  const fetchExpensesByPayer = useCallback(async (payerId: string) => {
    if (!groupId) return [];

    try {
      return await getExpensesByPayer(groupId, payerId);
    } catch (err: any) {
      setError(err.message);
      return [];
    }
  }, [groupId]);

  const createExpense = useCallback(async (data: CreateExpenseData, addedBy: string): Promise<string | null> => {
    if (!groupId) return null;

    try {
      const expenseId = await addExpense(groupId, data, addedBy);
      if (expenseId) {
        await fetchExpenses();
      }
      return expenseId;
    } catch (err: any) {
      setError(err.message);
      return null;
    }
  }, [groupId, fetchExpenses]);

  const updateExistingExpense = useCallback(async (expenseId: string, data: UpdateExpenseData): Promise<boolean> => {
    if (!groupId) return false;

    try {
      const success = await updateExpense(groupId, expenseId, data);
      if (success) {
        await fetchExpenses();
      }
      return success;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  }, [groupId, fetchExpenses]);

  const removeExpense = useCallback(async (expenseId: string): Promise<boolean> => {
    if (!groupId) return false;

    try {
      const success = await deleteExpense(groupId, expenseId);
      if (success) {
        await fetchExpenses();
      }
      return success;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  }, [groupId, fetchExpenses]);

  useEffect(() => {
    if (options.autoFetch) {
      fetchExpenses();
    }
  }, [fetchExpenses, options.autoFetch]);

  return {
    expenses,
    isLoading,
    error,
    fetchExpenses,
    fetchFilteredExpenses,
    fetchExpensesByPayer,
    createExpense,
    updateExistingExpense,
    removeExpense,
  };
}

// Hook for single expense
export function useExpense(groupId: string | undefined, expenseId: string | undefined) {
  const [expense, setExpense] = useState<Expense | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExpense = useCallback(async () => {
    if (!groupId || !expenseId) {
      setExpense(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await getExpense(groupId, expenseId);
      setExpense(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [groupId, expenseId]);

  useEffect(() => {
    fetchExpense();
  }, [fetchExpense]);

  return {
    expense,
    isLoading,
    error,
    fetchExpense,
  };
}