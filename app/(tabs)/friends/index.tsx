import { useFriends } from '@/services/hooks/useFriends';
import { usePresence } from '@/services/hooks/usePresence';
import { useAuthStore } from '@/stores/authStore';
import { colors, spacing, typographyStyles } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';
import {
    Alert,
    FlatList,
    Image,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

// Friend Card Component
interface FriendCardProps {
    id: string;
    name: string;
    mutualGroups: number;
    avatar?: string | null;
    isOnline?: boolean;
    onChat?: () => void;
}

function FriendCard({ id, name, mutualGroups, avatar, isOnline, onChat }: FriendCardProps) {
    return (
        <View style={styles.friendCard}>
            <View style={styles.avatarWrapper}>
                <View style={styles.avatarContainer}>
                    {avatar ? (
                        <Image source={{ uri: avatar }} style={styles.avatar} />
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <Text style={styles.avatarText}>{name.charAt(0)}</Text>
                        </View>
                    )}
                </View>
                {isOnline && <View style={styles.onlineDot} />}
            </View>
            <View style={styles.friendInfo}>
                <Text style={[typographyStyles.titleMedium, styles.friendName]}>
                    {name}
                </Text>
                <Text style={[typographyStyles.bodySmall, styles.mutualGroups]}>
                    {mutualGroups} {mutualGroups === 1 ? 'mutual group' : 'mutual groups'}
                </Text>
            </View>
            <TouchableOpacity style={styles.chatButton} onPress={onChat}>
                <Ionicons name="chatbubble-outline" size={20} color={colors.secondary} />
            </TouchableOpacity>
        </View>
    );
}

// Update ReceivedRequestCard component
interface ReceivedRequestCardProps {
    id: string;
    name: string;
    avatar?: string | null;  // Allow null
    onAccept: () => void;
    onReject: () => void;
}

function ReceivedRequestCard({ id, name, avatar, onAccept, onReject }: ReceivedRequestCardProps) {
    return (
        <View style={styles.requestCard}>
            <View style={styles.avatarContainer}>
                {avatar ? (
                    <Image source={{ uri: avatar }} style={styles.avatar} />
                ) : (
                    <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarText}>{name.charAt(0)}</Text>
                    </View>
                )}
            </View>
            <View style={styles.friendInfo}>
                <Text style={[typographyStyles.titleMedium, styles.friendName]}>
                    {name}
                </Text>
                <Text style={[typographyStyles.bodySmall, styles.requestStatus]}>
                    Wants to be friends
                </Text>
            </View>
            <View style={styles.requestActions}>
                <TouchableOpacity style={styles.acceptButton} onPress={onAccept}>
                    <Ionicons name="checkmark" size={18} color={colors.onPrimary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.rejectButton} onPress={onReject}>
                    <Ionicons name="close" size={18} color={colors.error} />
                </TouchableOpacity>
            </View>
        </View>
    );
}

// Update SentRequestCard component
interface SentRequestCardProps {
    id: string;
    name: string;
    avatar?: string | null;  // Allow null
    onCancel: () => void;
}

function SentRequestCard({ id, name, avatar, onCancel }: SentRequestCardProps) {
    return (
        <View style={[styles.requestCard, styles.sentRequestCard]}>
            <View style={styles.avatarContainer}>
                {avatar ? (
                    <Image source={{ uri: avatar }} style={styles.avatar} />
                ) : (
                    <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarText}>{name.charAt(0)}</Text>
                    </View>
                )}
            </View>
            <View style={styles.friendInfo}>
                <Text style={[typographyStyles.titleMedium, styles.friendName]}>
                    {name}
                </Text>
                <Text style={[typographyStyles.bodySmall, styles.requestStatus]}>
                    Request pending
                </Text>
            </View>
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
        </View>
    );
}

// Empty State Component
function EmptyState({ onAddFriend }: { onAddFriend: () => void }) {
    return (
        <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
                <Ionicons name="people-outline" size={48} color={colors.outline} />
            </View>
            <Text style={[typographyStyles.headlineSmall, styles.emptyTitle]}>
                No Friends Yet
            </Text>
            <Text style={[typographyStyles.bodyMedium, styles.emptyText]}>
                Add friends to start splitting expenses together
            </Text>
            <TouchableOpacity style={styles.emptyButton} onPress={onAddFriend}>
                <Text style={[typographyStyles.buttonMedium, styles.emptyButtonText]}>
                    Add Friends
                </Text>
            </TouchableOpacity>
        </View>
    );
}

