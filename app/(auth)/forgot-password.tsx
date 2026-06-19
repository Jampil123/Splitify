import { resetPassword } from '@/services/firebase/auth';
import { colors, spacing, typographyStyles } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

const RESEND_COOLDOWN = 60;

export default function ForgotPasswordScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState('');
    const [cooldown, setCooldown] = useState(0);
    const [isResending, setIsResending] = useState(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const inputRef = useRef<TextInput>(null);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    const startCooldown = () => {
        setCooldown(RESEND_COOLDOWN);
        timerRef.current = setInterval(() => {
            setCooldown(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current!);
                    timerRef.current = null;
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const handleResetPassword = async () => {
        if (!email.trim()) {
            setError('Email is required');
            return;
        }
        if (!/\S+@\S+\.\S+/.test(email)) {
            setError('Please enter a valid email');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const result = await resetPassword(email);
            if (result.success) {
                setIsSuccess(true);
                startCooldown();
            } else {
                setError(result.error || 'Failed to send reset email');
            }
        } catch (err: any) {
            setError(err.message || 'Something went wrong');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResend = async () => {
        if (cooldown > 0 || isResending) return;
        setIsResending(true);
        try {
            const result = await resetPassword(email);
            if (result.success) {
                startCooldown();
            }
        } finally {
            setIsResending(false);
        }
    };

    const handleBackToLogin = () => router.back();

    // ─── Success State ───────────────────────────────────────────────────────
    if (isSuccess) {
        return (
            <View style={styles.successContainer}>
                <StatusBar style="dark" />
                <View style={styles.blurTop} />
                <View style={styles.blurBottom} />

                {/* Back button */}
                <TouchableOpacity style={styles.successBack} onPress={handleBackToLogin} activeOpacity={0.7}>
                    <Ionicons name="arrow-back-outline" size={20} color={colors.primary} />
                </TouchableOpacity>

                <View style={styles.successCard}>
                    {/* Icon */}
                    <View style={styles.successIconCircle}>
                        <Ionicons name="mail-open-outline" size={36} color={colors.onPrimary} />
                    </View>

                    <Text style={[typographyStyles.headlineMedium, styles.successTitle]}>
                        Check your inbox
                    </Text>
                    <Text style={[typographyStyles.bodyMedium, styles.successMessage]}>
                        We sent a password reset link to
                    </Text>
                    <Text style={styles.successEmail}>{email}</Text>

                    {/* Steps */}
                    <View style={styles.stepsList}>
                        {[
                            { icon: 'mail-outline', text: 'Open the email we sent' },
                            { icon: 'link-outline', text: 'Tap the reset link inside' },
                            { icon: 'lock-closed-outline', text: 'Set your new password' },
                        ].map((step, i) => (
                            <View key={i} style={styles.stepRow}>
                                <View style={styles.stepIconWrap}>
                                    <Ionicons name={step.icon as any} size={16} color={colors.primary} />
                                </View>
                                <Text style={styles.stepText}>{step.text}</Text>
                            </View>
                        ))}
                    </View>

                    {/* Resend */}
                    <View style={styles.resendRow}>
                        <Text style={styles.resendLabel}>Didn't receive it?</Text>
                        {cooldown > 0 ? (
                            <Text style={styles.resendCooldown}>Resend in {cooldown}s</Text>
                        ) : (
                            <TouchableOpacity onPress={handleResend} disabled={isResending} activeOpacity={0.7}>
                                {isResending ? (
                                    <ActivityIndicator size="small" color={colors.primary} />
                                ) : (
                                    <Text style={styles.resendLink}>Resend email</Text>
                                )}
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Back to login */}
                    <TouchableOpacity
                        style={styles.backToLoginButton}
                        onPress={handleBackToLogin}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="arrow-back-outline" size={18} color={colors.onPrimary} />
                        <Text style={[typographyStyles.buttonLarge, styles.backToLoginText]}>
                            Back to Login
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    // ─── Form State ──────────────────────────────────────────────────────────
    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <StatusBar style="dark" />
            <View style={styles.blurTop} />
            <View style={styles.blurBottom} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={handleBackToLogin} activeOpacity={0.7}>
                    <Ionicons name="arrow-back-outline" size={22} color={colors.primary} />
                </TouchableOpacity>
                <Text style={[typographyStyles.headlineSmall, styles.logo]}>Splitify</Text>
                <View style={styles.headerSpacer} />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Icon and Title */}
                <View style={styles.iconSection}>
                    <View style={styles.iconWrapper}>
                        <Ionicons name="lock-open-outline" size={40} color={colors.primary} />
                    </View>
                    <Text style={[typographyStyles.headlineMedium, styles.title]}>
                        Forgot Password?
                    </Text>
                    <Text style={[typographyStyles.bodyMedium, styles.subtitle]}>
                        Enter your email and we'll send you a link to reset your password
                    </Text>
                </View>

                {/* Card */}
                <View style={styles.card}>
                    <View style={styles.inputGroup}>
                        <Text style={[typographyStyles.labelMedium, styles.label]}>
                            Email address
                        </Text>
                        <View style={[styles.inputWrapper, !!error && styles.inputWrapperError]}>
                            <Ionicons
                                name="mail-outline"
                                size={20}
                                color={error ? colors.error : colors.outline}
                                style={styles.inputIcon}
                            />
                            <TextInput
                                ref={inputRef}
                                style={styles.input}
                                placeholder="name@example.com"
                                placeholderTextColor={colors.outline}
                                value={email}
                                onChangeText={text => { setEmail(text); setError(''); }}
                                autoCapitalize="none"
                                keyboardType="email-address"
                                autoComplete="email"
                                returnKeyType="send"
                                onSubmitEditing={handleResetPassword}
                                editable={!isLoading}
                            />
                        </View>
                        {!!error && (
                            <View style={styles.errorRow}>
                                <Ionicons name="alert-circle-outline" size={14} color={colors.error} />
                                <Text style={styles.errorText}>{error}</Text>
                            </View>
                        )}
                    </View>

                    <TouchableOpacity
                        style={[styles.sendButton, isLoading && styles.disabledButton]}
                        onPress={handleResetPassword}
                        disabled={isLoading}
                        activeOpacity={0.8}
                    >
                        {isLoading ? (
                            <ActivityIndicator color={colors.onPrimary} />
                        ) : (
                            <>
                                <Ionicons name="paper-plane-outline" size={18} color={colors.onPrimary} />
                                <Text style={[typographyStyles.buttonLarge, styles.sendButtonText]}>
                                    Send Reset Link
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.backLink} onPress={handleBackToLogin} activeOpacity={0.7}>
                        <Text style={styles.backLinkText}>Back to login</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: spacing.gutter,
        paddingBottom: spacing.xl,
    },
    blurTop: {
        position: 'absolute',
        top: -50,
        right: -50,
        width: '40%',
        height: '40%',
        backgroundColor: colors.surfaceContainerHigh,
        borderRadius: 999,
        opacity: 0.5,
    },
    blurBottom: {
        position: 'absolute',
        bottom: -30,
        left: -30,
        width: '30%',
        height: '30%',
        backgroundColor: colors.secondaryFixed,
        borderRadius: 999,
        opacity: 0.5,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.gutter,
        paddingTop: spacing.xxl,
        paddingBottom: spacing.md,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.outlineVariant,
    },
    logo: {
        color: colors.primary,
        fontWeight: '600',
    },
    headerSpacer: {
        width: 40,
    },
    iconSection: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    iconWrapper: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: colors.primaryContainer,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 4,
    },
    title: {
        color: colors.onSurface,
        marginBottom: spacing.xs,
        textAlign: 'center',
    },
    subtitle: {
        color: colors.onSurfaceVariant,
        textAlign: 'center',
        maxWidth: 280,
        lineHeight: 22,
    },
    card: {
        backgroundColor: colors.secondaryContainer,
        borderRadius: spacing.borderRadiusLg,
        padding: spacing.lg,
        gap: spacing.sm,
        shadowColor: colors.onSurface,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    inputGroup: {
        gap: spacing.xs,
        marginBottom: spacing.xs,
    },
    label: {
        color: colors.onSurfaceVariant,
        marginLeft: spacing.xs,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.outlineVariant,
        borderRadius: spacing.borderRadiusLg,
        paddingHorizontal: spacing.md,
    },
    inputWrapperError: {
        borderColor: colors.error,
        backgroundColor: colors.errorContainer + '20',
    },
    inputIcon: {
        marginRight: spacing.sm,
    },
    input: {
        flex: 1,
        paddingVertical: spacing.md,
        fontSize: 15,
        fontFamily: 'Poppins_400Regular',
        color: colors.onSurface,
    },
    errorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginLeft: spacing.xs,
    },
    errorText: {
        fontSize: 12,
        color: colors.error,
        fontFamily: 'Poppins_400Regular',
    },
    sendButton: {
        backgroundColor: colors.primary,
        height: 52,
        borderRadius: spacing.borderRadiusFull,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    sendButtonText: {
        color: colors.onPrimary,
        fontSize: 16,
    },
    disabledButton: {
        opacity: 0.6,
    },
    backLink: {
        alignItems: 'center',
        paddingVertical: spacing.xs,
    },
    backLinkText: {
        fontSize: 13,
        color: colors.onSurfaceVariant,
        fontFamily: 'Poppins_400Regular',
        textDecorationLine: 'underline',
    },
    // ─── Success State ───────────────────────────────────────────────────────
    successContainer: {
        flex: 1,
        backgroundColor: colors.background,
        justifyContent: 'center',
        paddingHorizontal: spacing.gutter,
    },
    successBack: {
        position: 'absolute',
        top: spacing.xxl,
        left: spacing.gutter,
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.outlineVariant,
    },
    successCard: {
        backgroundColor: colors.secondaryContainer,
        borderRadius: spacing.borderRadiusLg,
        padding: spacing.lg,
        alignItems: 'center',
        gap: spacing.sm,
        shadowColor: colors.onSurface,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    successIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.xs,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 5,
    },
    successTitle: {
        color: colors.onSurface,
        textAlign: 'center',
    },
    successMessage: {
        color: colors.onSurfaceVariant,
        textAlign: 'center',
        marginTop: spacing.xs,
    },
    successEmail: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.primary,
        fontFamily: 'Poppins_700Bold',
        textAlign: 'center',
        marginBottom: spacing.sm,
    },
    stepsList: {
        alignSelf: 'stretch',
        backgroundColor: colors.surfaceContainer,
        borderRadius: spacing.borderRadiusMd,
        padding: spacing.md,
        gap: spacing.sm,
        marginVertical: spacing.xs,
    },
    stepRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    stepIconWrap: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.primaryContainer,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepText: {
        fontSize: 13,
        color: colors.onSurface,
        fontFamily: 'Poppins_400Regular',
        flex: 1,
    },
    resendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        paddingVertical: spacing.xs,
    },
    resendLabel: {
        fontSize: 13,
        color: colors.onSurfaceVariant,
        fontFamily: 'Poppins_400Regular',
    },
    resendLink: {
        fontSize: 13,
        color: colors.primary,
        fontWeight: '600',
        fontFamily: 'Poppins_600SemiBold',
        textDecorationLine: 'underline',
    },
    resendCooldown: {
        fontSize: 13,
        color: colors.outline,
        fontFamily: 'Poppins_400Regular',
    },
    backToLoginButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        backgroundColor: colors.primary,
        alignSelf: 'stretch',
        height: 52,
        borderRadius: spacing.borderRadiusFull,
        marginTop: spacing.xs,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 4,
    },
    backToLoginText: {
        color: colors.onPrimary,
        fontSize: 16,
    },
});
