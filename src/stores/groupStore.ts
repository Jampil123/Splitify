import { Group, GroupMember } from '@/types';
import { create } from 'zustand';

interface GroupState {
  // State
  currentGroup: Group | null;
  groups: Group[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setCurrentGroup: (group: Group | null) => void;
  setGroups: (groups: Group[]) => void;
  addGroup: (group: Group) => void;
  updateGroup: (groupId: string, updates: Partial<Group>) => void;
  removeGroup: (groupId: string) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  clearGroups: () => void;
  
  // Member actions
  addMemberToCurrentGroup: (member: GroupMember) => void;
  removeMemberFromCurrentGroup: (userId: string) => void;
  updateMemberInCurrentGroup: (userId: string, updates: Partial<GroupMember>) => void;
}

export const useGroupStore = create<GroupState>((set, get) => ({
  // Initial state
  currentGroup: null,
  groups: [],
  isLoading: false,
  error: null,

  // Actions
  setCurrentGroup: (group) => set({ currentGroup: group }),
  
  setGroups: (groups) => set({ groups }),
  
  addGroup: (group) => set((state) => ({ 
    groups: [group, ...state.groups] 
  })),
  
  updateGroup: (groupId, updates) => set((state) => ({
    groups: state.groups.map((g) => 
      g.id === groupId ? { ...g, ...updates } : g
    ),
    currentGroup: state.currentGroup?.id === groupId 
      ? { ...state.currentGroup, ...updates } 
      : state.currentGroup,
  })),
  
  removeGroup: (groupId) => set((state) => ({
    groups: state.groups.filter((g) => g.id !== groupId),
    currentGroup: state.currentGroup?.id === groupId ? null : state.currentGroup,
  })),
  
  setLoading: (isLoading) => set({ isLoading }),
  
  setError: (error) => set({ error }),
  
  clearGroups: () => set({ groups: [], currentGroup: null }),
  
  addMemberToCurrentGroup: (member) => set((state) => ({
    currentGroup: state.currentGroup
      ? {
          ...state.currentGroup,
          members: [...state.currentGroup.members, member],
          memberCount: state.currentGroup.memberCount + 1,
        }
      : null,
    groups: state.groups.map((g) =>
      g.id === state.currentGroup?.id
        ? {
            ...g,
            members: [...g.members, member],
            memberCount: g.memberCount + 1,
          }
        : g
    ),
  })),
  
  removeMemberFromCurrentGroup: (userId) => set((state) => ({
    currentGroup: state.currentGroup
      ? {
          ...state.currentGroup,
          members: state.currentGroup.members.filter((m) => m.userId !== userId),
          memberCount: state.currentGroup.memberCount - 1,
        }
      : null,
    groups: state.groups.map((g) =>
      g.id === state.currentGroup?.id
        ? {
            ...g,
            members: g.members.filter((m) => m.userId !== userId),
            memberCount: g.memberCount - 1,
          }
        : g
    ),
  })),
  
  updateMemberInCurrentGroup: (userId, updates) => set((state) => ({
    currentGroup: state.currentGroup
      ? {
          ...state.currentGroup,
          members: state.currentGroup.members.map((m) =>
            m.userId === userId ? { ...m, ...updates } : m
          ),
        }
      : null,
    groups: state.groups.map((g) =>
      g.id === state.currentGroup?.id
        ? {
            ...g,
            members: g.members.map((m) =>
              m.userId === userId ? { ...m, ...updates } : m
            ),
          }
        : g
    ),
  })),
}));