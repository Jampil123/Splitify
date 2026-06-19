import { CreateGroupData, Group, UpdateGroupData } from '@/types';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    addMemberToGroup,
    createGroup,
    deleteGroup,
    removeMemberFromGroup,
    subscribeToGroup,
    subscribeToUserGroups,
    updateGroup,
} from '../api/groups';

// ─── User's groups list (real-time) ──────────────────────────────────────────

interface UseGroupsOptions {
    autoFetch?: boolean;
}

export function useGroups(userId: string | undefined, _options: UseGroupsOptions = {}) {
    const [groups, setGroups] = useState<Group[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!userId) {
            setGroups([]);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        const unsub = subscribeToUserGroups(userId, data => {
            setGroups(data);
            setIsLoading(false);
        });

        return unsub;
    }, [userId]);

    // Mutations — no manual refetch needed; snapshot fires automatically

    const createNewGroup = useCallback(async (data: CreateGroupData): Promise<string | null> => {
        if (!userId) return null;
        try {
            return await createGroup(data, userId);
        } catch (err: any) {
            setError(err.message);
            return null;
        }
    }, [userId]);

    const updateExistingGroup = useCallback(async (groupId: string, data: UpdateGroupData): Promise<boolean> => {
        try {
            const ok = await updateGroup(groupId, data);
            if (!ok) setError('Failed to update group');
            return ok;
        } catch (err: any) {
            setError(err.message);
            return false;
        }
    }, []);

    const removeGroup = useCallback(async (groupId: string): Promise<boolean> => {
        try {
            const ok = await deleteGroup(groupId);
            if (!ok) setError('Failed to delete group');
            return ok;
        } catch (err: any) {
            setError(err.message);
            return false;
        }
    }, []);

    const addMember = useCallback(async (
        groupId: string,
        memberId: string,
        fullName: string,
        email: string,
        photoURL?: string | null
    ): Promise<boolean> => {
        try {
            return await addMemberToGroup(groupId, memberId, fullName, email, photoURL);
        } catch (err: any) {
            setError(err.message);
            return false;
        }
    }, []);

    const removeMember = useCallback(async (groupId: string, memberId: string): Promise<boolean> => {
        try {
            return await removeMemberFromGroup(groupId, memberId);
        } catch (err: any) {
            setError(err.message);
            return false;
        }
    }, []);

    // fetchGroups kept for API compatibility — no-op since subscription is live
    const fetchGroups = useCallback(() => Promise.resolve(), []);

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

// ─── Single group (real-time) ─────────────────────────────────────────────────

export function useGroup(groupId: string | undefined) {
    const [group, setGroup] = useState<Group | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!groupId) {
            setGroup(null);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        const unsub = subscribeToGroup(groupId, data => {
            setGroup(data);
            setIsLoading(false);
        });

        return unsub;
    }, [groupId]);

    // fetchGroup kept for API compatibility — subscription keeps data live
    const fetchGroup = useCallback(() => Promise.resolve(), []);

    return { group, isLoading, error, fetchGroup };
}
