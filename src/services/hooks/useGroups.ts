import { CreateGroupData, Group, UpdateGroupData } from '@/types';
import { useCallback, useEffect, useState } from 'react';
import {
    addMemberToGroup,
    createGroup,
    deleteGroup,
    getGroup,
    getUserGroups,
    removeMemberFromGroup,
    updateGroup,
} from '../api/groups';

interface UseGroupsOptions {
  autoFetch?: boolean;
}

export function useGroups(userId: string | undefined, options: UseGroupsOptions = { autoFetch: true }) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGroups = useCallback(async () => {
    if (!userId) {
      setGroups([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await getUserGroups(userId);
      setGroups(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const createNewGroup = useCallback(async (data: CreateGroupData): Promise<string | null> => {
    if (!userId) return null;
    try {
      const groupId = await createGroup(data, userId);
      if (groupId) {
        await fetchGroups();
      }
      return groupId;
    } catch (err: any) {
      setError(err.message);
      return null;
    }
  }, [userId, fetchGroups]);

  const updateExistingGroup = useCallback(async (groupId: string, data: UpdateGroupData): Promise<boolean> => {
    try {
      const success = await updateGroup(groupId, data);
      if (success) {
        await fetchGroups();
      }
      return success;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  }, [fetchGroups]);

  const removeGroup = useCallback(async (groupId: string): Promise<boolean> => {
    try {
      const success = await deleteGroup(groupId);
      if (success) {
        await fetchGroups();
      }
      return success;
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  }, [fetchGroups]);

  const addMember = useCallback(async (
    groupId: string,
    userId: string,
    fullName: string,
    email: string,
    photoURL?: string | null
  ): Promise<boolean> => {
    try {
      return await addMemberToGroup(groupId, userId, fullName, email, photoURL);
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  }, []);

  const removeMember = useCallback(async (groupId: string, userId: string): Promise<boolean> => {
    try {
      return await removeMemberFromGroup(groupId, userId);
    } catch (err: any) {
      setError(err.message);
      return false;
    }
  }, []);

  useEffect(() => {
    if (options.autoFetch) {
      fetchGroups();
    }
  }, [fetchGroups, options.autoFetch]);

  return {
    groups,
    isLoading,
    error,
    fetchGroups,
    createNewGroup,
    updateExistingGroup,
    removeGroup,
    addMember,
    removeMember,
  };
}

// Hook for single group
export function useGroup(groupId: string | undefined) {
  const [group, setGroup] = useState<Group | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGroup = useCallback(async () => {
    if (!groupId) {
      setGroup(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const data = await getGroup(groupId);
      setGroup(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchGroup();
  }, [fetchGroup]);

  return {
    group,
    isLoading,
    error,
    fetchGroup,
  };
}