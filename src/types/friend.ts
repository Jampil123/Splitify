import { Timestamp } from 'firebase/firestore';

export interface FriendRequest {
  id: string;
  fromUserId: string;
  fromUserName: string;                // Denormalized
  fromUserPhoto?: string | null;
  toUserId: string;
  toUserName: string;                  // Denormalized
  toUserPhoto?: string | null;
  
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  
  createdAt: Timestamp;
  respondedAt?: Timestamp | null;
  
  message?: string;
}

// For sending a friend request
export interface SendFriendRequestData {
  toUserId: string;
  message?: string;
}

// For responding to a friend request
export interface RespondToFriendRequestData {
  requestId: string;
  status: 'accepted' | 'rejected';
}

// For searching users
export interface UserSearchResult {
  id: string;
  fullName: string;
  email: string;
  photoURL: string | null;
  isFriend: boolean;
  hasPendingRequest: boolean;
}