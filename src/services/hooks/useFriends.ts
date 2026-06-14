import { FriendRequest, UserSearchResult } from '@/types';
import { useCallback, useEffect, useState } from 'react';
import {
    getPendingFriendRequests,
    getSentFriendRequests,
    getUserFriends,
    removeFriend,
    respondToFriendRequest,
    searchUsers,
    sendFriendRequest,
} from '../api/friends';

interface UseFriendsOptions {
  autoFetch?: boolean;
}

export function useFriends(currentUserId: string | undefined, options: UseFriendsOptions = { autoFetch: true }) {
  const [friends, setFriends] = useState<UserSearchResult[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAllFriendData = useCallback(async () => {
    if (!currentUserId) {
      setFriends([]);
      setPendingRequests([]);
      setSentRequests([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const [friendsList, pending, sent] = await Promise.all([
        getUserFriends(currentUserId),
        getPendingFriendRequests(currentUserId),
        getSentFriendRequests(currentUserId),
      ]);
      setFriends(friendsList);
      setPendingRequests(pending);
      setSentRequests(sent);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId]);

  const sendRequest = useCallback(async (toUserId: string, message?: string): Promise<boolean> => {
    if (!currentUserId) return false;

    try {
      const success = await sendFriendRequest(currentUserId, { toUserId, message });
      if (success) {
        await fetchAllFriendData();
      }
      return success;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  }, [currentUserId, fetchAllFriendData]);

  const acceptRequest = useCallback(async (requestId: string): Promise<boolean> => {
    if (!currentUserId) return false;

    try {
      const success = await respondToFriendRequest(currentUserId, { requestId, status: 'accepted' });
      if (success) {
        await fetchAllFriendData();
      }
      return success;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  }, [currentUserId, fetchAllFriendData]);

  const rejectRequest = useCallback(async (requestId: string): Promise<boolean> => {
    if (!currentUserId) return false;

    try {
      const success = await respondToFriendRequest(currentUserId, { requestId, status: 'rejected' });
      if (success) {
        await fetchAllFriendData();
      }
      return success;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  }, [currentUserId, fetchAllFriendData]);

  const unfriend = useCallback(async (friendId: string): Promise<boolean> => {
    if (!currentUserId) return false;

    try {
      const success = await removeFriend(currentUserId, friendId);
      if (success) {
        await fetchAllFriendData();
      }
      return success;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  }, [currentUserId, fetchAllFriendData]);

  const searchForUsers = useCallback(async (searchTerm: string): Promise<UserSearchResult[]> => {
    if (!currentUserId) return [];

    try {
      return await searchUsers(currentUserId, searchTerm);
    } catch (err: any) {
      setError(err.message);
      return [];
    }
  }, [currentUserId]);

  useEffect(() => {
    if (options.autoFetch) {
      fetchAllFriendData();
    }
  }, [fetchAllFriendData, options.autoFetch]);

  return {
    friends,
    pendingRequests,
    sentRequests,
    isLoading,
    error,
    fetchAllFriendData,
    sendRequest,
    acceptRequest,
    rejectRequest,
    unfriend,
    searchForUsers,
  };
}