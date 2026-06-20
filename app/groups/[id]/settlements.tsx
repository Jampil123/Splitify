import { createNotification } from '@/services/api/notifications';
import { markSettlementCompleted, subscribeToGroupSettlements } from '@/services/api/settlements';
import { subscribeToGroup } from '@/services/api/groups';
import { useAuthStore } from '@/stores/authStore';
import { colors, spacing, typographyStyles } from '@/styles';
import { Settlement } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
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

// Settlement Card Component
function SettlementCard({
    settlement,
    currentUserId,
    fromPhotoURL,
    toPhotoURL,
    isProcessing,
    onMarkPaid,
    onRemind,
}: {
    settlement: Settlement;
    currentUserId: string;
    fromPhotoURL?: string | null;
    toPhotoURL?: string | null;
    isProcessing: boolean;
    onMarkPaid: (id: string) => void;
    onRemind: (id: string) => void;
}) {
    const isCreditor = settlement.toUserId === currentUserId;
    const getInitials = (name: string) => name.charAt(0).toUpperCase();

    return (
        <View style={styles.settlementCard}>
            <View style={styles.cardHeader}>
                <View style={styles.cardLeft}>
                    <View style={styles.avatarRow}>
                        <View style={[styles.avatar, { overflow: 'hidden' }]}>
                            {fromPhotoURL ? (
                                <Image source={{ uri: fromPhotoURL }} style={styles.avatarImg} />
                            ) : (
                                <Text style={styles.avatarText}>{getInitials(settlement.fromUserName)}</Text>
                            )}
                        </View>
                        <Ionicons name="arrow-forward" size={20} color={colors.primary} style={styles.arrowIcon} />
                        <View style={[styles.avatar, styles.avatarTo, { overflow: 'hidden' }]}>
                            {toPhotoURL ? (
                                <Image source={{ uri: toPhotoURL }} style={styles.avatarImg} />
                            ) : (
                                <Text style={styles.avatarText}>{getInitials(settlement.toUserName)}</Text>
                            )}
                        </View>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={[typographyStyles.labelMedium, styles.paymentLabel]} numberOfLines={1}>
                            {settlement.fromUserName} <Text style={styles.toText}>to</Text> {settlement.toUserName}
                        </Text>
                        <Text style={[typographyStyles.headlineMedium, styles.paymentAmount]}>
                            ₱{settlement.amount.toFixed(2)}
                        </Text>
                    </View>
                </View>
                <View style={[styles.statusBadge, settlement.status === 'completed' && styles.statusBadgeCompleted]}>
                    <Text style={[styles.statusText, settlement.status === 'completed' && styles.statusTextCompleted]}>
                        {settlement.status === 'completed' ? 'Paid' : 'Pending'}
                    </Text>
                </View>
            </View>
            {settlement.status === 'pending' && isCreditor && (
                <View style={styles.cardActions}>
                    {isProcessing ? (
                        <View style={[styles.markPaidButton, styles.markPaidButtonDisabled]}>
                            <ActivityIndicator size="small" color={colors.onPrimary} />
                            <Text style={[typographyStyles.labelMedium, styles.markPaidText]}>Processing…</Text>
                        </View>
                    ) : (
                        <TouchableOpacity style={styles.markPaidButton} onPress={() => onMarkPaid(settlement.id)}>
                            <Text style={[typographyStyles.labelMedium, styles.markPaidText]}>Mark as Paid</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.remindButton} onPress={() => onRemind(settlement.id)} disabled={isProcessing}>
                        <Text style={[typographyStyles.labelMedium, styles.remindText]}>Remind</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

// Info Banner Component
function InfoBanner() {
    return (
        <View style={styles.infoBanner}>
            <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
            <Text style={[typographyStyles.bodySmall, styles.infoText]}>
                These are suggested payments to settle all balances. Mark as paid when complete.
            </Text>
        </View>
    );
}

export default function SettlementsScreen() {
    const router = useRouter();
    const { id: groupId } = useLocalSearchParams<{ id: string }>();
    const { user } = useAuthStore();
    
    const [settlements, setSettlements] = useState<Settlement[]>([]);
    const [memberPhotoMap, setMemberPhotoMap] = useState<Record<string, string | null>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [totalAmount, setTotalAmount] = useState(0);
    const [pendingCount, setPendingCount] = useState(0);
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        if (!groupId) return;
        setIsLoading(true);

        const unsubGroup = subscribeToGroup(groupId, (groupData) => {
            if (!groupData) {
                Alert.alert('Error', 'Group not found');
                router.back();
                return;
            }
            const photoMap: Record<string, string | null> = {};
            (groupData.members || []).forEach(m => { photoMap[m.userId] = m.photoURL || null; });
            setMemberPhotoMap(photoMap);
            setIsLoading(false);
            setRefreshing(false);
        });

        const unsubSettlements = subscribeToGroupSettlements(groupId, (settlementsData) => {
            setSettlements(settlementsData);
            setTotalAmount(settlementsData.reduce((sum: number, s: Settlement) => sum + s.amount, 0));
            setPendingCount(settlementsData.length);
        });

        return () => {
            unsubGroup();
            unsubSettlements();
        };
    }, [groupId]);

    const onRefresh = () => {
        setRefreshing(true);
        setTimeout(() => setRefreshing(false), 800);
    };

    const handleMarkPaid = async (settlementId: string) => {
        const settlement = settlements.find(s => s.id === settlementId);
        if (!settlement) return;

        Alert.alert(
            'Mark as Paid',
            'Confirm that this payment has been completed?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm',
                    onPress: async () => {
                        setProcessingId(settlementId);
                        const ok = await markSettlementCompleted(groupId, settlement, {});
                        setProcessingId(null);
                        if (ok) {
                            Alert.alert('Success', 'Payment marked as completed!');
                        } else {
                            Alert.alert('Error', 'Failed to mark payment');
                        }
                    },
                },
            ]
        );
    };

    const handleRemind = async (settlementId: string) => {
        const settlement = settlements.find(s => s.id === settlementId);
        if (!settlement) return;

        try {
            await createNotification({
                userId: (settlement as any).fromUserId,
                title: 'Payment Reminder',
                body: `You need to pay ${settlement.toUserName} ₱${settlement.amount.toFixed(2)}. Please settle up!`,
                type: 'settlement_reminder',
                groupId,
                relatedUserId: user?.id,
                settlementId,
            });
            Alert.alert('Reminder Sent', `${settlement.fromUserName} has been reminded to pay ₱${settlement.amount.toFixed(2)}`);
        } catch {
            Alert.alert('Error', 'Failed to send reminder');
        }
    };

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
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back-outline" size={24} color={colors.primary} />
                </TouchableOpacity>
                <Text style={[typographyStyles.headlineMedium, styles.headerTitle]}>
                    Settle Up
                </Text>
                <TouchableOpacity style={styles.shareButton}>
                    <Ionicons name="share-outline" size={24} color={colors.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
                }
            >
                {/* Info Banner */}
                <InfoBanner />

                {/* Summary Card */}
                <View style={styles.summaryCard}>
                    <Text style={[typographyStyles.labelMedium, styles.summaryLabel]}>
                        Total to be settled
                    </Text>
                    <View style={styles.summaryRow}>
                        <Text style={[typographyStyles.headlineMedium, styles.summaryAmount]}>
                            ₱{totalAmount.toFixed(2)}
                        </Text>
                        <Text style={[typographyStyles.bodySmall, styles.summaryCount]}>
                            Across {pendingCount} payment{pendingCount !== 1 ? 's' : ''}
                        </Text>
                    </View>
                </View>

                {/* Settlements List */}
                {settlements.length > 0 ? (
                    <View style={styles.settlementsList}>
                        {settlements.map((settlement) => (
                            <SettlementCard
                                key={settlement.id}
                                settlement={settlement}
                                currentUserId={user?.id || ''}
                                fromPhotoURL={memberPhotoMap[settlement.fromUserId]}
                                toPhotoURL={memberPhotoMap[settlement.toUserId]}
                                isProcessing={processingId === settlement.id}
                                onMarkPaid={handleMarkPaid}
                                onRemind={handleRemind}
                            />
                        ))}
                    </View>
                ) : (
                    <View style={styles.emptyContainer}>
                        <View style={styles.emptyIconContainer}>
                            <Ionicons name="checkmark-circle-outline" size={48} color={colors.success} />
                        </View>
                        <Text style={[typographyStyles.headlineSmall, styles.emptyTitle]}>
                            All Settled! 🎉
                        </Text>
                        <Text style={[typographyStyles.bodyMedium, styles.emptyText]}>
                            Everyone is paid up in this group
                        </Text>
                    </View>
                )}

                {/* Illustration Section */}
                <View style={styles.illustrationContainer}>
                    <Ionicons name="wallet-outline" size={48} color={colors.primary} />
                    <Text style={[typographyStyles.headlineSmall, styles.illustrationTitle]}>
                        Smart Settlement
                    </Text>
                    <Text style={[typographyStyles.bodySmall, styles.illustrationText]}>
                        We've calculated the minimum number of transfers needed to square everyone away.
                    </Text>
                </View>
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
        paddingTop: spacing.xxl,
        paddingBottom: spacing.sm,
        backgroundColor: colors.surface,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.outlineVariant + '50',
    },
    backButton: {
        padding: spacing.sm,
    },
    headerTitle: {
        color: colors.primary,
        fontSize: 18,
    },
    shareButton: {
        padding: spacing.sm,
    },
    scrollContent: {
        paddingHorizontal: spacing.gutter,
        paddingBottom: 100,
        gap: spacing.lg,
        paddingTop: spacing.md,
    },
    infoBanner: {
        flexDirection: 'row',
        backgroundColor: colors.secondaryContainer,
        borderRadius: spacing.borderRadiusLg,
        padding: spacing.md,
        gap: spacing.sm,
        alignItems: 'flex-start',
    },
    infoText: {
        color: colors.secondary,
        flex: 1,
        lineHeight: 20,
    },
    summaryCard: {
        backgroundColor: colors.surfaceContainerHigh,
        borderRadius: spacing.borderRadiusLg,
        padding: spacing.lg,
        gap: spacing.xs,
        borderWidth: 1,
        borderColor: colors.outlineVariant + '20',
    },
    summaryLabel: {
        color: colors.secondary,
        textTransform: 'uppercase',
    },
    summaryRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
    },
    summaryAmount: {
        color: colors.onSurface,
    },
    summaryCount: {
        color: colors.secondary,
    },
    settlementsList: {
        gap: spacing.md,
    },
    settlementCard: {
        backgroundColor: colors.secondaryContainer,
        borderRadius: spacing.borderRadiusLg,
        padding: spacing.md,
        gap: spacing.lg,
        shadowColor: colors.onSurface,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    cardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        flex: 1,
    },
    avatarRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: colors.surfaceContainerLowest,
    },
    avatarTo: {
        backgroundColor: colors.tertiary,
    },
    avatarImg: {
        width: 40,
        height: 40,
    },
    avatarText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.onPrimary,
    },
    arrowIcon: {
        marginHorizontal: 4,
    },
    paymentLabel: {
        color: colors.onSurface,
    },
    toText: {
        color: colors.secondary + '60',
    },
    paymentAmount: {
        color: colors.onSurface,
        fontSize: 20,
    },
    statusBadge: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: 4,
    },
    statusBadgeCompleted: {
        backgroundColor: colors.success,
    },
    statusText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: colors.onPrimary,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    statusTextCompleted: {
        color: colors.onPrimary,
    },
    cardActions: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    markPaidButton: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: colors.primary,
        paddingVertical: spacing.md,
        borderRadius: spacing.borderRadiusFull,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    markPaidButtonDisabled: {
        opacity: 0.7,
    },
    markPaidText: {
        color: colors.onPrimary,
    },
    remindButton: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: spacing.borderRadiusFull,
        borderWidth: 1,
        borderColor: colors.primary,
        alignItems: 'center',
    },
    remindText: {
        color: colors.primary,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xl,
        gap: spacing.sm,
    },
    emptyIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.success + '15',
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyTitle: {
        color: colors.onSurface,
        marginTop: spacing.sm,
    },
    emptyText: {
        color: colors.onSurfaceVariant,
        textAlign: 'center',
    },
    illustrationContainer: {
        backgroundColor: colors.surfaceContainerLow,
        borderRadius: spacing.borderRadiusXl,
        padding: spacing.lg,
        alignItems: 'center',
        gap: spacing.sm,
        marginTop: spacing.md,
    },
    illustrationTitle: {
        color: colors.primary,
        fontSize: 18,
    },
    illustrationText: {
        color: colors.secondary,
        textAlign: 'center',
        maxWidth: '80%',
    },
});