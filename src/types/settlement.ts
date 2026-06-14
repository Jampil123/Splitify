import { Timestamp } from 'firebase/firestore';

export interface Settlement {
  id: string;
  groupId: string;
  
  // Parties involved
  fromUserId: string;                  // Who owes money (debtor)
  fromUserName: string;                // Denormalized
  toUserId: string;                    // Who receives money (creditor)
  toUserName: string;                  // Denormalized
  
  // Amount
  amount: number;
  
  // Status
  status: 'pending' | 'completed' | 'cancelled';
  
  // Timestamps
  suggestedAt: Timestamp;              // When system generated this suggestion
  completedAt?: Timestamp | null;      // When marked as paid
  cancelledAt?: Timestamp | null;      // If cancelled
  
  // Additional info
  note?: string;
  completedBy?: string;                // User ID who marked as completed
  paymentMethod?: 'cash' | 'bank_transfer' | 'gcash' | 'maya' | 'other';
  transactionReference?: string;       // User-provided reference number
}

// For marking a settlement as completed
export interface MarkSettlementData {
  settlementId: string;
  groupId: string;
  paymentMethod?: Settlement['paymentMethod'];
  transactionReference?: string;
  note?: string;
}

// Balance summary for a user in a group
export interface UserBalance {
  userId: string;
  userName: string;
  totalPaid: number;                   // Total amount user paid
  totalShare: number;                  // User's fair share
  balance: number;                     // Positive = should receive, negative = owes
}

// Group balance summary
export interface GroupBalanceSummary {
  groupId: string;
  groupName: string;
  totalExpenses: number;
  memberCount: number;
  individualShare: number;
  balances: UserBalance[];
  pendingSettlements: Settlement[];
  isFullySettled: boolean;
}