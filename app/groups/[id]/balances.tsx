import { db } from '@/services/firebase/config';
import { useAuthStore } from '@/stores/authStore';
import { colors, spacing, typographyStyles } from '@/styles';
import { Group, UserBalance } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { doc, getDoc } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

// Member Balance Card Component
function MemberBalanceCard({ 
    member, 
    isCurrentUser,
    onPress,
}: { 
    member: UserBalance; 
    isCurrentUser: boolean;
    onPress?: () => void;
}) {
    const isOwed = member.balance > 0;
    const isOwes = member.balance < 0;
    const isSettled = member.balance === 0;
    
    const statusText = isSettled ? 'SETTLED' : (isOwed ? 'GETS BACK' : 'OWES');
    const statusColor = isSettled ? colors.outline : (isOwed ? colors.primary : colors.error);
    const amountColor = isSettled ? colors.outline : (isOwed ? colors.primary : colors.error);

    const getInitials = (name: string) => {
        return name.charAt(0).toUpperCase();
    };

    return (
        <TouchableOpacity 
            style={styles.memberCard}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={styles.memberLeft}>
                <View style={[styles.memberAvatar, isCurrentUser && styles.currentUserAvatar]}>
                    <Text style={styles.memberAvatarText}>{getInitials(member.userName)}</Text>
                </View>
                <View>
                    <Text style={[typographyStyles.bodyMedium, styles.memberName]}>
                        {member.userName} {isCurrentUser && '(You)'}
                    </Text>
                    <Text style={[typographyStyles.bodySmall, styles.memberDetails]}>
                        Paid: ₱{member.totalPaid.toFixed(2)} • Share: ₱{member.totalShare.toFixed(2)}
                    </Text>
                </View>
            </View>
            <View style={styles.memberRight}>
                <Text style={[typographyStyles.labelMedium, styles.statusText, { color: statusColor }]}>
                    {statusText}
                </Text>
                <Text style={[typographyStyles.bodyLarge, styles.amountText, { color: amountColor }]}>
                    ₱{Math.abs(member.balance).toFixed(2)}
                </Text>
            </View>
        </TouchableOpacity>
    );
}

// Payment Card Component (Detailed View)
function PaymentCard({
    fromUser,
    toUser,
    amount,
    type,
    onAction,
}: {
    fromUser: string;
    toUser: string;
    amount: number;
    type: 'owe' | 'receive';
    onAction?: () => void;
}) {
    const isOwe = type === 'owe';
    const iconColor = isOwe ? colors.error : colors.primary;
    const bgColor = isOwe ? colors.errorContainer : colors.primaryFixed;

    return (
        <View style={styles.paymentCard}>
            <View style={styles.paymentLeft}>
                <View style={[styles.paymentIcon, { backgroundColor: bgColor }]}>
                    <Ionicons name="person-outline" size={20} color={iconColor} />
                </View>
                <View>
                    <Text style={[typographyStyles.bodySmall, styles.paymentText]}>
                        {isOwe ? 'You owe' : ''} <Text style={styles.paymentName}>{toUser}</Text>
                    </Text>
                    <Text style={[typographyStyles.headlineMedium, styles.paymentAmount, { color: iconColor }]}>
                        ₱{amount.toFixed(2)}
                    </Text>
                </View>
            </View>
            <TouchableOpacity 
                style={[styles.paymentButton, isOwe ? styles.payButton : styles.requestButton]}
                onPress={onAction}
            >
                <Text style={[typographyStyles.labelMedium, styles.paymentButtonText]}>
                    {isOwe ? 'Pay Now' : 'Request Payment'}
                </Text>
            </TouchableOpacity>
        </View>
    );
}

