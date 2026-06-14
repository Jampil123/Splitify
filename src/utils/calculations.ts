import { UserBalance } from '@/types';

/**
 * Calculate individual share when splitting equally
 * @param totalExpense - Total group expense
 * @param memberCount - Number of members in group
 * @returns Individual share amount
 */
export function calculateIndividualShare(totalExpense: number, memberCount: number): number {
  if (memberCount === 0) return 0;
  return totalExpense / memberCount;
}

/**
 * Calculate balance for a single member
 * @param totalPaid - Total amount member paid
 * @param individualShare - Member's fair share
 * @returns Balance (positive = should receive, negative = owes)
 */
export function calculateMemberBalance(totalPaid: number, individualShare: number): number {
  return totalPaid - individualShare;
}

/**
 * Calculate all member balances in a group
 * @param members - Array of group members with totalPaid
 * @param totalExpense - Total group expense
 * @returns Members with calculated totalShare and balance
 */
export function calculateAllMemberBalances(
  members: Array<{ userId: string; userName: string; totalPaid: number }>,
  totalExpense: number
): UserBalance[] {
  const memberCount = members.length;
  const individualShare = calculateIndividualShare(totalExpense, memberCount);
  
  return members.map(member => ({
    userId: member.userId,
    userName: member.userName,
    totalPaid: member.totalPaid,
    totalShare: individualShare,
    balance: calculateMemberBalance(member.totalPaid, individualShare),
  }));
}

/**
 * Generate minimum number of settlement transactions between members
 * Uses greedy algorithm to simplify who owes whom
 * 
 * @param balances - Array of member balances
 * @returns Array of suggested settlements (who pays whom)
 */
export function generateSettlements(
  balances: UserBalance[]
): Array<{ fromUserId: string; fromUserName: string; toUserId: string; toUserName: string; amount: number }> {
  
  // Separate debtors (owe money) and creditors (are owed money)
  const debtors = balances
    .filter(b => b.balance < 0)
    .map(b => ({ userId: b.userId, userName: b.userName, amount: Math.abs(b.balance) }))
    .sort((a, b) => b.amount - a.amount);
    
  const creditors = balances
    .filter(b => b.balance > 0)
    .map(b => ({ userId: b.userId, userName: b.userName, amount: b.balance }))
    .sort((a, b) => b.amount - a.amount);
  
  const settlements: Array<{ fromUserId: string; fromUserName: string; toUserId: string; toUserName: string; amount: number }> = [];
  
  let i = 0; // index for debtors
  let j = 0; // index for creditors
  
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    const amount = Math.min(debtor.amount, creditor.amount);
    
    if (amount > 0.01) { // Only add if amount is significant (avoid floating point issues)
      settlements.push({
        fromUserId: debtor.userId,
        fromUserName: debtor.userName,
        toUserId: creditor.userId,
        toUserName: creditor.userName,
        amount: roundToTwoDecimals(amount),
      });
    }
    
    // Reduce amounts
    debtor.amount -= amount;
    creditor.amount -= amount;
    
    // Move to next if settled
    if (debtor.amount < 0.01) i++;
    if (creditor.amount < 0.01) j++;
  }
  
  return settlements;
}

/**
 * Check if all balances are settled (within 1 cent tolerance)
 * @param balances - Array of member balances
 * @returns True if all balances are effectively zero
 */
export function isFullySettled(balances: UserBalance[]): boolean {
  return balances.every(b => Math.abs(b.balance) < 0.01);
}

/**
 * Calculate total expense from array of expenses
 * @param expenses - Array of expense amounts
 * @returns Total sum
 */
export function calculateTotalExpense(expenses: Array<{ amount: number }>): number {
  return expenses.reduce((sum, expense) => sum + expense.amount, 0);
}

/**
 * Calculate total paid by a specific member
 * @param expenses - Array of expenses
 * @param payerId - User ID of the payer
 * @returns Total amount paid by that member
 */
export function calculateTotalPaidByMember(
  expenses: Array<{ payerId: string; amount: number }>,
  payerId: string
): number {
  return expenses
    .filter(expense => expense.payerId === payerId)
    .reduce((sum, expense) => sum + expense.amount, 0);
}

/**
 * Calculate total paid for all members
 * @param expenses - Array of expenses
 * @param memberIds - Array of member IDs
 * @returns Object mapping memberId to totalPaid
 */
export function calculateAllTotalPaid(
  expenses: Array<{ payerId: string; amount: number }>,
  memberIds: string[]
): Record<string, number> {
  const result: Record<string, number> = {};
  
  memberIds.forEach(memberId => {
    result[memberId] = calculateTotalPaidByMember(expenses, memberId);
  });
  
  return result;
}

/**
 * Round number to 2 decimal places (for currency)
 * @param num - Number to round
 * @returns Rounded number
 */
export function roundToTwoDecimals(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Validate expense amount
 * @param amount - Amount to validate
 * @returns True if valid
 */
export function isValidAmount(amount: number): boolean {
  return !isNaN(amount) && amount > 0 && isFinite(amount);
}

/**
 * Validate member count for group
 * @param memberCount - Number of members
 * @returns True if valid (at least 2 members)
 */
export function isValidGroupSize(memberCount: number): boolean {
  return memberCount >= 2;
}

/**
 * Calculate how much a user owes or is owed overall (across all groups)
 * @param userBalances - Array of user's balances across groups
 * @returns Net balance (positive = owed money, negative = owes money)
 */
export function calculateNetBalance(userBalances: Array<{ groupId: string; balance: number }>): number {
  return userBalances.reduce((net, item) => net + item.balance, 0);
}

/**
 * Get payment status text and color
 * @param balance - User's balance
 * @returns Object with text and status type
 */
export function getPaymentStatus(balance: number): {
  text: string;
  status: 'owes' | 'owed' | 'settled';
  color: string;
} {
  if (Math.abs(balance) < 0.01) {
    return { text: 'Settled', status: 'settled', color: '#10B981' }; // Green
  }
  if (balance < 0) {
    return { text: `Owes ₱${Math.abs(balance).toFixed(2)}`, status: 'owes', color: '#EF4444' }; // Red
  }
  return { text: `Is owed ₱${balance.toFixed(2)}`, status: 'owed', color: '#3B82F6' }; // Blue
}