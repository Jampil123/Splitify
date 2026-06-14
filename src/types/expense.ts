import { Timestamp } from 'firebase/firestore';
import { UserProfile } from './user';

export interface ExpenseSplit {
  userId: string;
  userName: string;
  amount: number;
}

export interface Expense {
  id: string;
  groupId: string;
  
  // Basic info
  title: string;
  amount: number;
  description?: string;
  
  // Payer info
  payerId: string;
  payerName: string;                   // Denormalized
  payerUser?: UserProfile;             // For detailed view
  
  // Date info
  date: Timestamp;                     // When expense occurred
  createdAt: Timestamp;                // When added to system
  
  // Split details
  splitType: 'equal' | 'custom';
  individualShare?: number;            // For equal split: amount / memberCount
  splits?: ExpenseSplit[];             // For custom split only
  
  // Optional
  category?: 'travel' | 'food' | 'accommodation' | 'utilities' | 'shopping' | 'other';
  receiptImage?: string | null;        // Storage URL
  
  // Metadata
  addedBy: string;                     // User ID who added this expense
  addedByName?: string;                // Denormalized
  
  // Status
  isDeleted: boolean;
  deletedAt?: Timestamp | null;
}

// For creating a new expense
export interface CreateExpenseData {
  title: string;
  amount: number;
  description?: string;
  payerId: string;
  date: Date | Timestamp;
  splitType: 'equal' | 'custom';
  splits?: { userId: string; amount: number }[];  // Required if splitType = 'custom'
  category?: Expense['category'];
  receiptImage?: string | null;
}

// For updating an expense
export interface UpdateExpenseData {
  title?: string;
  amount?: number;
  description?: string;
  payerId?: string;
  date?: Date | Timestamp;
  category?: Expense['category'];
  receiptImage?: string | null;
}

// For filtering expenses
export interface ExpenseFilters {
  startDate?: Date;
  endDate?: Date;
  payerId?: string;
  category?: Expense['category'];
  minAmount?: number;
  maxAmount?: number;
}