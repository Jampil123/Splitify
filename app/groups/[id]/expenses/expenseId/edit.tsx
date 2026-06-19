import { refreshSettlementSuggestions } from '@/services/api/settlements';
import { db } from '@/services/firebase/config';
import { useAuthStore } from '@/stores/authStore';
import { colors, spacing, typographyStyles } from '@/styles';
import { Expense, GroupMember } from '@/types';
import { formatDateInput } from '@/utils/dateHelpers';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { deleteDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
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

const categories = [
    { id: 'food', label: 'Food', icon: 'restaurant-outline' },
    { id: 'transport', label: 'Transport', icon: 'car-outline' },
    { id: 'grocery', label: 'Grocery', icon: 'cart-outline' },
    { id: 'bills', label: 'Bills', icon: 'receipt-outline' },
    { id: 'entertainment', label: 'Entertainment', icon: 'game-controller-outline' },
    { id: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' },
];

export default function EditExpenseScreen() {
    const router = useRouter();
    const { id: groupId, expenseId } = useLocalSearchParams<{ id: string; expenseId: string }>();
    const { user } = useAuthStore();
    
    const [expense, setExpense] = useState<Expense | null>(null);
    const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    
    // Form state
    const [title, setTitle] = useState('');
    const [amount, setAmount] = useState('');
    const [payerId, setPayerId] = useState('');
    const [category, setCategory] = useState('');
    const [date, setDate] = useState('');
    const [description, setDescription] = useState('');
    const [originalTitle, setOriginalTitle] = useState('');
    const [originalAmount, setOriginalAmount] = useState('');
    
    const [selectedPayer, setSelectedPayer] = useState<GroupMember | null>(null);
    const [showCategorySelector, setShowCategorySelector] = useState(false);
    const [showPayerSelector, setShowPayerSelector] = useState(false);

    // Fetch expense data
    useEffect(() => {
        const fetchExpense = async () => {
            if (!groupId || !expenseId) return;
            
            try {
                const expenseRef = doc(db, 'groups', groupId, 'expenses', expenseId);
                const expenseSnap = await getDoc(expenseRef);
                
                if (expenseSnap.exists()) {
                    const expenseData = { id: expenseSnap.id, ...expenseSnap.data() } as Expense;
                    setExpense(expenseData);
                    
                    // Set form values
                    setTitle(expenseData.title);
                    setOriginalTitle(expenseData.title);
                    setAmount(expenseData.amount.toString());
                    setOriginalAmount(expenseData.amount.toString());
                    setPayerId(expenseData.payerId);
                    setCategory(expenseData.category || 'other');
                    setDescription(expenseData.description || '');
                    
                    // Use the helper function to format date
                    if (expenseData.date) {
                        setDate(formatDateInput(expenseData.date));
                    }
                    
                    // Fetch group members
                    const groupRef = doc(db, 'groups', groupId);
                    const groupSnap = await getDoc(groupRef);
                    if (groupSnap.exists()) {
                        const groupData = groupSnap.data();
                        setGroupMembers(groupData.members || []);
                        const payer = groupData.members?.find((m: any) => m.userId === expenseData.payerId);
                        setSelectedPayer(payer || null);
                    }
                } else {
                    Alert.alert('Error', 'Expense not found');
                    router.back();
                }
            } catch (error) {
                console.error('Error fetching expense:', error);
                Alert.alert('Error', 'Failed to load expense');
            } finally {
                setIsLoading(false);
            }
        };
        
        fetchExpense();
    }, [groupId, expenseId]);

    const hasChanges = () => {
        return title !== originalTitle || amount !== originalAmount || 
               payerId !== expense?.payerId || category !== expense?.category ||
               description !== expense?.description;
    };

    const handleSave = async () => {
        if (!title.trim()) {
            Alert.alert('Error', 'Please enter a title');
            return;
        }
        
        const amountNum = parseFloat(amount);
        if (isNaN(amountNum) || amountNum <= 0) {
            Alert.alert('Error', 'Please enter a valid amount');
            return;
        }
        
        if (!hasChanges()) {
            Alert.alert('Info', 'No changes to save');
            return;
        }

        setIsSaving(true);

        try {
            const expenseRef = doc(db, 'groups', groupId, 'expenses', expenseId);
            
            const updateData: any = {
                title: title.trim(),
                amount: amountNum,
                category: category,
                description: description.trim(),
            };
            
            // If payer changed, update payer name
            if (payerId !== expense?.payerId) {
                const payer = groupMembers.find(m => m.userId === payerId);
                updateData.payerId = payerId;
                updateData.payerName = payer?.fullName || 'Unknown';
            }
            
            await updateDoc(expenseRef, updateData);

            // Update group total expenses if amount changed
            if (amountNum !== expense?.amount) {
                const groupRef = doc(db, 'groups', groupId);
                const groupSnap = await getDoc(groupRef);
                if (groupSnap.exists()) {
                    const groupData = groupSnap.data();
                    const diff = amountNum - (expense?.amount || 0);
                    await updateDoc(groupRef, {
                        totalExpenses: (groupData.totalExpenses || 0) + diff,
                    });
                }
            }

            await refreshSettlementSuggestions(groupId);
            Alert.alert(
                'Success',
                'Expense updated successfully!',
                [{ text: 'OK', onPress: () => router.back() }]
            );
            
        } catch (error: any) {
            console.error('Error updating expense:', error);
            Alert.alert('Error', error.message || 'Failed to update expense');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Expense',
            'Are you sure you want to delete this expense? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        setIsSaving(true);
                        try {
                            const expenseRef = doc(db, 'groups', groupId, 'expenses', expenseId);
                            await deleteDoc(expenseRef);

                            // Update group total expenses
                            const groupRef = doc(db, 'groups', groupId);
                            const groupSnap = await getDoc(groupRef);
                            if (groupSnap.exists()) {
                                const groupData = groupSnap.data();
                                await updateDoc(groupRef, {
                                    totalExpenses: (groupData.totalExpenses || 0) - (expense?.amount || 0),
                                });
                            }

                            await refreshSettlementSuggestions(groupId);
                            Alert.alert('Success', 'Expense deleted successfully');
                            router.back();
                        } catch (error) {
                            console.error('Error deleting expense:', error);
                            Alert.alert('Error', 'Failed to delete expense');
                        } finally {
                            setIsSaving(false);
                        }
                    }
                }
            ]
        );
    };

    const selectCategory = (catId: string) => {
        setCategory(catId);
        setShowCategorySelector(false);
    };

    const selectPayer = (member: GroupMember) => {
        setSelectedPayer(member);
        setPayerId(member.userId);
        setShowPayerSelector(false);
    };

    const getCategoryLabel = (catId: string) => {
        const cat = categories.find(c => c.id === catId);
        return cat?.label || 'Other';
    };

    const getCategoryIcon = (catId: string) => {
        const cat = categories.find(c => c.id === catId);
        return cat?.icon || 'ellipsis-horizontal-outline';
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
            
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back-outline" size={24} color={colors.primary} />
                    </TouchableOpacity>
                    <Text style={[typographyStyles.headlineMedium, styles.headerTitle]}>
                        Edit Expense
                    </Text>
                </View>
                <TouchableOpacity
                    style={[
                        styles.saveButton,
                        (!hasChanges() || isSaving) && styles.saveButtonDisabled,
                    ]}
                    onPress={handleSave}
                    disabled={!hasChanges() || isSaving}
                >
                    {isSaving ? (
                        <ActivityIndicator size="small" color={colors.onPrimary} />
                    ) : (
                        <Text style={[
                            typographyStyles.labelMedium,
                            styles.saveText,
                            (!hasChanges()) && styles.saveTextDisabled,
                        ]}>
                            Save
                        </Text>
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                {/* Amount Section */}
                <View style={styles.amountSection}>
                    <Text style={[typographyStyles.labelMedium, styles.amountLabel]}>Amount</Text>
                    <View style={styles.amountRow}>
                        <Text style={styles.amountPrefix}>₱</Text>
                        <TextInput
                            style={styles.amountInput}
                            placeholder="0.00"
                            placeholderTextColor={colors.outline}
                            value={amount}
                            onChangeText={setAmount}
                            keyboardType="numeric"
                        />
                    </View>
                    {amount !== originalAmount && (
                        <Text style={[typographyStyles.labelMedium, styles.originalText]}>
                            Original: ₱{originalAmount}
                        </Text>
                    )}
                </View>

                {/* Title */}
                <View style={styles.inputGroup}>
                    <Text style={[typographyStyles.labelMedium, styles.label]}>
                        What was this for?
                    </Text>
                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter expense title"
                            placeholderTextColor={colors.outline}
                            value={title}
                            onChangeText={setTitle}
                        />
                        <Ionicons name="document-text-outline" size={20} color={colors.outline} style={styles.inputIcon} />
                    </View>
                </View>

                {/* ✅ Payer & Category - Vertical Layout */}
                <View style={styles.verticalGroup}>
                    {/* Payer */}
                    <View style={styles.inputGroup}>
                        <Text style={[typographyStyles.labelMedium, styles.label]}>Paid by</Text>
                        <TouchableOpacity
                            style={styles.pickerCard}
                            onPress={() => setShowPayerSelector(true)}
                        >
                            <View style={styles.payerAvatar}>
                                <Text style={styles.payerAvatarText}>
                                    {selectedPayer?.fullName?.charAt(0) || '?'}
                                </Text>
                            </View>
                            <Text style={[typographyStyles.bodySmall, styles.pickerText]}>
                                {selectedPayer?.fullName || 'Select payer'}
                                {selectedPayer?.userId === user?.id && ' (You)'}
                            </Text>
                            <Ionicons name="chevron-down" size={20} color={colors.outline} />
                        </TouchableOpacity>
                    </View>

                    {/* Category */}
                    <View style={styles.inputGroup}>
                        <Text style={[typographyStyles.labelMedium, styles.label]}>Category</Text>
                        <TouchableOpacity
                            style={styles.pickerCard}
                            onPress={() => setShowCategorySelector(true)}
                        >
                            <Ionicons name={getCategoryIcon(category) as any} size={20} color={colors.primary} />
                            <Text style={[typographyStyles.bodySmall, styles.pickerText]}>
                                {getCategoryLabel(category)}
                            </Text>
                            <Ionicons name="chevron-down" size={20} color={colors.outline} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Date */}
                <View style={styles.inputGroup}>
                    <Text style={[typographyStyles.labelMedium, styles.label]}>Date</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={colors.outline}
                        value={date}
                        onChangeText={setDate}
                    />
                </View>

                {/* Description */}
                <View style={styles.inputGroup}>
                    <Text style={[typographyStyles.labelMedium, styles.label]}>Description (Optional)</Text>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Add more details..."
                        placeholderTextColor={colors.outline}
                        value={description}
                        onChangeText={setDescription}
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                    />
                </View>

                {/* Split Preview */}
                <View style={styles.splitCard}>
                    <View style={styles.splitHeader}>
                        <Text style={[typographyStyles.labelMedium, styles.splitLabel]}>
                            Split among {groupMembers.length} people
                        </Text>
                        <TouchableOpacity>
                            <Text style={[typographyStyles.labelMedium, styles.splitEditText]}>
                                Edit Split
                            </Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.splitAvatars}>
                        {groupMembers.slice(0, 4).map((member, index) => (
                            <View
                                key={member.userId}
                                style={[
                                    styles.splitAvatar,
                                    member.userId === user?.id && styles.splitAvatarCurrent,
                                    { marginLeft: index > 0 ? -8 : 0 },
                                ]}
                            >
                                <Text style={styles.splitAvatarText}>
                                    {member.fullName.charAt(0).toUpperCase()}
                                </Text>
                            </View>
                        ))}
                        {groupMembers.length > 4 && (
                            <View style={[styles.splitAvatar, styles.splitAvatarMore]}>
                                <Text style={styles.splitAvatarText}>+{groupMembers.length - 4}</Text>
                            </View>
                        )}
                    </View>
                    <Text style={[typographyStyles.bodySmall, styles.splitAmountText]}>
                        Equally split: <Text style={styles.splitAmountBold}>
                            ₱{(parseFloat(amount) / (groupMembers.length || 1)).toFixed(2)} / person
                        </Text>
                    </Text>
                </View>

                {/* Danger Zone */}
                <View style={styles.dangerSection}>
                    <View style={styles.dangerCard}>
                        <View>
                            <Text style={[typographyStyles.labelMedium, styles.dangerTitle]}>
                                Remove from Group
                            </Text>
                            <Text style={[typographyStyles.bodySmall, styles.dangerSubtext]}>
                                This action cannot be undone.
                            </Text>
                        </View>
                        <TouchableOpacity style={styles.dangerButton} onPress={handleDelete}>
                            <Text style={[typographyStyles.labelMedium, styles.dangerButtonText]}>
                                Delete
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>

            {/* Category Selector Modal */}
            {showCategorySelector && (
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={[typographyStyles.headlineSmall, styles.modalTitle]}>
                                Select Category
                            </Text>
                            <TouchableOpacity onPress={() => setShowCategorySelector(false)}>
                                <Ionicons name="close" size={24} color={colors.onSurface} />
                            </TouchableOpacity>
                        </View>
                        {categories.map((cat) => (
                            <TouchableOpacity
                                key={cat.id}
                                style={[
                                    styles.modalItem,
                                    category === cat.id && styles.modalItemActive,
                                ]}
                                onPress={() => selectCategory(cat.id)}
                            >
                                <Ionicons
                                    name={cat.icon as any}
                                    size={20}
                                    color={category === cat.id ? colors.onPrimary : colors.onSurface}
                                />
                                <Text style={[
                                    styles.modalItemText,
                                    category === cat.id && styles.modalItemTextActive,
                                ]}>
                                    {cat.label}
                                </Text>
                                {category === cat.id && (
                                    <Ionicons name="checkmark" size={20} color={colors.onPrimary} />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            )}

            {/* Payer Selector Modal */}
            {showPayerSelector && (
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={[typographyStyles.headlineSmall, styles.modalTitle]}>
                                Select Payer
                            </Text>
                            <TouchableOpacity onPress={() => setShowPayerSelector(false)}>
                                <Ionicons name="close" size={24} color={colors.onSurface} />
                            </TouchableOpacity>
                        </View>
                        {groupMembers.map((member) => (
                            <TouchableOpacity
                                key={member.userId}
                                style={[
                                    styles.modalItem,
                                    payerId === member.userId && styles.modalItemActive,
                                ]}
                                onPress={() => selectPayer(member)}
                            >
                                <View style={styles.modalAvatar}>
                                    <Text style={styles.modalAvatarText}>
                                        {member.fullName.charAt(0).toUpperCase()}
                                    </Text>
                                </View>
                                <Text style={[
                                    styles.modalItemText,
                                    payerId === member.userId && styles.modalItemTextActive,
                                ]}>
                                    {member.fullName} {member.userId === user?.id && '(You)'}
                                </Text>
                                {payerId === member.userId && (
                                    <Ionicons name="checkmark" size={20} color={colors.onPrimary} />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            )}
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
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.outlineVariant,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    backButton: {
        padding: spacing.sm,
    },
    headerTitle: {
        color: colors.primary,
        fontSize: 18,
    },
    saveButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: spacing.borderRadiusFull,
    },
    saveButtonDisabled: {
        opacity: 0.5,
    },
    saveText: {
        color: colors.onPrimary,
    },
    saveTextDisabled: {
        color: colors.onPrimary,
    },
    scrollContent: {
        paddingHorizontal: spacing.gutter,
        paddingBottom: 100,
        gap: spacing.lg,
        paddingTop: spacing.md,
    },
    amountSection: {
        backgroundColor: colors.surfaceContainerHighest,
        borderRadius: spacing.borderRadiusLg,
        padding: spacing.lg,
        position: 'relative',
        overflow: 'hidden',
    },
    amountLabel: {
        color: colors.onSurfaceVariant,
    },
    amountRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    amountPrefix: {
        fontSize: 22,
        fontWeight: '600',
        color: colors.primary,
        marginRight: spacing.xs,
    },
    amountInput: {
        fontSize: 22,
        fontWeight: '600',
        color: colors.primary,
        padding: 0,
        flex: 1,
    },
    originalText: {
        color: colors.onSurfaceVariant,
        marginTop: spacing.xs,
    },
    // ✅ Vertical Group for Payer & Category
    verticalGroup: {
        gap: spacing.md,
    },
    inputGroup: {
        gap: spacing.xs,
    },
    label: {
        color: colors.primary,
        marginLeft: spacing.xs,
    },
    inputWrapper: {
        position: 'relative',
    },
    input: {
        backgroundColor: colors.surfaceContainerLow,
        borderWidth: 1,
        borderColor: colors.outlineVariant,
        borderRadius: spacing.borderRadiusLg,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        fontSize: 16,
        fontFamily: 'Inter_400Regular',
        color: colors.onSurface,
        paddingRight: 48,
    },
    inputIcon: {
        position: 'absolute',
        right: spacing.md,
        top: '50%',
        transform: [{ translateY: -10 }],
    },
    textArea: {
        minHeight: 80,
        textAlignVertical: 'top',
        paddingRight: spacing.md,
    },
    pickerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceContainerLow,
        borderWidth: 1,
        borderColor: colors.outlineVariant,
        borderRadius: spacing.borderRadiusLg,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        gap: spacing.sm,
    },
    payerAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    payerAvatarText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: colors.onPrimary,
    },
    pickerText: {
        flex: 1,
        color: colors.onSurface,
    },
    splitCard: {
        backgroundColor: colors.secondaryContainer + '66',
        borderRadius: spacing.borderRadiusLg,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.outlineVariant,
    },
    splitHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    splitLabel: {
        color: colors.onSurfaceVariant,
    },
    splitEditText: {
        color: colors.primary,
    },
    splitAvatars: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    splitAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.secondaryContainer,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: colors.surface,
    },
    splitAvatarCurrent: {
        borderColor: colors.primary,
    },
    splitAvatarMore: {
        backgroundColor: colors.secondaryContainer,
    },
    splitAvatarText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: colors.onSurface,
    },
    splitAmountText: {
        color: colors.onSurfaceVariant,
        marginTop: spacing.xs,
    },
    splitAmountBold: {
        fontWeight: 'bold',
        color: colors.onSurface,
    },
    dangerSection: {
        marginTop: spacing.md,
        paddingTop: spacing.lg,
        borderTopWidth: 1,
        borderTopColor: colors.errorContainer,
    },
    dangerCard: {
        backgroundColor: colors.errorContainer + '20',
        borderRadius: spacing.borderRadiusLg,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.errorContainer,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    dangerTitle: {
        color: colors.error,
        fontWeight: 'bold',
    },
    dangerSubtext: {
        color: colors.onSurfaceVariant,
    },
    dangerButton: {
        backgroundColor: colors.error,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: spacing.borderRadiusLg,
    },
    dangerButtonText: {
        color: colors.onError,
    },
    modalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    modalContent: {
        backgroundColor: colors.surface,
        borderRadius: spacing.borderRadiusLg,
        padding: spacing.lg,
        width: '85%',
        maxHeight: '70%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    modalTitle: {
        color: colors.onSurface,
    },
    modalItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        borderRadius: spacing.borderRadiusLg,
        gap: spacing.sm,
    },
    modalItemActive: {
        backgroundColor: colors.primary,
    },
    modalItemText: {
        flex: 1,
        color: colors.onSurface,
    },
    modalItemTextActive: {
        color: colors.onPrimary,
    },
    modalAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.primaryContainer,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalAvatarText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: colors.onPrimary,
    },
});