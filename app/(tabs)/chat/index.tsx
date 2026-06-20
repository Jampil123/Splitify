import { subscribeToConversations } from '@/services/api/chat';
import { getCurrentUserData } from '@/services/firebase/auth';
import { usePresence } from '@/services/hooks/usePresence';
import { useAuthStore } from '@/stores/authStore';
import { colors, spacing, typographyStyles } from '@/styles';
import { Conversation } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(timestamp: any): string {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}h`;
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Friend Circle (online strip) ────────────────────────────────────────────

function FriendCircle({
    name,
    photo,
    isOnline,
    onPress,
}: {
    name: string;
    photo: string | null;
    isOnline: boolean;
    onPress: () => void;
}) {
    return (
        <TouchableOpacity style={styles.circleItem} onPress={onPress} activeOpacity={0.75}>
            <View style={[styles.circleRing, isOnline && styles.circleRingOnline]}>
                <View style={styles.circleAvatar}>
                    {photo ? (
                        <Image source={{ uri: photo }} style={styles.circleImg} />
                    ) : (
                        <Text style={styles.circleInitial}>{name.charAt(0).toUpperCase()}</Text>
                    )}
                </View>
                {isOnline && <View style={styles.circleDot} />}
            </View>
            <Text numberOfLines={1} style={styles.circleName}>{name.split(' ')[0]}</Text>
        </TouchableOpacity>
    );
}

// ─── Conversation Card ────────────────────────────────────────────────────────

function ConversationCard({
    conversation,
    currentUserId,
    isOnline,
    friendPhoto,
    onPress,
}: {
    conversation: Conversation;
    currentUserId: string;
    isOnline: boolean;
    friendPhoto: string | null;
    onPress: () => void;
}) {
    const friendId = conversation.participants.find(p => p !== currentUserId) ?? '';
    const friendName = conversation.participantNames[friendId] ?? 'Unknown';
    const unread = conversation.unreadCount?.[currentUserId] ?? 0;
    const hasUnread = unread > 0;
    const isLastMine = conversation.lastMessageBy === currentUserId;

    const preview = conversation.lastMessage
        ? (isLastMine ? `You: ${conversation.lastMessage}` : conversation.lastMessage)
        : 'Tap to start chatting';

    return (
        <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
            <View style={styles.cardAvatarWrap}>
                <View style={styles.cardAvatarCircle}>
                    {friendPhoto ? (
                        <Image source={{ uri: friendPhoto }} style={styles.cardAvatarImg} />
                    ) : (
                        <Text style={styles.cardAvatarInitial}>{friendName.charAt(0).toUpperCase()}</Text>
                    )}
                </View>
                {isOnline && <View style={styles.cardOnlineDot} />}
            </View>

            <View style={styles.cardInfo}>
                <Text numberOfLines={1} style={[styles.cardName, hasUnread && styles.cardNameBold]}>
                    {friendName}
                </Text>
                <Text numberOfLines={1} style={[styles.cardPreview, hasUnread && styles.cardPreviewBold]}>
                    {preview}
                </Text>
            </View>

            <View style={styles.cardRight}>
                <Text style={[styles.cardTime, hasUnread && styles.cardTimeUnread]}>
                    {formatTime(conversation.lastMessageAt)}
                </Text>
                {hasUnread ? (
                    <View style={styles.unreadBadge}>
                        <Text style={styles.unreadText}>{unread > 99 ? '99+' : unread}</Text>
                    </View>
                ) : (
                    <View style={styles.badgePlaceholder} />
                )}
            </View>
        </TouchableOpacity>
    );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function ChatListScreen() {
    const router = useRouter();
    const { user } = useAuthStore();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [profileMap, setProfileMap] = useState<Record<string, string | null>>({});

    useEffect(() => {
        if (!user?.id) { setIsLoading(false); return; }
        const unsub = subscribeToConversations(user.id, convs => {
            const sorted = [...convs].sort((a, b) =>
                (b.lastMessageAt?.toMillis?.() ?? 0) - (a.lastMessageAt?.toMillis?.() ?? 0)
            );
            setConversations(sorted);
            setIsLoading(false);
        });
        return unsub;
    }, [user?.id]);

    const friendIds = useMemo(
        () => conversations.map(c => c.participants.find(p => p !== user?.id) ?? '').filter(Boolean),
        [conversations, user?.id]
    );
    const onlineMap = usePresence(friendIds);

    // Fetch fresh profile photos for every friend in the list
    useEffect(() => {
        if (friendIds.length === 0) return;
        Promise.all(friendIds.map(id => getCurrentUserData(id))).then(profiles => {
            const map: Record<string, string | null> = {};
            profiles.forEach((p, i) => { if (p) map[friendIds[i]] = p.photoURL ?? null; });
            setProfileMap(prev => ({ ...prev, ...map }));
        });
    }, [friendIds.join(',')]);

    const filtered = useMemo(() => {
        if (!search.trim()) return conversations;
        const q = search.toLowerCase();
        return conversations.filter(c => {
            const friendId = c.participants.find(p => p !== user?.id) ?? '';
            const name = (c.participantNames[friendId] ?? '').toLowerCase();
            const msg = (c.lastMessage ?? '').toLowerCase();
            return name.includes(q) || msg.includes(q);
        });
    }, [conversations, search, user?.id]);

    // Separate online friends for the strip
    const onlineFriends = useMemo(
        () => conversations.filter(c => {
            const fId = c.participants.find(p => p !== user?.id) ?? '';
            return onlineMap[fId] === true;
        }),
        [conversations, onlineMap, user?.id]
    );

    const handleOpen = (conv: Conversation) => {
        const friendId = conv.participants.find(p => p !== user?.id) ?? '';
        router.push({
            pathname: '/chat/[friendId]',
            params: {
                friendId,
                friendName: conv.participantNames[friendId] ?? '',
                friendPhoto: conv.participantPhotos[friendId] ?? '',
            },
        });
    };

    const myPhoto = user?.photoURL ?? null;
    const myInitial = (user?.fullName ?? 'M').charAt(0).toUpperCase();

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            {/* Header — "Messages" left, my avatar right */}
            <View style={styles.header}>
                <Text style={[typographyStyles.headlineMedium, styles.headerTitle]}>Messages</Text>
                <View style={styles.myAvatar}>
                    {myPhoto ? (
                        <Image source={{ uri: myPhoto }} style={styles.myAvatarImg} />
                    ) : (
                        <Text style={styles.myAvatarInitial}>{myInitial}</Text>
                    )}
                </View>
            </View>

            {/* Search */}
            <View style={styles.searchWrap}>
                <Ionicons name="search-outline" size={18} color={colors.outline} style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search messages..."
                    placeholderTextColor={colors.outline}
                    value={search}
                    onChangeText={setSearch}
                />
                {search.length > 0 && (
                    <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Ionicons name="close-circle" size={18} color={colors.outline} />
                    </TouchableOpacity>
                )}
            </View>

            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <>
                    {/* Online friends strip — only show when not searching */}
                    {!search && onlineFriends.length > 0 && (
                        <View style={styles.onlineSection}>
                            <Text style={styles.onlineLabel}>Online Now</Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.onlineScroll}
                            >
                                {onlineFriends.map(conv => {
                                    const fId = conv.participants.find(p => p !== user?.id) ?? '';
                                    return (
                                        <FriendCircle
                                            key={conv.id}
                                            name={conv.participantNames[fId] ?? '?'}
                                            photo={profileMap[fId] ?? conv.participantPhotos[fId] ?? null}
                                            isOnline
                                            onPress={() => handleOpen(conv)}
                                        />
                                    );
                                })}
                            </ScrollView>
                        </View>
                    )}

                    {/* Conversation list */}
                    {!search && conversations.length > 0 && (
                        <Text style={styles.recentLabel}>Recent Chats</Text>
                    )}
                    <FlatList
                        data={filtered}
                        keyExtractor={c => c.id}
                        renderItem={({ item }) => {
                            const fId = item.participants.find(p => p !== user?.id) ?? '';
                            return (
                                <ConversationCard
                                    conversation={item}
                                    currentUserId={user?.id ?? ''}
                                    isOnline={onlineMap[fId] === true}
                                    friendPhoto={profileMap[fId] ?? item.participantPhotos[fId] ?? null}
                                    onPress={() => handleOpen(item)}
                                />
                            );
                        }}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={filtered.length === 0 ? styles.emptyList : styles.listContent}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <View style={styles.emptyIconWrap}>
                                    <Ionicons name="chatbubbles-outline" size={48} color={colors.outline} />
                                </View>
                                <Text style={[typographyStyles.headlineSmall, styles.emptyTitle]}>
                                    {search ? 'No results' : 'No Messages Yet'}
                                </Text>
                                <Text style={[typographyStyles.bodyMedium, styles.emptySubtitle]}>
                                    {search ? 'Try a different name or keyword' : 'Start a conversation from the Friends tab'}
                                </Text>
                            </View>
                        }
                    />
                </>
            )}
        </View>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const AVATAR = 52;
const CIRCLE = 52;

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.gutter,
        paddingTop: spacing.xxl,
        paddingBottom: spacing.md,
        backgroundColor: colors.surface,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.outlineVariant + '50',
    },
    headerTitle: { color: colors.primary },
    myAvatar: {
        width: 38,
        height: 38,
        borderRadius: 19,
        overflow: 'hidden',
        backgroundColor: colors.primaryContainer,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: colors.primary + '30',
    },
    myAvatarImg: { width: 38, height: 38 },
    myAvatarInitial: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.primary,
        fontFamily: 'Poppins_700Bold',
    },

    // Search
    searchWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.outlineVariant,
        borderRadius: spacing.borderRadiusLg,
        marginHorizontal: spacing.gutter,
        marginVertical: spacing.md,
        paddingHorizontal: spacing.md,
        gap: spacing.sm,
    },
    searchIcon: { flexShrink: 0 },
    searchInput: {
        flex: 1,
        paddingVertical: spacing.md,
        fontSize: 14,
        fontFamily: 'Poppins_400Regular',
        color: colors.onSurface,
    },

    loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },

    // Online strip
    onlineSection: {
        paddingTop: spacing.xs,
        paddingBottom: spacing.sm,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.outlineVariant + '40',
    },
    onlineLabel: {
        fontSize: 12,
        fontFamily: 'Poppins_600SemiBold',
        color: colors.onSurfaceVariant,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        paddingHorizontal: spacing.gutter,
        marginBottom: spacing.sm,
    },
    onlineScroll: {
        paddingHorizontal: spacing.gutter,
        gap: spacing.md,
    },

    // Friend circle
    circleItem: { alignItems: 'center', gap: 5, width: 60 },
    circleRing: {
        width: CIRCLE + 4,
        height: CIRCLE + 4,
        borderRadius: (CIRCLE + 4) / 2,
        padding: 2,
        borderWidth: 2,
        borderColor: colors.outlineVariant,
        position: 'relative',
    },
    circleRingOnline: { borderColor: '#22C55E' },
    circleAvatar: {
        width: CIRCLE,
        height: CIRCLE,
        borderRadius: CIRCLE / 2,
        overflow: 'hidden',
        backgroundColor: colors.primaryContainer,
        alignItems: 'center',
        justifyContent: 'center',
    },
    circleImg: { width: CIRCLE, height: CIRCLE },
    circleInitial: { fontSize: 18, fontWeight: '700', color: colors.primary, fontFamily: 'Poppins_700Bold' },
    circleDot: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 13,
        height: 13,
        borderRadius: 7,
        backgroundColor: '#22C55E',
        borderWidth: 2,
        borderColor: colors.background,
    },
    circleName: {
        fontSize: 11,
        fontFamily: 'Poppins_400Regular',
        color: colors.onSurfaceVariant,
        textAlign: 'center',
    },

    // Section label
    recentLabel: {
        fontSize: 12,
        fontFamily: 'Poppins_600SemiBold',
        color: colors.onSurfaceVariant,
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        paddingHorizontal: spacing.gutter,
        paddingTop: spacing.md,
        paddingBottom: spacing.sm,
    },

    // Conversation card
    listContent: { paddingBottom: 80 },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.gutter,
        paddingVertical: spacing.md,
        gap: spacing.md,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.outlineVariant + '40',
        backgroundColor: colors.background,
    },
    cardAvatarWrap: { position: 'relative' },
    cardAvatarCircle: {
        width: AVATAR,
        height: AVATAR,
        borderRadius: AVATAR / 2,
        overflow: 'hidden',
        backgroundColor: colors.primaryContainer,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardAvatarImg: { width: AVATAR, height: AVATAR },
    cardAvatarInitial: { fontSize: 20, fontWeight: '700', color: colors.primary, fontFamily: 'Poppins_700Bold' },
    cardOnlineDot: {
        position: 'absolute',
        bottom: 1,
        right: 1,
        width: 13,
        height: 13,
        borderRadius: 7,
        backgroundColor: '#22C55E',
        borderWidth: 2,
        borderColor: colors.background,
    },
    cardInfo: { flex: 1, minWidth: 0, gap: 3 },
    cardName: { fontSize: 15, fontFamily: 'Poppins_500Medium', color: colors.onSurface },
    cardNameBold: { fontFamily: 'Poppins_700Bold' },
    cardPreview: { fontSize: 13, fontFamily: 'Poppins_400Regular', color: colors.onSurfaceVariant },
    cardPreviewBold: { color: colors.onSurface, fontFamily: 'Poppins_500Medium' },
    cardRight: { alignItems: 'flex-end', gap: 5, flexShrink: 0 },
    cardTime: { fontSize: 11, fontFamily: 'Poppins_400Regular', color: colors.outline },
    cardTimeUnread: { color: colors.primary, fontFamily: 'Poppins_500Medium' },
    unreadBadge: {
        backgroundColor: colors.primary,
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 5,
    },
    unreadText: { fontSize: 10, fontWeight: 'bold', color: colors.onPrimary, fontFamily: 'Poppins_700Bold' },
    badgePlaceholder: { height: 20 },

    // Empty
    emptyList: { flex: 1 },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 80,
        paddingHorizontal: spacing.xl,
    },
    emptyIconWrap: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: colors.surfaceContainerHighest,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
    },
    emptyTitle: { color: colors.onSurface, marginBottom: spacing.sm, textAlign: 'center' },
    emptySubtitle: { color: colors.onSurfaceVariant, textAlign: 'center' },
});
