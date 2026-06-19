import { db } from '@/services/firebase/config';
import { useFriends } from '@/services/hooks/useFriends';
import { useAuthStore } from '@/stores/authStore';
import { colors, spacing, typographyStyles } from '@/styles';
import { Group, GroupMember } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { arrayUnion, doc, getDoc, Timestamp, updateDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface FriendResult {
    id: string;
    fullName: string;
    email: string;
    photoURL?: string | null;
    isFriend: boolean;
}

export default function AddMembersScreen() {
    const router = useRouter();
    const { id: groupId } = useLocalSearchParams<{ id: string }>();
    const { user } = useAuthStore();
    const { friends, searchForUsers } = useFriends(user?.id);
    
    const [group, setGroup] = useState<Group | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<FriendResult[]>([]);
    const [selectedMembers, setSelectedMembers] = useState<FriendResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);

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
    }, [groupId]);

    // Handle search
    const handleSearch = async (text: string) => {
        setSearchQuery(text);
        
        if (text.length < 2) {
            setSearchResults([]);
            return;
        }
        
        setIsSearching(true);
        try {
            const results = await searchForUsers(text);
            // Filter out users already in the group
            const groupMemberIds = group?.members.map(m => m.userId) || [];
            const filteredResults = results.filter(r => !groupMemberIds.includes(r.id));
            setSearchResults(filteredResults);
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setIsSearching(false);
        }
    };

    const toggleSelectMember = (member: FriendResult) => {
        const isSelected = selectedMembers.some(m => m.id === member.id);
        if (isSelected) {
            setSelectedMembers(selectedMembers.filter(m => m.id !== member.id));
        } else {
            setSelectedMembers([...selectedMembers, member]);
        }
    };

    const isMemberSelected = (userId: string) => {
        return selectedMembers.some(m => m.id === userId);
    };

    const isMemberInGroup = (userId: string) => {
        return group?.members.some(m => m.userId === userId) || false;
    };

    const handleAddMembers = async () => {
        if (selectedMembers.length === 0) {
            Alert.alert('Info', 'Please select at least one member to add');
            return;
        }

        setIsSaving(true);

        try {
            const groupRef = doc(db, 'groups', groupId);
            
            // Add each selected member to the group
            for (const member of selectedMembers) {
                const newMember: GroupMember = {
                    userId: member.id,
                    fullName: member.fullName,
                    email: member.email,
                    photoURL: member.photoURL || null,
                    joinedAt: Timestamp.now(),
                    totalPaid: 0,
                    totalShare: 0,
                    balance: 0,
                };

                // Update group members
                await updateDoc(groupRef, {
                    members: arrayUnion(newMember),
                    memberCount: (group?.memberCount || 0) + 1,
                });

                // Add group to user's groups array
                const userRef = doc(db, 'users', member.id);
                await updateDoc(userRef, {
                    groups: arrayUnion(groupId),
                });
            }

            Alert.alert(
                'Success',
                `${selectedMembers.length} member${selectedMembers.length > 1 ? 's' : ''} added successfully!`,
                [{ text: 'OK', onPress: () => router.back() }]
            );

        } catch (error: any) {
            console.error('Error adding members:', error);
            Alert.alert('Error', error.message || 'Failed to add members');
        } finally {
            setIsSaving(false);
        }
    };

    // Get friends not already in group
    const availableFriends = friends.filter(friend => {
        const isInGroup = group?.members.some(m => m.userId === friend.id);
        return !isInGroup;
    });

    // Show friends as initial results when no search
    const displayResults = searchQuery.length >= 2 ? searchResults : availableFriends;

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
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back-outline" size={24} color={colors.primary} />
                </TouchableOpacity>
                <Text style={[typographyStyles.headlineMedium, styles.headerTitle]}>
                    Add Members
                </Text>
                <TouchableOpacity 
                    style={styles.doneButton} 
                    onPress={handleAddMembers}
                    disabled={isSaving || selectedMembers.length === 0}
                >
                    {isSaving ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                        <Text style={[
                            typographyStyles.labelMedium, 
                            styles.doneText,
                            selectedMembers.length === 0 && styles.doneTextDisabled
                        ]}>
                            Done
                        </Text>
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <Ionicons name="search-outline" size={20} color={colors.outline} style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by email or name..."
                        placeholderTextColor={colors.outline}
                        value={searchQuery}
                        onChangeText={handleSearch}
                    />
                </View>

                {/* Selected Members Chips */}
                {selectedMembers.length > 0 && (
                    <View style={styles.selectedSection}>
                        <Text style={[typographyStyles.labelMedium, styles.sectionTitle]}>Selected</Text>
                        <View style={styles.chipsContainer}>
                            {selectedMembers.map((member) => (
                                <View key={member.id} style={styles.chip}>
                                    <View style={styles.chipAvatar}>
                                        {member.photoURL ? (
                                            <Image source={{ uri: member.photoURL }} style={styles.chipAvatarImage} />
                                        ) : (
                                            <Text style={styles.chipAvatarText}>
                                                {member.fullName.charAt(0)}
                                            </Text>
                                        )}
                                    </View>
                                    <Text style={[typographyStyles.labelMedium, styles.chipText]}>
                                        {member.fullName.split(' ')[0]}
                                    </Text>
                                    <TouchableOpacity 
                                        style={styles.chipRemove}
                                        onPress={() => toggleSelectMember(member)}
                                    >
                                        <Ionicons name="close" size={16} color={colors.onSurfaceVariant} />
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Search Results */}
                <View style={styles.resultsSection}>
                    <Text style={[typographyStyles.labelMedium, styles.sectionTitle]}>
                        {searchQuery.length >= 2 ? 'Search Results' : 'Your Friends'}
                    </Text>
                    
                    {displayResults.length > 0 ? (
                        <View style={styles.resultsGrid}>
                            {displayResults.map((result) => {
                                const isSelected = isMemberSelected(result.id);
                                const isAlreadyInGroup = isMemberInGroup(result.id);
                                
                                return (
                                    <View key={result.id} style={[
                                        styles.resultCard,
                                        isSelected && styles.resultCardSelected,
                                    ]}>
                                        <View style={styles.resultLeft}>
                                            <View style={styles.resultAvatar}>
                                                {result.photoURL ? (
                                                    <Image source={{ uri: result.photoURL }} style={styles.resultAvatarImage} />
                                                ) : (
                                                    <Text style={styles.resultAvatarText}>
                                                        {result.fullName.charAt(0)}
                                                    </Text>
                                                )}
                                            </View>
                                            <View>
                                                <Text style={[typographyStyles.bodyMedium, styles.resultName]}>
                                                    {result.fullName}
                                                </Text>
                                                <Text style={[typographyStyles.bodySmall, styles.resultEmail]}>
                                                    {result.email}
                                                </Text>
                                            </View>
                                        </View>
                                        {isAlreadyInGroup ? (
                                            <View style={styles.addedBadge}>
                                                <Text style={styles.addedBadgeText}>Added</Text>
                                            </View>
                                        ) : (
                                            <TouchableOpacity
                                                style={[
                                                    styles.addButton,
                                                    isSelected && styles.addButtonActive,
                                                ]}
                                                onPress={() => toggleSelectMember(result)}
                                            >
                                                <Ionicons 
                                                    name={isSelected ? 'checkmark' : 'add'} 
                                                    size={20} 
                                                    color={isSelected ? colors.onPrimary : colors.primary} 
                                                />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                );
                            })}
                        </View>
                    ) : (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="person-add-outline" size={48} color={colors.outline} />
                            <Text style={[typographyStyles.bodyMedium, styles.emptyText]}>
                                {searchQuery.length >= 2 ? 'No users found' : 'No friends to add'}
                            </Text>
                            {searchQuery.length < 2 && (
                                <Text style={[typographyStyles.bodySmall, styles.emptySubtext]}>
                                    Add friends first to invite them to your group
                                </Text>
                            )}
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Bottom Action Bar */}
            <View style={styles.bottomContainer}>
                <View>
                    <Text style={[typographyStyles.labelMedium, styles.selectionLabel]}>Selection</Text>
                    <Text style={[typographyStyles.headlineMedium, styles.selectionCount]}>
                        {selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''} selected
                    </Text>
                </View>
                <TouchableOpacity
                    style={[
                        styles.addToGroupButton,
                        (selectedMembers.length === 0 || isSaving) && styles.addToGroupButtonDisabled,
                    ]}
                    onPress={handleAddMembers}
                    disabled={selectedMembers.length === 0 || isSaving}
                >
                    {isSaving ? (
                        <ActivityIndicator color={colors.onPrimary} />
                    ) : (
                        <>
                            <Text style={[typographyStyles.buttonMedium, styles.addToGroupText]}>
                                Add to Group
                            </Text>
                            <Ionicons name="chevron-forward" size={20} color={colors.onPrimary} />
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
    doneButton: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
    },
    doneText: {
        color: colors.primary,
    },
    doneTextDisabled: {
        opacity: 0.5,
    },
    scrollContent: {
        paddingHorizontal: spacing.gutter,
        paddingBottom: 120,
        paddingTop: spacing.md,
        gap: spacing.lg,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceContainer,
        borderRadius: spacing.borderRadiusLg,
        paddingHorizontal: spacing.md,
    },
    searchIcon: {
        marginRight: spacing.sm,
    },
    searchInput: {
        flex: 1,
        paddingVertical: spacing.md,
        fontSize: 16,
        fontFamily: 'Poppins_400Regular',
        color: colors.onSurface,
    },
    selectedSection: {
        gap: spacing.sm,
    },
    sectionTitle: {
        color: colors.secondary,
        textTransform: 'uppercase',
        marginLeft: spacing.xs,
    },
    chipsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.secondaryContainer,
        borderRadius: spacing.borderRadiusFull,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        gap: spacing.xs,
    },
    chipAvatar: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    chipAvatarImage: {
        width: 24,
        height: 24,
        borderRadius: 12,
    },
    chipAvatarText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: colors.onPrimary,
    },
    chipText: {
        fontSize: 12,
        color: colors.secondaryContainer,
    },
    chipRemove: {
        padding: 2,
    },
    resultsSection: {
        gap: spacing.sm,
    },
    resultsGrid: {
        gap: spacing.md,
    },
    resultCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.surfaceContainerLowest,
        padding: spacing.md,
        borderRadius: spacing.borderRadiusLg,
        borderWidth: 1,
        borderColor: colors.outlineVariant + '30',
    },
    resultCardSelected: {
        borderColor: colors.primary,
        backgroundColor: colors.primary + '05',
    },
    resultLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        flex: 1,
    },
    resultAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.primaryContainer,
        alignItems: 'center',
        justifyContent: 'center',
    },
    resultAvatarImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    resultAvatarText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.onPrimary,
    },
    resultName: {
        color: colors.onSurface,
    },
    resultEmail: {
        color: colors.outline,
    },
    addedBadge: {
        backgroundColor: colors.surfaceContainerHigh,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: spacing.borderRadiusFull,
    },
    addedBadgeText: {
        fontSize: 12,
        color: colors.onSurfaceVariant,
    },
    addButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    addButtonActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xl,
        gap: spacing.sm,
    },
    emptyText: {
        color: colors.outline,
        marginTop: spacing.sm,
    },
    emptySubtext: {
        color: colors.outline,
        textAlign: 'center',
    },
    bottomContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.gutter,
        paddingVertical: spacing.md,
        backgroundColor: colors.surfaceContainerLowest,
        borderTopLeftRadius: spacing.borderRadiusLg,
        borderTopRightRadius: spacing.borderRadiusLg,
        shadowColor: colors.onSurface,
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 4,
    },
    selectionLabel: {
        color: colors.outline,
        textTransform: 'uppercase',
    },
    selectionCount: {
        fontSize: 18,
        color: colors.primary,
    },
    addToGroupButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: spacing.borderRadiusFull,
        gap: spacing.sm,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    addToGroupButtonDisabled: {
        opacity: 0.6,
    },
    addToGroupText: {
        color: colors.onPrimary,
    },
});