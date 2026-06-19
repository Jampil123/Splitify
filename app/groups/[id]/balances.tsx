import { db } from '@/services/firebase/config';
import { useAuthStore } from '@/stores/authStore';
import { colors, spacing, typographyStyles } from '@/styles';
import { Group, Settlement, UserBalance } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

type MemberBalance = UserBalance & { photoURL?: string | null };

function MemberRow({ member, isCurrentUser }: { member: MemberBalance; isCurrentUser: boolean }) {
    const isPositive = member.balance > 0;
    const isNegative = member.balance < 0;
    const sign = isPositive ? '+' : isNegative ? '−' : '';
    const amountColor = isPositive ? '#10B981' : isNegative ? colors.error : colors.outline;
    const label = isPositive ? 'gets back' : isNegative ? 'owes' : 'settled';

    return (
        <View style={s.memberRow}>
            <View style={[s.avatar, isCurrentUser && s.avatarYou, { overflow: 'hidden' }]}>
                {member.photoURL ? (
                    <Image source={{ uri: member.photoURL }} style={s.avatarImg} />
                ) : (
                    <Text style={s.avatarText}>{member.userName.charAt(0).toUpperCase()}</Text>
                )}
            </View>
            <View style={s.memberInfo}>
                <Text style={s.memberName} numberOfLines={1}>
                    {member.userName}{isCurrentUser ? ' (You)' : ''}
                </Text>
                <Text style={s.memberLabel}>{label}</Text>
            </View>
            <Text style={[s.memberAmount, { color: amountColor }]}>
                {sign}₱{Math.abs(member.balance).toFixed(2)}
            </Text>
        </View>
    );
}