export default function FriendsScreen() {
    const router = useRouter();
    const { user } = useAuthStore();
    const {
        friends,
        pendingRequests,
        sentRequests,
        isLoading,
        fetchAllFriendData,
        acceptRequest,
        rejectRequest,
        unfriend,
        searchForUsers,
    } = useFriends(user?.id);

    const friendIds = friends.map((f) => f.id);
    const onlineMap = usePresence(friendIds);

    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState<'friends' | 'requests'>('friends');
    const [refreshing, setRefreshing] = useState(false);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchAllFriendData();
        setRefreshing(false);
    }, [fetchAllFriendData]);

    const handleSearch = async (text: string) => {
        setSearchQuery(text);
        if (text.length > 1) {
            setIsSearching(true);
            const results = await searchForUsers(text);
            setSearchResults(results);
            setIsSearching(false);
        } else {
            setSearchResults([]);
        }
    };

    const handleAddFriend = () => {
        router.push('/(friends)/add-friend');
    };

    const handleAcceptRequest = async (requestId: string) => {
        const success = await acceptRequest(requestId);
        if (success) {
            Alert.alert('Success', 'Friend request accepted!');
        }
    };

    const handleRejectRequest = async (requestId: string) => {
        Alert.alert(
            'Reject Request',
            'Are you sure you want to reject this friend request?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reject',
                    style: 'destructive',
                    onPress: async () => {
                        await rejectRequest(requestId);
                    },
                },
            ]
        );
    };

    const handleCancelRequest = async (requestId: string) => {
        Alert.alert(
            'Cancel Request',
            'Are you sure you want to cancel this friend request?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Cancel Request',
                    style: 'destructive',
                    onPress: async () => {
                        await rejectRequest(requestId);
                    },
                },
            ]
        );
    };

    const handleUnfriend = (friendId: string, friendName: string) => {
        Alert.alert(
            'Remove Friend',
            `Are you sure you want to remove ${friendName} from your friends?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                        await unfriend(friendId);
                    },
                },
            ]
        );
    };

    // Update the render functions where avatar is passed
    const renderFriendItem = ({ item }: { item: any }) => (
        <FriendCard
            id={item.id}
            name={item.fullName}
            mutualGroups={0}
            avatar={item.photoURL || undefined}
            isOnline={onlineMap[item.id] === true}
            onChat={() => {
                Alert.alert('Chat', `Chat with ${item.fullName} coming soon`);
            }}
        />
    );

    const renderReceivedRequest = ({ item }: { item: any }) => (
        <ReceivedRequestCard
            id={item.id}
            name={item.fromUserName}
            avatar={item.fromUserPhoto || undefined}  // Convert null to undefined
            onAccept={() => handleAcceptRequest(item.id)}
            onReject={() => handleRejectRequest(item.id)}
        />
    );

    const renderSentRequest = ({ item }: { item: any }) => (
        <SentRequestCard
            id={item.id}
            name={item.toUserName}
            avatar={item.toUserPhoto || undefined}  // Convert null to undefined
            onCancel={() => handleCancelRequest(item.id)}
        />
    );

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            
            {/* Header */}
            <View style={styles.header}>
                <Text style={[typographyStyles.headlineMedium, styles.headerTitle]}>
                    Friends
                </Text>
                <TouchableOpacity style={styles.addButton} onPress={handleAddFriend}>
                    <Ionicons name="person-add-outline" size={24} color={colors.primary} />
                </TouchableOpacity>
            </View>

            {/* Tab Bar */}
            <View style={styles.tabBar}>
                <TouchableOpacity
                    style={styles.tab}
                    onPress={() => setActiveTab('friends')}
                >
                    <Text
                        style={[
                            styles.tabText,
                            activeTab === 'friends' && styles.tabTextActive,
                        ]}
                    >
                        My Friends
                    </Text>
                    {activeTab === 'friends' && <View style={styles.tabUnderline} />}
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.tab}
                    onPress={() => setActiveTab('requests')}
                >
                    <Text
                        style={[
                            styles.tabText,
                            activeTab === 'requests' && styles.tabTextActive,
                        ]}
                    >
                        Requests
                        {pendingRequests.length > 0 && (
                            <View style={styles.requestBadge}>
                                <Text style={styles.requestBadgeText}>
                                    {pendingRequests.length}
                                </Text>
                            </View>
                        )}
                    </Text>
                    {activeTab === 'requests' && <View style={styles.tabUnderline} />}
                </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <Ionicons name="search-outline" size={20} color={colors.outline} style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search friends..."
                    placeholderTextColor={colors.outline}
                    value={searchQuery}
                    onChangeText={handleSearch}
                />
            </View>

            {/* Content */}
            {activeTab === 'friends' ? (
                <FlatList
                    data={searchQuery.length > 1 ? searchResults : friends}
                    keyExtractor={(item) => item.id}
                    renderItem={renderFriendItem}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
                    }
                    ListEmptyComponent={
                        <EmptyState onAddFriend={handleAddFriend} />
                    }
                    showsVerticalScrollIndicator={false}
                />
            ) : (
                <FlatList
                    data={[
                        ...pendingRequests.map(r => ({ ...r, type: 'received' })),
                        ...sentRequests.map(r => ({ ...r, type: 'sent' })),
                    ]}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => {
                        if (pendingRequests.find(r => r.id === item.id)) {
                            return renderReceivedRequest({ item });
                        } else {
                            return renderSentRequest({ item });
                        }
                    }}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
                    }
                    ListHeaderComponent={
                        <>
                            {pendingRequests.length > 0 && (
                                <>
                                    <Text style={styles.sectionHeader}>Received</Text>
                                    {pendingRequests.map(item => (
                                        <ReceivedRequestCard
                                            key={item.id}
                                            id={item.id}
                                            name={item.fromUserName}
                                            avatar={item.fromUserPhoto}
                                            onAccept={() => handleAcceptRequest(item.id)}
                                            onReject={() => handleRejectRequest(item.id)}
                                        />
                                    ))}
                                </>
                            )}
                            {sentRequests.length > 0 && (
                                <>
                                    <Text style={[styles.sectionHeader, styles.sentHeader]}>Sent</Text>
                                    {sentRequests.map(item => (
                                        <SentRequestCard
                                            key={item.id}
                                            id={item.id}
                                            name={item.toUserName}
                                            avatar={item.toUserPhoto}
                                            onCancel={() => handleCancelRequest(item.id)}
                                        />
                                    ))}
                                </>
                            )}
                            {pendingRequests.length === 0 && sentRequests.length === 0 && (
                                <View style={styles.emptyRequestsContainer}>
                                    <Text style={[typographyStyles.bodyMedium, styles.emptyText]}>
                                        No pending requests
                                    </Text>
                                </View>
                            )}
                        </>
                    }
                    showsVerticalScrollIndicator={false}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.gutter,
        paddingTop: spacing.xxl,
        paddingBottom: spacing.md,
        backgroundColor: colors.surface,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.outlineVariant + '50',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    headerTitle: {
        color: colors.primary,
    },
    headerAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    headerAvatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.primaryContainer,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerAvatarText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.onPrimary,
    },
    addButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface,
    },
    avatarWrapper: {
        position: 'relative',
    },
    avatarContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        overflow: 'hidden',
    },
    onlineDot: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 11,
        height: 11,
        borderRadius: 6,
        backgroundColor: '#22C55E',
        borderWidth: 2,
        borderColor: colors.surface,
    },
    avatar: {
        width: '100%',
        height: '100%',
    },
    avatarPlaceholder: {
        width: '100%',
        height: '100%',
        borderRadius: 20,
        backgroundColor: colors.primaryContainer,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.onPrimary,
    },
    // Tab Bar
    tabBar: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: colors.outlineVariant,
        marginHorizontal: spacing.gutter,
    },
    tab: {
        flex: 1,
        paddingVertical: spacing.md,
        alignItems: 'center',
        position: 'relative',
    },
    tabText: {
        fontSize: 14,
        fontWeight: '500',
        color: colors.onSurfaceVariant,
    },
    tabTextActive: {
        color: colors.primary,
        fontWeight: '600',
    },
    tabUnderline: {
        position: 'absolute',
        bottom: -1,
        left: 0,
        right: 0,
        height: 3,
        backgroundColor: colors.primary,
        borderRadius: 3,
    },
    requestBadge: {
        position: 'absolute',
        top: -8,
        right: -16,
        backgroundColor: colors.error,
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    requestBadgeText: {
        fontSize: 10,
        color: colors.onError,
        fontWeight: 'bold',
    },
    // Search
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.outlineVariant,
        borderRadius: spacing.borderRadiusLg,
        marginHorizontal: spacing.gutter,
        marginVertical: spacing.md,
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
    // List
    listContent: {
        paddingHorizontal: spacing.gutter,
        paddingBottom: 80,
    },
    // Friend Card
    friendCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.secondaryContainer,
        borderRadius: spacing.borderRadiusLg,
        padding: spacing.md,
        marginBottom: spacing.md,
        gap: spacing.md,
    },
    friendInfo: {
        flex: 1,
    },
    friendName: {
        color: colors.onSurface,
        fontSize: 14,
        marginBottom: 2,
    },
    mutualGroups: {
        color: colors.onSurfaceVariant,
        fontSize: 12,
    },
    chatButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface,
    },
    // Request Card
    requestCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.secondaryContainer,
        borderRadius: spacing.borderRadiusLg,
        padding: spacing.md,
        marginBottom: spacing.md,
        gap: spacing.md,
    },
    sentRequestCard: {
        opacity: 0.8,
    },
    requestStatus: {
        color: colors.onSurfaceVariant,
        fontSize: 12,
    },
    requestActions: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    acceptButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rejectButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.error,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButton: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: spacing.borderRadiusFull,
        borderWidth: 1,
        borderColor: colors.primary,
    },
    cancelButtonText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.primary,
    },
    sectionHeader: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.primary,
        marginTop: spacing.md,
        marginBottom: spacing.md,
    },
    sentHeader: {
        marginTop: spacing.lg,
    },
    emptyRequestsContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xl,
    },
    // Empty State
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xxl,
        paddingHorizontal: spacing.xl,
    },
    emptyIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.surfaceContainerHighest,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
    },
    emptyTitle: {
        color: colors.onSurface,
        marginBottom: spacing.sm,
        textAlign: 'center',
    },
    emptyText: {
        color: colors.onSurfaceVariant,
        textAlign: 'center',
        marginBottom: spacing.lg,
    },
    emptyButton: {
        backgroundColor: colors.primaryContainer,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: spacing.borderRadiusFull,
    },
    emptyButtonText: {
        color: colors.onPrimary,
    },
});