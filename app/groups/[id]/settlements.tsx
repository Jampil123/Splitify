import { createNotification } from '@/services/api/notifications';
import { db } from '@/services/firebase/config';
import { useAuthStore } from '@/stores/authStore';
import { colors, spacing, typographyStyles } from '@/styles';
import { Group, Settlement } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { collection, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore';
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

// Settlement Card Component
function SettlementCard({
    settlement,
    currentUserId,
    fromPhotoURL,
    toPhotoURL,
    onMarkPaid,
    onRemind,
}: {
    settlement: Settlement;
    currentUserId: string;
    fromPhotoURL?: string | null;
    toPhotoURL?: string | null;
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
                    <TouchableOpacity style={styles.markPaidButton} onPress={() => onMarkPaid(settlement.id)}>
                        <Text style={[typographyStyles.labelMedium, styles.markPaidText]}>Mark as Paid</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.remindButton} onPress={() => onRemind(settlement.id)}>
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
    
    const [group, setGroup] = useState<Group | null>(null);
    const [settlements, setSettlements] = useState<Settlement[]>([]);
    const [memberPhotoMap, setMemberPhotoMap] = useState<Record<string, string | null>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [totalAmount, setTotalAmount] = useState(0);
    const [pendingCount, setPendingCount] = useState(0);

    const fetchData = useCallback(async () => {
        if (!groupId) return;
        
        try {
            // Fetch group data
            const groupRef = doc(db, 'groups', groupId);
            const groupSnap = await getDoc(groupRef);
            
            if (groupSnap.exists()) {
                const groupData = { id: groupSnap.id, ...groupSnap.data() } as Group;
                setGroup(groupData);
                const photoMap: Record<string, string | null> = {};
                (groupData.members || []).forEach(m => { photoMap[m.userId] = m.photoURL || null; });
                setMemberPhotoMap(photoMap);
            } else {
                Alert.alert('Error', 'Group not found');
                router.back();
                return;
            }
            
            // Fetch settlements from subcollection
            const settlementsRef = collection(db, 'groups', groupId, 'settlements');
            const q = query(settlementsRef, where('status', '==', 'pending'));
            const settlementsSnap = await getDocs(q);
            const settlementsData = settlementsSnap.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data() 
            }) as Settlement);
            
            setSettlements(settlementsData);
            
            // Calculate totals
            const total = settlementsData.reduce((sum, s) => sum + s.amount, 0);
            setTotalAmount(total);
            setPendingCount(settlementsData.length);
            
        } catch (error) {
            console.error('Error fetching settlements:', error);
            Alert.alert('Error', 'Failed to load settlements');
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, [groupId, router]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    const handleMarkPaid = async (settlementId: string) => {
        Alert.alert(
            'Mark as Paid',
            'Confirm that this payment has been completed?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Confirm',
                    onPress: async () => {
                        try {
                            const settlementRef = doc(db, 'groups', groupId, 'settlements', settlementId);
                            await updateDoc(settlementRef, {
                                status: 'completed',
                                completedAt: new Date(),
                            });
                            
                            // Refresh settlements
                            await fetchData();
                            
                            // Check if all settlements are now completed
                            const remaining = settlements.filter(s => s.id !== settlementId && s.status === 'pending');
                            if (remaining.length === 0) {
                                // Update group isFullySettled
                                const groupRef = doc(db, 'groups', groupId);
                                await updateDoc(groupRef, {
                                    isFullySettled: true,
                                });
                            }
                            
                            Alert.alert('Success', 'Payment marked as completed!');
                        } catch (error) {
                            console.error('Error marking settlement:', error);
                            Alert.alert('Error', 'Failed to mark payment');
                        }
                    }
                }
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
        backgroundColor: colors.primary,
        paddingVertical: spacing.md,
        borderRadius: spacing.borderRadiusFull,
        alignItems: 'center',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
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