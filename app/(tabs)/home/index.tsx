import { FAB } from '@/components/common/FAB';
import { useGroups } from '@/services/hooks/useGroups';
import { useAuthStore } from '@/stores/authStore';
import { colors, spacing, typographyStyles } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface GroupCardProps {
    id: string;
    name: string;
    memberCount: number;
    balance: number;
    imageUrl?: string;
    icon?: string;
    onPress: () => void;
}

function GroupCard({ id, name, memberCount, balance, imageUrl, icon, onPress }: GroupCardProps) {
    const isOwed = balance > 0;
    const isOwes = balance < 0;
    const isSettled = balance === 0;
    
    const balanceText = isSettled ? 'Settled' : (isOwed ? 'You get' : 'You owe');
    const balanceAmount = Math.abs(balance).toFixed(2);
    const balanceColor = isSettled ? colors.onSurfaceVariant : (isOwed ? '#4CAF50' : colors.error);

    return (
        <TouchableOpacity style={styles.groupCard} onPress={onPress} activeOpacity={0.7}>
            {/* Group Image / Icon */}
            <View style={styles.groupImageContainer}>
                {imageUrl ? (
                    <Image source={{ uri: imageUrl }} style={styles.groupImage} />
                ) : icon ? (
                    <View style={styles.groupIconPlaceholder}>
                        <Text style={styles.groupIconText}>{icon}</Text>
                    </View>
                ) : (
                    <View style={[styles.groupIconPlaceholder, { backgroundColor: colors.primaryContainer }]}>
                        <Text style={styles.groupIconText}>👥</Text>
                    </View>
                )}
            </View>

            {/* Group Info */}
            <View style={styles.groupInfo}>
                <Text style={[typographyStyles.headlineMedium, styles.groupName]} numberOfLines={1}>
                    {name}
                </Text>
                <Text style={[typographyStyles.bodySmall, styles.groupMembers]}>
                    {memberCount} {memberCount === 1 ? 'member' : 'members'}
                </Text>
            </View>

            {/* Balance */}
            <View style={styles.balanceContainer}>
                <Text style={[typographyStyles.labelMedium, styles.balanceLabel, { color: balanceColor }]}>
                    {balanceText}
                </Text>
                <Text style={[typographyStyles.bodyLarge, styles.balanceAmount, { color: balanceColor }]}>
                    ₱{balanceAmount}
                </Text>
            </View>
        </TouchableOpacity>
    );
}

