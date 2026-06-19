import {
    addDoc,
    arrayRemove,
    arrayUnion,
    collection,
    db,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    orderBy,
    query,
    serverTimestamp,
    updateDoc,
    where
} from '../firebase/config';

import { FriendRequest, RespondToFriendRequestData, SendFriendRequestData, UserSearchResult } from '@/types';
import { getCurrentUserData, updateUserProfile } from '../firebase/auth';

// ============ Friend Request Operations ============

/**
 * Send a friend request
 */
export async function sendFriendRequest(
  fromUserId: string,
  data: SendFriendRequestData
): Promise<boolean> {
  try {
    // Check if already friends
    const fromUser = await getCurrentUserData(fromUserId);
    if (!fromUser) return false;
    
    if (fromUser.friends.includes(data.toUserId)) {
      throw new Error('Already friends');
    }
    
    // Check if request already exists
    const requestsRef = collection(db, 'friendRequests');
    const existingQuery = query(
      requestsRef,
      where('fromUserId', '==', fromUserId),
      where('toUserId', '==', data.toUserId),
      where('status', '==', 'pending')
    );
    const existing = await getDocs(existingQuery);
    
    if (!existing.empty) {
      throw new Error('Friend request already sent');
    }
    
    // Get receiver's data
    const toUser = await getCurrentUserData(data.toUserId);
    if (!toUser) return false;
    
    const requestData = {
      fromUserId,
      fromUserName: fromUser.fullName,
      fromUserPhoto: fromUser.photoURL,
      toUserId: data.toUserId,
      toUserName: toUser.fullName,
      toUserPhoto: toUser.photoURL,
      status: 'pending' as const,
      createdAt: serverTimestamp(),
      respondedAt: null,
      message: data.message || '',
    };
    
    await addDoc(collection(db, 'friendRequests'), requestData);
    
    return true;
  } catch (error) {
    console.error('Error sending friend request:', error);
    return false;
  }
}

/**
 * Get pending friend requests for a user
 */
export async function getPendingFriendRequests(userId: string): Promise<FriendRequest[]> {
  try {
    const requestsRef = collection(db, 'friendRequests');
    const q = query(
      requestsRef,
      where('toUserId', '==', userId),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as FriendRequest);
  } catch (error) {
    console.error('Error getting pending friend requests:', error);
    return [];
  }
}

/**
 * Get sent friend requests
 */
export async function getSentFriendRequests(userId: string): Promise<FriendRequest[]> {
  try {
    const requestsRef = collection(db, 'friendRequests');
    const q = query(
      requestsRef,
      where('fromUserId', '==', userId),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as FriendRequest);
  } catch (error) {
    console.error('Error getting sent friend requests:', error);
    return [];
  }
}

/**
 * Respond to a friend request (accept/reject)
 */
export async function respondToFriendRequest(
  userId: string,
  data: RespondToFriendRequestData
): Promise<boolean> {
  try {
    const requestRef = doc(db, 'friendRequests', data.requestId);
    const requestSnap = await getDoc(requestRef);
    
    if (!requestSnap.exists()) {
      throw new Error('Friend request not found');
    }
    
    const request = requestSnap.data() as FriendRequest;
    
    // Verify user is the recipient
    if (request.toUserId !== userId) {
      throw new Error('Not authorized');
    }
    
    await updateDoc(requestRef, {
      status: data.status,
      respondedAt: serverTimestamp(),
    });
    
    // If accepted, add to friends lists
    if (data.status === 'accepted') {
      await updateUserProfile(request.fromUserId, {
        friends: arrayUnion(request.toUserId) as unknown as string[],
      });
      
      await updateUserProfile(request.toUserId, {
        friends: arrayUnion(request.fromUserId) as unknown as string[],
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error responding to friend request:', error);
    return false;
  }
}

/**
 * Cancel a sent friend request (deletes the document)
 */
export async function cancelFriendRequest(requestId: string): Promise<boolean> {
  try {
    const requestRef = doc(db, 'friendRequests', requestId);
    await deleteDoc(requestRef);
    return true;
  } catch (error) {
    console.error('Error canceling friend request:', error);
    return false;
  }
}

/**
 * Remove a friend
 */
export async function removeFriend(userId: string, friendId: string): Promise<boolean> {
  try {
    await updateUserProfile(userId, {
      friends: arrayRemove(friendId) as unknown as string[],
    });
    
    await updateUserProfile(friendId, {
      friends: arrayRemove(userId) as unknown as string[],
    });
    
    return true;
  } catch (error) {
    console.error('Error removing friend:', error);
    return false;
  }
}

/**
 * Get user's friends list with details
 */
export async function getUserFriends(userId: string): Promise<UserSearchResult[]> {
  try {
    const user = await getCurrentUserData(userId);
    if (!user) return [];
    
    const friends: UserSearchResult[] = [];
    
    for (const friendId of user.friends) {
      const friendData = await getCurrentUserData(friendId);
      if (friendData) {
        friends.push({
          id: friendData.id,
          fullName: friendData.fullName,
          email: friendData.email,
          photoURL: friendData.photoURL,
          isFriend: true,
          hasPendingRequest: false,
        });
      }
    }
    
    return friends;
  } catch (error) {
    console.error('Error getting user friends:', error);
    return [];
  }
}

/**
 * Search for users by email or name
 */
export async function searchUsers(
  currentUserId: string,
  searchTerm: string
): Promise<UserSearchResult[]> {
  try {
    // Note: Firestore doesn't support full-text search natively
    // For MVP, we'll search by email exact match and name prefix
    // For production, consider using Algolia or Meilisearch
    
    const usersRef = collection(db, 'users');
    
    // Search by email (exact match)
    const emailQuery = query(
      usersRef,
      where('email', '>=', searchTerm.toLowerCase()),
      where('email', '<=', searchTerm.toLowerCase() + '\uf8ff'),
      where('id', '!=', currentUserId)
    );
    
    // Search by name (prefix)
    const nameQuery = query(
      usersRef,
      where('fullName', '>=', searchTerm),
      where('fullName', '<=', searchTerm + '\uf8ff'),
      where('id', '!=', currentUserId)
    );
    
    const [emailResults, nameResults] = await Promise.all([
      getDocs(emailQuery),
      getDocs(nameQuery),
    ]);
    
    // Combine and deduplicate results
    const usersMap = new Map<string, UserSearchResult>();
    
    const addUser = (doc: any) => {
      const userData = doc.data();
      usersMap.set(userData.id, {
        id: userData.id,
        fullName: userData.fullName,
        email: userData.email,
        photoURL: userData.photoURL,
        isFriend: false,
        hasPendingRequest: false,
      });
    };
    
    emailResults.forEach(addUser);
    nameResults.forEach(addUser);
    
    // Check friendship status
    const currentUser = await getCurrentUserData(currentUserId);
    const results = Array.from(usersMap.values());
    
    for (const result of results) {
      result.isFriend = currentUser?.friends.includes(result.id) || false;
      
      // Check for pending request
      const pendingQuery = query(
        collection(db, 'friendRequests'),
        where('fromUserId', '==', currentUserId),
        where('toUserId', '==', result.id),
        where('status', '==', 'pending')
      );
      const pendingSnapshot = await getDocs(pendingQuery);
      result.hasPendingRequest = !pendingSnapshot.empty;
      if (!pendingSnapshot.empty) {
        result.pendingRequestId = pendingSnapshot.docs[0].id;
      }
    }
    
    return results;
  } catch (error) {
    console.error('Error searching users:', error);
    return [];
  }
}