import { CreateExpenseData, Expense, ExpenseFilters, UpdateExpenseData } from '@/types';
import { useCallback, useEffect, useState } from 'react';
import {
    addExpense,
    deleteExpense,
    getExpense,
    getExpensesByPayer,
    getFilteredExpenses,
    subscribeToGroupExpenses,
    updateExpense,
} from '../api/expenses';

// ─── Group expenses list (real-time) ─────────────────────────────────────────

interface UseExpensesOptions {
    autoFetch?: boolean;
}

export function useExpenses(groupId: string | undefined, _options: UseExpensesOptions = {}) {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!groupId) {
            setExpenses([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        const unsub = subscribeToGroupExpenses(groupId, data => {
            setExpenses(data);
            setIsLoading(false);
        });

        return unsub;
    }, [groupId]);

    // Filtered/payer queries still use one-time fetches (complex filters not suited for live listeners)

    const fetchFilteredExpenses = useCallback(async (filters: ExpenseFilters) => {
        if (!groupId) return [];
        try {
            return await getFilteredExpenses(groupId, filters);
        } catch (err: any) {
            setError(err.message);
            return [];
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

    // Mutations — snapshot fires automatically after each write

    const createExpense = useCallback(async (data: CreateExpenseData, addedBy: string): Promise<string | null> => {
        if (!groupId) return null;
        try {
            return await addExpense(groupId, data, addedBy);
        } catch (err: any) {
            setError(err.message);
            return null;
        }
    }, [groupId]);

    const updateExistingExpense = useCallback(async (expenseId: string, data: UpdateExpenseData): Promise<boolean> => {
        if (!groupId) return false;
        try {
            const ok = await updateExpense(groupId, expenseId, data);
            if (!ok) setError('Failed to update expense');
            return ok;
        } catch (err: any) {
            setError(err.message);
            return false;
        }
    }, [groupId]);

    const removeExpense = useCallback(async (expenseId: string): Promise<boolean> => {
        if (!groupId) return false;
        try {
            const ok = await deleteExpense(groupId, expenseId);
            if (!ok) setError('Failed to delete expense');
            return ok;
        } catch (err: any) {
            setError(err.message);
            return false;
        }
    }, [groupId]);

    // fetchExpenses kept for API compatibility — no-op since subscription is live
    const fetchExpenses = useCallback(() => Promise.resolve(), []);

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

// ─── Single expense (one-time fetch — details rarely change live) ─────────────

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
        try {
            setExpense(await getExpense(groupId, expenseId));
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [groupId, expenseId]);

    useEffect(() => { fetchExpense(); }, [fetchExpense]);

    return { expense, isLoading, error, fetchExpense };
}
