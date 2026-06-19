import {
  addDoc,
  collection,
  db,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where
} from '../firebase/config';
import { onSnapshot } from 'firebase/firestore';

import { CreateExpenseData, Expense, ExpenseFilters, UpdateExpenseData } from '@/types';
import { getGroup } from './groups';

// ─── Real-time subscription ───────────────────────────────────────────────────

/**
 * Subscribe to a group's expenses collection, ordered by date descending.
 * Fires immediately with current data and on every subsequent change.
 */
export function subscribeToGroupExpenses(
    groupId: string,
    callback: (expenses: Expense[]) => void
): () => void {
    const q = query(
        collection(db, 'groups', groupId, 'expenses'),
        orderBy('date', 'desc')
    );
    return onSnapshot(q, snap => {
        callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as Expense)));
    });
}

// ============ Helper to convert date to Timestamp ============
function toFirestoreTimestamp(date: Date | Timestamp): Timestamp {
  if (date instanceof Timestamp) {
    return date;
  }
  return Timestamp.fromDate(date);
}

// ============ Expense CRUD Operations ============

/**
 * Add expense to group
 */
export async function addExpense(
  groupId: string,
  data: CreateExpenseData,
  addedBy: string
): Promise<string | null> {
  try {
    const expensesRef = collection(db, 'groups', groupId, 'expenses');
    const group = await getGroup(groupId);
    
    if (!group) {
      throw new Error('Group not found');
    }
    
    const now = serverTimestamp();
    const payer = group.members.find(m => m.userId === data.payerId);
    
    const expenseData = {
      groupId,
      title: data.title,
      amount: data.amount,
      description: data.description || '',
      payerId: data.payerId,
      payerName: payer?.fullName || '',
      date: toFirestoreTimestamp(data.date),
      createdAt: now,
      splitType: data.splitType,
      individualShare: data.splitType === 'equal' ? data.amount / group.memberCount : undefined,
      splits: data.splitType === 'custom' ? data.splits : undefined,
      category: data.category || 'other',
      receiptImage: data.receiptImage || null,
      addedBy,
      addedByName: '',
      isDeleted: false,
    };
    
    const docRef = await addDoc(expensesRef, expenseData);
    
    // Update group last activity (using updateGroup with any)
    const groupRef = doc(db, 'groups', groupId);
    await updateDoc(groupRef, {
      lastActivityAt: now,
    });

    return docRef.id;
  } catch (error) {
    console.error('Error adding expense:', error);
    return null;
  }
}

/**
 * Get all expenses for a group
 */
export async function getGroupExpenses(groupId: string): Promise<Expense[]> {
  try {
    const expensesRef = collection(db, 'groups', groupId, 'expenses');
    const q = query(
      expensesRef,
      where('isDeleted', '==', false),
      orderBy('date', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Expense);
  } catch (error) {
    console.error('Error getting group expenses:', error);
    return [];
  }
}

/**
 * Get expense by ID
 */
export async function getExpense(groupId: string, expenseId: string): Promise<Expense | null> {
  try {
    const expenseRef = doc(db, 'groups', groupId, 'expenses', expenseId);
    const expenseSnap = await getDoc(expenseRef);
    
    if (expenseSnap.exists()) {
      return { id: expenseSnap.id, ...expenseSnap.data() } as Expense;
    }
    return null;
  } catch (error) {
    console.error('Error getting expense:', error);
    return null;
  }
}

/**
 * Update expense
 */
export async function updateExpense(
  groupId: string,
  expenseId: string,
  data: UpdateExpenseData
): Promise<boolean> {
  try {
    const expenseRef = doc(db, 'groups', groupId, 'expenses', expenseId);
    const expense = await getExpense(groupId, expenseId);
    
    if (!expense) {
      throw new Error('Expense not found');
    }
    
    const updateData: any = { ...data };
    
    // If date is provided, convert to Timestamp
    if (data.date) {
      updateData.date = toFirestoreTimestamp(data.date);
    }
    
    await updateDoc(expenseRef, updateData);

    // Update group last activity
    const groupRef = doc(db, 'groups', groupId);
    await updateDoc(groupRef, {
      lastActivityAt: serverTimestamp(),
    });

    return true;
  } catch (error) {
    console.error('Error updating expense:', error);
    return false;
  }
}

/**
 * Delete expense (soft delete)
 */
export async function deleteExpense(groupId: string, expenseId: string): Promise<boolean> {
  try {
    const expenseRef = doc(db, 'groups', groupId, 'expenses', expenseId);
    await updateDoc(expenseRef, {
      isDeleted: true,
      deletedAt: serverTimestamp(),
    });
    
    // Update group last activity
    const groupRef = doc(db, 'groups', groupId);
    await updateDoc(groupRef, {
      lastActivityAt: serverTimestamp(),
    });

    return true;
  } catch (error) {
    console.error('Error deleting expense:', error);
    return false;
  }
}

/**
 * Get expenses with filters
 */
export async function getFilteredExpenses(
  groupId: string,
  filters: ExpenseFilters
): Promise<Expense[]> {
  try {
    let constraints: any[] = [where('isDeleted', '==', false)];
    
    if (filters.startDate) {
      constraints.push(where('date', '>=', toFirestoreTimestamp(filters.startDate)));
    }
    if (filters.endDate) {
      constraints.push(where('date', '<=', toFirestoreTimestamp(filters.endDate)));
    }
    if (filters.payerId) {
      constraints.push(where('payerId', '==', filters.payerId));
    }
    if (filters.category) {
      constraints.push(where('category', '==', filters.category));
    }
    if (filters.minAmount) {
      constraints.push(where('amount', '>=', filters.minAmount));
    }
    if (filters.maxAmount) {
      constraints.push(where('amount', '<=', filters.maxAmount));
    }
    
    constraints.push(orderBy('date', 'desc'));
    
    const expensesRef = collection(db, 'groups', groupId, 'expenses');
    const q = query(expensesRef, ...constraints);
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Expense);
  } catch (error) {
    console.error('Error getting filtered expenses:', error);
    return [];
  }
}

/**
 * Get expenses by payer
 */
export async function getExpensesByPayer(groupId: string, payerId: string): Promise<Expense[]> {
  try {
    const expensesRef = collection(db, 'groups', groupId, 'expenses');
    const q = query(
      expensesRef,
      where('payerId', '==', payerId),
      where('isDeleted', '==', false),
      orderBy('date', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Expense);
  } catch (error) {
    console.error('Error getting expenses by payer:', error);
    return [];
  }
}