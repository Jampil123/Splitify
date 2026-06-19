import { useNotifications } from '@/services/hooks/useNotifications';
import { useAuthStore } from '@/stores/authStore';
import { colors, spacing } from '@/styles';
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

const TYPE_ICON: Record<string, string> = {
    expense_added: 'receipt-outline',
    expense_updated: 'create-outline',
    expense_deleted: 'trash-outline',
    settlement_reminder: 'time-outline',
    payment_confirmed: 'checkmark-circle-outline',
    friend_request: 'person-add-outline',
    friend_request_accepted: 'people-outline',
    member_joined: 'people-outline',
    member_left: 'person-remove-outline',
    group_invite: 'mail-outline',
    payment_request: 'cash-outline',
};

const TYPE_COLOR: Record<string, string> = {
    expense_added: colors.primary,
    expense_updated: colors.primary,
    expense_deleted: colors.error,
    settlement_reminder: '#F59E0B',
    payment_confirmed: '#10B981',
    friend_request: colors.secondary,
    friend_request_accepted: '#10B981',
    member_joined: colors.primary,
    member_left: colors.error,
    group_invite: colors.secondary,
    payment_request: '#10B981',
};

const FILTERS = [
    { id: 'all', label: 'All', types: null as string[] | null },
    { id: 'expense', label: 'Expenses', types: ['expense_added', 'expense_updated', 'expense_deleted'] },
    { id: 'payment', label: 'Payments', types: ['settlement_reminder', 'payment_confirmed', 'payment_request'] },
    { id: 'friend', label: 'Friends', types: ['friend_request', 'friend_request_accepted'] },
    { id: 'group', label: 'Groups', types: ['member_joined', 'member_left', 'group_invite'] },
];

