import { removeMemberFromGroup } from '@/services/api/groups';
import { db } from '@/services/firebase/config';
import { useAuthStore } from '@/stores/authStore';
import { colors, spacing, typographyStyles } from '@/styles';
import { Group, GroupMember } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { doc, getDoc } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

// Member Card Component
function MemberCard({
    member,
    isCurrentUser,
    isAdmin,
    showRemove,
    onPress,
    onRemove,
}: {
    member: GroupMember;
    isCurrentUser: boolean;
    isAdmin: boolean;
    showRemove?: boolean;
    onPress: () => void;
    onRemove?: () => void;
}) {
    const getInitials = (name: string) => name.charAt(0).toUpperCase();
    const isOwed = member.balance > 0;
    const isSettled = member.balance === 0;
    
    const statusText = isSettled ? 'Settled' : (isOwed ? 'Is owed' : 'Owes');
    const statusColor = isSettled ? colors.outline : (isOwed ? '#4CAF50' : colors.error);
    const amountColor = isSettled ? colors.outline : (isOwed ? '#4CAF50' : colors.error);

    return (
        <TouchableOpacity style={styles.memberCard} onPress={onPress} activeOpacity={0.7}>
            <View style={styles.memberLeft}>
                <View style={[styles.memberAvatar, isCurrentUser && styles.currentUserAvatar]}>
                    {member.photoURL ? (
                        <Image source={{ uri: member.photoURL }} style={styles.memberAvatarImage} />
                    ) : (
                        <Text style={styles.memberAvatarText}>{getInitials(member.fullName)}</Text>
                    )}
                </View>
                <View>
                    <View style={styles.memberNameRow}>
                        <Text style={[typographyStyles.bodyMedium, styles.memberName]}>
                            {member.fullName}
                        </Text>
                        {isCurrentUser && (
                            <View style={styles.youBadge}>
                                <Text style={styles.youBadgeText}>You</Text>
                            </View>
                        )}
                        {isAdmin && (
                            <View style={styles.adminBadge}>
                                <Text style={styles.adminBadgeText}>Admin</Text>
                            </View>
                        )}
                    </View>
                    <Text style={[typographyStyles.bodySmall, styles.memberEmail]}>
                        {member.email}
                    </Text>
                </View>
            </View>
            <View style={styles.memberRight}>
                <Text style={[typographyStyles.labelMedium, styles.memberStatus, { color: statusColor }]}>
                    {statusText}
                </Text>
                <Text style={[typographyStyles.bodyMedium, styles.memberAmount, { color: amountColor }]}>
                    ₱{Math.abs(member.balance).toFixed(2)}
                </Text>
                {showRemove && (
                    <TouchableOpacity onPress={onRemove} style={styles.removeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="person-remove-outline" size={16} color={colors.error} />
                    </TouchableOpacity>
                )}
            </View>
        </TouchableOpacity>
    );
}

export default function AllMembersScreen() {
    const router = useRouter();
    const { id: groupId } = useLocalSearchParams<{ id: string }>();
    const { user } = useAuthStore();
    
    const [group, setGroup] = useState<Group | null>(null);
    const [members, setMembers] = useState<GroupMember[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchMembers = useCallback(async () => {
        if (!groupId) return;
        
        try {
            const groupRef = doc(db, 'groups', groupId);
            const groupSnap = await getDoc(groupRef);
            
            if (groupSnap.exists()) {
                const groupData = { id: groupSnap.id, ...groupSnap.data() } as Group;
                setGroup(groupData);
                setMembers(groupData.members || []);
            } else {
                Alert.alert('Error', 'Group not found');
                router.back();
            }
        } catch (error) {
            console.error('Error fetching members:', error);
            Alert.alert('Error', 'Failed to load members');
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, [groupId]);

    useEffect(() => {
        fetchMembers();
    }, [fetchMembers]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchMembers();
    };

    const handleAddMember = () => {
        router.push({
            pathname: '/groups/[id]/members/add',
            params: { id: groupId }
        });
    };

    const handleMemberPress = (member: GroupMember) => {
        // Show member details or navigate to member profile
        Alert.alert(
            member.fullName,
            `Email: ${member.email}\nPaid: ₱${member.totalPaid?.toFixed(2) || '0.00'}\nShare: ₱${member.totalShare?.toFixed(2) || '0.00'}\nBalance: ₱${member.balance?.toFixed(2) || '0.00'}`
        );
    };

    const handleRemoveMember = (member: GroupMember) => {
        if (member.userId === user?.id) {
            Alert.alert('Cannot Remove', 'You cannot remove yourself from the group');
            return;
        }
        
        Alert.alert(
            'Remove Member',
            `Are you sure you want to remove ${member.fullName} from this group?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        const success = await removeMemberFromGroup(groupId, member.userId);
                        if (success) {
                            fetchMembers();
                        } else {
                            Alert.alert('Error', 'Could not remove member. Groups require at least 2 members.');
                        }
                    }
                }
            ]
        );
    };

    const totalMembers = members.length;
    const activeMembers = members.filter(m => m.balance !== 0).length;

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back-outline" size={24} color={colors.primary} />
                    </TouchableOpacity>
                    <Text style={[typographyStyles.headlineMedium, styles.headerTitle]}>
                        Members
                    </Text>
                </View>
                <TouchableOpacity style={styles.addButton} onPress={handleAddMember}>
                    <Ionicons name="add" size={20} color={colors.onPrimary} />
                    <Text style={[typographyStyles.labelMedium, styles.addButtonText]}>Add</Text>
                </TouchableOpacity>
            </View>

            {/* Summary Cards */}
            <View style={styles.summaryContainer}>
                <View style={styles.summaryCard}>
                    <Text style={[typographyStyles.labelMedium, styles.summaryLabel]}>
                        Total Members
                    </Text>
                    <Text style={[typographyStyles.headlineMedium, styles.summaryValue]}>
                        {totalMembers}
                    </Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryCard}>
                    <Text style={[typographyStyles.labelMedium, styles.summaryLabel]}>
                        Active Members
                    </Text>
                    <Text style={[typographyStyles.headlineMedium, styles.summaryValue]}>
                        {activeMembers}
                    </Text>
                </View>
            </View>

            {/* Member List */}
            <FlatList
                data={members}
                keyExtractor={(item) => item.userId}
                renderItem={({ item }) => (
                    <MemberCard
                        member={item}
                        isCurrentUser={item.userId === user?.id}
                        isAdmin={item.userId === group?.createdBy}
                        showRemove={user?.id === group?.createdBy && item.userId !== user?.id}
                        onPress={() => handleMemberPress(item)}
                        onRemove={() => handleRemoveMember(item)}
                    />
                )}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="people-outline" size={48} color={colors.outline} />
                        <Text style={[typographyStyles.headlineSmall, styles.emptyTitle]}>
                            No Members Yet
                        </Text>
                        <Text style={[typographyStyles.bodyMedium, styles.emptyText]}>
                            Add members to start splitting expenses
                        </Text>
                        <TouchableOpacity style={styles.emptyButton} onPress={handleAddMember}>
                            <Text style={[typographyStyles.buttonMedium, styles.emptyButtonText]}>
                                Add Members
                            </Text>
                        </TouchableOpacity>
                    </View>
                }
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.gutter,
        paddingTop: spacing.md,
        paddingBottom: spacing.sm,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.outlineVariant,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    backButton: {
        padding: spacing.sm,
    },
    headerTitle: {
        color: colors.onSurface,
        fontSize: 18,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: spacing.borderRadiusFull,
        gap: 4,
    },
    addButtonText: {
        color: colors.onPrimary,
    },
    summaryContainer: {
        flexDirection: 'row',
        backgroundColor: colors.secondaryContainer,
        borderRadius: spacing.borderRadiusLg,
        marginHorizontal: spacing.gutter,
        marginTop: spacing.md,
        padding: spacing.md,
    },
    summaryCard: {
        flex: 1,
        alignItems: 'center',
    },
    summaryLabel: {
        color: colors.onSurfaceVariant,
    },
    summaryValue: {
        color: colors.onSurface,
        fontSize: 24,
    },
    summaryDivider: {
        width: 1,
        backgroundColor: colors.outlineVariant,
    },
    listContent: {
        paddingHorizontal: spacing.gutter,
        paddingBottom: 120,
        gap: spacing.md,
        paddingTop: spacing.md,
    },
    memberCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.secondaryContainer,
        padding: spacing.md,
        borderRadius: spacing.borderRadiusLg,
    },
    memberLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        flex: 1,
    },
    memberAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.primaryContainer,
        alignItems: 'center',
        justifyContent: 'center',
    },
    currentUserAvatar: {
        borderWidth: 2,
        borderColor: colors.primary,
    },
    memberAvatarImage: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    memberAvatarText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.onPrimary,
    },
    memberNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        flexWrap: 'wrap',
    },
    memberName: {
        color: colors.onSurface,
        fontWeight: '600',
    },
    youBadge: {
        backgroundColor: colors.primary,
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 4,
    },
    youBadgeText: {
        fontSize: 9,
        fontWeight: 'bold',
        color: colors.onPrimary,
    },
    adminBadge: {
        backgroundColor: colors.secondaryFixed,
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 4,
    },
    adminBadgeText: {
        fontSize: 9,
        fontWeight: 'bold',
        color: colors.onSecondaryFixedVariant,
    },
    memberEmail: {
        color: colors.onSurfaceVariant,
    },
    memberRight: {
        alignItems: 'flex-end',
    },
    memberStatus: {
        fontSize: 11,
        fontWeight: 'bold',
    },
    memberAmount: {
        fontWeight: '600',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xxl,
        gap: spacing.sm,
    },
    emptyTitle: {
        color: colors.onSurface,
        marginTop: spacing.sm,
    },
    emptyText: {
        color: colors.outline,
        textAlign: 'center',
    },
    emptyButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: spacing.borderRadiusFull,
        marginTop: spacing.md,
    },
    emptyButtonText: {
        color: colors.onPrimary,
    },
    removeBtn: {
        marginTop: spacing.xs,
        alignItems: 'center',
    },
});