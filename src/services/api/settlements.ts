import {
    collection,
    db,
    doc,
    getDoc,
    getDocs,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
    updateDoc,
    where,
    writeBatch
} from '../firebase/config';
import { onSnapshot } from 'firebase/firestore';

import { GroupBalanceSummary, MarkSettlementData, Settlement } from '@/types';
import {
    calculateAllMemberBalances,
    calculateIndividualShare,
    calculateTotalExpense,
    generateSettlements,
    isFullySettled,
} from '@/utils/calculations';
import { getGroupExpenses } from './expenses';
import { getGroup } from './groups';

// ─── Real-time subscription ───────────────────────────────────────────────────

/**
 * Subscribe to a group's pending settlements.
 * Fires immediately with current data and on every subsequent change.
 */
export function subscribeToGroupSettlements(
    groupId: string,
    callback: (settlements: Settlement[]) => void
): () => void {
    const q = query(
        collection(db, 'groups', groupId, 'settlements'),
        where('status', '==', 'pending'),
        orderBy('suggestedAt', 'desc')
    );
    return onSnapshot(q, snap => {
        callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as Settlement)));
    });
}

// ============ Settlement Operations ============

/**
 * Get all settlements for a group
 */
export async function getGroupSettlements(groupId: string): Promise<Settlement[]> {
  try {
    const settlementsRef = collection(db, 'groups', groupId, 'settlements');
    const q = query(settlementsRef, orderBy('suggestedAt', 'desc'));
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Settlement);
  } catch (error) {
    console.error('Error getting group settlements:', error);
    return [];
  }
}

/**
 * Get pending settlements for a group
 */
