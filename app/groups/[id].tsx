import { DropdownMenu } from '@/components/common/DropdownMenu';
import { db } from '@/services/firebase/config';
import { useAuthStore } from '@/stores/authStore';
import { colors, spacing, typographyStyles } from '@/styles';
import { Group, GroupMember } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { collection, doc, getDoc, getDocs, orderBy, query, where } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

// Member Avatar Component
function MemberAvatar({ member, isCurrentUser }: { member: GroupMember; isCurrentUser: boolean }) {
    return (
        <View style={styles.memberItem}>
            <View style={styles.memberAvatarContainer}>
                {member.photoURL ? (
                    <Image source={{ uri: member.photoURL }} style={styles.memberAvatar} />
                ) : (
                    <View style={[styles.memberAvatarPlaceholder, isCurrentUser && styles.currentUserAvatar]}>
                        <Text style={styles.memberAvatarText}>
                            {member.fullName.charAt(0).toUpperCase()}
                        </Text>
                    </View>
                )}
                <View style={[styles.statusDot, { backgroundColor: '#4CAF50' }]} />
            </View>
            <Text style={[typographyStyles.labelMedium, styles.memberName]}>
                {isCurrentUser ? 'You' : member.fullName.split(' ')[0]}
            </Text>
        </View>
    );
}

// Expense Item Component
function ExpenseItem({ expense, onPress }: { expense: any; onPress: () => void }) {
    const getCategoryIcon = (category: string): any => {
        const icons: Record<string, any> = {
            food: 'restaurant-outline',
            travel: 'airplane-outline',
            accommodation: 'bed-outline',
            utilities: 'flash-outline',
            shopping: 'bag-outline',
            entertainment: 'game-controller-outline',
            transport: 'car-outline',
            other: 'receipt-outline',
        };
        return icons[category] || 'receipt-outline';
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return 'Recently';
        try {
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            const now = new Date();
            const diff = now.getTime() - date.getTime();
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            
            if (days === 0) return 'Today';
            if (days === 1) return 'Yesterday';
            if (days < 7) return `${days} days ago`;
            return date.toLocaleDateString();
        } catch {
            return 'Recently';
        }
    };

    return (
        <TouchableOpacity style={styles.expenseItem} onPress={onPress} activeOpacity={0.7}>
            <View style={styles.expenseLeft}>
                <View style={styles.expenseIcon}>
                    <Ionicons name={getCategoryIcon(expense.category || 'other')} size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={[typographyStyles.bodyMedium, styles.expenseTitle]} numberOfLines={1}>{expense.title}</Text>
                    <Text style={[typographyStyles.bodySmall, styles.expenseMeta]} numberOfLines={1}>
                        Paid by {expense.payerName} • {formatDate(expense.date)}
                    </Text>
                </View>
            </View>
            <View style={styles.expenseRight}>
                <Text style={[typographyStyles.bodyMedium, styles.expenseAmount]}>
                    ₱{expense.amount?.toFixed(2) || '0.00'}
                </Text>
            </View>
        </TouchableOpacity>
    );
}

