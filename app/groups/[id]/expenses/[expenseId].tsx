import { refreshSettlementSuggestions } from '@/services/api/settlements';
import { db } from '@/services/firebase/config';
import { useAuthStore } from '@/stores/authStore';
import { colors, spacing, typographyStyles } from '@/styles';
import { Expense } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { deleteDoc, doc, getDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { useEffect, useRef, useState } from 'react';
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

// Helper function to format date
const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    try {
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        });
    } catch {
        return 'N/A';
    }
};

// Helper function to get category icon
const getCategoryIcon = (category: string): any => {
    const icons: Record<string, any> = {
        food: 'restaurant-outline',
        travel: 'airplane-outline',
        accommodation: 'bed-outline',
        utilities: 'flash-outline',
        shopping: 'bag-outline',
        entertainment: 'game-controller-outline',
        transport: 'car-outline',
        bills: 'receipt-outline',
        other: 'receipt-outline',
    };
    return icons[category] || 'receipt-outline';
};

// Helper function to get category label
const getCategoryLabel = (category: string): string => {
    const labels: Record<string, string> = {
        food: 'Food & Drink',
        travel: 'Travel',
        accommodation: 'Accommodation',
        utilities: 'Utilities',
        shopping: 'Shopping',
        entertainment: 'Entertainment',
        transport: 'Transport',
        bills: 'Bills',
        other: 'Other',
    };
    return labels[category] || 'Other';
};

// Split Breakdown Row Component
function SplitRow({ member, amount, isPayer, paidTotal }: { member: any; amount: number; isPayer: boolean; paidTotal?: number }) {
    const getInitials = (name: string) => name.charAt(0).toUpperCase();

    return (
        <View style={styles.splitRow}>
            <View style={styles.splitRowLeft}>
                <View style={[styles.splitAvatar, isPayer && styles.splitAvatarPayer, { overflow: 'hidden' }]}>
                    {member.photoURL ? (
                        <Image source={{ uri: member.photoURL }} style={styles.splitAvatarImage} />
                    ) : (
                        <Text style={styles.splitAvatarText}>{getInitials(member.fullName)}</Text>
                    )}
                </View>
                <View>
                    <Text style={[typographyStyles.bodyMedium, styles.splitName]}>
                        {member.fullName}
                    </Text>
                    <Text style={[typographyStyles.bodySmall, styles.splitStatus]}>
                        {isPayer ? `Paid ₱${(paidTotal ?? amount).toFixed(2)}` : 'Owes share'}
                    </Text>
                </View>
            </View>
            <Text style={[typographyStyles.bodyMedium, styles.splitAmount]}>
                ₱{amount.toFixed(2)}
            </Text>
        </View>
    );
}

