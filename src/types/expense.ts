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
    payerUser?: UserProfile;
    
    // Date info
    date: Timestamp;
    createdAt: Timestamp;
    
    // Split details
    splitType: 'equal' | 'custom';
    individualShare?: number;
    splits?: Record<string, number>;
    
    // Optional
    category?: 'travel' | 'food' | 'accommodation' | 'utilities' | 'shopping' | 'other';
    receiptImage?: string | null;
    
    // Metadata
    addedBy: string;
    addedByName?: string;
    
    // Status
    isDeleted: boolean;
    deletedAt?: Timestamp | null;

    // Set to true for settlement payment records — excluded from expense list UI
    // but included in balance calculations via refreshSettlementSuggestions
    isPayment?: boolean;
}

// ✅ CreateExpenseData - for creating new expenses
export interface CreateExpenseData {
    title: string;
    amount: number;
    description?: string;
    payerId: string;
    date: Date | Timestamp;
    splitType: 'equal' | 'custom';
    splits?: Record<string, number>;
    category?: Expense['category'];
    receiptImage?: string | null;
}

// ✅ UpdateExpenseData - for updating existing expenses (all fields optional)
export interface UpdateExpenseData {
    title?: string;
    amount?: number;
    description?: string;
    payerId?: string;
    date?: Date | Timestamp;
    category?: Expense['category'];
    receiptImage?: string | null;
}

// ✅ ExpenseFilters - for filtering expenses
export interface ExpenseFilters {
    startDate?: Date;
    endDate?: Date;
    payerId?: string;
    category?: Expense['category'];
    minAmount?: number;
    maxAmount?: number;
}