export async function getPendingSettlements(groupId: string): Promise<Settlement[]> {
  try {
    const settlementsRef = collection(db, 'groups', groupId, 'settlements');
    const q = query(
      settlementsRef,
      where('status', '==', 'pending'),
      orderBy('suggestedAt', 'asc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Settlement);
  } catch (error) {
    console.error('Error getting pending settlements:', error);
    return [];
  }
}

/**
 * Get settlements involving a specific user
 */
export async function getUserSettlements(userId: string): Promise<Settlement[]> {
  try {
    // Get all groups the user is in
    const groupsRef = collection(db, 'groups');
    const groupsSnapshot = await getDocs(groupsRef);
    
    const allSettlements: Settlement[] = [];
    
    for (const groupDoc of groupsSnapshot.docs) {
      const groupData = groupDoc.data();
      // Check if user is a member of this group
      const isMember = groupData.members?.some((m: any) => m.userId === userId);
      
      if (isMember) {
        const settlementsRef = collection(db, 'groups', groupDoc.id, 'settlements');
        const settlementsQuery = query(
          settlementsRef,
          where('status', '==', 'pending'),
          where('fromUserId', '==', userId)
        );
        const settlementsSnapshot = await getDocs(settlementsQuery);
        
        settlementsSnapshot.docs.forEach(doc => {
          allSettlements.push({ id: doc.id, ...doc.data() } as Settlement);
        });
      }
    }
    
    return allSettlements;
  } catch (error) {
    console.error('Error getting user settlements:', error);
    return [];
  }
}

/**
 * Mark settlement as completed
 */
export async function markSettlementCompleted(
  groupId: string,
  settlementId: string,
  data: Omit<MarkSettlementData, 'settlementId' | 'groupId'>
): Promise<boolean> {
  try {
    const settlementRef = doc(db, 'groups', groupId, 'settlements', settlementId);
    const settlement = await getDoc(settlementRef);
    
    if (!settlement.exists()) {
      throw new Error('Settlement not found');
    }
    
    await updateDoc(settlementRef, {
      status: 'completed',
      completedAt: serverTimestamp(),
      paymentMethod: data.paymentMethod || null,
      transactionReference: data.transactionReference || null,
      note: data.note || null,
    });
    
    // Check if all settlements are now completed
    const pendingSettlements = await getPendingSettlements(groupId);
    if (pendingSettlements.length === 0) {
      const groupRef = doc(db, 'groups', groupId);
      await updateDoc(groupRef, { isFullySettled: true });
    }
    
    return true;
  } catch (error) {
    console.error('Error marking settlement completed:', error);
    return false;
  }
}

/**
 * Cancel a settlement
 */
export async function cancelSettlement(groupId: string, settlementId: string): Promise<boolean> {
  try {
    const settlementRef = doc(db, 'groups', groupId, 'settlements', settlementId);
    await updateDoc(settlementRef, {
        status: 'cancelled',
        cancelledAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error('Error cancelling settlement:', error);
    return false;
  }
}

/**
 * Generate or refresh settlement suggestions for a group
 * This would typically be called after expenses are updated
 */
export async function refreshSettlementSuggestions(groupId: string): Promise<Settlement[]> {
  try {
    const group = await getGroup(groupId);
    if (!group) {
      throw new Error('Group not found');
    }
    
    const expenses = await getGroupExpenses(groupId);
    const totalExpense = calculateTotalExpense(expenses);
    
    // Prepare member data — handles both equal and custom splits
    const memberData = group.members.map(member => {
      const totalPaid = expenses
        .filter(e => e.payerId === member.userId && !e.isDeleted)
        .reduce((sum, e) => sum + e.amount, 0);

      const totalShare = expenses
        .filter(e => !e.isDeleted)
        .reduce((sum, e) => {
          if (e.splitType === 'custom' && e.splits && e.splits[member.userId] !== undefined) {
            return sum + (e.splits[member.userId] || 0);
          }
          return sum + e.amount / group.memberCount;
        }, 0);

      return {
        userId: member.userId,
        userName: member.fullName,
        totalPaid,
        totalShare,
        balance: totalPaid - totalShare,
      };
    });

    const individualShare = calculateIndividualShare(totalExpense, group.memberCount);
    const balances: UserBalance[] = memberData.map(m => ({
      userId: m.userId,
      userName: m.userName,
      totalPaid: m.totalPaid,
      totalShare: m.totalShare,
      balance: m.balance,
    }));
    const settlementSuggestions = generateSettlements(balances);
    const fullySettled = isFullySettled(balances);

    // Update group with new per-member balances
    const updatedMembers = group.members.map(member => {
      const memberBal = memberData.find(m => m.userId === member.userId);
      return {
        ...member,
        totalPaid: memberBal?.totalPaid || 0,
        totalShare: memberBal?.totalShare || 0,
        balance: memberBal?.balance || 0,
      };
    });
    
    const groupRef = doc(db, 'groups', groupId);
    await updateDoc(groupRef, {
      members: updatedMembers,
      totalExpenses: totalExpense,
      isFullySettled: fullySettled,
      lastActivityAt: serverTimestamp(),
    });
    
    // Delete old pending settlements
    const oldSettlements = await getPendingSettlements(groupId);
    const batch = writeBatch(db);
    oldSettlements.forEach(settlement => {
      const settlementRef = doc(db, 'groups', groupId, 'settlements', settlement.id);
      batch.delete(settlementRef);
    });
    await batch.commit();
    
    // Add new settlement suggestions
    const newSettlements: Settlement[] = [];
    const now = serverTimestamp();
    
    for (const suggestion of settlementSuggestions) {
      const settlementRef = doc(collection(db, 'groups', groupId, 'settlements'));
      const settlementData = {
        id: settlementRef.id,
        groupId,
        fromUserId: suggestion.fromUserId,
        fromUserName: suggestion.fromUserName,
        toUserId: suggestion.toUserId,
        toUserName: suggestion.toUserName,
        amount: suggestion.amount,
        status: 'pending' as const,
        suggestedAt: now,
        completedAt: null,
        cancelledAt: null,
      };
      
      await setDoc(settlementRef, settlementData);
      newSettlements.push({ ...settlementData, id: settlementRef.id } as Settlement);
    }
    
    return newSettlements;
  } catch (error) {
    console.error('Error refreshing settlement suggestions:', error);
    return [];
  }
}

/**
 * Get balance summary for a group
 */
export async function getGroupBalanceSummary(groupId: string): Promise<GroupBalanceSummary | null> {
  try {
    const group = await getGroup(groupId);
    if (!group) {
      return null;
    }
    
    const expenses = await getGroupExpenses(groupId);
    const totalExpense = calculateTotalExpense(expenses);
    const individualShare = calculateIndividualShare(totalExpense, group.memberCount);
    
    const memberData = group.members.map(member => {
      const totalPaid = expenses
        .filter(e => e.payerId === member.userId && !e.isDeleted)
        .reduce((sum, e) => sum + e.amount, 0);
      
      return {
        userId: member.userId,
        userName: member.fullName,
        totalPaid,
      };
    });
    
    const balances = calculateAllMemberBalances(memberData, totalExpense);
    const pendingSettlements = await getPendingSettlements(groupId);
    
    return {
      groupId: group.id,
      groupName: group.groupName,
      totalExpenses: totalExpense,
      memberCount: group.memberCount,
      individualShare,
      balances,
      pendingSettlements,
      isFullySettled: group.isFullySettled,
    };
  } catch (error) {
    console.error('Error getting group balance summary:', error);
    return null;
  }
}