export default function ExpenseDetailsScreen() {
    const router = useRouter();
    const { id: groupId, expenseId } = useLocalSearchParams<{ id: string; expenseId: string }>();
    const { user } = useAuthStore();
    
    const [expense, setExpense] = useState<Expense | null>(null);
    const [groupMembers, setGroupMembers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const membersLoaded = useRef(false);

    useEffect(() => {
        if (!groupId || !expenseId) return;
        setIsLoading(true);

        const expenseRef = doc(db, 'groups', groupId, 'expenses', expenseId);
        const unsub = onSnapshot(expenseRef, async (snap) => {
            if (!snap.exists()) {
                Alert.alert('Error', 'Expense not found');
                router.back();
                return;
            }
            setExpense({ id: snap.id, ...snap.data() } as Expense);

            if (!membersLoaded.current) {
                membersLoaded.current = true;
                const groupSnap = await getDoc(doc(db, 'groups', groupId));
                if (groupSnap.exists()) {
                    setGroupMembers(groupSnap.data().members || []);
                }
            }

            setIsLoading(false);
            setRefreshing(false);
        }, (error) => {
            console.error('Error subscribing to expense:', error);
            Alert.alert('Error', 'Failed to load expense details');
            setIsLoading(false);
        });

        return unsub;
    }, [groupId, expenseId]);

    const onRefresh = () => {
        setRefreshing(true);
        setTimeout(() => setRefreshing(false), 800);
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Expense',
            'Are you sure you want to delete this expense?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const expenseRef = doc(db, 'groups', groupId, 'expenses', expenseId);
                            await deleteDoc(expenseRef);

                            // Update group total expenses
                            const groupRef = doc(db, 'groups', groupId);
                            const groupSnap = await getDoc(groupRef);
                            if (groupSnap.exists()) {
                                const groupData = groupSnap.data();
                                const newTotal = (groupData.totalExpenses || 0) - (expense?.amount || 0);
                                await updateDoc(groupRef, { totalExpenses: newTotal });
                            }

                            await refreshSettlementSuggestions(groupId);
                            Alert.alert('Success', 'Expense deleted successfully');
                            router.back();
                        } catch (error) {
                            console.error('Error deleting expense:', error);
                            Alert.alert('Error', 'Failed to delete expense');
                        }
                    }
                }
            ]
        );
    };

    const handleEdit = () => {
        router.push({
            pathname: '/groups/[id]/expenses/expenseId/edit',
            params: { id: groupId, expenseId: expenseId }
        });
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!expense) {
        return (
            <View style={styles.loadingContainer}>
                <Text style={[typographyStyles.bodyMedium, styles.errorText]}>Expense not found</Text>
            </View>
        );
    }

    // Calculate split amounts
    const memberCount = groupMembers.length || 1;
    const equalShare = expense.amount / memberCount;

    // Find payer details
    const payer = groupMembers.find((m: any) => m.userId === expense.payerId);
    const isPayer = payer?.userId === user?.id;

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back-outline" size={24} color={colors.primary} />
                </TouchableOpacity>
                <Text style={[typographyStyles.headlineMedium, styles.headerTitle]}>
                    Expense Details
                </Text>
                <TouchableOpacity style={styles.menuButton}>
                    <Ionicons name="ellipsis-vertical" size={24} color={colors.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
                }
            >
                {/* Hero Card */}
                <View style={styles.heroCard}>
                    <View style={styles.heroIcon}>
                        <Ionicons name={getCategoryIcon(expense.category || 'other')} size={32} color={colors.onPrimary} />
                    </View>
                    <Text style={[typographyStyles.headlineMedium, styles.heroTitle]}>
                        {expense.title}
                    </Text>
                    <Text style={styles.heroAmount}>₱{expense.amount.toFixed(2)}</Text>
                    <View style={styles.heroStatus}>
                        <Text style={[typographyStyles.labelMedium, styles.heroStatusText]}>
                            {expense.isDeleted ? 'Deleted' : 'Active'}
                        </Text>
                    </View>
                </View>

                {/* Info Grid */}
                <View style={styles.infoGrid}>
                    <View style={styles.infoItem}>
                        <Text style={[typographyStyles.labelMedium, styles.infoLabel]}>Paid By</Text>
                        <View style={styles.infoValue}>
                            <View style={styles.infoAvatar}>
                                <Text style={styles.infoAvatarText}>
                                    {payer?.fullName?.charAt(0) || '?'}
                                </Text>
                            </View>
                            <Text style={[typographyStyles.bodyMedium, styles.infoText]}>
                                {payer?.fullName || 'Unknown'} {isPayer && '(You)'}
                            </Text>
                        </View>
                    </View>
                    <View style={styles.infoItem}>
                        <Text style={[typographyStyles.labelMedium, styles.infoLabel]}>Date</Text>
                        <Text style={[typographyStyles.bodyMedium, styles.infoText]}>
                            {formatDate(expense.date)}
                        </Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Text style={[typographyStyles.labelMedium, styles.infoLabel]}>Category</Text>
                        <Text style={[typographyStyles.bodyMedium, styles.infoText]}>
                            {getCategoryLabel(expense.category || 'other')}
                        </Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Text style={[typographyStyles.labelMedium, styles.infoLabel]}>Split Type</Text>
                        <Text style={[typographyStyles.bodyMedium, styles.infoText]}>
                            {expense.splitType === 'equal' ? 'Equally' : 'Custom'}
                        </Text>
                    </View>
                </View>

                {/* Split Breakdown */}
                <View style={styles.splitSection}>
                    <View style={styles.splitSectionHeader}>
                        <Text style={[typographyStyles.headlineSmall, styles.sectionTitle]}>
                            Split Breakdown
                        </Text>
                        <View style={[styles.splitTypeBadge, expense.splitType === 'custom' && styles.splitTypeBadgeCustom]}>
                            <Ionicons
                                name={expense.splitType === 'custom' ? 'options-outline' : 'git-branch-outline'}
                                size={11}
                                color={expense.splitType === 'custom' ? colors.primary : colors.onSurfaceVariant}
                            />
                            <Text style={[styles.splitTypeBadgeText, expense.splitType === 'custom' && styles.splitTypeBadgeTextCustom]}>
                                {expense.splitType === 'custom' ? 'Custom' : 'Equal'}
                            </Text>
                        </View>
                    </View>
                    {groupMembers.map((member: any) => {
                        const isThisPayer = member.userId === expense.payerId;
                        const splitsMap = expense.splits as Record<string, number> | null | undefined;
                        const hasCustomSplits =
                            expense.splitType === 'custom' &&
                            splitsMap != null &&
                            typeof splitsMap === 'object' &&
                            Object.keys(splitsMap).length > 0;
                        const memberShare = hasCustomSplits
                            ? (splitsMap![member.userId] ?? equalShare)
                            : equalShare;
                        return (
                            <SplitRow
                                key={member.userId}
                                member={member}
                                amount={memberShare}
                                isPayer={isThisPayer}
                                paidTotal={isThisPayer ? expense.amount : undefined}
                            />
                        );
                    })}
                </View>

                {/* Notes Section */}
                {expense.description && (
                    <View style={styles.notesSection}>
                        <Text style={[typographyStyles.headlineSmall, styles.sectionTitle]}>
                            Notes
                        </Text>
                        <View style={styles.notesCard}>
                            <Text style={[typographyStyles.bodyMedium, styles.notesText]}>
                                {expense.description}
                            </Text>
                        </View>
                    </View>
                )}

                {/* Receipt Section */}
                {expense.receiptImage && (
                    <View style={styles.receiptSection}>
                        <Text style={[typographyStyles.headlineSmall, styles.sectionTitle]}>
                            Receipt
                        </Text>
                        <TouchableOpacity style={styles.receiptCard} activeOpacity={0.8}>
                            <Image source={{ uri: expense.receiptImage }} style={styles.receiptImage} />
                            <View style={styles.receiptOverlay}>
                                <Ionicons name="search-outline" size={32} color={colors.onSurface} />
                            </View>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>

            {/* Bottom Actions */}
            <View style={styles.bottomContainer}>
                <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                    <Ionicons name="trash-outline" size={20} color={colors.onSurface} />
                    <Text style={[typographyStyles.buttonMedium, styles.deleteButtonText]}>
                        Delete
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
                    <Ionicons name="create-outline" size={20} color={colors.onPrimary} />
                    <Text style={[typographyStyles.buttonMedium, styles.editButtonText]}>
                        Edit Expense
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
    errorText: {
        color: colors.error,
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
    menuButton: {
        padding: spacing.sm,
    },
    scrollContent: {
        paddingHorizontal: spacing.gutter,
        paddingBottom: 120,
        gap: spacing.lg,
        paddingTop: spacing.md,
    },
    // Hero Card
    heroCard: {
        backgroundColor: colors.secondaryContainer,
        borderRadius: spacing.borderRadiusLg,
        padding: spacing.lg,
        alignItems: 'center',
    },
    heroIcon: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    heroTitle: {
        color: colors.onSurface,
        textAlign: 'center',
        marginBottom: spacing.xs,
    },
    heroAmount: {
        fontSize: 32,
        fontWeight: 'bold',
        color: colors.primary,
    },
    heroStatus: {
        marginTop: spacing.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        backgroundColor: colors.primaryContainer,
        borderRadius: spacing.borderRadiusFull,
    },
    heroStatusText: {
        color: colors.OnPrimaryContainer,
        textTransform: 'uppercase',
    },
    // Info Grid
    infoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.md,
    },
    infoItem: {
        flex: 1,
        minWidth: '45%',
        backgroundColor: colors.secondaryContainer,
        padding: spacing.md,
        borderRadius: spacing.borderRadiusLg,
        gap: spacing.xs,
    },
    infoLabel: {
        color: colors.onSurfaceVariant,
    },
    infoValue: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    infoAvatar: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoAvatarText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: colors.onPrimary,
    },
    infoText: {
        color: colors.onSurface,
    },
    // Split Section
    splitSection: {
        gap: spacing.sm,
    },
    splitSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.sm,
    },
    splitTypeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: spacing.borderRadiusFull,
        backgroundColor: colors.surfaceContainer,
        borderWidth: 1,
        borderColor: colors.outlineVariant,
    },
    splitTypeBadgeCustom: {
        backgroundColor: colors.primaryContainer,
        borderColor: colors.primary + '40',
    },
    splitTypeBadgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.onSurfaceVariant,
        fontFamily: 'Poppins_600SemiBold',
    },
    splitTypeBadgeTextCustom: {
        color: colors.primary,
    },
    sectionTitle: {
        color: colors.onSurface,
        marginBottom: 0,
    },
    splitRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderRadius: spacing.borderRadiusLg,
        borderWidth: 1,
        borderColor: colors.outlineVariant,
    },
    splitRowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        flex: 1,
    },
    splitAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.secondaryContainer,
        alignItems: 'center',
        justifyContent: 'center',
    },
    splitAvatarPayer: {
        borderWidth: 2,
        borderColor: colors.primary,
    },
    splitAvatarImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    splitAvatarText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.onSurface,
    },
    splitName: {
        color: colors.onSurface,
        fontWeight: '600',
    },
    splitStatus: {
        color: colors.onSurfaceVariant,
    },
    splitAmount: {
        color: colors.onSurface,
        fontWeight: '600',
    },
    // Notes Section
    notesSection: {
        gap: spacing.sm,
    },
    notesCard: {
        backgroundColor: colors.secondaryContainer,
        padding: spacing.md,
        borderRadius: spacing.borderRadiusLg,
    },
    notesText: {
        color: colors.onSurface,
        lineHeight: 24,
    },
    // Receipt Section
    receiptSection: {
        gap: spacing.sm,
    },
    receiptCard: {
        borderRadius: spacing.borderRadiusLg,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: colors.outlineVariant,
        borderStyle: 'dashed',
        position: 'relative',
    },
    receiptImage: {
        width: '100%',
        height: 192,
        opacity: 0.8,
    },
    receiptOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    // Bottom Actions
    bottomContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        padding: spacing.md,
        paddingBottom: spacing.lg,
        backgroundColor: colors.surface + 'E6',
        borderTopWidth: 1,
        borderTopColor: colors.outlineVariant,
        gap: spacing.md,
    },
    deleteButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.md,
        borderRadius: spacing.borderRadiusFull,
        borderWidth: 1,
        borderColor: colors.primary,
        gap: spacing.sm,
    },
    deleteButtonText: {
        color: colors.onSurface,
    },
    editButton: {
        flex: 2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.md,
        borderRadius: spacing.borderRadiusFull,
        backgroundColor: colors.primary,
        gap: spacing.sm,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    editButtonText: {
        color: colors.onPrimary,
    },
});