export default function BalancesScreen() {
    const router = useRouter();
    const { id: groupId } = useLocalSearchParams<{ id: string }>();
    const { user } = useAuthStore();
    
    const [group, setGroup] = useState<Group | null>(null);
    const [balances, setBalances] = useState<UserBalance[]>([]);
    const [userBalance, setUserBalance] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<'summary' | 'detailed'>('summary');
    const [totalExpenses, setTotalExpenses] = useState(0);
    const [individualShare, setIndividualShare] = useState(0);

    const fetchBalances = useCallback(async () => {
        if (!groupId) return;
        
        try {
            const groupRef = doc(db, 'groups', groupId);
            const groupSnap = await getDoc(groupRef);
            
            if (groupSnap.exists()) {
                const groupData = { id: groupSnap.id, ...groupSnap.data() } as Group;
                setGroup(groupData);
                setTotalExpenses(groupData.totalExpenses || 0);
                
                // Calculate balances
                const memberCount = groupData.members.length;
                const share = memberCount > 0 ? (groupData.totalExpenses || 0) / memberCount : 0;
                setIndividualShare(share);
                
                const userBalances: UserBalance[] = groupData.members.map(member => ({
                    userId: member.userId,
                    userName: member.fullName,
                    totalPaid: member.totalPaid || 0,
                    totalShare: share,
                    balance: (member.totalPaid || 0) - share,
                }));
                
                setBalances(userBalances);
                
                // Find current user's balance
                const currentUserBalance = userBalances.find(b => b.userId === user?.id);
                setUserBalance(currentUserBalance?.balance || 0);
            } else {
                Alert.alert('Error', 'Group not found');
                router.back();
            }
        } catch (error) {
            console.error('Error fetching balances:', error);
            Alert.alert('Error', 'Failed to load balances');
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, [groupId, user]);

    useEffect(() => {
        fetchBalances();
    }, [fetchBalances]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchBalances();
    };

    const handleViewSettlements = () => {
        router.push({
            pathname: '/groups/[id]/settlements',
            params: { id: groupId }
        });
    };

    const handleExportBalances = () => {
        Alert.alert('Export', 'Export balances feature coming soon');
    };

    const handlePayNow = (toUser: string, amount: number) => {
        Alert.alert(
            'Pay Now',
            `Pay ₱${amount.toFixed(2)} to ${toUser}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Pay', onPress: () => {
                    Alert.alert('Success', 'Payment request sent!');
                }}
            ]
        );
    };

    const handleRequestPayment = (fromUser: string, amount: number) => {
        Alert.alert(
            'Request Payment',
            `Request ₱${amount.toFixed(2)} from ${fromUser}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Request', onPress: () => {
                    Alert.alert('Success', 'Payment request sent!');
                }}
            ]
        );
    };

    const isOwed = userBalance > 0;
    const isOwes = userBalance < 0;
    const isSettled = userBalance === 0;
    
    const balanceText = isSettled ? 'Settled' : (isOwed ? 'You Get Back' : 'You Owe');
    const balanceColor = isSettled ? colors.outline : (isOwed ? colors.primary : colors.error);
    const balanceBg = isSettled ? colors.surfaceContainer : (isOwed ? '#E8F5E9' : '#FEE2E2');

    // Get owe and receive lists for detailed view
    const oweList = balances
        .filter(b => b.balance < 0 && b.userId !== user?.id)
        .map(b => ({
            fromUser: b.userName,
            toUser: user?.fullName || 'You',
            amount: Math.abs(b.balance),
        }));

    const receiveList = balances
        .filter(b => b.balance > 0 && b.userId !== user?.id)
        .map(b => ({
            fromUser: user?.fullName || 'You',
            toUser: b.userName,
            amount: b.balance,
        }));

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
                    Balances
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
                {/* Summary Card */}
                <View style={styles.summaryCard}>
                    <Text style={[typographyStyles.labelMedium, styles.summaryLabel]}>Group Snapshot</Text>
                    <Text style={styles.summaryTotal}>Total Expenses: ₱{totalExpenses.toFixed(2)}</Text>
                    <View style={styles.summaryDivider} />
                    <Text style={styles.summaryShare}>Each person pays: ₱{individualShare.toFixed(2)}</Text>
                </View>

                {/* Personal Balance Card */}
                <View style={[styles.personalCard, { backgroundColor: balanceBg }]}>
                    <View>
                        <Text style={[typographyStyles.labelMedium, styles.personalLabel, { color: balanceColor }]}>
                            {balanceText}
                        </Text>
                        <Text style={[typographyStyles.headlineMedium, styles.personalAmount, { color: balanceColor }]}>
                            ₱{Math.abs(userBalance).toFixed(2)}
                        </Text>
                    </View>
                    {!isSettled && (
                        <View style={styles.personalBadge}>
                            <Text style={[typographyStyles.labelMedium, styles.personalBadgeText, { color: balanceColor }]}>
                                {isOwed ? 'From ' : 'To '}
                                {isOwed ? receiveList.length : oweList.length} person{isOwed ? receiveList.length !== 1 ? 's' : '' : oweList.length !== 1 ? 's' : ''}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Tab Toggle */}
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'summary' && styles.tabActive]}
                        onPress={() => setActiveTab('summary')}
                    >
                        <Text style={[typographyStyles.labelMedium, styles.tabText, activeTab === 'summary' && styles.tabTextActive]}>
                            Summary View
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'detailed' && styles.tabActive]}
                        onPress={() => setActiveTab('detailed')}
                    >
                        <Text style={[typographyStyles.labelMedium, styles.tabText, activeTab === 'detailed' && styles.tabTextActive]}>
                            Detailed View
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Summary View */}
                {activeTab === 'summary' && (
                    <View style={styles.summaryContent}>
                        {balances.map((member) => (
                            <MemberBalanceCard
                                key={member.userId}
                                member={member}
                                isCurrentUser={member.userId === user?.id}
                            />
                        ))}
                    </View>
                )}

                {/* Detailed View */}
                {activeTab === 'detailed' && (
                    <View style={styles.detailedContent}>
                        {/* Payments to Make */}
                        {oweList.length > 0 && (
                            <View style={styles.paymentSection}>
                                <Text style={[typographyStyles.labelMedium, styles.paymentSectionTitle]}>
                                    Payments to Make
                                </Text>
                                {oweList.map((item, index) => (
                                    <PaymentCard
                                        key={index}
                                        fromUser={item.fromUser}
                                        toUser={item.toUser}
                                        amount={item.amount}
                                        type="owe"
                                        onAction={() => handlePayNow(item.toUser, item.amount)}
                                    />
                                ))}
                            </View>
                        )}

                        {/* Payments to Receive */}
                        {receiveList.length > 0 && (
                            <View style={styles.paymentSection}>
                                <Text style={[typographyStyles.labelMedium, styles.paymentSectionTitle]}>
                                    Payments to Receive
                                </Text>
                                {receiveList.map((item, index) => (
                                    <PaymentCard
                                        key={index}
                                        fromUser={item.fromUser}
                                        toUser={item.toUser}
                                        amount={item.amount}
                                        type="receive"
                                        onAction={() => handleRequestPayment(item.fromUser, item.amount)}
                                    />
                                ))}
                            </View>
                        )}

                        {oweList.length === 0 && receiveList.length === 0 && (
                            <View style={styles.settledContainer}>
                                <Ionicons name="checkmark-circle-outline" size={48} color={colors.success} />
                                <Text style={[typographyStyles.bodyMedium, styles.settledText]}>
                                    All settled up! 🎉
                                </Text>
                                <Text style={[typographyStyles.bodySmall, styles.settledSubtext]}>
                                    Everyone is paid up in this group
                                </Text>
                            </View>
                        )}
                    </View>
                )}
            </ScrollView>

            {/* Bottom Actions */}
            <View style={styles.bottomContainer}>
                <TouchableOpacity style={styles.primaryButton} onPress={handleViewSettlements}>
                    <Ionicons name="mic-outline" size={20} color={colors.onPrimary} />
                    <Text style={[typographyStyles.buttonLarge, styles.primaryButtonText]}>
                        View Settlement Suggestions
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryButton} onPress={handleExportBalances}>
                    <Ionicons name="download-outline" size={20} color={colors.primary} />
                    <Text style={[typographyStyles.buttonMedium, styles.secondaryButtonText]}>
                        Export Balances
                    </Text>
                </TouchableOpacity>
            </View>
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
        paddingBottom: 160,
        gap: spacing.lg,
        paddingTop: spacing.md,
    },
    summaryCard: {
        backgroundColor: colors.secondaryFixed,
        borderRadius: spacing.borderRadiusLg,
        padding: spacing.lg,
        alignItems: 'center',
        shadowColor: colors.onSurface,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    summaryLabel: {
        color: colors.secondary,
        marginBottom: 4,
    },
    summaryTotal: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#2A3E4B',
        marginBottom: 4,
    },
    summaryDivider: {
        width: '100%',
        height: 1,
        backgroundColor: colors.primaryContainer + '20',
        marginVertical: spacing.sm,
    },
    summaryShare: {
        fontSize: 18,
        fontWeight: '600',
        color: '#2A3E4B',
    },
    personalCard: {
        borderRadius: spacing.borderRadiusLg,
        padding: spacing.md,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderLeftWidth: 4,
        borderLeftColor: colors.error,
    },
    personalLabel: {
        color: colors.error,
    },
    personalAmount: {
        fontSize: 24,
        color: colors.error,
    },
    personalBadge: {
        backgroundColor: 'transparent',
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: spacing.borderRadiusFull,
    },
    personalBadgeText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: colors.error,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: colors.surfaceContainerLow,
        borderRadius: spacing.borderRadiusFull,
        padding: 4,
    },
    tab: {
        flex: 1,
        paddingVertical: spacing.sm,
        borderRadius: spacing.borderRadiusFull,
        alignItems: 'center',
    },
    tabActive: {
        backgroundColor: colors.surface,
        shadowColor: colors.onSurface,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    tabText: {
        color: colors.onSurfaceVariant,
    },
    tabTextActive: {
        color: colors.primary,
    },
    summaryContent: {
        gap: spacing.md,
    },
    memberCard: {
        backgroundColor: colors.surfaceContainerLowest,
        borderRadius: spacing.borderRadiusLg,
        padding: spacing.md,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.outlineVariant + '50',
        shadowColor: colors.onSurface,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    memberLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        flex: 1,
    },
    memberAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.primaryContainer,
        alignItems: 'center',
        justifyContent: 'center',
    },
    currentUserAvatar: {
        borderWidth: 2,
        borderColor: colors.primary,
    },
    memberAvatarText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.onPrimary,
    },
    memberName: {
        color: colors.onSurface,
        fontWeight: 'bold',
    },
    memberDetails: {
        color: colors.onSurfaceVariant,
    },
    memberRight: {
        alignItems: 'flex-end',
    },
    statusText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    amountText: {
        fontWeight: 'bold',
    },
    detailedContent: {
        gap: spacing.lg,
    },
    paymentSection: {
        gap: spacing.sm,
    },
    paymentSectionTitle: {
        color: colors.onSurfaceVariant,
        textTransform: 'uppercase',
        marginLeft: spacing.xs,
    },
    paymentCard: {
        backgroundColor: colors.surfaceContainerLowest,
        borderRadius: spacing.borderRadiusLg,
        padding: spacing.md,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.errorContainer + '50',
        shadowColor: colors.onSurface,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    paymentLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    paymentIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    paymentText: {
        color: colors.onSurface,
    },
    paymentName: {
        fontWeight: 'bold',
    },
    paymentAmount: {
        fontSize: 20,
    },
    paymentButton: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: spacing.borderRadiusFull,
    },
    payButton: {
        backgroundColor: colors.primary,
    },
    requestButton: {
        borderWidth: 1,
        borderColor: colors.primary,
    },
    paymentButtonText: {
        color: colors.onPrimary,
    },
    bottomContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: spacing.gutter,
        paddingBottom: spacing.lg,
        paddingTop: spacing.md,
        backgroundColor: colors.background + 'CC',
        gap: spacing.sm,
    },
    primaryButton: {
        flexDirection: 'row',
        backgroundColor: colors.primary,
        borderRadius: spacing.borderRadiusFull,
        height: 56,
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
    },
    secondaryButton: {
        flexDirection: 'row',
        borderWidth: 1,
        borderColor: colors.primary,
        borderRadius: spacing.borderRadiusFull,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
    },
    secondaryButtonText: {
        color: colors.primary,
    },
    settledContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xl,
        gap: spacing.sm,
    },
    settledText: {
        color: colors.success,
        marginTop: spacing.sm,
    },
    settledSubtext: {
        color: colors.outline,
    },
});