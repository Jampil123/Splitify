import { db } from '@/services/firebase/config';
import { useAuthStore } from '@/stores/authStore';
import { colors, spacing, typographyStyles } from '@/styles';
import { Group, GroupMember } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { addDoc, collection, doc, getDoc, serverTimestamp, Timestamp, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface ExpenseData {
    title: string;
    amount: string;
    payerId: string;
    date: Date;
    category: string;
    description: string;
    splitType: 'equal' | 'custom';
}

const categories = [
    { id: 'food', label: 'Food', icon: 'restaurant-outline' },
    { id: 'transport', label: 'Transport', icon: 'car-outline' },
    { id: 'grocery', label: 'Grocery', icon: 'cart-outline' },
    { id: 'bills', label: 'Bills', icon: 'receipt-outline' },
    { id: 'entertainment', label: 'Entertainment', icon: 'game-controller-outline' },
    { id: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' },
];

export default function AddExpenseScreen() {
    const router = useRouter();
    const { id: groupId } = useLocalSearchParams<{ id: string }>();
    const { user } = useAuthStore();
    
    const [group, setGroup] = useState<Group | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    const [expense, setExpense] = useState<ExpenseData>({
        title: '',
        amount: '',
        payerId: user?.id || '',
        date: new Date(),
        category: 'food',
        description: '',
        splitType: 'equal',
    });

    const [selectedPayer, setSelectedPayer] = useState<GroupMember | null>(null);

    // Fetch group data
    useEffect(() => {
        const fetchGroup = async () => {
            if (!groupId) return;
            
            try {
                const groupRef = doc(db, 'groups', groupId);
                const groupSnap = await getDoc(groupRef);
                
                if (groupSnap.exists()) {
                    const groupData = { id: groupSnap.id, ...groupSnap.data() } as Group;
                    setGroup(groupData);
                    
                    // Set default payer as current user
                    const currentUser = groupData.members.find(m => m.userId === user?.id);
                    if (currentUser) {
                        setSelectedPayer(currentUser);
                        setExpense(prev => ({ ...prev, payerId: currentUser.userId }));
                    }
                } else {
                    Alert.alert('Error', 'Group not found');
                    router.back();
                }
            } catch (error) {
                console.error('Error fetching group:', error);
                Alert.alert('Error', 'Failed to load group');
            } finally {
                setIsLoading(false);
            }
        };
        
        fetchGroup();
    }, [groupId, user]);

    const handleAddExpense = async () => {
        // Validate
        if (!expense.title.trim()) {
            Alert.alert('Error', 'Please enter a description');
            return;
        }
        
        const amountNum = parseFloat(expense.amount);
        if (isNaN(amountNum) || amountNum <= 0) {
            Alert.alert('Error', 'Please enter a valid amount');
            return;
        }
        
        if (!expense.payerId) {
            Alert.alert('Error', 'Please select who paid');
            return;
        }

        setIsSaving(true);

        try {
            const groupRef = doc(db, 'groups', groupId);
            const expensesRef = collection(db, 'groups', groupId, 'expenses');
            
            // Get payer name
            const payer = group?.members.find(m => m.userId === expense.payerId);
            
            // Calculate individual share
            const memberCount = group?.members.length || 1;
            const individualShare = amountNum / memberCount;

            const newExpense = {
                groupId,
                title: expense.title.trim(),
                amount: amountNum,
                description: expense.description.trim(),
                payerId: expense.payerId,
                payerName: payer?.fullName || 'Unknown',
                date: Timestamp.fromDate(expense.date),
                createdAt: serverTimestamp(),
                splitType: 'equal',
                individualShare: individualShare,
                category: expense.category,
                receiptImage: null,
                addedBy: user?.id,
                isDeleted: false,
            };

            await addDoc(expensesRef, newExpense);
            
            await updateDoc(groupRef, {
                totalExpenses: (group?.totalExpenses || 0) + amountNum,
                lastActivityAt: serverTimestamp(),
            });

            Alert.alert(
                'Success',
                'Expense added successfully!',
                [{ text: 'OK', onPress: () => router.back() }]
            );
            
        } catch (error: any) {
            console.error('Error adding expense:', error);
            Alert.alert('Error', error.message || 'Failed to add expense');
        } finally {
            setIsSaving(false);
        }
    };

    const selectPayer = (member: GroupMember) => {
        setSelectedPayer(member);
        setExpense(prev => ({ ...prev, payerId: member.userId }));
    };

    const selectCategory = (categoryId: string) => {
        setExpense(prev => ({ ...prev, category: categoryId }));
    };

    const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric' 
        });
    };

    const showPayerSelector = () => {
        if (!group) return;
        
        Alert.alert(
            'Select Payer',
            'Choose who paid for this expense',
            group.members.map(member => ({
                text: member.fullName + (member.userId === user?.id ? ' (You)' : ''),
                onPress: () => selectPayer(member),
            })),
            { cancelable: true }
        );
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView 
            style={styles.container} 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <StatusBar style="dark" />
            
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back-outline" size={24} color={colors.primary} />
                </TouchableOpacity>
                <Text style={[typographyStyles.headlineMedium, styles.headerTitle]}>
                    Add Expense
                </Text>
                <TouchableOpacity 
                    style={styles.saveButton} 
                    onPress={handleAddExpense}
                    disabled={isSaving}
                >
                    {isSaving ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                        <Text style={[typographyStyles.labelMedium, styles.saveText]}>Save</Text>
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                {/* ✅ Description - Full Width */}
                <View style={styles.inputGroup}>
                    <Text style={[typographyStyles.labelMedium, styles.label]}>Description</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="What was it for?"
                        placeholderTextColor={colors.outline}
                        value={expense.title}
                        onChangeText={(text) => setExpense(prev => ({ ...prev, title: text }))}
                    />
                </View>

                {/* ✅ Amount - Full Width */}
                <View style={styles.inputGroup}>
                    <Text style={[typographyStyles.labelMedium, styles.label]}>Amount</Text>
                    <View style={styles.amountInputWrapper}>
                        <Text style={styles.amountPrefix}>₱</Text>
                        <TextInput
                            style={styles.amountInput}
                            placeholder="0.00"
                            placeholderTextColor={colors.outline}
                            value={expense.amount}
                            onChangeText={(text) => setExpense(prev => ({ ...prev, amount: text }))}
                            keyboardType="numeric"
                        />
                    </View>
                </View>

                {/* ✅ Payer - Full Width */}
                <View style={styles.inputGroup}>
                    <Text style={[typographyStyles.labelMedium, styles.label]}>Paid by</Text>
                    <TouchableOpacity style={styles.pickerButton} onPress={showPayerSelector}>
                        <View style={styles.pickerLeft}>
                            <View style={styles.payerAvatar}>
                                <Text style={styles.payerAvatarText}>
                                    {selectedPayer?.fullName?.charAt(0) || 'U'}
                                </Text>
                            </View>
                            <Text style={styles.pickerText} numberOfLines={1}>
                                {selectedPayer?.fullName || 'Select payer'}
                                {selectedPayer?.userId === user?.id && ' (You)'}
                            </Text>
                        </View>
                        <Ionicons name="chevron-down-outline" size={20} color={colors.outline} />
                    </TouchableOpacity>
                </View>

                {/* ✅ Category - Full Width */}
                <View style={styles.inputGroup}>
                    <Text style={[typographyStyles.labelMedium, styles.label]}>Category</Text>
                    <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.categoriesContainer}
                    >
                        {categories.map((cat) => {
                            const isActive = expense.category === cat.id;
                            return (
                                <TouchableOpacity
                                    key={cat.id}
                                    style={[
                                        styles.categoryChip,
                                        isActive && styles.categoryChipActive,
                                    ]}
                                    onPress={() => selectCategory(cat.id)}
                                >
                                    <Ionicons 
                                        name={cat.icon as any} 
                                        size={16} 
                                        color={isActive ? colors.onPrimary : colors.onSurfaceVariant} 
                                    />
                                    <Text style={[
                                        styles.categoryText,
                                        isActive && styles.categoryTextActive,
                                    ]}>
                                        {cat.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>

                {/* ✅ Date - Full Width */}
                <View style={styles.inputGroup}>
                    <Text style={[typographyStyles.labelMedium, styles.label]}>Date</Text>
                    <TouchableOpacity style={styles.pickerButton}>
                        <View style={styles.pickerLeft}>
                            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                            <Text style={styles.pickerDateText}>{formatDate(expense.date)}</Text>
                        </View>
                        <Ionicons name="chevron-down-outline" size={20} color={colors.outline} />
                    </TouchableOpacity>
                </View>

                {/* Split Preview */}
                <View style={styles.splitSection}>
                    <View style={styles.splitHeader}>
                        <Text style={[typographyStyles.labelMedium, styles.label]}>Split Type</Text>
                        <TouchableOpacity>
                            <Text style={[typographyStyles.labelMedium, styles.changeTypeText]}>Change Type</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.splitCard}>
                        <View style={styles.splitCardHeader}>
                            <Text style={[typographyStyles.bodySmall, styles.splitLabel]}>Split Equally</Text>
                            <Ionicons name="information-circle-outline" size={20} color={colors.outline} />
                        </View>
                        {group?.members.map((member) => {
                            const share = parseFloat(expense.amount) / (group.members.length || 1);
                            return (
                                <View key={member.userId} style={styles.splitRow}>
                                    <View style={styles.splitMember}>
                                        <View style={[styles.splitAvatar, { backgroundColor: member.userId === user?.id ? colors.primary : colors.secondary }]}>
                                            <Text style={styles.splitAvatarText}>
                                                {member.fullName.charAt(0)}
                                            </Text>
                                        </View>
                                        <Text style={[typographyStyles.bodySmall, styles.splitName]} numberOfLines={1}>
                                            {member.userId === user?.id ? 'You' : member.fullName.split(' ')[0]}
                                        </Text>
                                    </View>
                                    <Text style={[typographyStyles.bodyMedium, styles.splitAmount]}>
                                        ₱{isNaN(share) ? '0.00' : share.toFixed(2)}
                                    </Text>
                                </View>
                            );
                        })}
                    </View>
                </View>

                {/* Additional Info */}
                <View style={styles.inputGroup}>
                    <Text style={[typographyStyles.labelMedium, styles.label]}>Detailed Description</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Add more details about this expense..."
                        placeholderTextColor={colors.outline}
                        value={expense.description}
                        onChangeText={(text) => setExpense(prev => ({ ...prev, description: text }))}
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                    />
                </View>
            </ScrollView>

            {/* Bottom Button */}
            <View style={styles.bottomContainer}>
                <TouchableOpacity
                    style={[styles.confirmButton, isSaving && styles.confirmButtonDisabled]}
                    onPress={handleAddExpense}
                    disabled={isSaving}
                >
                    {isSaving ? (
                        <ActivityIndicator color={colors.onPrimary} />
                    ) : (
                        <>
                            <Ionicons name="checkmark-circle-outline" size={24} color={colors.onPrimary} />
                            <Text style={[typographyStyles.buttonLarge, styles.confirmText]}>
                                Confirm & Split Expense
                            </Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
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
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.gutter,
        paddingTop: spacing.md,
        paddingBottom: spacing.sm,
        backgroundColor: colors.background,
        borderBottomWidth: 1,
        borderBottomColor: colors.outlineVariant,
    },
    backButton: {
        padding: spacing.sm,
    },
    headerTitle: {
        color: colors.primary,
        fontSize: 18,
    },
    saveButton: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
    },
    saveText: {
        color: colors.primary,
    },
    scrollContent: {
        paddingHorizontal: spacing.gutter,
        paddingBottom: 120,
        gap: spacing.lg,
        paddingTop: spacing.md,
    },
    inputGroup: {
        gap: spacing.xs,
    },
    label: {
        color: colors.onSurfaceVariant,
        marginLeft: spacing.xs,
    },
    input: {
        backgroundColor: colors.surfaceBright,
        borderWidth: 1,
        borderColor: colors.secondaryContainer,
        borderRadius: spacing.borderRadiusLg,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        fontSize: 16,
        fontFamily: 'Inter_400Regular',
        color: colors.onSurface,
    },
    textArea: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    amountInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceBright,
        borderWidth: 1,
        borderColor: colors.secondaryContainer,
        borderRadius: spacing.borderRadiusLg,
    },
    amountPrefix: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.primary,
        paddingLeft: spacing.md,
    },
    amountInput: {
        flex: 1,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        fontSize: 18,
        fontFamily: 'Inter_400Regular',
        color: colors.onSurface,
    },
    pickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.surfaceContainerLowest,
        borderWidth: 1,
        borderColor: colors.secondaryContainer,
        borderRadius: spacing.borderRadiusFull,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
    },
    pickerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        flex: 1,
    },
    payerAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    payerAvatarText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: colors.onPrimary,
    },
    pickerText: {
        fontSize: 14,
        color: colors.onSurface,
        flexShrink: 1,
    },
    pickerDateText: {
        fontSize: 14,
        color: colors.onSurface,
    },
    categoriesContainer: {
        gap: spacing.sm,
        paddingVertical: spacing.xs,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: spacing.borderRadiusFull,
        backgroundColor: colors.secondaryContainer,
    },
    categoryChipActive: {
        backgroundColor: colors.primary,
    },
    categoryText: {
        fontSize: 12,
        fontWeight: '500',
        color: colors.onSurfaceVariant,
    },
    categoryTextActive: {
        color: colors.onPrimary,
    },
    splitSection: {
        gap: spacing.sm,
    },
    splitHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    changeTypeText: {
        color: colors.primary,
    },
    splitCard: {
        backgroundColor: colors.surfaceContainer,
        borderRadius: spacing.borderRadiusLg,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.secondaryContainer,
        gap: spacing.sm,
    },
    splitCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    splitLabel: {
        color: colors.onSurfaceVariant,
    },
    splitRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.surface + '80',
        padding: spacing.sm,
        borderRadius: spacing.borderRadiusLg,
    },
    splitMember: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        flex: 1,
    },
    splitAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    splitAvatarText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: colors.onPrimary,
    },
    splitName: {
        color: colors.onSurface,
        flexShrink: 1,
    },
    splitAmount: {
        color: colors.onSurface,
        fontWeight: '600',
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
        borderTopWidth: 1,
        borderTopColor: colors.secondaryContainer + '30',
    },
    confirmButton: {
        flexDirection: 'row',
        backgroundColor: colors.primaryContainer,
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
    confirmButtonDisabled: {
        opacity: 0.6,
    },
    confirmText: {
        color: colors.OnPrimaryContainer,
        fontSize: 16,
    },
});