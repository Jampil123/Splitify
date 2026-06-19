import { db } from '@/services/firebase/config';
import { refreshSettlementSuggestions } from '@/services/api/settlements';
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
    Image,
    KeyboardAvoidingView,
    Modal,
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
    const [showDateModal, setShowDateModal] = useState(false);
    const [showPayerModal, setShowPayerModal] = useState(false);
    const [dateInputText, setDateInputText] = useState('');
    const [customSplits, setCustomSplits] = useState<Record<string, string>>({});

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
                    
                    // Set default payer and inherit group's split type
                    const currentUser = groupData.members.find(m => m.userId === user?.id);
                    if (currentUser) {
                        setSelectedPayer(currentUser);
                        setExpense(prev => ({
                            ...prev,
                            payerId: currentUser.userId,
                            splitType: groupData.splitType || 'equal',
                        }));
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

    // Computed split values (used in JSX and validation)
    const splitAmountNum = parseFloat(expense.amount) || 0;
    const totalAssigned = Object.values(customSplits).reduce((sum, v) => sum + (parseFloat(v) || 0), 0);
    const remaining = splitAmountNum - totalAssigned;
    const isCustomBalanced = Math.abs(remaining) < 0.01;

    const distributeRemaining = () => {
        if (!group || remaining <= 0.01) return;
        const unset = group.members.filter(
            m => !customSplits[m.userId] || parseFloat(customSplits[m.userId] || '0') === 0
        );
        if (unset.length === 0) return;
        const share = remaining / unset.length;
        setCustomSplits(prev => {
            const next = { ...prev };
            unset.forEach(m => { next[m.userId] = share.toFixed(2); });
            return next;
        });
    };

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

        if (expense.splitType === 'custom') {
            if (!isCustomBalanced) {
                Alert.alert(
                    'Split Error',
                    remaining > 0
                        ? `₱${remaining.toFixed(2)} still needs to be assigned`
                        : `You've assigned ₱${Math.abs(remaining).toFixed(2)} over the total`
                );
                return;
            }
        }

        setIsSaving(true);

        try {
            const groupRef = doc(db, 'groups', groupId);
            const expensesRef = collection(db, 'groups', groupId, 'expenses');

            const payer = group?.members.find(m => m.userId === expense.payerId);
            const memberCount = group?.members.length || 1;

            const splits = expense.splitType === 'custom'
                ? Object.fromEntries(
                    (group?.members || []).map(m => [m.userId, parseFloat(customSplits[m.userId] || '0') || 0])
                  )
                : null;

            const newExpense = {
                groupId,
                title: expense.title.trim(),
                amount: amountNum,
                description: expense.description.trim(),
                payerId: expense.payerId,
                payerName: payer?.fullName || 'Unknown',
                date: Timestamp.fromDate(expense.date),
                createdAt: serverTimestamp(),
                splitType: expense.splitType,
                individualShare: expense.splitType === 'equal' ? amountNum / memberCount : null,
                splits,
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

            await refreshSettlementSuggestions(groupId);

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

    const handleDateConfirm = () => {
        const parsed = new Date(dateInputText);
        if (isNaN(parsed.getTime())) {
            Alert.alert('Invalid Date', 'Please enter a valid date in YYYY-MM-DD format');
            return;
        }
        setExpense(prev => ({ ...prev, date: parsed }));
        setShowDateModal(false);
        setDateInputText('');
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
                    <TouchableOpacity style={styles.pickerButton} onPress={() => setShowPayerModal(true)}>
                        <View style={styles.pickerLeft}>
                            <View style={[styles.payerAvatar, { overflow: 'hidden' }]}>
                                {selectedPayer?.photoURL ? (
                                    <Image source={{ uri: selectedPayer.photoURL }} style={styles.payerAvatarImg} />
                                ) : (
                                    <Text style={styles.payerAvatarText}>
                                        {selectedPayer?.fullName?.charAt(0) || 'U'}
                                    </Text>
                                )}
                            </View>
                            <Text style={styles.pickerText} numberOfLines={1}>
                                {selectedPayer
                                    ? (selectedPayer.userId === user?.id ? 'You' : selectedPayer.fullName)
                                    : 'Select payer'}
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
                    <TouchableOpacity style={styles.pickerButton} onPress={() => {
                        setDateInputText('');
                        setShowDateModal(true);
                    }}>
                        <View style={styles.pickerLeft}>
                            <Ionicons name="calendar-outline" size={20} color={colors.primary} />
                            <Text style={styles.pickerDateText}>{formatDate(expense.date)}</Text>
                        </View>
                        <Ionicons name="chevron-down-outline" size={20} color={colors.outline} />
                    </TouchableOpacity>
                </View>

                {/* Split Section */}
                <View style={styles.splitSection}>
                    <Text style={[typographyStyles.labelMedium, styles.label]}>Split</Text>

                    {/* Type Toggle */}
                    <View style={styles.splitToggle}>
                        <TouchableOpacity
                            style={[styles.splitToggleBtn, expense.splitType === 'equal' && styles.splitToggleBtnActive]}
                            onPress={() => setExpense(prev => ({ ...prev, splitType: 'equal' }))}
                        >
                            <Ionicons name="git-branch-outline" size={14} color={expense.splitType === 'equal' ? colors.onPrimary : colors.onSurfaceVariant} />
                            <Text style={[styles.splitToggleBtnText, expense.splitType === 'equal' && styles.splitToggleBtnTextActive]}>Equal</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.splitToggleBtn, expense.splitType === 'custom' && styles.splitToggleBtnActive]}
                            onPress={() => setExpense(prev => ({ ...prev, splitType: 'custom' }))}
                        >
                            <Ionicons name="options-outline" size={14} color={expense.splitType === 'custom' ? colors.onPrimary : colors.onSurfaceVariant} />
                            <Text style={[styles.splitToggleBtnText, expense.splitType === 'custom' && styles.splitToggleBtnTextActive]}>Custom</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.splitCard}>
                        {/* Equal Split Preview */}
                        {expense.splitType === 'equal' && (
                            <>
                                <View style={styles.splitCardHeader}>
                                    <Text style={[typographyStyles.bodySmall, styles.splitLabel]}>Divided equally</Text>
                                    <Text style={styles.splitLabelAmount}>
                                        ₱{splitAmountNum > 0 ? (splitAmountNum / (group?.members.length || 1)).toFixed(2) : '0.00'} each
                                    </Text>
                                </View>
                                {group?.members.map((member) => {
                                    const share = splitAmountNum / (group.members.length || 1);
                                    return (
                                        <View key={member.userId} style={styles.splitRow}>
                                            <View style={styles.splitMember}>
                                                <View style={[styles.splitAvatar, { backgroundColor: member.userId === user?.id ? colors.primary : colors.secondary }]}>
                                                    <Text style={styles.splitAvatarText}>{member.fullName.charAt(0)}</Text>
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
                            </>
                        )}

                        {/* Custom Split */}
                        {expense.splitType === 'custom' && (
                            <>
                                {group?.members.map((member) => (
                                    <View key={member.userId} style={styles.splitRow}>
                                        <View style={styles.splitMember}>
                                            <View style={[styles.splitAvatar, { backgroundColor: member.userId === user?.id ? colors.primary : colors.secondary }]}>
                                                <Text style={styles.splitAvatarText}>{member.fullName.charAt(0)}</Text>
                                            </View>
                                            <Text style={[typographyStyles.bodySmall, styles.splitName]} numberOfLines={1}>
                                                {member.userId === user?.id ? 'You' : member.fullName.split(' ')[0]}
                                            </Text>
                                        </View>
                                        <View style={styles.customAmountWrapper}>
                                            <Text style={styles.customAmountPrefix}>₱</Text>
                                            <TextInput
                                                style={styles.customAmountInput}
                                                value={customSplits[member.userId] || ''}
                                                onChangeText={v => setCustomSplits(prev => ({ ...prev, [member.userId]: v }))}
                                                keyboardType="decimal-pad"
                                                placeholder="0.00"
                                                placeholderTextColor={colors.outline}
                                            />
                                        </View>
                                    </View>
                                ))}

                                {/* Summary Bar */}
                                <View style={[styles.splitSummaryBar, {
                                    borderColor: isCustomBalanced ? '#10B981' : remaining < 0 ? colors.error : colors.outlineVariant,
                                }]}>
                                    <View style={styles.splitSummaryItem}>
                                        <Text style={styles.splitSummaryLabel}>Assigned</Text>
                                        <Text style={styles.splitSummaryValue}>₱{totalAssigned.toFixed(2)}</Text>
                                    </View>
                                    <View style={styles.splitSummaryDivider} />
                                    <View style={styles.splitSummaryItem}>
                                        <Text style={styles.splitSummaryLabel}>{remaining >= 0 ? 'Remaining' : 'Over by'}</Text>
                                        <Text style={[styles.splitSummaryValue, {
                                            color: isCustomBalanced ? '#10B981' : remaining < 0 ? colors.error : colors.onSurface,
                                        }]}>
                                            {isCustomBalanced ? '✓ Balanced' : `₱${Math.abs(remaining).toFixed(2)}`}
                                        </Text>
                                    </View>
                                    <View style={styles.splitSummaryDivider} />
                                    <View style={styles.splitSummaryItem}>
                                        <Text style={styles.splitSummaryLabel}>Total</Text>
                                        <Text style={styles.splitSummaryValue}>₱{splitAmountNum.toFixed(2)}</Text>
                                    </View>
                                </View>

                                {/* Distribute button */}
                                {remaining > 0.01 && group?.members.some(m => !customSplits[m.userId] || parseFloat(customSplits[m.userId] || '0') === 0) && (
                                    <TouchableOpacity style={styles.distributeBtn} onPress={distributeRemaining}>
                                        <Ionicons name="share-outline" size={14} color={colors.primary} />
                                        <Text style={styles.distributeBtnText}>Distribute ₱{remaining.toFixed(2)} equally</Text>
                                    </TouchableOpacity>
                                )}

                                {/* Inline error */}
                                {!isCustomBalanced && splitAmountNum > 0 && totalAssigned > 0 && (
                                    <Text style={styles.splitErrorText}>
                                        {remaining > 0
                                            ? `₱${remaining.toFixed(2)} still needs to be assigned`
                                            : `Over by ₱${Math.abs(remaining).toFixed(2)} — reduce some amounts`}
                                    </Text>
                                )}
                            </>
                        )}
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
            {/* Payer Selection Modal */}
            <Modal visible={showPayerModal} transparent animationType="slide" onRequestClose={() => setShowPayerModal(false)}>
                <TouchableOpacity style={styles.payerModalOverlay} activeOpacity={1} onPress={() => setShowPayerModal(false)}>
                    <TouchableOpacity style={styles.payerModalSheet} activeOpacity={1}>
                        <View style={styles.payerModalHandle} />
                        <View style={styles.payerModalHeader}>
                            <Text style={styles.payerModalTitle}>Who paid?</Text>
                            <TouchableOpacity style={styles.payerModalCloseBtn} onPress={() => setShowPayerModal(false)}>
                                <Ionicons name="close" size={20} color={colors.onSurfaceVariant} />
                            </TouchableOpacity>
                        </View>
                        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 360 }}>
                            {group?.members.map(member => {
                                const isSelected = expense.payerId === member.userId;
                                const isCurrentUser = member.userId === user?.id;
                                return (
                                    <TouchableOpacity
                                        key={member.userId}
                                        style={[styles.payerModalMember, isSelected && styles.payerModalMemberSelected]}
                                        onPress={() => { selectPayer(member); setShowPayerModal(false); }}
                                        activeOpacity={0.7}
                                    >
                                        <View style={[styles.payerModalAvatar, { overflow: 'hidden' }]}>
                                            {member.photoURL ? (
                                                <Image source={{ uri: member.photoURL }} style={styles.payerModalAvatarImg} />
                                            ) : (
                                                <Text style={styles.payerModalAvatarText}>
                                                    {member.fullName.charAt(0).toUpperCase()}
                                                </Text>
                                            )}
                                        </View>
                                        <View style={styles.payerModalMemberInfo}>
                                            <Text style={[styles.payerModalMemberName, isSelected && styles.payerModalMemberNameSelected]}>
                                                {isCurrentUser ? 'You' : member.fullName}
                                            </Text>
                                            {isCurrentUser && (
                                                <Text style={styles.payerModalMemberSub}>{member.fullName}</Text>
                                            )}
                                        </View>
                                        {isSelected && (
                                            <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>

            {/* Date Picker Modal */}
            <Modal visible={showDateModal} transparent animationType="fade" onRequestClose={() => setShowDateModal(false)}>
                <TouchableOpacity style={styles.dateModalOverlay} activeOpacity={1} onPress={() => setShowDateModal(false)}>
                    <TouchableOpacity style={styles.dateModalContent} activeOpacity={1}>
                        <Text style={[typographyStyles.headlineSmall, styles.dateModalTitle]}>Select Date</Text>
                        <View style={styles.dateQuickButtons}>
                            <TouchableOpacity style={styles.dateQuickBtn} onPress={() => {
                                setExpense(prev => ({ ...prev, date: new Date() }));
                                setShowDateModal(false);
                            }}>
                                <Text style={[typographyStyles.labelMedium, styles.dateQuickBtnText]}>Today</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.dateQuickBtn} onPress={() => {
                                const d = new Date();
                                d.setDate(d.getDate() - 1);
                                setExpense(prev => ({ ...prev, date: d }));
                                setShowDateModal(false);
                            }}>
                                <Text style={[typographyStyles.labelMedium, styles.dateQuickBtnText]}>Yesterday</Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={[typographyStyles.bodySmall, styles.dateOrLabel]}>or enter a custom date</Text>
                        <TextInput
                            style={styles.dateTextInput}
                            placeholder="YYYY-MM-DD"
                            placeholderTextColor={colors.outline}
                            value={dateInputText}
                            onChangeText={setDateInputText}
                            keyboardType="numbers-and-punctuation"
                            maxLength={10}
                        />
                        <TouchableOpacity style={styles.dateConfirmBtn} onPress={handleDateConfirm}>
                            <Text style={[typographyStyles.labelMedium, styles.dateConfirmBtnText]}>Confirm</Text>
                        </TouchableOpacity>
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>
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
        fontFamily: 'Poppins_400Regular',
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
        fontFamily: 'Poppins_400Regular',
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
    splitToggle: {
        flexDirection: 'row',
        backgroundColor: colors.surfaceContainerLow,
        borderRadius: spacing.borderRadiusFull,
        padding: 4,
    },
    splitToggleBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingVertical: spacing.sm,
        borderRadius: spacing.borderRadiusFull,
    },
    splitToggleBtnActive: {
        backgroundColor: colors.primary,
    },
    splitToggleBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.onSurfaceVariant,
        fontFamily: 'Poppins_600SemiBold',
    },
    splitToggleBtnTextActive: {
        color: colors.onPrimary,
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
    },
    splitLabel: {
        color: colors.onSurfaceVariant,
    },
    splitLabelAmount: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.primary,
        fontFamily: 'Poppins_600SemiBold',
    },
    splitRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.surface + '80',
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
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
    customAmountWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceBright,
        borderWidth: 1,
        borderColor: colors.secondaryContainer,
        borderRadius: spacing.borderRadiusMd,
        paddingHorizontal: spacing.sm,
    },
    customAmountPrefix: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.primary,
        fontFamily: 'Poppins_600SemiBold',
    },
    customAmountInput: {
        width: 80,
        paddingVertical: spacing.xs,
        fontSize: 14,
        fontFamily: 'Poppins_400Regular',
        color: colors.onSurface,
        textAlign: 'right',
    },
    splitSummaryBar: {
        flexDirection: 'row',
        backgroundColor: colors.surfaceContainerLowest,
        borderRadius: spacing.borderRadiusLg,
        padding: spacing.md,
        borderWidth: 1,
        marginTop: spacing.xs,
    },
    splitSummaryItem: {
        flex: 1,
        alignItems: 'center',
        gap: 2,
    },
    splitSummaryLabel: {
        fontSize: 10,
        color: colors.onSurfaceVariant,
        fontFamily: 'Poppins_400Regular',
    },
    splitSummaryValue: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.onSurface,
        fontFamily: 'Poppins_700Bold',
    },
    splitSummaryDivider: {
        width: 1,
        backgroundColor: colors.outlineVariant,
    },
    distributeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        backgroundColor: colors.primaryContainer,
        paddingVertical: spacing.sm,
        borderRadius: spacing.borderRadiusFull,
    },
    distributeBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.primary,
        fontFamily: 'Poppins_600SemiBold',
    },
    splitErrorText: {
        fontSize: 12,
        color: colors.error,
        textAlign: 'center',
        fontFamily: 'Poppins_400Regular',
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
    dateModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    dateModalContent: {
        backgroundColor: colors.surface,
        borderRadius: spacing.borderRadiusLg,
        padding: spacing.lg,
        width: '85%',
        gap: spacing.md,
    },
    dateModalTitle: {
        color: colors.onSurface,
        textAlign: 'center',
    },
    dateQuickButtons: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    dateQuickBtn: {
        flex: 1,
        backgroundColor: colors.secondaryContainer,
        paddingVertical: spacing.sm,
        borderRadius: spacing.borderRadiusFull,
        alignItems: 'center',
    },
    dateQuickBtnText: {
        color: colors.onSurface,
    },
    dateOrLabel: {
        color: colors.onSurfaceVariant,
        textAlign: 'center',
    },
    dateTextInput: {
        backgroundColor: colors.surfaceBright,
        borderWidth: 1,
        borderColor: colors.secondaryContainer,
        borderRadius: spacing.borderRadiusLg,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        fontSize: 16,
        fontFamily: 'Poppins_400Regular',
        color: colors.onSurface,
        textAlign: 'center',
    },
    dateConfirmBtn: {
        backgroundColor: colors.primary,
        paddingVertical: spacing.md,
        borderRadius: spacing.borderRadiusFull,
        alignItems: 'center',
    },
    dateConfirmBtnText: {
        color: colors.onPrimary,
    },
    // Payer avatar image (in picker button)
    payerAvatarImg: {
        width: 32,
        height: 32,
    },
    // Payer selection modal
    payerModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    payerModalSheet: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: spacing.gutter,
        paddingTop: spacing.sm,
        paddingBottom: spacing.xl,
    },
    payerModalHandle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: colors.outlineVariant,
        alignSelf: 'center',
        marginBottom: spacing.lg,
    },
    payerModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    payerModalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.onSurface,
        fontFamily: 'Poppins_700Bold',
    },
    payerModalCloseBtn: {
        padding: spacing.xs,
        borderRadius: spacing.borderRadiusFull,
        backgroundColor: colors.surfaceContainer,
    },
    payerModalMember: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        borderRadius: spacing.borderRadiusLg,
        gap: spacing.md,
        marginBottom: spacing.xs,
        backgroundColor: colors.surfaceContainer,
    },
    payerModalMemberSelected: {
        backgroundColor: colors.primaryContainer,
        borderWidth: 1.5,
        borderColor: colors.primary,
    },
    payerModalAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.secondary,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    payerModalAvatarImg: {
        width: 48,
        height: 48,
    },
    payerModalAvatarText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.onPrimary,
    },
    payerModalMemberInfo: {
        flex: 1,
        gap: 2,
    },
    payerModalMemberName: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.onSurface,
        fontFamily: 'Poppins_600SemiBold',
    },
    payerModalMemberNameSelected: {
        color: colors.primary,
    },
    payerModalMemberSub: {
        fontSize: 12,
        color: colors.onSurfaceVariant,
        fontFamily: 'Poppins_400Regular',
    },
});