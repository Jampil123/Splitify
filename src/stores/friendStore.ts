import { FriendRequest, UserSearchResult } from '@/types';
import { create } from 'zustand';

interface FriendState {
  // State
  friends: UserSearchResult[];
  pendingRequests: FriendRequest[];
  sentRequests: FriendRequest[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setFriends: (friends: UserSearchResult[]) => void;
  setPendingRequests: (requests: FriendRequest[]) => void;
  setSentRequests: (requests: FriendRequest[]) => void;
  addFriend: (friend: UserSearchResult) => void;
  removeFriend: (friendId: string) => void;
  addPendingRequest: (request: FriendRequest) => void;
  removePendingRequest: (requestId: string) => void;
  acceptPendingRequest: (requestId: string, fromUserId: string, fromUserName: string) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  clearFriends: () => void;
}

export const useFriendStore = create<FriendState>((set, get) => ({
  // Initial state
  friends: [],
  pendingRequests: [],
  sentRequests: [],
  isLoading: false,
  error: null,

  // Actions
  setFriends: (friends) => set({ friends }),
  
  setPendingRequests: (pendingRequests) => set({ pendingRequests }),
  
  setSentRequests: (sentRequests) => set({ sentRequests }),
  
  addFriend: (friend) => set((state) => ({
    friends: [...state.friends, friend],
  })),
  
  removeFriend: (friendId) => set((state) => ({
    friends: state.friends.filter((f) => f.id !== friendId),
  })),
  
  addPendingRequest: (request) => set((state) => ({
    pendingRequests: [request, ...state.pendingRequests],
  })),
  
  removePendingRequest: (requestId) => set((state) => ({
    pendingRequests: state.pendingRequests.filter((r) => r.id !== requestId),
  })),
  
  acceptPendingRequest: (requestId, fromUserId, fromUserName) => {
    // Remove from pending requests
    set((state) => ({
      pendingRequests: state.pendingRequests.filter((r) => r.id !== requestId),
      friends: [
        ...state.friends,
        {
          id: fromUserId,
          fullName: fromUserName,
          email: '',
          photoURL: null,
          isFriend: true,
          hasPendingRequest: false,
        },
      ],
    }));
  },
  
  setLoading: (isLoading) => set({ isLoading }),
  
  setError: (error) => set({ error }),
  
  clearFriends: () => set({ friends: [], pendingRequests: [], sentRequests: [] }),
}));