export default function GroupDetailsScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams<{ id: string }>();
    const { user } = useAuthStore();
    
    const [group, setGroup] = useState<Group | null>(null);
    const [expenses, setExpenses] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [userBalance, setUserBalance] = useState(0);

    const fetchGroupData = useCallback(async () => {
        if (!id) return;
        
        try {
            // Fetch group data
            const groupRef = doc(db, 'groups', id);
            const groupSnap = await getDoc(groupRef);
            
            if (groupSnap.exists()) {
                const groupData = { id: groupSnap.id, ...groupSnap.data() } as Group;
                setGroup(groupData);
                
                // Calculate current user's balance
                if (user?.id) {
                    const currentMember = groupData.members.find(m => m.userId === user.id);
                    setUserBalance(currentMember?.balance || 0);
                }
            } else {
                Alert.alert('Error', 'Group not found');
                router.back();
                return;
            }
            
            // ✅ Fetch expenses from subcollection
            const expensesRef = collection(db, 'groups', id, 'expenses');
            const expensesQuery = query(
                expensesRef,
                where('isDeleted', '==', false),
                orderBy('date', 'desc')
            );
            const expensesSnap = await getDocs(expensesQuery);
            const expensesData = expensesSnap.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data() 
            }));
            setExpenses(expensesData);
            
        } catch (error) {
            console.error('Error fetching group data:', error);
            Alert.alert('Error', 'Failed to load group data');
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, [id, user, router]);

    useEffect(() => {
        fetchGroupData();
    }, [fetchGroupData]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchGroupData();
    };

    const handleAddExpense = () => {
        router.push({
            pathname: '/groups/[id]/expenses/add',
            params: { id: id }
        });
    };

    const handleViewBalances = () => {
        router.push({
            pathname: '/groups/[id]/balances',
            params: { id: id }
        });
    };

    

    const handleViewAllMembers = () => {
        router.push({
            pathname: '/groups/[id]/members/list',
            params: { id: id }
        });
    };

    const handleViewAllExpenses = () => {
        router.push({
            pathname: '/groups/[id]/expenses/list',
            params: { id: id }
        });
    };

    const handleExpensePress = (expenseId: string) => {
        router.push({
            pathname: '/groups/[id]/expenses/[expenseId]',
            params: { id: id, expenseId: expenseId }
        });
    };

    const handleInviteMember = () => {
        router.push({ pathname: '/groups/[id]/members/add', params: { id: id }});
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!group) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={[typographyStyles.bodyMedium, styles.errorText]}>Group not found</Text>
            </View>
        );
    }

    const isOwed = userBalance > 0;
    const isOwes = userBalance < 0;
    const isSettled = userBalance === 0;
    
    const balanceText = isSettled ? 'Settled' : (isOwed ? 'You are owed' : 'You owe');
    const balanceColor = isSettled ? colors.outline : (isOwed ? '#2E7D32' : colors.error);
    const balanceBg = isSettled ? colors.surfaceContainer : (isOwed ? '#E8F5E9' : colors.errorContainer);

    const currentUserMember = group.members.find(m => m.userId === user?.id);
    const userShare = currentUserMember?.totalShare || 0;

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back-outline" size={24} color={colors.primary} />
                </TouchableOpacity>
                <Text style={[typographyStyles.headlineMedium, styles.headerTitle]} numberOfLines={1}>
                    {group.groupName}
                </Text>
                <DropdownMenu
                    items={[
                        {
                            id: 'settings',
                            label: 'Group Settings',
                            icon: 'settings-outline',
                            onPress: () => router.push({ pathname: '/groups/[id]/settings', params: { id } }),
                        },
                        {
                            id: 'members',
                            label: 'Manage Members',
                            icon: 'people-outline',
                            onPress: handleViewAllMembers,
                        },
                        {
                            id: 'settlements',
                            label: 'View Settlements',
                            icon: 'wallet-outline',
                            onPress: () => router.push({ pathname: '/groups/[id]/settlements', params: { id } }),
                        },
                    ]}
                />
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
                }
            >
                {/* Group Header Card */}
                <View style={styles.groupCard}>
                    <View style={styles.groupImageContainer}>
                        {group.groupPhoto ? (
                            <Image source={{ uri: group.groupPhoto }} style={styles.groupImage} />
                        ) : (
                            <View style={styles.groupImagePlaceholder}>
                                <Text style={styles.groupImageText}>{group.groupName.charAt(0)}</Text>
                            </View>
                        )}
                        <View style={styles.memberCountBadge}>
                            <Text style={styles.memberCountBadgeText}>{group.memberCount}</Text>
                        </View>
                    </View>
                    <View style={styles.groupInfo}>
                        <View style={styles.groupNameRow}>
                            <Text style={[typographyStyles.headlineMedium, styles.groupName]} numberOfLines={1}>
                                {group.groupName}
                            </Text>
                            <View style={styles.memberCountChip}>
                                <Text style={styles.memberCountChipText}>{group.memberCount} Members</Text>
                            </View>
                        </View>
                        {group.groupDescription && (
                            <Text style={[typographyStyles.bodySmall, styles.groupDescription]}>
                                {group.groupDescription}
                            </Text>
                        )}
                    </View>
                </View>

                {/* Balance Card */}
                <View style={[styles.balanceCard, { backgroundColor: balanceBg }]}>
                    <View>
                        <Text style={[typographyStyles.labelMedium, styles.balanceLabel]}>
                            Your Balance
                        </Text>
                        <Text style={[typographyStyles.headlineMedium, styles.balanceAmount, { color: balanceColor }]}>
                            {balanceText} ₱{Math.abs(userBalance).toFixed(2)}
                        </Text>
                    </View>
                    {!isSettled && (
                        <TouchableOpacity
                            style={[styles.balanceButton, { backgroundColor: balanceColor }]}
                            onPress={() => router.push({ pathname: '/groups/[id]/settlements', params: { id } })}
                        >
                            <Text style={styles.balanceButtonText}>
                                {isOwed ? 'Request' : 'Settle Now'}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Quick Stats */}
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Text style={[typographyStyles.labelMedium, styles.statLabel]}>Total Expenses</Text>
                        <Text style={[typographyStyles.headlineMedium, styles.statValue]}>
                            ₱{group.totalExpenses?.toFixed(2) || '0.00'}
                        </Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={[typographyStyles.labelMedium, styles.statLabel]}>Your Share</Text>
                        <Text style={[typographyStyles.headlineMedium, styles.statValue]}>
                            ₱{userShare?.toFixed(2) || '0.00'}
                        </Text>
                    </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionButtons}>
                    <TouchableOpacity style={styles.primaryButton} onPress={handleAddExpense}>
                        <Ionicons name="add-circle-outline" size={24} color={colors.onPrimary} />
                        <Text style={[typographyStyles.buttonLarge, styles.primaryButtonText]}>Add Expense</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.secondaryButton} onPress={handleViewBalances}>
                        <Ionicons name="wallet-outline" size={24} color={colors.primary} />
                        <Text style={[typographyStyles.buttonLarge, styles.secondaryButtonText]}>View Balances</Text>
                    </TouchableOpacity>
                </View>

                {/* Members Section */}
                <View style={styles.membersSection}>
                    <View style={styles.sectionHeader}>
                        <Text style={[typographyStyles.headlineSmall, styles.sectionTitle]}>Members</Text>
                        <TouchableOpacity onPress={handleViewAllMembers}>
                            <Text style={[typographyStyles.labelMedium, styles.seeAllText]}>See All</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.membersScroll}>
                        {group.members.slice(0, 6).map((member) => (
                            <MemberAvatar
                                key={member.userId}
                                member={member}
                                isCurrentUser={member.userId === user?.id}
                            />
                        ))}
                        {group.members.length > 6 && (
                            <View style={styles.memberItem}>
                                <View style={styles.moreMembersContainer}>
                                    <Text style={styles.moreMembersText}>+{group.members.length - 6}</Text>
                                </View>
                            </View>
                        )}
                        <TouchableOpacity style={styles.memberItem} onPress={handleInviteMember}>
                            <View style={styles.inviteButton}>
                                <Ionicons name="add" size={24} color={colors.primary} />
                            </View>
                            <Text style={[typographyStyles.labelMedium, styles.inviteText]}>Invite</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </View>

                {/* Recent Expenses */}
                <View style={styles.expensesSection}>
                    <View style={styles.sectionHeader}>
                        <Text style={[typographyStyles.headlineSmall, styles.sectionTitle]}>Recent Expenses</Text>
                        <TouchableOpacity onPress={handleViewAllExpenses}>
                            <Text style={[typographyStyles.labelMedium, styles.seeAllText]}>View All</Text>
                        </TouchableOpacity>
                    </View>
                    
                    {expenses && expenses.length > 0 ? (
                        expenses.slice(0, 3).map((expense: any) => (
                            <ExpenseItem
                                key={expense.id}
                                expense={expense}
                                onPress={() => handleExpensePress(expense.id)}
                            />
                        ))
                    ) : (
                        <View style={styles.emptyExpenses}>
                            <Ionicons name="receipt-outline" size={48} color={colors.outline} />
                            <Text style={[typographyStyles.bodyMedium, styles.emptyExpensesText]}>
                                No expenses yet
                            </Text>
                            <Text style={[typographyStyles.bodySmall, styles.emptyExpensesSubtext]}>
                                Tap "Add Expense" to get started
                            </Text>
                        </View>
                    )}
                </View>

                {/* Suggested Settlements */}
                {userBalance !== 0 && (
                    <View style={styles.settlementCard}>
                        <View style={styles.settlementHeader}>
                            <Ionicons name="bulb" size={20} color={colors.primary} />
                            <Text style={[typographyStyles.headlineSmall, styles.settlementTitle]}>
                                Suggested Settlements
                            </Text>
                        </View>
                        <View style={styles.settlementItem}>
                            <View style={styles.settlementUsers}>
                                <View style={styles.settlementAvatars}>
                                    <View style={styles.settlementAvatar}>
                                        <Text style={styles.settlementAvatarText}>S</Text>
                                    </View>
                                    <View style={[styles.settlementAvatar, styles.settlementAvatarYou]}>
                                        <Text style={styles.settlementAvatarText}>Y</Text>
                                    </View>
                                </View>
                                <Text style={[typographyStyles.bodySmall, styles.settlementText]}>
                                    {isOwed ? 'Someone owes you' : 'You owe someone'}
                                    <Text style={styles.settlementAmount}>
                                        {' '}₱{Math.abs(userBalance).toFixed(2)}
                                    </Text>
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={styles.remindButton}
                                onPress={() => router.push({ pathname: '/groups/[id]/settlements', params: { id } })}
                            >
                                <Text style={[typographyStyles.labelMedium, styles.remindButtonText]}>
                                    {isOwed ? 'Request' : 'Settle'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={[typographyStyles.bodySmall, styles.settlementTip]}>
                            Tip: Settle small debts first to clear the board!
                        </Text>
                    </View>
                )}
            </ScrollView>
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
    errorText: {
        color: colors.error,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.gutter,
        paddingTop: spacing.md,
        paddingBottom: spacing.sm,
        backgroundColor: colors.background,
    },
    backButton: {
        padding: spacing.sm,
    },
    headerTitle: {
        color: colors.primary,
        flex: 1,
        textAlign: 'center',
        fontSize: 18,
    },
    menuButton: {
        padding: spacing.sm,
    },
    scrollContent: {
        paddingHorizontal: spacing.gutter,
        paddingBottom: 100,
        gap: spacing.lg,
    },
    groupCard: {
        flexDirection: 'row',
        backgroundColor: colors.surfaceContainerLowest,
        borderRadius: spacing.borderRadiusLg,
        padding: spacing.md,
        gap: spacing.md,
        shadowColor: colors.onSurface,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    groupImageContainer: {
        position: 'relative',
    },
    groupImage: {
        width: 64,
        height: 64,
        borderRadius: spacing.borderRadiusLg,
    },
    groupImagePlaceholder: {
        width: 64,
        height: 64,
        borderRadius: spacing.borderRadiusLg,
        backgroundColor: colors.primaryContainer,
        alignItems: 'center',
        justifyContent: 'center',
    },
    groupImageText: {
        fontSize: 28,
        fontWeight: '600',
        color: colors.onPrimary,
    },
    memberCountBadge: {
        position: 'absolute',
        bottom: -4,
        right: -4,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: colors.surfaceContainerLowest,
    },
    memberCountBadgeText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: colors.onPrimary,
    },
    groupInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    groupNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
    },
    groupName: {
        fontSize: 18,
        color: colors.onSurface,
        flex: 1,
        flexShrink: 1,
    },
    memberCountChip: {
        backgroundColor: colors.surfaceContainer,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: spacing.borderRadiusLg,
    },
    memberCountChipText: {
        fontSize: 12,
        color: colors.outline,
    },
    groupDescription: {
        color: colors.onSurfaceVariant,
        marginTop: 4,
        lineHeight: 18,
    },
    balanceCard: {
        padding: spacing.md,
        borderRadius: spacing.borderRadiusLg,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    balanceLabel: {
        color: colors.secondary,
        textTransform: 'uppercase',
    },
    balanceAmount: {
        fontSize: 22,
    },
    balanceButton: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: spacing.borderRadiusFull,
    },
    balanceButtonText: {
        color: colors.onPrimary,
        fontSize: 12,
        fontWeight: '500',
    },
    statsRow: {
        flexDirection: 'row',
        backgroundColor: colors.surfaceContainer,
        borderRadius: spacing.borderRadiusLg,
        padding: spacing.md,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statLabel: {
        color: colors.onSecondaryFixedVariant,
    },
    statValue: {
        fontSize: 20,
        color: colors.onSurface,
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        backgroundColor: colors.outlineVariant,
    },
    actionButtons: {
        gap: spacing.sm,
    },
    primaryButton: {
        flexDirection: 'row',
        backgroundColor: colors.primary,
        borderRadius: spacing.borderRadiusFull,
        paddingVertical: spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    primaryButtonText: {
        color: colors.onPrimary,
        fontSize: 16,
    },
    secondaryButton: {
        flexDirection: 'row',
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: colors.primaryContainer,
        borderRadius: spacing.borderRadiusFull,
        paddingVertical: spacing.md,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
    },
    secondaryButtonText: {
        color: colors.primary,
        fontSize: 16,
    },
    membersSection: {
        gap: spacing.sm,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    sectionTitle: {
        fontSize: 20,
        color: colors.onSurface,
    },
    seeAllText: {
        color: colors.primary,
    },
    membersScroll: {
        flexDirection: 'row',
        paddingVertical: spacing.xs,
    },
    memberItem: {
        alignItems: 'center',
        gap: spacing.xs,
        marginRight: spacing.md,
        minWidth: 60,
    },
    memberAvatarContainer: {
        position: 'relative',
    },
    memberAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
    },
    memberAvatarPlaceholder: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.primaryContainer,
        alignItems: 'center',
        justifyContent: 'center',
    },
    currentUserAvatar: {
        borderWidth: 2,
        borderColor: colors.primary,
    },
    memberAvatarText: {
        fontSize: 20,
        fontWeight: '600',
        color: colors.onPrimary,
    },
    statusDot: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 14,
        height: 14,
        borderRadius: 7,
        borderWidth: 2,
        borderColor: colors.surfaceContainerLowest,
    },
    memberName: {
        fontSize: 12,
        color: colors.onSurface,
    },
    moreMembersContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.secondaryContainer,
        alignItems: 'center',
        justifyContent: 'center',
    },
    moreMembersText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.secondary,
    },
    inviteButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        borderWidth: 2,
        borderColor: colors.primaryContainer,
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
    },
    inviteText: {
        fontSize: 12,
        color: colors.primary,
    },
    expensesSection: {
        gap: spacing.sm,
    },
    expenseItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.surfaceContainerLowest,
        padding: spacing.md,
        borderRadius: spacing.borderRadiusLg,
        borderWidth: 1,
        borderColor: colors.outlineVariant + '30',
    },
    expenseLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        flex: 1,
    },
    expenseIcon: {
        width: 40,
        height: 40,
        borderRadius: spacing.borderRadiusLg,
        backgroundColor: colors.surfaceContainer,
        alignItems: 'center',
        justifyContent: 'center',
    },
    expenseTitle: {
        color: colors.onSurface,
        fontWeight: '600',
    },
    expenseMeta: {
        color: colors.onSurfaceVariant,
    },
    expenseRight: {
        alignItems: 'flex-end',
    },
    expenseAmount: {
        color: colors.onSurface,
        fontWeight: '600',
    },
    emptyExpenses: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xl,
        gap: spacing.sm,
    },
    emptyExpensesText: {
        color: colors.outline,
    },
    emptyExpensesSubtext: {
        color: colors.outline,
        textAlign: 'center',
    },
    settlementCard: {
        backgroundColor: colors.secondaryContainer,
        padding: spacing.md,
        borderRadius: spacing.borderRadiusLg,
        gap: spacing.md,
    },
    settlementHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    settlementTitle: {
        fontSize: 18,
        color: colors.primary,
    },
    settlementItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.surfaceContainerLowest,
        padding: spacing.md,
        borderRadius: spacing.borderRadiusLg,
    },
    settlementUsers: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    settlementAvatars: {
        flexDirection: 'row',
    },
    settlementAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.secondaryContainer,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: colors.surfaceContainerLowest,
        marginLeft: -8,
    },
    settlementAvatarYou: {
        backgroundColor: colors.primary,
    },
    settlementAvatarText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: colors.onPrimary,
    },
    settlementText: {
        color: colors.onSurfaceVariant,
    },
    settlementAmount: {
        fontWeight: 'bold',
        color: colors.primary,
    },
    remindButton: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
    },
    remindButtonText: {
        color: colors.primary,
        fontWeight: '600',
    },
    settlementTip: {
        color: colors.secondary,
        textAlign: 'center',
        fontStyle: 'italic',
    },
});