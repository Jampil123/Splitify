import {
    getOrCreateConversation,
    markAsRead,
    sendMessage,
    subscribeToMessages,
} from '@/services/api/chat';
import { usePresence } from '@/services/hooks/usePresence';
import { useAuthStore } from '@/stores/authStore';
import { colors, spacing } from '@/styles';
import { Conversation, Message } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDayLabel(timestamp: any): string {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getTimeLabel(timestamp: any): string {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

// ─── List item types ─────────────────────────────────────────────────────────

type FlatItem =
    | { kind: 'message'; message: Message; isLastInRun: boolean }
    | { kind: 'separator'; label: string; id: string };

function buildFlatItems(messages: Message[]): FlatItem[] {
    const items: FlatItem[] = [];
    let lastDay = '';

    messages.forEach((msg, i) => {
        const dayLabel = getDayLabel(msg.createdAt);
        if (dayLabel !== lastDay) {
            items.push({ kind: 'separator', label: dayLabel, id: `sep_${dayLabel}` });
            lastDay = dayLabel;
        }
        const nextMsg = messages[i + 1];
        const isLastInRun = !nextMsg || nextMsg.senderId !== msg.senderId;
        items.push({ kind: 'message', message: msg, isLastInRun });
    });

    return items;
}

// ─── Message bubble ──────────────────────────────────────────────────────────

function Bubble({
    message,
    isOwn,
    isLastInRun,
    friendPhoto,
}: {
    message: Message;
    isOwn: boolean;
    isLastInRun: boolean;
    friendPhoto?: string | null;
}) {
    return (
        <View style={[styles.bubbleRow, isOwn ? styles.bubbleRowOwn : styles.bubbleRowFriend]}>
            {!isOwn && (
                <View style={styles.bubbleAvatarSlot}>
                    {isLastInRun ? (
                        <View style={styles.bubbleAvatar}>
                            {friendPhoto ? (
                                <Image source={{ uri: friendPhoto }} style={styles.bubbleAvatarImg} />
                            ) : (
                                <Text style={styles.bubbleAvatarText}>
                                    {message.senderName.charAt(0).toUpperCase()}
                                </Text>
                            )}
                        </View>
                    ) : null}
                </View>
            )}

            <View style={[styles.bubbleWrap, isOwn ? styles.bubbleWrapOwn : styles.bubbleWrapFriend]}>
                <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleFriend]}>
                    <Text style={[styles.bubbleText, isOwn ? styles.bubbleTextOwn : styles.bubbleTextFriend]}>
                        {message.text}
                    </Text>
                </View>
                {isLastInRun && (
                    <Text style={[styles.bubbleTime, isOwn ? styles.bubbleTimeOwn : styles.bubbleTimeFriend]}>
                        {getTimeLabel(message.createdAt)}
                    </Text>
                )}
            </View>
        </View>
    );
}

// ─── Day separator ───────────────────────────────────────────────────────────

