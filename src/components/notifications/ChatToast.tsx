import { useChatStore } from '@/stores/chatStore';
import { colors, spacing } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import {
    Animated,
    Image,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export function ChatToast() {
    const router = useRouter();
    const { toast, dismissToast } = useChatStore();
    const slideY = useRef(new Animated.Value(-120)).current;
    const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const slideIn = () => {
        Animated.spring(slideY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 80,
            friction: 10,
        }).start();
    };

    const slideOut = (onDone?: () => void) => {
        if (dismissTimer.current) {
            clearTimeout(dismissTimer.current);
            dismissTimer.current = null;
        }
        Animated.timing(slideY, {
            toValue: -120,
            duration: 250,
            useNativeDriver: true,
        }).start(() => onDone?.());
    };

    useEffect(() => {
        if (toast) {
            // Reset position and slide in
            slideY.setValue(-120);
            slideIn();

            // Auto-dismiss after 4 seconds
            dismissTimer.current = setTimeout(() => {
                slideOut(dismissToast);
            }, 4000);
        }

        return () => {
            if (dismissTimer.current) {
                clearTimeout(dismissTimer.current);
            }
        };
    }, [toast?.friendId, toast?.text]);

    const handleDismiss = () => {
        slideOut(dismissToast);
    };

    const handlePress = () => {
        if (!toast) return;
        slideOut(() => {
            dismissToast();
            router.push({
                pathname: '/chat/[friendId]',
                params: {
                    friendId: toast.friendId,
                    friendName: toast.friendName,
                    friendPhoto: toast.senderPhoto || '',
                },
            });
        });
    };

    if (!toast) return null;

    return (
        <Animated.View
            style={[styles.container, { transform: [{ translateY: slideY }] }]}
            pointerEvents="box-none"
        >
            <TouchableOpacity style={styles.toast} activeOpacity={0.95} onPress={handlePress}>
                {/* Avatar */}
                <View style={styles.avatar}>
                    {toast.senderPhoto ? (
                        <Image source={{ uri: toast.senderPhoto }} style={styles.avatarImg} />
                    ) : (
                        <Text style={styles.avatarText}>
                            {toast.senderName.charAt(0).toUpperCase()}
                        </Text>
                    )}
                    <View style={styles.chatIcon}>
                        <Ionicons name="chatbubble" size={8} color={colors.onPrimary} />
                    </View>
                </View>

                {/* Content */}
                <View style={styles.content}>
                    <Text style={styles.senderName} numberOfLines={1}>
                        {toast.senderName}
                    </Text>
                    <Text style={styles.messageText} numberOfLines={1}>
                        {toast.text}
                    </Text>
                </View>

                {/* Dismiss */}
                <TouchableOpacity style={styles.closeBtn} onPress={handleDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="close" size={16} color={colors.onSurfaceVariant} />
                </TouchableOpacity>
            </TouchableOpacity>
        </Animated.View>
    );
}

const TOP_OFFSET = Platform.OS === 'ios' ? 54 : 36;

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: TOP_OFFSET,
        left: spacing.gutter,
        right: spacing.gutter,
        zIndex: 9999,
        // Shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 10,
    },
    toast: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: 16,
        padding: spacing.md,
        gap: spacing.sm,
        borderWidth: 1,
        borderColor: colors.outlineVariant + '40',
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        overflow: 'hidden',
        backgroundColor: colors.primaryContainer,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarImg: {
        width: 44,
        height: 44,
    },
    avatarText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.primary,
    },
    chatIcon: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: colors.surface,
    },
    content: {
        flex: 1,
        gap: 2,
    },
    senderName: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.onSurface,
        fontFamily: 'Poppins_700Bold',
    },
    messageText: {
        fontSize: 12,
        color: colors.onSurfaceVariant,
        fontFamily: 'Poppins_400Regular',
    },
    closeBtn: {
        width: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
