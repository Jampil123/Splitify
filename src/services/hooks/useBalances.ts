import { GroupBalanceSummary, Settlement, UserBalance } from '@/types';
import { useCallback, useEffect, useState } from 'react';
import {
    cancelSettlement,
    getGroupBalanceSummary,
    getPendingSettlements,
    markSettlementCompleted,
    refreshSettlementSuggestions,
} from '../api/settlements';

type PaymentMethod = 'cash' | 'bank_transfer' | 'gcash' | 'maya' | 'other';

interface UseBalancesOptions {
  autoFetch?: boolean;
}

export function useBalances(groupId: string | undefined, options: UseBalancesOptions = { autoFetch: true }) {
  const [balanceSummary, setBalanceSummary] = useState<GroupBalanceSummary | null>(null);
  const [pendingSettlements, setPendingSettlements] = useState<Settlement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBalances = useCallback(async () => {
    if (!groupId) {
      setBalanceSummary(null);
      setPendingSettlements([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const [summary, settlements] = await Promise.all([
        getGroupBalanceSummary(groupId),
        getPendingSettlements(groupId),
      ]);
      setBalanceSummary(summary);
      setPendingSettlements(settlements);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [groupId]);

  const refreshBalances = useCallback(async () => {
    if (!groupId) return;

    setIsLoading(true);
    try {
      const newSettlements = await refreshSettlementSuggestions(groupId);
      await fetchBalances();
      return newSettlements;
    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [groupId, fetchBalances]);

  const markAsSettled = useCallback(async (
    settlementId: string,
    paymentMethod?: PaymentMethod,
    transactionReference?: string,
    note?: string
  ): Promise<boolean> => {
    if (!groupId) return false;

    try {
      const success = await markSettlementCompleted(groupId, settlementId, {
        paymentMethod,
        transactionReference,
        note,
      });
      if (success) {
        await fetchBalances();
      }
      return success;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  }, [groupId, fetchBalances]);

  const cancelPendingSettlement = useCallback(async (settlementId: string): Promise<boolean> => {
    if (!groupId) return false;

    try {
      const success = await cancelSettlement(groupId, settlementId);
      if (success) {
        await fetchBalances();
      }
      return success;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  }, [groupId, fetchBalances]);

  // Helper to get current user's balance
  const getCurrentUserBalance = useCallback((currentUserId: string): UserBalance | null => {
    if (!balanceSummary) return null;
    return balanceSummary.balances.find(b => b.userId === currentUserId) || null;
  }, [balanceSummary]);

  useEffect(() => {
    if (options.autoFetch) {
      fetchBalances();
    }
  }, [fetchBalances, options.autoFetch]);

  return {
    balanceSummary,
    pendingSettlements,
    isLoading,
    error,
    fetchBalances,
    refreshBalances,
    markAsSettled,
    cancelPendingSettlement,
    getCurrentUserBalance,
  };
}