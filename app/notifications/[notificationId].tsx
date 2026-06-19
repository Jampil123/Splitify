import { markNotificationAsRead } from '@/services/api/notifications';
import { db } from '@/services/firebase/config';
import { useAuthStore } from '@/stores/authStore';
import { colors, spacing, typographyStyles } from '@/styles';
import { formatRelativeTime } from '@/utils/dateHelpers';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const TYPE_META: Record<string, { icon: string; color: string; label: string }> = {
    expense_added:       { icon: 'receipt-outline',           color: '#3D6374', label: 'New Expense' },
    expense_updated:     { icon: 'create-outline',            color: '#3D6374', label: 'Expense Updated' },
    expense_deleted:     { icon: 'trash-outline',             color: '#BA1A1A', label: 'Expense Deleted' },
    settlement_reminder: { icon: 'time-outline',              color: '#F59E0B', label: 'Payment Reminder' },
    payment_confirmed:   { icon: 'checkmark-circle-outline',  color: '#10B981', label: 'Payment Confirmed' },
    friend_request:      { icon: 'person-add-outline',        color: '#526168', label: 'Friend Request' },
    friend_request_accepted: { icon: 'people-outline',        color: '#10B981', label: 'Request Accepted' },
    member_joined:       { icon: 'people-outline',            color: '#3D6374', label: 'Member Joined' },
    member_left:         { icon: 'person-remove-outline',     color: '#BA1A1A', label: 'Member Left' },
    group_invite:        { icon: 'mail-outline',              color: '#526168', label: 'Group Invite' },
    payment_request:     { icon: 'cash-outline',              color: '#10B981', label: 'Payment Request' },
};

function getActionLabel(type: string) {
    if (type.includes('expense')) return 'View Expenses';
    if (type.includes('settlement') || type.includes('payment')) return 'View Settlements';
    if (type.includes('friend')) return 'View Friends';
    if (type.includes('member') || type === 'group_invite') return 'Open Group';
    return null;
}

export default function NotificationDetailScreen() {
    const router = useRouter();
    const { notificationId } = useLocalSearchParams<{ notificationId: string }>();
    const { user } = useAuthStore();

    const [notification, setNotification] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            if (!user?.id || !notificationId) return;
            try {
                const ref = doc(db, 'users', user.id, 'notifications', notificationId);
                const snap = await getDoc(ref);
                if (snap.exists()) {
                    const data = { id: snap.id, ...snap.data() };
                    setNotification(data);
                    if (!(data as any).isRead) {
                        await markNotificationAsRead(user.id, notificationId);
                    }
                }
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [user?.id, notificationId]);

    const handleAction = () => {
        if (!notification) return;
        const { type, groupId } = notification;

        if (type.includes('expense') && groupId) {
            router.push({ pathname: '/groups/[id]/expenses/list', params: { id: groupId } });
        } else if ((type.includes('settlement') || type.includes('payment')) && groupId) {
            router.push({ pathname: '/groups/[id]/settlements', params: { id: groupId } });
        } else if (type.includes('friend')) {
            router.push('/(tabs)/friends');
        } else if ((type.includes('member') || type === 'group_invite') && groupId) {
            router.push({ pathname: '/groups/[id]', params: { id: groupId } });
        }
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!notification) {
        return (
            <View style={styles.loadingContainer}>
                <Ionicons name="notifications-off-outline" size={48} color={colors.outline} />
                <Text style={[typographyStyles.bodyMedium, { color: colors.outline, marginTop: spacing.md }]}>
                    Notification not found
                </Text>
            </View>
        );
    }

    const meta = TYPE_META[notification.type] || {
        icon: 'notifications-outline',
        color: colors.primary,
        label: 'Notification',
    };
    const actionLabel = getActionLabel(notification.type);
    const timeAgo = formatRelativeTime(notification.createdAt?.toDate?.() || new Date());

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back-outline" size={24} color={colors.primary} />
                </TouchableOpacity>
                <Text style={[typographyStyles.headlineMedium, styles.headerTitle]} numberOfLines={1}>
                    Notification
                </Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Icon + Type */}
                <View style={styles.heroSection}>
                    <View style={[styles.iconCircle, { backgroundColor: meta.color + '18' }]}>
                        <Ionicons name={meta.icon as any} size={40} color={meta.color} />
                    </View>
                    <View style={[styles.typeBadge, { backgroundColor: meta.color + '15' }]}>
                        <Text style={[typographyStyles.labelMedium, { color: meta.color }]}>
                            {meta.label}
                        </Text>
                    </View>
                </View>

                {/* Content */}
                <View style={styles.contentCard}>
                    <Text style={[typographyStyles.headlineSmall, styles.title]}>
                        {notification.title}
                    </Text>
                    <Text style={[typographyStyles.bodyMedium, styles.body]}>
                        {notification.body}
                    </Text>
                    <View style={styles.timeLine}>
                        <Ionicons name="time-outline" size={14} color={colors.outline} />
                        <Text style={[typographyStyles.bodySmall, styles.timeText]}>{timeAgo}</Text>
                    </View>
                </View>

                {/* Action Button */}
                {actionLabel && (
                    <TouchableOpacity style={styles.actionBtn} onPress={handleAction}>
                        <Text style={[typographyStyles.buttonLarge, styles.actionBtnText]}>
                            {actionLabel}
                        </Text>
                        <Ionicons name="arrow-forward-outline" size={20} color={colors.onPrimary} />
                    </TouchableOpacity>
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.gutter,
        paddingTop: spacing.md,
        paddingBottom: spacing.sm,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.outlineVariant,
    },
    backButton: {
        padding: spacing.sm,
    },
    headerTitle: {
        color: colors.onSurface,
        fontSize: 18,
        flex: 1,
        textAlign: 'center',
    },
    scrollContent: {
        paddingHorizontal: spacing.gutter,
        paddingBottom: 60,
        paddingTop: spacing.xl,
        gap: spacing.lg,
        alignItems: 'center',
    },
    heroSection: {
        alignItems: 'center',
        gap: spacing.md,
    },
    iconCircle: {
        width: 96,
        height: 96,
        borderRadius: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    typeBadge: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: spacing.borderRadiusFull,
    },
    contentCard: {
        backgroundColor: colors.surface,
        borderRadius: spacing.borderRadiusLg,
        padding: spacing.lg,
        gap: spacing.md,
        width: '100%',
        shadowColor: colors.onSurface,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    title: {
        color: colors.onSurface,
        textAlign: 'center',
    },
    body: {
        color: colors.onSurfaceVariant,
        textAlign: 'center',
        lineHeight: 24,
    },
    timeLine: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        marginTop: spacing.xs,
    },
    timeText: {
        color: colors.outline,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary,
        borderRadius: spacing.borderRadiusFull,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        gap: spacing.sm,
        width: '100%',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
    },
    actionBtnText: {
        color: colors.onPrimary,
    },
});
