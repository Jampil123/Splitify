import { Timestamp } from 'firebase/firestore';

export interface User {
  id: string;                          // Firebase Auth UID
  email: string;
  fullName: string;
  photoURL: string | null;
  createdAt: Timestamp;
  lastLoginAt: Timestamp;
  
  // Friend Lists (denormalized)
  friends: string[];                   // Array of user IDs
  
  // Group Lists (denormalized)
  groups: string[];                    // Array of group IDs
  
  // Settings
  notificationsEnabled: boolean;
  emailNotifications: boolean;
  fcmToken?: string;                   // Push notification token
  
  // Stats (denormalized, for quick display)
  totalOwed: number;                   // Total amount user owes others
  totalToReceive: number;              // Total amount others owe user
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  photoURL: string | null;
}

// For registration form
export interface RegisterData {
  email: string;
  password: string;
  fullName: string;
}

// For login form
export interface LoginData {
  email: string;
  password: string;
}