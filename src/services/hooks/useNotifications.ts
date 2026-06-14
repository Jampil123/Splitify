import { Notification } from '@/types';
import { useCallback, useEffect, useState } from 'react';
import {
    deleteNotification,
    getUnreadNotificationCount,
    getUserNotifications,
    markAllNotificationsAsRead,
    markNotificationAsRead,
} from '../api/notifications';

interface UseNotificationsOptions {
  autoFetch?: boolean;
  limit?: number;
}

export function useNotifications(userId: string | undefined, options: UseNotificationsOptions = { autoFetch: true, limit: 50 }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!userId) {
      setNotifications([]);
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const [notifs, count] = await Promise.all([
        getUserNotifications(userId, options.limit),
        getUnreadNotificationCount(userId),
      ]);
      setNotifications(notifs);
      setUnreadCount(count);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [userId, options.limit]);

  const markAsRead = useCallback(async (notificationId: string): Promise<boolean> => {
    if (!userId) return false;

    try {
      const success = await markNotificationAsRead(userId, notificationId);
      if (success) {
        await fetchNotifications();
      }
      return success;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  }, [userId, fetchNotifications]);

  const markAllAsRead = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;

    try {
      const success = await markAllNotificationsAsRead(userId);
      if (success) {
        await fetchNotifications();
      }
      return success;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  }, [userId, fetchNotifications]);

  const removeNotification = useCallback(async (notificationId: string): Promise<boolean> => {
    if (!userId) return false;

    try {
      const success = await deleteNotification(userId, notificationId);
      if (success) {
        await fetchNotifications();
      }
      return success;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  }, [userId, fetchNotifications]);

  useEffect(() => {
    if (options.autoFetch) {
      fetchNotifications();
    }
  }, [fetchNotifications, options.autoFetch]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    removeNotification,
  };
}