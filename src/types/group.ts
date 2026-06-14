import { Timestamp } from 'firebase/firestore';
import { UserProfile } from './user';

export interface GroupMember {
  userId: string;
  fullName: string;
  email: string;
  photoURL?: string | null;
  joinedAt: Timestamp;
  
  // Computed fields (updated via Cloud Function)
  totalPaid: number;                   // Sum of all expenses where user is payer
  totalShare: number;                  // Equal share of total expenses
  balance: number;                     // totalPaid - totalShare (positive = should receive, negative = owes)
}

export interface Group {
  id: string;
  groupName: string;
  groupDescription?: string;
  groupPhoto?: string | null;
  createdAt: Timestamp;
  createdBy: string;                   // User ID
  createdByUser?: UserProfile;         // Denormalized for display
  
  // Members (denormalized array for quick access)
  members: GroupMember[];
  
  // Settings
  splitType: 'equal' | 'custom';       // 'equal' for MVP, 'custom' for future
  isActive: boolean;
  archivedAt?: Timestamp | null;
  
  // Computed fields
  totalExpenses: number;
  memberCount: number;
  lastActivityAt: Timestamp;
  isFullySettled: boolean;
}

// For creating a new group
export interface CreateGroupData {
  groupName: string;
  groupDescription?: string;
  members: string[];                   // Array of user IDs to add initially
}

// For updating a group
export interface UpdateGroupData {
  groupName?: string;
  groupDescription?: string;
  groupPhoto?: string | null;
  isActive?: boolean;
}