export default function HomeScreen() {
    const router = useRouter();
    const { user } = useAuthStore();
    const { groups, isLoading, error, fetchGroups } = useGroups(user?.id);
    const [refreshing, setRefreshing] = useState(false);

    // Calculate summary totals
    const totalOwed = groups.reduce((sum, group) => {
        const userBalance = group.members.find(m => m.userId === user?.id)?.balance || 0;
        return sum + (userBalance < 0 ? Math.abs(userBalance) : 0);
    }, 0);

    const totalOwedToMe = groups.reduce((sum, group) => {
        const userBalance = group.members.find(m => m.userId === user?.id)?.balance || 0;
        return sum + (userBalance > 0 ? userBalance : 0);
    }, 0);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchGroups();
        setRefreshing(false);
    }, [fetchGroups]);

    const handleCreateGroup = () => {
        
    };

    const handleGroupPress = (groupId: string) => {
        // router.push(`/groups/${groupId}`);
    };

    const handleSearch = () => {
        // TODO: Implement search functionality
        Alert.alert('Search', 'Search functionality coming soon');
    };

    const handleProfilePress = () => {
        // router.push('/(tabs)/profile');
    };

    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
                <Text style={styles.emptyIcon}>👥</Text>
            </View>
            <Text style={[typographyStyles.headlineSmall, styles.emptyTitle]}>
                No Groups Yet
            </Text>
            <Text style={[typographyStyles.bodyMedium, styles.emptyText]}>
                Create your first group to start splitting expenses with friends
            </Text>
            <TouchableOpacity style={styles.emptyButton} onPress={handleCreateGroup}>
                <Text style={[typographyStyles.buttonMedium, styles.emptyButtonText]}>
                    Create New Group
                </Text>
            </TouchableOpacity>
        </View>
    );

    if (isLoading && !refreshing) {
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
                <Text style={[typographyStyles.headlineMedium, styles.headerTitle]}>
                    My Groups
                </Text>
                <View style={styles.headerActions}>
                    <TouchableOpacity style={styles.headerButton} onPress={handleSearch}>
                        <Ionicons name="search" size={24} color={colors.onSurface} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.headerButton} onPress={handleCreateGroup}>
                        <Ionicons name="add" size={28} color={colors.onSurface} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.avatarButton} onPress={handleProfilePress}>
                        {user?.photoURL ? (
                            <Image source={{ uri: user.photoURL }} style={styles.avatar} />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Text style={styles.avatarText}>
                                    {user?.fullName?.charAt(0) || 'U'}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            <FlatList
                data={groups}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                    const userBalance = item.members.find(m => m.userId === user?.id)?.balance || 0;
                    return (
                        <GroupCard
                            id={item.id}
                            name={item.groupName}
                            memberCount={item.memberCount}
                            balance={userBalance}
                            imageUrl={item.groupPhoto || undefined}
                            icon={item.groupName.charAt(0)}
                            onPress={() => handleGroupPress(item.id)}
                        />
                    );
                }}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
                }
                ListHeaderComponent={
                    groups.length > 0 ? (
                        <View style={styles.summarySection}>
                            <View style={styles.summaryCard}>
                                <View style={styles.summaryHeader}>
                                    <Text style={[typographyStyles.labelMedium, styles.summaryLabel]}>
                                        Summary
                                    </Text>
                                    <Text style={styles.summaryIcon}>📊</Text>
                                </View>
                                <View style={styles.summaryRow}>
                                    <View style={styles.summaryItem}>
                                        <Text style={[typographyStyles.bodySmall, styles.summaryItemLabel]}>
                                            You owe overall
                                        </Text>
                                        <Text style={[typographyStyles.headlineMedium, styles.summaryOwedAmount]}>
                                            ₱{totalOwed.toFixed(2)}
                                        </Text>
                                    </View>
                                    <View style={styles.summaryDivider} />
                                    <View style={styles.summaryItem}>
                                        <Text style={[typographyStyles.bodySmall, styles.summaryItemLabel]}>
                                            You are owed
                                        </Text>
                                        <Text style={[typographyStyles.headlineMedium, styles.summaryOwedToMeAmount]}>
                                            ₱{totalOwedToMe.toFixed(2)}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    ) : null
                }
                ListEmptyComponent={renderEmptyState}
                showsVerticalScrollIndicator={false}
            />
            <FAB onPress={handleCreateGroup} />
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
    // Header styles
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.gutter,
        paddingTop: spacing.md,
        paddingBottom: spacing.sm,
        backgroundColor: colors.background,
    },
    headerTitle: {
        color: colors.primary,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    headerButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface,
    },
    headerIcon: {
        fontSize: 20,
        color: colors.onSurface,
    },
    avatarButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        overflow: 'hidden',
    },
    avatar: {
        width: '100%',
        height: '100%',
    },
    avatarPlaceholder: {
        width: '100%',
        height: '100%',
        borderRadius: 20,
        backgroundColor: colors.primaryContainer,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.onPrimary,
    },
    // List content
    listContent: {
        paddingBottom: 80,
    },
    // Summary section
    summarySection: {
        paddingHorizontal: spacing.gutter,
        marginTop: spacing.md,
        marginBottom: spacing.lg,
    },
    summaryCard: {
        backgroundColor: colors.surfaceContainerHighest,
        borderRadius: spacing.borderRadiusLg,
        padding: spacing.md,
        shadowColor: colors.onSurface,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    summaryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    summaryLabel: {
        color: colors.secondary,
    },
    summaryIcon: {
        fontSize: 16,
        color: colors.secondary,
        opacity: 0.5,
    },
    summaryRow: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    summaryItem: {
        flex: 1,
    },
    summaryItemLabel: {
        color: colors.onSurfaceVariant,
        marginBottom: spacing.xs,
    },
    summaryOwedAmount: {
        color: colors.error,
    },
    summaryOwedToMeAmount: {
        color: '#4CAF50',
    },
    summaryDivider: {
        width: 1,
        backgroundColor: colors.outlineVariant,
        opacity: 0.3,
    },
    // Group card styles
    groupCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceContainer,
        borderRadius: spacing.borderRadiusLg,
        padding: spacing.md,
        marginHorizontal: spacing.gutter,
        marginBottom: spacing.md,
        gap: spacing.md,
    },
    groupImageContainer: {
        width: 64,
        height: 64,
        borderRadius: spacing.borderRadiusLg,
        overflow: 'hidden',
        flexShrink: 0,
    },
    groupImage: {
        width: '100%',
        height: '100%',
    },
    groupIconPlaceholder: {
        width: '100%',
        height: '100%',
        borderRadius: spacing.borderRadiusLg,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    groupIconText: {
        fontSize: 28,
        color: colors.onPrimary,
    },
    groupInfo: {
        flex: 1,
    },
    groupName: {
        color: colors.onSurface,
        fontSize: 18,
        marginBottom: 2,
    },
    groupMembers: {
        color: colors.secondary,
    },
    balanceContainer: {
        alignItems: 'flex-end',
    },
    balanceLabel: {
        marginBottom: 2,
    },
    balanceAmount: {
        fontWeight: '600',
    },
    // Empty state styles
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.xxl * 2,
    },
    emptyIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.surfaceContainerHighest,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
    },
    emptyIcon: {
        fontSize: 40,
    },
    emptyTitle: {
        color: colors.onSurface,
        marginBottom: spacing.sm,
        textAlign: 'center',
    },
    emptyText: {
        color: colors.onSurfaceVariant,
        textAlign: 'center',
        marginBottom: spacing.lg,
    },
    emptyButton: {
        backgroundColor: colors.primaryContainer,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: spacing.borderRadiusFull,
    },
    emptyButtonText: {
        color: colors.onPrimary,
    },
});