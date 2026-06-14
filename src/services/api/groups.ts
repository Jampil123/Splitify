import {
    arrayRemove,
    arrayUnion,
    collection,
    db,
    doc,
    getDoc,
    getDocs,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
    Timestamp,
    updateDoc,
    where
} from '../firebase/config';

import { CreateGroupData, Group, GroupMember, UpdateGroupData } from '@/types';
import { getCurrentUserData, updateUserProfile } from '../firebase/auth';

// ============ Group CRUD Operations ============

/**
 * Create a new group
 */
export async function createGroup(data: CreateGroupData, creatorId: string): Promise<string | null> {
  try {
    const groupRef = doc(collection(db, 'groups'));
    const now = serverTimestamp();

    // Get creator's user data
    const creatorData = await getCurrentUserData(creatorId);
    if (!creatorData) {
      throw new Error('Creator user data not found');
    }

    // Initial members array (includes creator + invited members)
    const initialMembers: GroupMember[] = [
      {
        userId: creatorId,
        fullName: creatorData.fullName,
        email: creatorData.email,
        photoURL: creatorData.photoURL,
        joinedAt: now as Timestamp,
        totalPaid: 0,
        totalShare: 0,
        balance: 0,
      },
    ];

    // Add additional members if provided
    for (const memberId of data.members) {
      if (memberId !== creatorId) {
        const memberData = await getCurrentUserData(memberId);
        if (memberData) {
          initialMembers.push({
            userId: memberId,
            fullName: memberData.fullName,
            email: memberData.email,
            photoURL: memberData.photoURL,
            joinedAt: now as Timestamp,
            totalPaid: 0,
            totalShare: 0,
            balance: 0,
          });
        }
      }
    }

    const groupData = {
      id: groupRef.id,
      groupName: data.groupName,
      groupDescription: data.groupDescription || '',
      groupPhoto: null,
      createdAt: now,
      createdBy: creatorId,
      members: initialMembers,
      splitType: 'equal' as const,
      isActive: true,
      totalExpenses: 0,
      memberCount: initialMembers.length,
      lastActivityAt: now,
      isFullySettled: false,
    };

    await setDoc(groupRef, groupData);

    // Add group ID to each member's groups array
    for (const member of initialMembers) {
      await updateUserProfile(member.userId, {
        groups: arrayUnion(groupRef.id) as unknown as string[],
      });
    }

    return groupRef.id;
  } catch (error) {
    console.error('Error creating group:', error);
    return null;
  }
}

/**
 * Get group by ID
 */
export async function getGroup(groupId: string): Promise<Group | null> {
  try {
    const groupRef = doc(db, 'groups', groupId);
    const groupSnap = await getDoc(groupRef);
    
    if (groupSnap.exists()) {
      return { id: groupSnap.id, ...groupSnap.data() } as Group;
    }
    return null;
  } catch (error) {
    console.error('Error getting group:', error);
    return null;
  }
}

/**
 * Get all groups for a user
 */
export async function getUserGroups(userId: string): Promise<Group[]> {
  try {
    const groupsRef = collection(db, 'groups');
    const q = query(
      groupsRef,
      where('members', 'array-contains', { userId }),
      orderBy('lastActivityAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Group);
  } catch (error) {
    console.error('Error getting user groups:', error);
    return [];
  }
}

/**
 * Update group
 */
export async function updateGroup(groupId: string, data: UpdateGroupData): Promise<boolean> {
  try {
    const groupRef = doc(db, 'groups', groupId);
    await updateDoc(groupRef, {
      ...data,
      lastActivityAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error('Error updating group:', error);
    return false;
  }
}

/**
 * Delete group (soft delete - mark as inactive)
 */
export async function deleteGroup(groupId: string): Promise<boolean> {
  try {
    const groupRef = doc(db, 'groups', groupId);
    await updateDoc(groupRef, {
      isActive: false,
      archivedAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error('Error deleting group:', error);
    return false;
  }
}

// ============ Member Management ============

/**
 * Add member to group
 */
export async function addMemberToGroup(
  groupId: string,
  userId: string,
  userFullName: string,
  userEmail: string,
  userPhotoURL: string | null = null
): Promise<boolean> {
  try {
    const groupRef = doc(db, 'groups', groupId);
    const group = await getGroup(groupId);
    
    if (!group) return false;
    
    // Check if member already exists
    const memberExists = group.members.some(m => m.userId === userId);
    if (memberExists) return false;
    
    const newMember: GroupMember = {
      userId,
      fullName: userFullName,
      email: userEmail,
      photoURL: userPhotoURL,
      joinedAt: serverTimestamp() as Timestamp,
      totalPaid: 0,
      totalShare: 0,
      balance: 0,
    };
    
    await updateDoc(groupRef, {
      members: arrayUnion(newMember),
      memberCount: group.memberCount + 1,
      lastActivityAt: serverTimestamp(),
    });
    
    // Add group to user's groups array
    await updateUserProfile(userId, {
      groups: arrayUnion(groupId) as unknown as string[],
    });
    
    return true;
  } catch (error) {
    console.error('Error adding member to group:', error);
    return false;
  }
}

/**
 * Remove member from group
 */
export async function removeMemberFromGroup(groupId: string, userId: string): Promise<boolean> {
  try {
    const groupRef = doc(db, 'groups', groupId);
    const group = await getGroup(groupId);
    
    if (!group) return false;
    
    // Cannot remove if less than 2 members would remain
    if (group.memberCount <= 2) {
      throw new Error('Group must have at least 2 members');
    }
    
    const memberToRemove = group.members.find(m => m.userId === userId);
    if (!memberToRemove) return false;
    
    await updateDoc(groupRef, {
      members: arrayRemove(memberToRemove),
      memberCount: group.memberCount - 1,
      lastActivityAt: serverTimestamp(),
    });
    
    // Remove group from user's groups array
    await updateUserProfile(userId, {
      groups: arrayRemove(groupId) as unknown as string[],
    });
    
    return true;
  } catch (error) {
    console.error('Error removing member from group:', error);
    return false;
  }
}

/**
 * Get group members
 */
export async function getGroupMembers(groupId: string): Promise<GroupMember[]> {
  try {
    const group = await getGroup(groupId);
    return group?.members || [];
  } catch (error) {
    console.error('Error getting group members:', error);
    return [];
  }
}