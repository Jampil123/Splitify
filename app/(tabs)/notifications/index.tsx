import { useNotifications } from '@/services/hooks/useNotifications';
import { useAuthStore } from '@/stores/authStore';
import { colors, spacing, typographyStyles } from '@/styles';
import { formatRelativeTime } from '@/utils/dateHelpers';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

// Notification Type Icons
const getNotificationIcon = (type: string): string => {
    const iconMap: Record<string, string> = {
        expense_added: 'receipt-outline',
        expense_updated: 'create-outline',
        expense_deleted: 'trash-outline',
        settlement_reminder: 'time-outline',
        payment_confirmed: 'checkmark-circle-outline',
        friend_request: 'person-add-outline',
        friend_request_accepted: 'person-add-outline',
        member_joined: 'people-outline',
        member_left: 'person-remove-outline',
        group_invite: 'mail-outline',
        payment_request: 'cash-outline',
    };
    return iconMap[type] || 'notifications-outline';
};

const getNotificationColor = (type: string): string => {
    if (type.includes('expense')) return colors.primary;
    if (type.includes('settlement') || type.includes('payment')) return '#4CAF50';
    if (type.includes('friend')) return colors.secondary;
    if (type.includes('reminder')) return '#F59E0B';
    return colors.primary;
};

// Notification Item Component
interface NotificationItemProps {
    id: string;
    title: string;
    body: string;
    type: string;
    createdAt: any;
    isRead: boolean;
    onPress: () => void;
}