function PaymentRow({
    name,
    photoURL,
    amount,
    type,
    onPress,
}: {
    name: string;
    photoURL?: string | null;
    amount: number;
    type: 'owe' | 'receive';
    onPress: () => void;
}) {
    const isOwe = type === 'owe';
    const amountColor = isOwe ? colors.error : '#10B981';
    const rowBg = isOwe ? colors.errorContainer + '40' : colors.primaryFixed + '70';

    return (
        <View style={[s.payRow, { backgroundColor: rowBg }]}>
            <View style={[s.avatar, { backgroundColor: isOwe ? colors.errorContainer : colors.primaryContainer, overflow: 'hidden' }]}>
                {photoURL ? (
                    <Image source={{ uri: photoURL }} style={s.avatarImg} />
                ) : (
                    <Text style={s.avatarText}>{name.charAt(0).toUpperCase()}</Text>
                )}
            </View>
            <View style={s.payInfo}>
                <Text style={s.payLabel}>{isOwe ? 'You pay' : 'Will pay you'}</Text>
                <Text style={s.payName} numberOfLines={1}>{name}</Text>
            </View>
            <View style={s.payRight}>
                <Text style={[s.payAmount, { color: amountColor }]}>
                    {isOwe ? '−' : '+'}₱{amount.toFixed(2)}
                </Text>
                <TouchableOpacity
                    style={[s.payBtn, isOwe ? s.payBtnRed : s.payBtnGreen]}
                    onPress={onPress}
                >
                    <Text style={[s.payBtnText, !isOwe && s.payBtnTextGreen]}>
                        {isOwe ? 'Pay' : 'Request'}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

export default function BalancesScreen() {
    const router = useRouter();
    const { id: groupId } = useLocalSearchParams<{ id: string }>();
    const { user } = useAuthStore();

    const [settlements, setSettlements] = useState<Settlement[]>([]);
    const [balances, setBalances] = useState<MemberBalance[]>([]);
    const [memberPhotoMap, setMemberPhotoMap] = useState<Record<string, string | null>>({});
    const [userBalance, setUserBalance] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeTab, setActiveTab] = useState<'members' | 'mine'>('members');
    const [totalExpenses, setTotalExpenses] = useState(0);
    const [individualShare, setIndividualShare] = useState(0);

    const fetchBalances = useCallback(async () => {
        if (!groupId) return;
        try {
            const groupSnap = await getDoc(doc(db, 'groups', groupId));
            if (!groupSnap.exists()) return;

            const groupData = { id: groupSnap.id, ...groupSnap.data() } as Group;
            setTotalExpenses(groupData.totalExpenses || 0);

            const memberCount = groupData.members.length;
            const share = memberCount > 0 ? (groupData.totalExpenses || 0) / memberCount : 0;
            setIndividualShare(share);

            const photoMap: Record<string, string | null> = {};
            groupData.members.forEach(m => { photoMap[m.userId] = m.photoURL || null; });
            setMemberPhotoMap(photoMap);

            const userBalances: MemberBalance[] = groupData.members.map(m => ({
                userId: m.userId,
                userName: m.fullName,
                photoURL: m.photoURL || null,
                totalPaid: m.totalPaid || 0,
                totalShare: share,
                balance: (m.totalPaid || 0) - share,
            }));
            setBalances(userBalances);
            setUserBalance(userBalances.find(b => b.userId === user?.id)?.balance || 0);

            const settlementsSnap = await getDocs(query(
                collection(db, 'groups', groupId, 'settlements'),
                where('status', '==', 'pending')
            ));
            setSettlements(settlementsSnap.docs.map(d => ({ id: d.id, ...d.data() }) as Settlement));
        } catch (e) {
            console.error('Error fetching balances:', e);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, [groupId, user]);

    useEffect(() => { fetchBalances(); }, [fetchBalances]);

    const onRefresh = () => { setRefreshing(true); fetchBalances(); };
    const goToSettlements = () => router.push({ pathname: '/groups/[id]/settlements', params: { id: groupId } });

    const oweList = settlements.filter(s => s.fromUserId === user?.id);
    const receiveList = settlements.filter(s => s.toUserId === user?.id);

    const isOwed = userBalance > 0;
    const isSettled = userBalance === 0;
    const sign = isOwed ? '+' : isSettled ? '' : '−';
    const balanceColor = isSettled ? colors.outline : isOwed ? '#10B981' : colors.error;
    const heroBg = isSettled ? colors.surfaceContainerLow : isOwed ? '#E8F5E9' : '#FEE2E2';

    if (isLoading) {
        return (
            <View style={s.centered}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={s.container}>
            <StatusBar style="dark" />

            <View style={s.header}>
                <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
                    <Ionicons name="arrow-back-outline" size={24} color={colors.primary} />
                </TouchableOpacity>
                <Text style={[typographyStyles.headlineMedium, s.headerTitle]}>Balances</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={s.scroll}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
            >
                {/* Hero balance */}
                <View style={[s.hero, { backgroundColor: heroBg }]}>
                    <Text style={s.heroLabel}>YOUR BALANCE</Text>
                    <Text style={[s.heroAmount, { color: balanceColor }]}>
                        {sign}₱{Math.abs(userBalance).toFixed(2)}
                    </Text>
                    <Text style={[s.heroStatus, { color: balanceColor }]}>
                        {isSettled ? 'All settled up' : isOwed ? 'You will receive' : 'You will pay'}
                    </Text>
                    <View style={s.heroStats}>
                        <View style={s.heroStat}>
                            <Text style={s.heroStatLabel}>Group Total</Text>
                            <Text style={s.heroStatValue}>₱{totalExpenses.toFixed(2)}</Text>
                        </View>
                        <View style={s.heroStatDivider} />
                        <View style={s.heroStat}>
                            <Text style={s.heroStatLabel}>Per Person</Text>
                            <Text style={s.heroStatValue}>₱{individualShare.toFixed(2)}</Text>
                        </View>
                    </View>
                </View>

                {/* Tabs */}
                <View style={s.tabs}>
                    {(['members', 'mine'] as const).map(t => (
                        <TouchableOpacity
                            key={t}
                            style={[s.tab, activeTab === t && s.tabActive]}
                            onPress={() => setActiveTab(t)}
                        >
                            <Text style={[s.tabText, activeTab === t && s.tabTextActive]}>
                                {t === 'members' ? 'All Members' : 'My Payments'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* All Members */}
                {activeTab === 'members' && (
                    <View style={s.card}>
                        {balances.map(m => (
                            <MemberRow
                                key={m.userId}
                                member={m}
                                isCurrentUser={m.userId === user?.id}
                            />
                        ))}
                        {balances.length === 0 && (
                            <Text style={s.emptyNote}>No members yet</Text>
                        )}
                    </View>
                )}

                {/* My Payments */}
                {activeTab === 'mine' && (
                    <View style={s.paySection}>
                        {oweList.length > 0 && (
                            <View>
                                <Text style={s.sectionLabel}>YOU NEED TO PAY</Text>
                                {oweList.map((settlement, i) => (
                                    <PaymentRow
                                        key={settlement.id || i}
                                        name={settlement.toUserName}
                                        photoURL={memberPhotoMap[settlement.toUserId]}
                                        amount={settlement.amount}
                                        type="owe"
                                        onPress={goToSettlements}
                                    />
                                ))}
                            </View>
                        )}
                        {receiveList.length > 0 && (
                            <View>
                                <Text style={s.sectionLabel}>YOU'LL RECEIVE</Text>
                                {receiveList.map((settlement, i) => (
                                    <PaymentRow
                                        key={settlement.id || i}
                                        name={settlement.fromUserName}
                                        photoURL={memberPhotoMap[settlement.fromUserId]}
                                        amount={settlement.amount}
                                        type="receive"
                                        onPress={goToSettlements}
                                    />
                                ))}
                            </View>
                        )}
                        {oweList.length === 0 && receiveList.length === 0 && (
                            <View style={s.emptyCard}>
                                <Ionicons name="checkmark-circle-outline" size={40} color={colors.success} />
                                <Text style={[typographyStyles.bodyMedium, { color: colors.success, marginTop: 8 }]}>
                                    You're all squared away!
                                </Text>
                                <Text style={[typographyStyles.bodySmall, { color: colors.outline, textAlign: 'center' }]}>
                                    No pending payments for you
                                </Text>
                            </View>
                        )}
                    </View>
                )}

                {/* View Settle Up */}
                <TouchableOpacity style={s.settleBtn} onPress={goToSettlements}>
                    <Ionicons name="wallet-outline" size={18} color={colors.onPrimary} />
                    <Text style={s.settleBtnText}>View Settle Up</Text>
                    <Ionicons name="arrow-forward-outline" size={16} color={colors.onPrimary} />
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
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
    backBtn: { padding: spacing.sm, width: 40 },
    headerTitle: { color: colors.primary, fontSize: 18 },
    scroll: {
        paddingHorizontal: spacing.gutter, paddingBottom: 60,
        paddingTop: spacing.md, gap: spacing.lg,
    },
    // Hero
    hero: {
        borderRadius: spacing.borderRadiusLg, padding: spacing.lg,
        alignItems: 'center', gap: 4,
    },
    heroLabel: {
        fontSize: 11, fontWeight: '600', color: colors.onSurfaceVariant,
        letterSpacing: 1.5, fontFamily: 'Poppins_600SemiBold',
    },
    heroAmount: {
        fontSize: 52, fontWeight: '800', lineHeight: 60,
        fontFamily: 'Poppins_800ExtraBold',
    },
    heroStatus: { fontSize: 13, fontWeight: '600', fontFamily: 'Poppins_600SemiBold', marginBottom: 4 },
    heroStats: {
        flexDirection: 'row', width: '100%', marginTop: spacing.sm,
        backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: spacing.borderRadiusMd,
        paddingVertical: spacing.sm,
    },
    heroStat: { flex: 1, alignItems: 'center' },
    heroStatLabel: { fontSize: 11, color: colors.onSurfaceVariant, fontFamily: 'Poppins_400Regular' },
    heroStatValue: { fontSize: 14, fontWeight: '700', color: colors.onSurface, fontFamily: 'Poppins_700Bold' },
    heroStatDivider: { width: 1, backgroundColor: colors.outlineVariant + '50' },
    // Tabs
    tabs: {
        flexDirection: 'row', backgroundColor: colors.surfaceContainerLow,
        borderRadius: spacing.borderRadiusFull, padding: 4,
    },
    tab: { flex: 1, paddingVertical: spacing.sm, borderRadius: spacing.borderRadiusFull, alignItems: 'center' },
    tabActive: {
        backgroundColor: colors.surface,
        shadowColor: colors.onSurface, shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
    },
    tabText: { fontSize: 13, fontWeight: '500', color: colors.onSurfaceVariant, fontFamily: 'Poppins_500Medium' },
    tabTextActive: { color: colors.primary },
    // Members list
    card: {
        backgroundColor: colors.surfaceContainerLowest, borderRadius: spacing.borderRadiusLg,
        overflow: 'hidden', borderWidth: 1, borderColor: colors.outlineVariant + '40',
    },
    memberRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: spacing.md, paddingVertical: 10, gap: spacing.sm,
        borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.outlineVariant + '40',
    },
    avatar: {
        width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryContainer,
        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    },
    avatarImg: { width: 40, height: 40 },
    avatarYou: { borderWidth: 2, borderColor: colors.primary },
    avatarText: { fontSize: 16, fontWeight: '700', color: colors.onPrimary, fontFamily: 'Poppins_700Bold' },
    memberInfo: { flex: 1 },
    memberName: { fontSize: 14, fontWeight: '600', color: colors.onSurface, fontFamily: 'Poppins_600SemiBold' },
    memberLabel: { fontSize: 12, color: colors.onSurfaceVariant, fontFamily: 'Poppins_400Regular', marginTop: 1 },
    memberAmount: { fontSize: 15, fontWeight: '700', fontFamily: 'Poppins_700Bold', flexShrink: 0 },
    emptyNote: { textAlign: 'center', color: colors.outline, padding: spacing.lg, fontFamily: 'Poppins_400Regular' },
    // My Payments
    paySection: { gap: spacing.md },
    sectionLabel: {
        fontSize: 11, fontWeight: '600', color: colors.onSurfaceVariant,
        letterSpacing: 0.8, marginBottom: 6, fontFamily: 'Poppins_600SemiBold',
    },
    payRow: {
        flexDirection: 'row', alignItems: 'center', borderRadius: spacing.borderRadiusLg,
        padding: spacing.md, gap: spacing.sm, marginBottom: spacing.sm,
    },
    payInfo: { flex: 1 },
    payLabel: { fontSize: 11, color: colors.onSurfaceVariant, fontFamily: 'Poppins_400Regular' },
    payName: { fontSize: 14, fontWeight: '600', color: colors.onSurface, fontFamily: 'Poppins_600SemiBold' },
    payRight: { alignItems: 'flex-end', gap: 4, flexShrink: 0 },
    payAmount: { fontSize: 15, fontWeight: '700', fontFamily: 'Poppins_700Bold' },
    payBtn: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: spacing.borderRadiusFull },
    payBtnRed: { backgroundColor: colors.error },
    payBtnGreen: { borderWidth: 1, borderColor: '#10B981' },
    payBtnText: { fontSize: 11, fontWeight: '600', color: colors.onPrimary, fontFamily: 'Poppins_600SemiBold' },
    payBtnTextGreen: { color: '#10B981' },
    emptyCard: {
        backgroundColor: colors.surfaceContainerLowest, borderRadius: spacing.borderRadiusLg,
        padding: spacing.xl, alignItems: 'center', gap: 4,
    },
    // Bottom button
    settleBtn: {
        flexDirection: 'row', backgroundColor: colors.primary, borderRadius: spacing.borderRadiusFull,
        paddingVertical: spacing.md, paddingHorizontal: spacing.lg,
        alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
        shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
    },
    settleBtnText: { fontSize: 15, fontWeight: '600', color: colors.onPrimary, fontFamily: 'Poppins_600SemiBold' },
});
