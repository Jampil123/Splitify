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
    
    // Prepare member data with total paid
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
    
    const individualShare = calculateIndividualShare(totalExpense, group.memberCount);
    const balances = calculateAllMemberBalances(memberData, totalExpense);
    const settlementSuggestions = generateSettlements(balances);
    const fullySettled = isFullySettled(balances);
    
    // Update group with new balances and settled status
    const updatedMembers = group.members.map(member => {
      const balanceData = balances.find(b => b.userId === member.userId);
      return {
        ...member,
        totalPaid: balanceData?.totalPaid || 0,
        totalShare: individualShare,
        balance: balanceData?.balance || 0,
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