function NotifItem({ notification, onPress }: { notification: any; onPress: () => void }) {
    const icon = TYPE_ICON[notification.type] || 'notifications-outline';
    const color = TYPE_COLOR[notification.type] || colors.primary;
    const time = formatRelativeTime(notification.createdAt?.toDate?.() || new Date());

    return (
        <TouchableOpacity
            style={[s.item, !notification.isRead && s.itemUnread]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={[s.itemIcon, { backgroundColor: color + '18' }]}>
                <Ionicons name={icon as any} size={20} color={color} />
            </View>
            <View style={s.itemContent}>
                <View style={s.itemTop}>
                    <Text style={s.itemTitle} numberOfLines={1}>{notification.title}</Text>
                    <Text style={s.itemTime}>{time}</Text>
                </View>
                <Text style={s.itemBody} numberOfLines={2}>{notification.body}</Text>
            </View>
            {!notification.isRead && <View style={s.dot} />}
        </TouchableOpacity>
    );
}

export default function NotificationsScreen() {
    const router = useRouter();
    const { user } = useAuthStore();
    const { notifications, unreadCount, isLoading, fetchNotifications, markAllAsRead } = useNotifications(user?.id);

    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState('all');

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchNotifications();
        setRefreshing(false);
    }, [fetchNotifications]);

    const handleMarkAll = () => {
        if (unreadCount === 0) return;
        Alert.alert('Mark All as Read', 'Mark all notifications as read?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Mark All', onPress: markAllAsRead },
        ]);
    };

    const getFiltered = () => {
        const f = FILTERS.find(f => f.id === filter);
        if (!f || !f.types) return notifications;
        return notifications.filter(n => f.types!.includes(n.type));
    };

    const groupByDate = (items: any[]) => {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yestStart = new Date(todayStart);
        yestStart.setDate(yestStart.getDate() - 1);

        const today: any[] = [], yesterday: any[] = [], earlier: any[] = [];
        items.forEach(n => {
            const d = n.createdAt?.toDate?.() || new Date();
            if (d >= todayStart) today.push(n);
            else if (d >= yestStart) yesterday.push(n);
            else earlier.push(n);
        });

        const result: { title: string; data: any[] }[] = [];
        if (today.length) result.push({ title: 'Today', data: today });
        if (yesterday.length) result.push({ title: 'Yesterday', data: yesterday });
        if (earlier.length) result.push({ title: 'Earlier', data: earlier });
        return result;
    };

    const grouped = groupByDate(getFiltered());

    if (isLoading && !refreshing) {
        return (
            <View style={s.centered}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={s.container}>
            <StatusBar style="dark" />

            {/* Header */}
            <View style={s.header}>
                <View style={s.headerLeft}>
                    <Text style={s.headerTitle}>Notifications</Text>
                    {unreadCount > 0 && (
                        <View style={s.badge}>
                            <Text style={s.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                        </View>
                    )}
                </View>
                {unreadCount > 0 && (
                    <TouchableOpacity onPress={handleMarkAll}>
                        <Text style={s.markAll}>Mark all read</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Filter chips */}
            <View style={s.filtersRow}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={s.filters}
                >
                    {FILTERS.map(f => (
                        <TouchableOpacity
                            key={f.id}
                            style={[s.chip, filter === f.id && s.chipActive]}
                            onPress={() => setFilter(f.id)}
                            activeOpacity={0.7}
                        >
                            <Text style={[s.chipText, filter === f.id && s.chipTextActive]}>
                                {f.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* List */}
            <FlatList
                data={grouped}
                keyExtractor={(item, i) => item.title + i}
                renderItem={({ item: section }) => (
                    <View>
                        <Text style={s.sectionTitle}>{section.title}</Text>
                        {section.data.map((n: any) => (
                            <NotifItem
                                key={n.id}
                                notification={n}
                                onPress={() =>
                                    router.push({
                                        pathname: '/notifications/[notificationId]',
                                        params: { notificationId: n.id },
                                    })
                                }
                            />
                        ))}
                    </View>
                )}
                ListEmptyComponent={
                    <View style={s.empty}>
                        <View style={s.emptyIcon}>
                            <Ionicons name="notifications-off-outline" size={40} color={colors.outline} />
                        </View>
                        <Text style={s.emptyTitle}>All caught up!</Text>
                        <Text style={s.emptyText}>No notifications to show</Text>
                    </View>
                }
                contentContainerStyle={s.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
                }
                showsVerticalScrollIndicator={false}
            />
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    // Header
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: spacing.gutter,
        paddingTop: spacing.xxl, paddingBottom: spacing.md,
        backgroundColor: colors.surface,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.outlineVariant + '50',
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    headerTitle: {
        fontSize: 24, fontWeight: '600', color: colors.primary, fontFamily: 'Poppins_600SemiBold',
    },
    badge: {
        backgroundColor: colors.error, borderRadius: 10,
        paddingHorizontal: 6, paddingVertical: 1,
        minWidth: 20, alignItems: 'center',
    },
    badgeText: { fontSize: 11, fontWeight: '700', color: colors.onPrimary, fontFamily: 'Poppins_700Bold' },
    markAll: {
        fontSize: 13, color: colors.primary, fontFamily: 'Poppins_500Medium',
    },
    // Filters
    filtersRow: {
        height: 48,
        justifyContent: 'center',
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.outlineVariant + '30',
    },
    filters: {
        paddingHorizontal: spacing.gutter,
        alignItems: 'center',
        gap: spacing.sm,
        flexDirection: 'row',
    },
    chip: {
        height: 32, paddingHorizontal: 14, borderRadius: 16,
        backgroundColor: colors.surfaceContainerHigh,
        justifyContent: 'center', alignItems: 'center',
    },
    chipActive: { backgroundColor: colors.primary },
    chipText: { fontSize: 12, fontWeight: '500', color: colors.onSurfaceVariant, fontFamily: 'Poppins_500Medium' },
    chipTextActive: { color: colors.onPrimary },
    // Sections
    sectionTitle: {
        fontSize: 11, fontWeight: '600', color: colors.onSurfaceVariant,
        paddingHorizontal: spacing.gutter, paddingTop: spacing.xs, paddingBottom: spacing.xs,
        fontFamily: 'Poppins_600SemiBold', textTransform: 'uppercase', letterSpacing: 0.8,
    },
    // Items
    item: {
        flexDirection: 'row', alignItems: 'flex-start',
        paddingHorizontal: spacing.gutter, paddingVertical: 12,
        gap: spacing.md, backgroundColor: colors.surface,
        borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.outlineVariant + '30',
    },
    itemUnread: { backgroundColor: colors.primaryFixed + '25' },
    itemIcon: {
        width: 40, height: 40, borderRadius: 20,
        alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
    },
    itemContent: { flex: 1 },
    itemTop: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'flex-start', gap: spacing.sm, marginBottom: 2,
    },
    itemTitle: {
        fontSize: 14, fontWeight: '600', color: colors.onSurface,
        fontFamily: 'Poppins_600SemiBold', flex: 1,
    },
    itemTime: {
        fontSize: 11, color: colors.outline, fontFamily: 'Poppins_400Regular', flexShrink: 0, marginTop: 1,
    },
    itemBody: {
        fontSize: 13, color: colors.onSurfaceVariant, lineHeight: 18,
        fontFamily: 'Poppins_400Regular',
    },
    dot: {
        width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary,
        marginTop: 6, flexShrink: 0,
    },
    // List
    listContent: { paddingBottom: 80 },
    // Empty
    empty: { alignItems: 'center', paddingVertical: 60, gap: spacing.sm },
    emptyIcon: {
        width: 80, height: 80, borderRadius: 40, backgroundColor: colors.surfaceContainerHighest,
        alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm,
    },
    emptyTitle: {
        fontSize: 17, fontWeight: '700', color: colors.onSurface, fontFamily: 'Poppins_700Bold',
    },
    emptyText: {
        fontSize: 13, color: colors.onSurfaceVariant, fontFamily: 'Poppins_400Regular',
    },
});
