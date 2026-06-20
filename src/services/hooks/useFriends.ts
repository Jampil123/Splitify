import { onSnapshot } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';

import { FriendRequest, UserSearchResult } from '@/types';
import { getCurrentUserData } from '../firebase/auth';
import { collection, db, doc, orderBy, query, where } from '../firebase/config';
import {
    cancelFriendRequest,
    removeFriend,
    respondToFriendRequest,
    searchUsers,
    sendFriendRequest,
} from '../api/friends';

export function useFriends(currentUserId: string | undefined) {
    const [friends, setFriends] = useState<UserSearchResult[]>([]);
    const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
    const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!currentUserId) {
            setFriends([]);
            setPendingRequests([]);
            setSentRequests([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        let firedCount = 0;
        const markFired = () => {
            firedCount++;
            if (firedCount >= 3) setIsLoading(false);
        };

        // Subscribe to received (pending) requests
        const pendingQ = query(
            collection(db, 'friendRequests'),
            where('toUserId', '==', currentUserId),
            where('status', '==', 'pending'),
            orderBy('createdAt', 'desc')
        );
        const unsubPending = onSnapshot(
            pendingQ,
            snap => {
                setPendingRequests(snap.docs.map(d => ({ id: d.id, ...d.data() } as FriendRequest)));
                markFired();
            },
            () => markFired()
        );

        // Subscribe to sent requests
        const sentQ = query(
            collection(db, 'friendRequests'),
            where('fromUserId', '==', currentUserId),
            where('status', '==', 'pending'),
            orderBy('createdAt', 'desc')
        );
        const unsubSent = onSnapshot(
            sentQ,
            snap => {
                setSentRequests(snap.docs.map(d => ({ id: d.id, ...d.data() } as FriendRequest)));
                markFired();
            },
            () => markFired()
        );

        // Subscribe to the user doc to watch the friends[] array
        const unsubUser = onSnapshot(
            doc(db, 'users', currentUserId),
            async snap => {
                if (!snap.exists()) {
                    setFriends([]);
                    markFired();
                    return;
                }
                const friendIds: string[] = snap.data().friends || [];
                if (friendIds.length === 0) {
                    setFriends([]);
                    markFired();
                    return;
                }
                try {
                    const profiles = await Promise.all(friendIds.map(id => getCurrentUserData(id)));
                    setFriends(
                        profiles
                            .filter(Boolean)
                            .map(u => ({
                                id: u!.id,
                                fullName: u!.fullName,
                                email: u!.email,
                                photoURL: u!.photoURL,
                                isFriend: true,
                                hasPendingRequest: false,
                            }))
                    );
                } catch (err) {
                    console.error('Error fetching friend profiles:', err);
                }
                markFired();
            },
            () => {
                setFriends([]);
                markFired();
            }
        );

        return () => {
            unsubPending();
            unsubSent();
            unsubUser();
        };
    }, [currentUserId]);

    const sendRequest = useCallback(async (toUserId: string, message?: string): Promise<boolean> => {
        if (!currentUserId) return false;
        try {
            return await sendFriendRequest(currentUserId, { toUserId, message });
        } catch (err: any) {
            setError(err.message);
            return false;
        }
    }, [currentUserId]);

    const acceptRequest = useCallback(async (requestId: string): Promise<boolean> => {
        if (!currentUserId) return false;
        try {
            return await respondToFriendRequest(currentUserId, { requestId, status: 'accepted' });
        } catch (err: any) {
            setError(err.message);
            return false;
        }
    }, [currentUserId]);

    const rejectRequest = useCallback(async (requestId: string): Promise<boolean> => {
        if (!currentUserId) return false;
        try {
            return await respondToFriendRequest(currentUserId, { requestId, status: 'rejected' });
        } catch (err: any) {
            setError(err.message);
            return false;
        }
    }, [currentUserId]);

    const unfriend = useCallback(async (friendId: string): Promise<boolean> => {
        if (!currentUserId) return false;
        try {
            return await removeFriend(currentUserId, friendId);
        } catch (err: any) {
            setError(err.message);
            return false;
        }
    }, [currentUserId]);

    const cancelRequest = useCallback(async (requestId: string): Promise<boolean> => {
        if (!currentUserId) return false;
        try {
            return await cancelFriendRequest(requestId);
        } catch (err: any) {
            setError(err.message);
            return false;
        }
    }, [currentUserId]);

    const searchForUsers = useCallback(async (searchTerm: string): Promise<UserSearchResult[]> => {
        if (!currentUserId) return [];
        try {
            return await searchUsers(currentUserId, searchTerm);
        } catch (err: any) {
            setError(err.message);
            return [];
        }
    }, [currentUserId]);

    // Kept for pull-to-refresh compatibility — subscriptions auto-update so this is a no-op
    const fetchAllFriendData = useCallback(async () => {}, []);

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
        cancelRequest,
        unfriend,
        searchForUsers,
    };
}
