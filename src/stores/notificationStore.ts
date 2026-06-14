import { Notification } from '@/types';
import { create } from 'zustand';
import { Timestamp } from '../services/firebase/config';

interface NotificationState {
  // State
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  removeNotification: (notificationId: string) => void;
  setUnreadCount: (count: number) => void;
  incrementUnreadCount: () => void;
  decrementUnreadCount: () => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  clearNotifications: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  // Initial state
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,

  // Actions
  setNotifications: (notifications) => {
    const unreadCount = notifications.filter((n) => !n.isRead).length;
    set({ notifications, unreadCount });
  },
  
  addNotification: (notification) => set((state) => ({
    notifications: [notification, ...state.notifications],
    unreadCount: notification.isRead ? state.unreadCount : state.unreadCount + 1,
  })),
  
  markAsRead: (notificationId) => set((state) => {
    const notification = state.notifications.find((n) => n.id === notificationId);
    const wasUnread = notification && !notification.isRead;
    
    return {
      notifications: state.notifications.map((n) =>
        n.id === notificationId 
          ? { ...n, isRead: true, readAt: Timestamp.now() } 
          : n
      ),
      unreadCount: wasUnread ? state.unreadCount - 1 : state.unreadCount,
    };
  }),
  
  markAllAsRead: () => set((state) => ({
    notifications: state.notifications.map((n) => ({ 
      ...n, 
      isRead: true, 
      readAt: Timestamp.now() 
    })),
    unreadCount: 0,
  })),
  
  removeNotification: (notificationId) => set((state) => {
    const notification = state.notifications.find((n) => n.id === notificationId);
    const wasUnread = notification && !notification.isRead;
    
    return {
      notifications: state.notifications.filter((n) => n.id !== notificationId),
      unreadCount: wasUnread ? state.unreadCount - 1 : state.unreadCount,
    };
  }),
  
  setUnreadCount: (count) => set({ unreadCount: count }),
  
  incrementUnreadCount: () => set((state) => ({ unreadCount: state.unreadCount + 1 })),
  
  decrementUnreadCount: () => set((state) => ({ unreadCount: Math.max(0, state.unreadCount - 1) })),
  
  setLoading: (isLoading) => set({ isLoading }),
  
  setError: (error) => set({ error }),
  
  clearNotifications: () => set({ notifications: [], unreadCount: 0 }),
}));