function NotificationItem({ id, title, body, type, createdAt, isRead, onPress }: NotificationItemProps) {
    const timeAgo = formatRelativeTime(createdAt?.toDate?.() || new Date());
    const iconName = getNotificationIcon(type);
    const iconColor = getNotificationColor(type);

    return (
        <TouchableOpacity
            style={[styles.notificationItem, !isRead && styles.unreadItem]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            {!isRead && <View style={styles.unreadDot} />}
            <View style={[styles.iconContainer, { backgroundColor: iconColor + '15' }]}>
                <Ionicons name={iconName as any} size={24} color={iconColor} />
            </View>
            <View style={styles.contentContainer}>
                <View style={styles.headerRow}>
                    <Text style={[typographyStyles.titleMedium, styles.title]} numberOfLines={1}>
                        {title}
                    </Text>
                    <Text style={[typographyStyles.bodySmall, styles.time]}>{timeAgo}</Text>
                </View>
                <Text style={[typographyStyles.bodySmall, styles.body]} numberOfLines={2}>
                    {body}
                </Text>
            </View>
        </TouchableOpacity>
    );
}

// Filter Chip Component
interface FilterChipProps {
    label: string;
    isActive: boolean;
    onPress: () => void;
}

function FilterChip({ label, isActive, onPress }: FilterChipProps) {
    return (
        <TouchableOpacity
            style={[styles.filterChip, isActive && styles.filterChipActive]}
            onPress={onPress}
        >
            <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                {label}
            </Text>
        </TouchableOpacity>
    );
}

// Empty State Component
function EmptyState() {
    return (
        <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
                <Ionicons name="notifications-off-outline" size={48} color={colors.outline} />
            </View>
            <Text style={[typographyStyles.headlineSmall, styles.emptyTitle]}>
                All Caught Up!
            </Text>
            <Text style={[typographyStyles.bodyMedium, styles.emptyText]}>
                No notifications to show right now
            </Text>
        </View>
    );
}

export default function NotificationsScreen() {
    const router = useRouter();
    const { user } = useAuthStore();
    const {
        notifications,
        unreadCount,
        isLoading,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
    } = useNotifications(user?.id);

    const [refreshing, setRefreshing] = useState(false);
    const [selectedFilter, setSelectedFilter] = useState('all');

    const filters = [
        { id: 'all', label: 'All' },
        { id: 'expense', label: 'Expenses' },
        { id: 'settlement', label: 'Settlements' },
        { id: 'friend', label: 'Friends' },
        { id: 'reminder', label: 'Reminders' },
    ];

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchNotifications();
        setRefreshing(false);
    }, [fetchNotifications]);

    const handleMarkAllRead = async () => {
        if (unreadCount === 0) return;
        
        Alert.alert(
            'Mark All as Read',
            'Are you sure you want to mark all notifications as read?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Mark All',
                    onPress: async () => {
                        await markAllAsRead();
                    },
                },
            ]
        );
    };

    const handleNotificationPress = async (notification: any) => {
        // Mark as read if not already
        if (!notification.isRead) {
            await markAsRead(notification.id);
        }

        // Navigate based on notification type
        switch (notification.type) {
            case 'expense_added':
            case 'expense_updated':
            case 'expense_deleted':
                if (notification.groupId) {
                    // router.push(`/groups/${notification.groupId}/expenses`);
                }
                break;
            case 'settlement_reminder':
            case 'payment_confirmed':
                if (notification.groupId) {
                    // router.push(`/groups/${notification.groupId}/settlements`);
                }
                break;
            case 'friend_request':
            case 'friend_request_accepted':
                router.push('/(tabs)/friends');
                break;
            case 'member_joined':
            case 'member_left':
            case 'group_invite':
                if (notification.groupId) {
                    // router.push(`/groups/${notification.groupId}`);
                }
                break;
            default:
                // Just mark as read
                break;
        }
    };

    const getFilteredNotifications = () => {
        if (selectedFilter === 'all') return notifications;
        
        const filterMap: Record<string, string[]> = {
            expense: ['expense_added', 'expense_updated', 'expense_deleted'],
            settlement: ['settlement_reminder', 'payment_confirmed', 'payment_request'],
            friend: ['friend_request', 'friend_request_accepted'],
            reminder: ['member_joined', 'group_invite'],
        };
        
        const allowedTypes = filterMap[selectedFilter] || [];
        return notifications.filter(n => allowedTypes.includes(n.type));
    };

    const groupNotificationsByDate = (notifs: any[]) => {
        const groups: { title: string; data: any[] }[] = [];
        const today: any[] = [];
        const yesterday: any[] = [];
        const earlier: any[] = [];

        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterdayStart = new Date(todayStart);
        yesterdayStart.setDate(yesterdayStart.getDate() - 1);

        notifs.forEach(notification => {
            const date = notification.createdAt?.toDate?.() || new Date();
            if (date >= todayStart) {
                today.push(notification);
            } else if (date >= yesterdayStart) {
                yesterday.push(notification);
            } else {
                earlier.push(notification);
            }
        });

        if (today.length > 0) groups.push({ title: 'Today', data: today });
        if (yesterday.length > 0) groups.push({ title: 'Yesterday', data: yesterday });
        if (earlier.length > 0) groups.push({ title: 'Earlier', data: earlier });

        return groups;
    };

    const filteredNotifications = getFilteredNotifications();
    const groupedNotifications = groupNotificationsByDate(filteredNotifications);

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
                <View style={styles.headerLeft}>
                    <View style={styles.headerAvatar}>
                        <Ionicons name="person" size={20} color={colors.onPrimary} />
                    </View>
                    <Text style={[typographyStyles.headlineMedium, styles.headerTitle]}>
                        Notifications
                    </Text>
                </View>
                <TouchableOpacity style={styles.settingsButton}>
                    <Ionicons name="settings-outline" size={24} color={colors.primary} />
                </TouchableOpacity>
            </View>

            {/* Title Bar */}
            <View style={styles.titleBar}>
                <Text style={[typographyStyles.headlineMedium, styles.title]}>
                    Notifications
                </Text>
                {unreadCount > 0 && (
                    <TouchableOpacity onPress={handleMarkAllRead}>
                        <Text style={[typographyStyles.labelMedium, styles.markAllText]}>
                            Mark all read
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Filter Chips */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filtersContainer}
            >
                {filters.map(filter => (
                    <FilterChip
                        key={filter.id}
                        label={filter.label}
                        isActive={selectedFilter === filter.id}
                        onPress={() => setSelectedFilter(filter.id)}
                    />
                ))}
            </ScrollView>

            {/* Notifications List */}
            {filteredNotifications.length > 0 ? (
                <FlatList
                    data={groupedNotifications}
                    keyExtractor={(item, index) => item.title + index}
                    renderItem={({ item: group }) => (
                        <View style={styles.groupContainer}>
                            <Text style={[typographyStyles.labelMedium, styles.groupTitle]}>
                                {group.title}
                            </Text>
                            {group.data.map((notification: any) => (
                                <NotificationItem
                                    key={notification.id}
                                    id={notification.id}
                                    title={notification.title}
                                    body={notification.body}
                                    type={notification.type}
                                    createdAt={notification.createdAt}
                                    isRead={notification.isRead}
                                    onPress={() => handleNotificationPress(notification)}
                                />
                            ))}
                        </View>
                    )}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
                    }
                    showsVerticalScrollIndicator={false}
                />
            ) : (
                <FlatList
                    data={[]}
                    renderItem={() => null}
                    ListEmptyComponent={EmptyState}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
                    }
                    showsVerticalScrollIndicator={false}
                />
            )}
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
    // Header
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.gutter,
        paddingTop: spacing.md,
        paddingBottom: spacing.sm,
        backgroundColor: colors.surface + 'CC',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    headerAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        color: colors.primary,
        fontSize: 18,
    },
    settingsButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    // Title Bar
    titleBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        paddingHorizontal: spacing.gutter,
        marginTop: spacing.md,
        marginBottom: spacing.md,
    },
    title: {
        color: '#2A3E4B',
        fontSize: 22,
    },
    markAllText: {
        color: colors.primary,
    },
    // Filters
    filtersContainer: {
        paddingHorizontal: spacing.gutter,
        paddingBottom: spacing.md,
        gap: spacing.sm,
    },
    filterChip: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: spacing.borderRadiusFull,
        backgroundColor: colors.secondaryContainer,
    },
    filterChipActive: {
        backgroundColor: colors.primary,
    },
    filterChipText: {
        fontSize: 12,
        fontWeight: '500',
        color: colors.secondaryContainer,
    },
    filterChipTextActive: {
        color: colors.onPrimary,
    },
    // List
    listContent: {
        paddingBottom: 80,
    },
    groupContainer: {
        marginBottom: spacing.lg,
    },
    groupTitle: {
        color: colors.onSurfaceVariant,
        marginBottom: spacing.sm,
        marginHorizontal: spacing.gutter,
    },
    // Notification Item
    notificationItem: {
        flexDirection: 'row',
        backgroundColor: colors.secondaryFixed + '30',
        borderRadius: spacing.borderRadiusLg,
        padding: spacing.md,
        marginHorizontal: spacing.gutter,
        marginBottom: spacing.md,
        gap: spacing.md,
        position: 'relative',
    },
    unreadItem: {
        backgroundColor: colors.secondaryFixed + '50',
    },
    unreadDot: {
        position: 'absolute',
        right: spacing.md,
        top: spacing.md,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.primary,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    contentContainer: {
        flex: 1,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 4,
    },
    notificationTitle: {
        color: colors.onSurface,
        fontSize: 14,
        flex: 1,
    },
    time: {
        color: colors.onSurfaceVariant,
        marginLeft: spacing.sm,
    },
    body: {
        color: colors.onSurfaceVariant,
        lineHeight: 20,
    },
    // Empty State
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xxl * 2,
        paddingHorizontal: spacing.xl,
    },
    emptyIconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: colors.surfaceContainerHighest,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
    },
    emptyTitle: {
        color: colors.onSurface,
        marginBottom: spacing.sm,
        textAlign: 'center',
    },
    emptyText: {
        color: colors.onSurfaceVariant,
        textAlign: 'center',
    },
});