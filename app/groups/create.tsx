import { db } from '@/services/firebase/config';
import { useFriends } from '@/services/hooks/useFriends';
import { useAuthStore } from '@/stores/authStore';
import { colors, spacing, typographyStyles } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { addDoc, arrayUnion, collection, doc, serverTimestamp, Timestamp, updateDoc } from 'firebase/firestore';
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

interface SelectedMember {
    userId: string;
    fullName: string;
    email: string;
    photoURL?: string | null;
}

export default function CreateGroupScreen() {
    const router = useRouter();
    const { user } = useAuthStore();
    const { friends } = useFriends(user?.id);
    
    const [groupName, setGroupName] = useState('');
    const [description, setDescription] = useState('');
    const [selectedMembers, setSelectedMembers] = useState<SelectedMember[]>([]);
    const [splitType, setSplitType] = useState<'equal' | 'custom'>('equal');
    const [isLoading, setIsLoading] = useState(false);
    const [showMemberSelector, setShowMemberSelector] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Add current user as default member
    useEffect(() => {
        if (user && !selectedMembers.some(m => m.userId === user.id)) {
            setSelectedMembers([{
                userId: user.id,
                fullName: user.fullName || 'You',
                email: user.email,
                photoURL: user.photoURL,
            }]);
        }
    }, [user]);

    const handleAddMember = (member: any) => {
        if (!selectedMembers.some(m => m.userId === member.id)) {
            setSelectedMembers([...selectedMembers, {
                userId: member.id,
                fullName: member.fullName,
                email: member.email,
                photoURL: member.photoURL,
            }]);
        }
        setShowMemberSelector(false);
        setSearchQuery('');
    };

    const handleRemoveMember = (userId: string) => {
        if (userId === user?.id) {
            Alert.alert('Cannot Remove', 'You cannot remove yourself from the group');
            return;
        }
        setSelectedMembers(selectedMembers.filter(m => m.userId !== userId));
    };

    const handleCreateGroup = async () => {
        if (!groupName.trim()) {
            Alert.alert('Error', 'Please enter a group name');
            return;
        }
        
        setIsLoading(true);
        
        try {
            // Use Timestamp.now() instead of serverTimestamp() for arrays
            const now = Timestamp.now();
            
            // Create members array
            const membersList = selectedMembers.map(member => ({
                userId: member.userId,
                fullName: member.fullName,
                email: member.email,
                photoURL: member.photoURL || null,
                joinedAt: now,
                totalPaid: 0,
                totalShare: 0,
                balance: 0,
            }));

            // Create group document
            const groupsRef = collection(db, 'groups');
            const newGroup = {
                groupName: groupName.trim(),
                groupDescription: description.trim() || '',
                groupPhoto: null,
                createdAt: serverTimestamp(),
                createdBy: user?.id,
                members: membersList,
                splitType: splitType,
                isActive: true,
                totalExpenses: 0,
                memberCount: membersList.length,
                lastActivityAt: serverTimestamp(),
                isFullySettled: false,
            };

            const docRef = await addDoc(groupsRef, newGroup);
            
            // Add group ID to each member's groups array
            for (const member of selectedMembers) {
                const userRef = doc(db, 'users', member.userId);
                await updateDoc(userRef, {
                    groups: arrayUnion(docRef.id)
                });
            }

            Alert.alert('Success', 'Group created successfully!');
            router.replace('/home');
            
        } catch (error: any) {
            console.error('Create group error:', error);
            Alert.alert('Error', error.message || 'Failed to create group');
        } finally {
            setIsLoading(false);
        }
    };

    const filteredFriends = friends.filter(friend => 
        !selectedMembers.some(m => m.userId === friend.id) &&
        (friend.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
         friend.email.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const isValid = groupName.trim().length > 0 && selectedMembers.length >= 1;

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
                    Create New Group
                </Text>
                <TouchableOpacity style={styles.previewButton}>
                    <Text style={[typographyStyles.labelMedium, styles.previewText]}>Preview</Text>
                </TouchableOpacity>
            </View>

            <ScrollView 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                {/* Group Photo Section */}
                <View style={styles.photoSection}>
                    <View style={styles.photoContainer}>
                        <Ionicons name="camera-outline" size={32} color={colors.primary} />
                        <View style={styles.photoAddBadge}>
                            <Ionicons name="add" size={14} color={colors.onPrimary} />
                        </View>
                    </View>
                    <Text style={[typographyStyles.labelMedium, styles.photoLabel]}>
                        Add Group Photo
                    </Text>
                </View>

                {/* Form Section */}
                <View style={styles.formSection}>
                    {/* Group Name */}
                    <View style={styles.inputGroup}>
                        <Text style={[typographyStyles.labelMedium, styles.label]}>
                            Group Name <Text style={styles.required}>*</Text>
                        </Text>
                        <View style={styles.inputWrapper}>
                            <TextInput
                                style={styles.input}
                                placeholder="e.g., Boracay Trip 2026"
                                placeholderTextColor={colors.outline}
                                value={groupName}
                                onChangeText={setGroupName}
                                maxLength={50}
                            />
                            <Text style={styles.charCounter}>{groupName.length}/50</Text>
                        </View>
                    </View>

                    {/* Description */}
                    <View style={styles.inputGroup}>
                        <Text style={[typographyStyles.labelMedium, styles.label]}>
                            Description (Optional)
                        </Text>
                        <View style={styles.inputWrapper}>
                            <TextInput
                                style={[styles.input, styles.textArea]}
                                placeholder="Add a description for your group..."
                                placeholderTextColor={colors.outline}
                                value={description}
                                onChangeText={setDescription}
                                multiline
                                numberOfLines={3}
                                maxLength={200}
                                textAlignVertical="top"
                            />
                            <Text style={styles.charCounter}>{description.length}/200</Text>
                        </View>
                    </View>

                    {/* Split Method */}
                    <View style={styles.splitSection}>
                        <View style={styles.splitHeader}>
                            <Text style={[typographyStyles.labelMedium, styles.label]}>
                                Default Split Method
                            </Text>
                            <Ionicons name="information-circle-outline" size={16} color={colors.outline} />
                        </View>
                        <View style={styles.splitButtons}>
                            <TouchableOpacity
                                style={[styles.splitButton, splitType === 'equal' && styles.splitButtonActive]}
                                onPress={() => setSplitType('equal')}
                            >
                                <Text style={[
                                    styles.splitButtonText,
                                    splitType === 'equal' && styles.splitButtonTextActive
                                ]}>
                                    Equal Split
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.splitButton, styles.splitButtonDisabled]}
                                disabled
                            >
                                <Text style={styles.splitButtonTextDisabled}>
                                    Custom Split
                                </Text>
                                <View style={styles.soonBadge}>
                                    <Text style={styles.soonText}>SOON</Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Members Section */}
                    <View style={styles.membersSection}>
                        <View style={styles.membersHeader}>
                            <Text style={[typographyStyles.headlineMedium, styles.membersTitle]}>
                                Members
                            </Text>
                            <View style={styles.memberCountBadge}>
                                <Text style={styles.memberCountText}>{selectedMembers.length}</Text>
                            </View>
                        </View>

                        <ScrollView 
                            horizontal 
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.membersList}
                        >
                            {selectedMembers.map((member) => (
                                <View key={member.userId} style={styles.memberItem}>
                                    <View style={styles.memberAvatarContainer}>
                                        {member.photoURL ? (
                                            <Image source={{ uri: member.photoURL }} style={styles.memberAvatar} />
                                        ) : (
                                            <View style={[styles.memberAvatarPlaceholder, member.userId === user?.id && styles.currentUserAvatar]}>
                                                <Text style={styles.memberInitials}>
                                                    {member.fullName.charAt(0)}
                                                </Text>
                                            </View>
                                        )}
                                        {member.userId !== user?.id && (
                                            <TouchableOpacity
                                                style={styles.removeMemberButton}
                                                onPress={() => handleRemoveMember(member.userId)}
                                            >
                                                <Ionicons name="close" size={12} color={colors.onError} />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                    <Text style={[typographyStyles.labelMedium, styles.memberName]}>
                                        {member.userId === user?.id ? 'You' : member.fullName.split(' ')[0]}
                                    </Text>
                                </View>
                            ))}

                            <TouchableOpacity 
                                style={styles.addMemberButton}
                                onPress={() => setShowMemberSelector(true)}
                            >
                                <View style={styles.addMemberCircle}>
                                    <Ionicons name="person-add-outline" size={24} color={colors.outline} />
                                </View>
                                <Text style={[typographyStyles.labelMedium, styles.addMemberText]}>Add</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>
                </View>
            </ScrollView>

            {/* Bottom Summary */}
            <View style={styles.bottomContainer}>
                <View style={styles.summaryCard}>
                    <View>
                        <Text style={[typographyStyles.labelMedium, styles.summaryGroupName]}>
                            {groupName || 'New Group'}
                        </Text>
                        <Text style={[typographyStyles.labelMedium, styles.summaryMemberCount]}>
                            {selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''} included
                        </Text>
                    </View>
                    <View style={styles.summaryAvatars}>
                        {selectedMembers.slice(0, 2).map((member, index) => (
                            <View key={member.userId} style={[styles.summaryAvatar, { zIndex: 2 - index }]}>
                                {member.photoURL ? (
                                    <Image source={{ uri: member.photoURL }} style={styles.summaryAvatarImage} />
                                ) : (
                                    <View style={styles.summaryAvatarPlaceholder}>
                                        <Text style={styles.summaryAvatarText}>
                                            {member.fullName.charAt(0)}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        ))}
                        {selectedMembers.length > 2 && (
                            <View style={[styles.summaryAvatar, styles.summaryAvatarMore]}>
                                <Text style={styles.summaryAvatarMoreText}>+{selectedMembers.length - 2}</Text>
                            </View>
                        )}
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.createButton, (!isValid || isLoading) && styles.createButtonDisabled]}
                    onPress={handleCreateGroup}
                    disabled={!isValid || isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator color={colors.onPrimary} />
                    ) : (
                        <>
                            <Text style={[typographyStyles.buttonLarge, styles.createButtonText]}>
                                CREATE GROUP
                            </Text>
                            <Ionicons name="chevron-forward" size={20} color={colors.onPrimary} />
                        </>
                    )}
                </TouchableOpacity>
            </View>

            {/* Member Selector Bottom Sheet */}
            <Modal
                visible={showMemberSelector}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowMemberSelector(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.bottomSheet}>
                        <View style={styles.bottomSheetHandle} />
                        
                        <View style={styles.bottomSheetHeader}>
                            <Text style={[typographyStyles.headlineSmall, styles.bottomSheetTitle]}>
                                Select Members
                            </Text>
                            <TouchableOpacity onPress={() => setShowMemberSelector(false)}>
                                <Ionicons name="close" size={24} color={colors.onSurface} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.searchContainer}>
                            <Ionicons name="search-outline" size={20} color={colors.outline} />
                            <TextInput
                                style={styles.searchInput}
                                placeholder="Search friends..."
                                placeholderTextColor={colors.outline}
                                value={searchQuery}
                                onChangeText={setSearchQuery}
                            />
                        </View>

                        <ScrollView style={styles.friendsList}>
                            {filteredFriends.length === 0 ? (
                                <View style={styles.emptyFriends}>
                                    <Text style={[typographyStyles.bodyMedium, styles.emptyText]}>
                                        {searchQuery ? 'No friends found' : 'Add friends to invite them to your group'}
                                    </Text>
                                    {!searchQuery && (
                                        <TouchableOpacity 
                                            style={styles.addFriendsButton}
                                            onPress={() => {
                                                setShowMemberSelector(false);
                                                router.push('/(tabs)/friends');
                                            }}
                                        >
                                            <Text style={styles.addFriendsButtonText}>Go to Friends</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            ) : (
                                filteredFriends.map((friend) => (
                                    <TouchableOpacity
                                        key={friend.id}
                                        style={styles.friendItem}
                                        onPress={() => handleAddMember(friend)}
                                    >
                                        <View style={styles.friendAvatar}>
                                            {friend.photoURL ? (
                                                <Image source={{ uri: friend.photoURL }} style={styles.friendAvatarImage} />
                                            ) : (
                                                <View style={styles.friendAvatarPlaceholder}>
                                                    <Text style={styles.friendInitials}>
                                                        {friend.fullName.charAt(0)}
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                        <View style={styles.friendInfo}>
                                            <Text style={[typographyStyles.bodyMedium, styles.friendName]}>
                                                {friend.fullName}
                                            </Text>
                                            <Text style={[typographyStyles.bodySmall, styles.friendEmail]}>
                                                {friend.email}
                                            </Text>
                                        </View>
                                        <View style={styles.addCheckbox}>
                                            <Ionicons name="add-circle-outline" size={24} color={colors.primary} />
                                        </View>
                                    </TouchableOpacity>
                                ))
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
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
        color: colors.onSurface,
        fontSize: 18,
    },
    previewButton: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
    },
    previewText: {
        color: colors.primary,
    },
    scrollContent: {
        paddingBottom: 200,
    },
    // Photo Section
    photoSection: {
        alignItems: 'center',
        paddingVertical: spacing.xl,
    },
    photoContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.surfaceContainerHigh,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    photoAddBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: colors.background,
    },
    photoLabel: {
        color: colors.onSurfaceVariant,
        marginTop: spacing.xs,
    },
    // Form Section
    formSection: {
        paddingHorizontal: spacing.gutter,
        gap: spacing.lg,
    },
    inputGroup: {
        gap: spacing.xs,
    },
    label: {
        color: colors.onSurfaceVariant,
        marginLeft: spacing.xs,
    },
    required: {
        color: colors.error,
    },
    inputWrapper: {
        position: 'relative',
    },
    input: {
        backgroundColor: colors.surfaceContainerLowest,
        borderWidth: 1,
        borderColor: colors.outlineVariant,
        borderRadius: spacing.borderRadiusLg,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        fontSize: 16,
        fontFamily: 'Inter_400Regular',
        color: colors.onSurface,
        paddingRight: 50,
    },
    textArea: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    charCounter: {
        position: 'absolute',
        bottom: spacing.sm,
        right: spacing.md,
        fontSize: 10,
        color: colors.outline,
    },
    // Split Method
    splitSection: {
        gap: spacing.sm,
    },
    splitHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginLeft: spacing.xs,
    },
    splitButtons: {
        flexDirection: 'row',
        backgroundColor: colors.surfaceContainer,
        borderRadius: spacing.borderRadiusFull,
        padding: 4,
    },
    splitButton: {
        flex: 1,
        paddingVertical: spacing.md,
        borderRadius: spacing.borderRadiusFull,
        alignItems: 'center',
    },
    splitButtonActive: {
        backgroundColor: colors.primary,
    },
    splitButtonDisabled: {
        opacity: 0.4,
    },
    splitButtonText: {
        color: colors.onSurfaceVariant,
        fontWeight: '500',
    },
    splitButtonTextActive: {
        color: colors.onPrimary,
    },
    splitButtonTextDisabled: {
        color: colors.onSurfaceVariant,
    },
    soonBadge: {
        position: 'absolute',
        right: spacing.md,
        backgroundColor: colors.surfaceContainerHighest,
        paddingHorizontal: spacing.xs,
        paddingVertical: 2,
        borderRadius: spacing.borderRadiusFull,
        borderWidth: 1,
        borderColor: colors.outlineVariant,
    },
    soonText: {
        fontSize: 9,
        color: colors.onSurfaceVariant,
    },
    // Members Section
    membersSection: {
        gap: spacing.md,
        paddingTop: spacing.xs,
    },
    membersHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    membersTitle: {
        color: colors.onSurface,
        fontSize: 18,
    },
    memberCountBadge: {
        backgroundColor: colors.secondaryContainer,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: spacing.borderRadiusFull,
    },
    memberCountText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: colors.secondaryContainer,
    },
    membersList: {
        gap: spacing.md,
        paddingVertical: spacing.xs,
    },
    memberItem: {
        alignItems: 'center',
        gap: spacing.xs,
        marginRight: spacing.md,
    },
    memberAvatarContainer: {
        position: 'relative',
    },
    memberAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    memberAvatarPlaceholder: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: colors.primaryContainer,
        alignItems: 'center',
        justifyContent: 'center',
    },
    currentUserAvatar: {
        borderWidth: 2,
        borderColor: colors.primary,
    },
    memberInitials: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.onPrimary,
    },
    removeMemberButton: {
        position: 'absolute',
        top: -4,
        right: -4,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: colors.error,
        alignItems: 'center',
        justifyContent: 'center',
    },
    memberName: {
        fontSize: 12,
        color: colors.onSurface,
    },
    addMemberButton: {
        alignItems: 'center',
        gap: spacing.xs,
    },
    addMemberCircle: {
        width: 50,
        height: 50,
        borderRadius: 25,
        borderWidth: 2,
        borderColor: colors.outlineVariant,
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
    },
    addMemberText: {
        fontSize: 12,
        color: colors.outline,
    },
    // Bottom Container
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
        borderTopColor: colors.outlineVariant + '30',
    },
    summaryCard: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.surfaceContainerLow,
        borderRadius: spacing.borderRadiusLg,
        padding: spacing.md,
        marginBottom: spacing.md,
    },
    summaryGroupName: {
        color: colors.primary,
        fontWeight: 'bold',
    },
    summaryMemberCount: {
        color: colors.onSurfaceVariant,
        fontSize: 10,
        marginTop: 2,
    },
    summaryAvatars: {
        flexDirection: 'row',
    },
    summaryAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: colors.background,
        marginLeft: -8,
        overflow: 'hidden',
    },
    summaryAvatarImage: {
        width: '100%',
        height: '100%',
    },
    summaryAvatarPlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: colors.primaryContainer,
        alignItems: 'center',
        justifyContent: 'center',
    },
    summaryAvatarText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: colors.onPrimary,
    },
    summaryAvatarMore: {
        backgroundColor: colors.secondaryContainer,
        alignItems: 'center',
        justifyContent: 'center',
    },
    summaryAvatarMoreText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: colors.secondaryContainer,
    },
    createButton: {
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
    createButtonDisabled: {
        opacity: 0.6,
    },
    createButtonText: {
        color: colors.onPrimary,
        fontSize: 16,
        fontWeight: '600',
    },
    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    bottomSheet: {
        backgroundColor: colors.surface,
        borderTopLeftRadius: spacing.borderRadiusXl,
        borderTopRightRadius: spacing.borderRadiusXl,
        maxHeight: '80%',
    },
    bottomSheetHandle: {
        width: 40,
        height: 4,
        backgroundColor: colors.outlineVariant,
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: spacing.md,
    },
    bottomSheetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.outlineVariant,
    },
    bottomSheetTitle: {
        fontSize: 20,
        color: colors.onSurface,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceContainerLow,
        borderRadius: spacing.borderRadiusLg,
        margin: spacing.md,
        paddingHorizontal: spacing.md,
    },
    searchInput: {
        flex: 1,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.sm,
        fontSize: 16,
        fontFamily: 'Inter_400Regular',
        color: colors.onSurface,
    },
    friendsList: {
        maxHeight: 400,
    },
    friendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        gap: spacing.md,
    },
    friendAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        overflow: 'hidden',
    },
    friendAvatarImage: {
        width: '100%',
        height: '100%',
    },
    friendAvatarPlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: colors.primaryContainer,
        alignItems: 'center',
        justifyContent: 'center',
    },
    friendInitials: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.onPrimary,
    },
    friendInfo: {
        flex: 1,
    },
    friendName: {
        color: colors.onSurface,
    },
    friendEmail: {
        color: colors.onSurfaceVariant,
    },
    addCheckbox: {
        width: 40,
        alignItems: 'center',
    },
    emptyFriends: {
        padding: spacing.xl,
        alignItems: 'center',
    },
    emptyText: {
        color: colors.outline,
        textAlign: 'center',
    },
    addFriendsButton: {
        marginTop: spacing.md,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        backgroundColor: colors.primary,
        borderRadius: spacing.borderRadiusFull,
    },
    addFriendsButtonText: {
        color: colors.onPrimary,
        fontWeight: '500',
    },
});