function DaySeparator({ label }: { label: string }) {
    return (
        <View style={styles.daySep}>
            <View style={styles.daySepLine} />
            <Text style={styles.daySepText}>{label}</Text>
            <View style={styles.daySepLine} />
        </View>
    );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function ChatScreen() {
    const router = useRouter();
    const { user } = useAuthStore();
    const { friendId, friendName, friendPhoto } = useLocalSearchParams<{
        friendId: string;
        friendName: string;
        friendPhoto?: string;
    }>();

    const [messages, setMessages] = useState<Message[]>([]);
    const [conversation, setConversation] = useState<Conversation | null>(null);
    const [inputText, setInputText] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isInitializing, setIsInitializing] = useState(true);

    const flatListRef = useRef<FlatList>(null);

    const onlineMap = usePresence(friendId ? [friendId] : []);
    const isOnline = onlineMap[friendId] === true;

    const scrollToBottom = useCallback((animated = true) => {
        flatListRef.current?.scrollToEnd({ animated });
    }, []);

    // Initialize conversation
    useEffect(() => {
        if (!user || !friendId) return;

        const init = async () => {
            const conv = await getOrCreateConversation(
                { id: user.id, fullName: user.fullName, photoURL: user.photoURL },
                { id: friendId, fullName: friendName || 'Friend', photoURL: friendPhoto || null }
            );
            setConversation(conv);
            setIsInitializing(false);
        };

        init();
    }, [user, friendId, friendName, friendPhoto]);

    // Subscribe to messages once conversation is ready
    useEffect(() => {
        if (!conversation) return;
        const unsub = subscribeToMessages(conversation.id, msgs => {
            setMessages(msgs);
        });
        return unsub;
    }, [conversation?.id]);

    // Scroll to bottom and mark read when messages arrive
    useEffect(() => {
        if (messages.length === 0) return;
        scrollToBottom(messages.length > 1);
        if (conversation && user) {
            markAsRead(conversation.id, user.id);
        }
    }, [messages.length]);

    const flatItems = useMemo(() => buildFlatItems(messages), [messages]);

    const handleSend = async () => {
        const text = inputText.trim();
        if (!text || !conversation || !user || isSending) return;

        setInputText('');
        setIsSending(true);
        try {
            await sendMessage(
                conversation.id,
                user.id,
                user.fullName,
                text,
                conversation.participants
            );
        } finally {
            setIsSending(false);
        }
    };

    const renderItem = useCallback(({ item }: { item: FlatItem }) => {
        if (item.kind === 'separator') {
            return <DaySeparator label={item.label} />;
        }
        return (
            <Bubble
                message={item.message}
                isOwn={item.message.senderId === user?.id}
                isLastInRun={item.isLastInRun}
                friendPhoto={friendPhoto || null}
            />
        );
    }, [user?.id, friendPhoto]);

    const keyExtractor = useCallback((item: FlatItem) => {
        return item.kind === 'separator' ? item.id : item.message.id;
    }, []);

    if (isInitializing) {
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
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
        >
            <StatusBar style="dark" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Ionicons name="arrow-back-outline" size={24} color={colors.primary} />
                </TouchableOpacity>

                <View style={styles.headerCenter}>
                    <View style={styles.headerAvatarWrap}>
                        {friendPhoto ? (
                            <Image source={{ uri: friendPhoto }} style={styles.headerAvatar} />
                        ) : (
                            <Text style={styles.headerAvatarText}>
                                {(friendName || 'F').charAt(0).toUpperCase()}
                            </Text>
                        )}
                        {isOnline && <View style={styles.headerOnlineDot} />}
                    </View>
                    <View>
                        <Text style={styles.headerName} numberOfLines={1}>
                            {friendName || 'Chat'}
                        </Text>
                        <Text style={[styles.headerStatus, isOnline && styles.headerStatusOnline]}>
                            {isOnline ? 'Online' : 'Offline'}
                        </Text>
                    </View>
                </View>

                <View style={{ width: 40 }} />
            </View>

            {/* Message list */}
            <FlatList
                ref={flatListRef}
                data={flatItems}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                contentContainerStyle={styles.messageList}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                onLayout={() => scrollToBottom(false)}
                ListEmptyComponent={
                    <View style={styles.emptyChat}>
                        <Ionicons name="chatbubbles-outline" size={48} color={colors.outline} />
                        <Text style={styles.emptyChatText}>
                            Say hi to {friendName?.split(' ')[0] || 'your friend'}!
                        </Text>
                    </View>
                }
            />

            {/* Input bar */}
            <View style={styles.inputBar}>
                <TextInput
                    style={styles.input}
                    value={inputText}
                    onChangeText={setInputText}
                    placeholder={`Message ${friendName?.split(' ')[0] || ''}...`}
                    placeholderTextColor={colors.outline}
                    multiline
                    maxLength={1000}
                    returnKeyType="default"
                    onFocus={() => setTimeout(() => scrollToBottom(true), 300)}
                />
                <TouchableOpacity
                    style={[styles.sendBtn, (!inputText.trim() || isSending) && styles.sendBtnDisabled]}
                    onPress={handleSend}
                    disabled={!inputText.trim() || isSending}
                    activeOpacity={0.7}
                >
                    {isSending ? (
                        <ActivityIndicator size="small" color={colors.onPrimary} />
                    ) : (
                        <Ionicons name="send" size={18} color={colors.onPrimary} />
                    )}
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

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
    backBtn: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerCenter: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        justifyContent: 'center',
    },
    headerAvatarWrap: {
        width: 40,
        height: 40,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: colors.primaryContainer,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerAvatar: {
        width: 40,
        height: 40,
    },
    headerAvatarText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.primary,
    },
    headerOnlineDot: {
        position: 'absolute',
        bottom: 1,
        right: 1,
        width: 11,
        height: 11,
        borderRadius: 6,
        backgroundColor: '#22C55E',
        borderWidth: 2,
        borderColor: colors.surface,
    },
    headerName: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.onSurface,
        fontFamily: 'Poppins_700Bold',
    },
    headerStatus: {
        fontSize: 11,
        color: colors.outline,
        fontFamily: 'Poppins_400Regular',
    },
    headerStatusOnline: {
        color: '#22C55E',
    },

    // Message list — grows to fill space, messages start at top
    messageList: {
        paddingHorizontal: spacing.gutter,
        paddingTop: spacing.md,
        paddingBottom: spacing.sm,
        flexGrow: 1,
    },

    // Empty state
    emptyChat: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xl * 3,
        gap: spacing.md,
    },
    emptyChatText: {
        fontSize: 14,
        color: colors.onSurfaceVariant,
        fontFamily: 'Poppins_400Regular',
    },

    // Day separator
    daySep: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        marginVertical: spacing.md,
    },
    daySepLine: {
        flex: 1,
        height: StyleSheet.hairlineWidth,
        backgroundColor: colors.outlineVariant,
    },
    daySepText: {
        fontSize: 11,
        color: colors.outline,
        fontFamily: 'Poppins_400Regular',
    },

    // Bubble row
    bubbleRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginBottom: 2,
    },
    bubbleRowOwn: {
        justifyContent: 'flex-end',
    },
    bubbleRowFriend: {
        justifyContent: 'flex-start',
    },

    // Avatar next to friend's bubble
    bubbleAvatarSlot: {
        width: 28,
        height: 28,
        marginRight: spacing.xs,
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    bubbleAvatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        overflow: 'hidden',
        backgroundColor: colors.primaryContainer,
        alignItems: 'center',
        justifyContent: 'center',
    },
    bubbleAvatarImg: {
        width: 28,
        height: 28,
    },
    bubbleAvatarText: {
        fontSize: 11,
        fontWeight: 'bold',
        color: colors.primary,
    },

    // Bubble content
    bubbleWrap: {
        maxWidth: '75%',
    },
    bubbleWrapOwn: {
        alignItems: 'flex-end',
    },
    bubbleWrapFriend: {
        alignItems: 'flex-start',
    },
    bubble: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: 18,
    },
    bubbleOwn: {
        backgroundColor: colors.primary,
        borderBottomRightRadius: 4,
    },
    bubbleFriend: {
        backgroundColor: colors.surfaceContainer,
        borderBottomLeftRadius: 4,
    },
    bubbleText: {
        fontSize: 14,
        lineHeight: 20,
        fontFamily: 'Poppins_400Regular',
    },
    bubbleTextOwn: {
        color: colors.onPrimary,
    },
    bubbleTextFriend: {
        color: colors.onSurface,
    },
    bubbleTime: {
        fontSize: 10,
        marginTop: 2,
        fontFamily: 'Poppins_400Regular',
        color: colors.outline,
    },
    bubbleTimeOwn: {
        textAlign: 'right',
    },
    bubbleTimeFriend: {
        textAlign: 'left',
    },

    // Input bar
    inputBar: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: spacing.sm,
        paddingHorizontal: spacing.gutter,
        paddingTop: spacing.sm,
        paddingBottom: Platform.OS === 'ios' ? spacing.lg : spacing.md,
        backgroundColor: colors.surface,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: colors.outlineVariant + '50',
    },
    input: {
        flex: 1,
        minHeight: 44,
        maxHeight: 120,
        backgroundColor: colors.surfaceContainer,
        borderRadius: 22,
        paddingHorizontal: spacing.md,
        paddingVertical: Platform.OS === 'ios' ? spacing.sm + 2 : spacing.sm,
        fontSize: 14,
        fontFamily: 'Poppins_400Regular',
        color: colors.onSurface,
        borderWidth: 1,
        borderColor: colors.outlineVariant,
        textAlignVertical: 'center',
    },
    sendBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 3,
    },
    sendBtnDisabled: {
        backgroundColor: colors.outline,
        shadowOpacity: 0,
        elevation: 0,
    },
});
