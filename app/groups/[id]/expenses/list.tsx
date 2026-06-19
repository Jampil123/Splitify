import { db } from '@/services/firebase/config';
import { useAuthStore } from '@/stores/authStore';
import { colors, spacing, typographyStyles } from '@/styles';
import { Expense } from '@/types';
import { formatDate } from '@/utils/dateHelpers';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

// Category configuration
const categories = [
    { id: 'all', label: 'All', icon: 'apps-outline' },
    { id: 'food', label: 'Food', icon: 'restaurant-outline' },
    { id: 'transport', label: 'Transport', icon: 'car-outline' },
    { id: 'grocery', label: 'Grocery', icon: 'cart-outline' },
    { id: 'bills', label: 'Bills', icon: 'receipt-outline' },
    { id: 'entertainment', label: 'Entertainment', icon: 'game-controller-outline' },
    { id: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' },
];

const getCategoryIcon = (category: string): any => {
    const cat = categories.find(c => c.id === category);
    return cat?.icon || 'receipt-outline';
};

const getCategoryColor = (category: string): string => {
    const colors_map: Record<string, string> = {
        food: colors.primary,
        transport: colors.secondary,
        grocery: colors.primaryContainer,
        bills: colors.tertiary,
        entertainment: colors.primaryFixed,
        other: colors.outline,
    };
    return colors_map[category] || colors.outline;
};

// Expense Item Component
function ExpenseItem({ expense, onPress }: { expense: Expense; onPress: () => void }) {
    const isPaidByUser = expense.payerId === expense.addedBy;
    const isOwed = expense.payerId !== expense.addedBy && expense.individualShare;

    return (
        <TouchableOpacity style={styles.expenseItem} onPress={onPress} activeOpacity={0.7}>
            <View style={styles.expenseLeft}>
                <View style={[styles.expenseIcon, { backgroundColor: getCategoryColor(expense.category || 'other') + '20' }]}>
                    <Ionicons name={getCategoryIcon(expense.category || 'other')} size={20} color={getCategoryColor(expense.category || 'other')} />
                </View>
                <View>
                    <Text style={[typographyStyles.bodyMedium, styles.expenseTitle]}>{expense.title}</Text>
                    <Text style={[typographyStyles.bodySmall, styles.expenseMeta]}>
                        Paid by {expense.payerName} • {formatDate(expense.date, 'short')}
                    </Text>
                </View>
            </View>
            <View style={styles.expenseRight}>
                <Text style={[typographyStyles.bodyMedium, styles.expenseAmount]}>
                    ₱{expense.amount.toFixed(2)}
                </Text>
                <Text style={[
                    styles.expenseStatus,
                    isPaidByUser ? styles.statusPaid : styles.statusOwed,
                ]}>
                    {isPaidByUser ? 'You paid' : `You owe ₱${expense.individualShare?.toFixed(2) || '0.00'}`}
                </Text>
            </View>
        </TouchableOpacity>
    );
}

// Filter Chip Component
function FilterChip({ label, isActive, onPress }: { label: string; isActive: boolean; onPress: () => void }) {
    return (
        <TouchableOpacity
            style={[styles.filterChip, isActive && styles.filterChipActive]}
            onPress={onPress}
        >
            <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                {label}
            </Text>
        </TouchableOpacity>
    );
}

export default function AllExpensesScreen() {
    const router = useRouter();
    const { id: groupId } = useLocalSearchParams<{ id: string }>();
    const { user } = useAuthStore();
    
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'amount_high' | 'amount_low'>('date_desc');
    const [totalExpenses, setTotalExpenses] = useState(0);
    const [userShare, setUserShare] = useState(0);

    const fetchExpenses = useCallback(async () => {
        if (!groupId) return;
        
        try {
            const expensesRef = collection(db, 'groups', groupId, 'expenses');
            const q = query(
                expensesRef,
                where('isDeleted', '==', false),
                orderBy('date', 'desc')
            );
            const expensesSnap = await getDocs(q);
            const expensesData = expensesSnap.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data() 
            }) as Expense);
            
            setExpenses(expensesData);
            
            // Calculate totals
            const total = expensesData.reduce((sum, e) => sum + e.amount, 0);
            setTotalExpenses(total);
            
            // Calculate user's share
            const share = expensesData
                .filter(e => e.individualShare)
                .reduce((sum, e) => sum + (e.individualShare || 0), 0);
            setUserShare(share);
            
            applyFilters(expensesData, searchQuery, selectedCategory, sortBy);
            
        } catch (error) {
            console.error('Error fetching expenses:', error);
            Alert.alert('Error', 'Failed to load expenses');
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    }, [groupId]);

    useEffect(() => {
        fetchExpenses();
    }, [fetchExpenses]);

    const applyFilters = (data: Expense[], query: string, category: string, sort: string) => {
        let filtered = [...data];
        
        // Apply search
        if (query.trim()) {
            const q = query.toLowerCase();
            filtered = filtered.filter(e => 
                e.title.toLowerCase().includes(q) ||
                e.payerName.toLowerCase().includes(q) ||
                e.category?.toLowerCase().includes(q)
            );
        }
        
        // Apply category filter
        if (category !== 'all') {
            filtered = filtered.filter(e => e.category === category);
        }
        
        // Apply sorting
        switch (sort) {
            case 'date_desc':
                filtered.sort((a, b) => {
                    const dateA = a.date?.toDate?.() || new Date(0);
                    const dateB = b.date?.toDate?.() || new Date(0);
                    return dateB.getTime() - dateA.getTime();
                });
                break;
            case 'date_asc':
                filtered.sort((a, b) => {
                    const dateA = a.date?.toDate?.() || new Date(0);
                    const dateB = b.date?.toDate?.() || new Date(0);
                    return dateA.getTime() - dateB.getTime();
                });
                break;
            case 'amount_high':
                filtered.sort((a, b) => b.amount - a.amount);
                break;
            case 'amount_low':
                filtered.sort((a, b) => a.amount - b.amount);
                break;
        }
        
        setFilteredExpenses(filtered);
    };

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        applyFilters(expenses, query, selectedCategory, sortBy);
    };

    const handleCategorySelect = (categoryId: string) => {
        setSelectedCategory(categoryId);
        applyFilters(expenses, searchQuery, categoryId, sortBy);
    };

    const handleSortChange = () => {
        const options = [
            { label: 'Date (Newest)', value: 'date_desc' },
            { label: 'Date (Oldest)', value: 'date_asc' },
            { label: 'Amount (Highest)', value: 'amount_high' },
            { label: 'Amount (Lowest)', value: 'amount_low' },
        ];
        
        const currentIndex = options.findIndex(o => o.value === sortBy);
        const nextIndex = (currentIndex + 1) % options.length;
        const newSort = options[nextIndex].value as typeof sortBy;
        
        setSortBy(newSort);
        applyFilters(expenses, searchQuery, selectedCategory, newSort);
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchExpenses();
    };

    const handleAddExpense = () => {
        router.push({
            pathname: '/groups/[id]/expenses/add',
            params: { id: groupId }
        });
    };

    const handleExpensePress = (expenseId: string) => {
        router.push({
            pathname: '/groups/[id]/expenses/[expenseId]',
            params: { id: groupId, expenseId: expenseId }
        });
    };

    const handleSettleUp = () => {
        router.push({
            pathname: '/groups/[id]/settlements',
            params: { id: groupId }
        });
    };

    const getSortLabel = () => {
        const labels: Record<string, string> = {
            date_desc: 'Date (Newest)',
            date_asc: 'Date (Oldest)',
            amount_high: 'Amount (Highest)',
            amount_low: 'Amount (Lowest)',
        };
        return labels[sortBy] || 'Date (Newest)';
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
                <View style={styles.headerLeft}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back-outline" size={24} color={colors.primary} />
                    </TouchableOpacity>
                    <Text style={[typographyStyles.headlineMedium, styles.headerTitle]}>
                        All Expenses
                    </Text>
                </View>
                <TouchableOpacity style={styles.addButton} onPress={handleAddExpense}>
                    <Ionicons name="add" size={20} color={colors.onPrimary} />
                    <Text style={[typographyStyles.labelMedium, styles.addButtonText]}>Add</Text>
                </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
                <Ionicons name="search-outline" size={20} color={colors.outline} style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search expenses, groups, or names..."
                    placeholderTextColor={colors.outline}
                    value={searchQuery}
                    onChangeText={handleSearch}
                />
            </View>

            {/* Filters */}
            <View style={styles.filtersContainer}>
                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterChips}
                >
                    {categories.map((cat) => (
                        <FilterChip
                            key={cat.id}
                            label={cat.label}
                            isActive={selectedCategory === cat.id}
                            onPress={() => handleCategorySelect(cat.id)}
                        />
                    ))}
                </ScrollView>
                
                <TouchableOpacity style={styles.sortButton} onPress={handleSortChange}>
                    <Text style={[typographyStyles.labelMedium, styles.sortText]}>
                        Sort by: {getSortLabel()}
                    </Text>
                    <Ionicons name="chevron-down-outline" size={16} color={colors.outline} />
                </TouchableOpacity>
            </View>

            {/* Expense List */}
            <FlatList
                data={filteredExpenses}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <ExpenseItem
                        expense={item}
                        onPress={() => handleExpensePress(item.id)}
                    />
                )}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="receipt-outline" size={48} color={colors.outline} />
                        <Text style={[typographyStyles.headlineSmall, styles.emptyTitle]}>
                            No expenses found
                        </Text>
                        <Text style={[typographyStyles.bodyMedium, styles.emptyText]}>
                            {searchQuery ? 'Try adjusting your filters' : 'Add your first expense to get started'}
                        </Text>
                        <TouchableOpacity style={styles.emptyButton} onPress={handleAddExpense}>
                            <Text style={[typographyStyles.buttonMedium, styles.emptyButtonText]}>
                                Add Expense
                            </Text>
                        </TouchableOpacity>
                    </View>
                }
                showsVerticalScrollIndicator={false}
            />

            {/* Footer Summary - Vertical Layout */}
            <View style={styles.footer}>
                <View style={styles.footerTop}>
                    <View>
                        <Text style={[typographyStyles.labelMedium, styles.footerLabel]}>
                            Total Expenses
                        </Text>
                        <Text style={[typographyStyles.headlineMedium, styles.footerTotal]}>
                            ₱{totalExpenses.toFixed(2)}
                        </Text>
                    </View>
                    <View style={styles.footerShare}>
                        <Text style={[typographyStyles.labelMedium, styles.footerLabel]}>
                            Your Share
                        </Text>
                        <Text style={[typographyStyles.headlineMedium, styles.footerShareAmount]}>
                            ₱{userShare.toFixed(2)}
                        </Text>
                    </View>
                </View>
                <TouchableOpacity style={styles.settleButton} onPress={handleSettleUp}>
                    <Text style={[typographyStyles.buttonMedium, styles.settleButtonText]}>
                        Settle Up
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
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.gutter,
        paddingTop: spacing.md,
        paddingBottom: spacing.sm,
        backgroundColor: colors.surface,
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
        color: colors.onSurface,
        fontSize: 18,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: spacing.borderRadiusFull,
        gap: 4,
    },
    addButtonText: {
        color: colors.onPrimary,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.outlineVariant,
        borderRadius: spacing.borderRadiusLg,
        marginHorizontal: spacing.gutter,
        marginTop: spacing.md,
        paddingHorizontal: spacing.md,
    },
    searchIcon: {
        marginRight: spacing.sm,
    },
    searchInput: {
        flex: 1,
        paddingVertical: spacing.md,
        fontSize: 16,
        fontFamily: 'Inter_400Regular',
        color: colors.onSurface,
    },
    filtersContainer: {
        paddingHorizontal: spacing.gutter,
        marginTop: spacing.md,
        gap: spacing.sm,
    },
    filterChips: {
        gap: spacing.sm,
        paddingVertical: spacing.xs,
    },
    filterChip: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: spacing.borderRadiusFull,
        backgroundColor: colors.surfaceVariant,
    },
    filterChipActive: {
        backgroundColor: colors.primary,
    },
    filterChipText: {
        fontSize: 12,
        fontWeight: '500',
        color: colors.onSurfaceVariant,
    },
    filterChipTextActive: {
        color: colors.onPrimary,
    },
    sortButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 4,
        paddingVertical: spacing.xs,
    },
    sortText: {
        color: colors.onSurfaceVariant,
    },
    listContent: {
        paddingHorizontal: spacing.gutter,
        paddingBottom: 120,
        gap: spacing.md,
        paddingTop: spacing.md,
    },
    expenseItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.secondaryContainer,
        padding: spacing.md,
        borderRadius: spacing.borderRadiusLg,
    },
    expenseLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        flex: 1,
    },
    expenseIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    expenseTitle: {
        color: colors.onSurface,
        fontWeight: '600',
    },
    expenseMeta: {
        color: colors.onSurfaceVariant,
    },
    expenseRight: {
        alignItems: 'flex-end',
    },
    expenseAmount: {
        color: colors.onSurface,
        fontWeight: '600',
    },
    expenseStatus: {
        fontSize: 11,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    statusPaid: {
        color: '#4CAF50',
    },
    statusOwed: {
        color: colors.error,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xxl,
        gap: spacing.sm,
    },
    emptyTitle: {
        color: colors.onSurface,
        marginTop: spacing.sm,
    },
    emptyText: {
        color: colors.outline,
        textAlign: 'center',
    },
    emptyButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: spacing.borderRadiusFull,
        marginTop: spacing.md,
    },
    emptyButtonText: {
        color: colors.onPrimary,
    },
    footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.gutter,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface + 'CC',
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
    gap: spacing.md,
    },
    footerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.primaryFixed,
        borderRadius: spacing.borderRadiusLg,
        padding: spacing.md,
    },
    footerLabel: {
        color: colors.onSurfaceVariant,
        textTransform: 'uppercase',
    },
    footerTotal: {
        color: colors.onSurface,
        fontSize: 22,
    },
    footerShare: {
        alignItems: 'flex-end',
    },
    footerShareAmount: {
        color: colors.onPrimaryFixed,
        fontSize: 18,
    },
    settleButton: {
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
    settleButtonText: {
        color: colors.onPrimary,
        fontSize: 16,
    },
});