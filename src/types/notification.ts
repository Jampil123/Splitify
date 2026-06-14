import { Timestamp } from 'firebase/firestore';

export type NotificationType = 
  | 'expense_added'
  | 'expense_updated'
  | 'expense_deleted'
  | 'settlement_reminder'
  | 'payment_confirmed'
  | 'friend_request'
  | 'friend_request_accepted'
  | 'member_joined'
  | 'member_left'
  | 'group_invite'
  | 'payment_request';

export interface Notification {
  id: string;
  userId: string;                      // Who this notification is for
  
  // Content
  title: string;
  body: string;
  type: NotificationType;
  
  // Related data (for navigation)
  groupId?: string;
  groupName?: string;                  // Denormalized
  relatedUserId?: string;              // Who triggered this
  relatedUserName?: string;            // Denormalized
  expenseId?: string;
  settlementId?: string;
  
  // Status
  isRead: boolean;
  isDelivered: boolean;                // Push notification sent successfully
  
  // Timestamps
  createdAt: Timestamp;
  readAt?: Timestamp | null;
}

// For creating a notification (from Cloud Functions)
export interface CreateNotificationData {
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  groupId?: string;
  relatedUserId?: string;
  expenseId?: string;
  settlementId?: string;

  
}