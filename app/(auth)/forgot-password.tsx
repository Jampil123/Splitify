import { resetPassword } from '@/services/firebase/auth';
import { colors, spacing, typographyStyles } from '@/styles';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

export default function ForgotPasswordScreen() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState('');

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
            } else {
                setError(result.error || 'Failed to send reset email');
            }
        } catch (error: any) {
            setError(error.message || 'Something went wrong');
        } finally {
            setIsLoading(false);
        }
    };

    const handleBackToLogin = () => {
        router.back();
    };

    if (isSuccess) {
        return (
            <View style={styles.successContainer}>
                <StatusBar style="dark" />
                
                {/* Background Atmospheric Effect */}
                <View style={styles.blurTop} />
                <View style={styles.blurBottom} />
                
                <View style={styles.successCard}>
                    <View style={styles.successIconContainer}>
                        <View style={styles.successIconCircle}>
                            <Text style={styles.successIcon}>✓</Text>
                        </View>
                    </View>
                    <Text style={[typographyStyles.headlineMedium, styles.successTitle]}>
                        Reset link sent!
                    </Text>
                    <Text style={[typographyStyles.bodyLarge, styles.successMessage]}>
                        Check your email for the password reset link
                    </Text>
                    <TouchableOpacity
                        style={styles.backToLoginButton}
                        onPress={handleBackToLogin}
                        activeOpacity={0.8}
                    >
                        <Text style={[typographyStyles.buttonLarge, styles.backToLoginText]}>
                            Back to Login
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <StatusBar style="dark" />
            
            {/* Background Atmospheric Effect */}
            <View style={styles.blurTop} />
            <View style={styles.blurBottom} />
            
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={handleBackToLogin}
                    activeOpacity={0.7}
                >
                    <Text style={styles.backArrow}>←</Text>
                </TouchableOpacity>
                <Text style={[typographyStyles.headlineSmall, styles.logo]}>
                    Splitify
                </Text>
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
                        <Text style={styles.iconText}>📧</Text>
                    </View>
                    <Text style={[typographyStyles.headlineMedium, styles.title]}>
                        Forgot Password?
                    </Text>
                    <Text style={[typographyStyles.bodyLarge, styles.subtitle]}>
                        Enter your email and we'll send you a reset link
                    </Text>
                </View>

                {/* Card */}
                <View style={styles.card}>
                    <View style={styles.inputGroup}>
                        <Text style={[typographyStyles.labelMedium, styles.label]}>
                            Email address
                        </Text>
                        <TextInput
                            style={[
                                styles.input,
                                error ? styles.inputError : null
                            ]}
                            placeholder="name@example.com"
                            placeholderTextColor={colors.outline}
                            value={email}
                            onChangeText={(text) => {
                                setEmail(text);
                                setError('');
                            }}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            editable={!isLoading}
                        />
                        {error ? <Text style={styles.errorText}>{error}</Text> : null}
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
                            <Text style={[typographyStyles.buttonLarge, styles.sendButtonText]}>
                                Send Reset Link
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* Footer Decorative Element */}
            <View style={styles.footerDecoration} />
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
    // Background blur effects
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
    // Header styles
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.gutter,
        paddingTop: spacing.xl,
        paddingBottom: spacing.md,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface,
    },
    backArrow: {
        fontSize: 24,
        color: colors.primaryContainer,
    },
    logo: {
        color: colors.primary,
        fontWeight: '600',
    },
    headerSpacer: {
        width: 40,
    },
    // Icon section
    iconSection: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    iconWrapper: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.primaryContainer + '10', // 10% opacity
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
    },
    iconText: {
        fontSize: 48,
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
    },
    // Card styles
    card: {
        backgroundColor: colors.secondaryContainer,
        borderRadius: spacing.borderRadiusLg,
        padding: spacing.lg,
        shadowColor: colors.onSurface,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    inputGroup: {
        marginBottom: spacing.lg,
    },
    label: {
        color: colors.onPrimaryFixedVariant,
        marginBottom: spacing.xs,
        marginLeft: spacing.xs,
    },
    input: {
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.secondaryFixed,
        borderRadius: spacing.borderRadiusLg,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        fontSize: 16,
        fontFamily: 'Poppins_400Regular',
        color: colors.onSurface,
    },
    inputError: {
        borderColor: colors.error,
    },
    errorText: {
        fontSize: 12,
        color: colors.error,
        marginTop: spacing.xs,
        marginLeft: spacing.xs,
    },
    sendButton: {
        backgroundColor: colors.primaryContainer,
        height: 50,
        borderRadius: spacing.borderRadiusFull,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
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
    footerDecoration: {
        position: 'absolute',
        bottom: 40,
        left: 0,
        right: 0,
        alignItems: 'center',
        opacity: 0.1,
        pointerEvents: 'none',
    },
    // Success state styles
    successContainer: {
        flex: 1,
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.gutter,
    },
    successCard: {
        backgroundColor: colors.secondaryContainer,
        borderRadius: spacing.borderRadiusLg,
        padding: spacing.lg,
        alignItems: 'center',
        width: '100%',
        maxWidth: 400,
        shadowColor: colors.onSurface,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 4,
    },
    successIconContainer: {
        marginBottom: spacing.lg,
    },
    successIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#4CAF50',
        alignItems: 'center',
        justifyContent: 'center',
    },
    successIcon: {
        fontSize: 40,
        color: '#FFFFFF',
        fontWeight: 'bold',
    },
    successTitle: {
        color: colors.onSurface,
        marginBottom: spacing.sm,
        textAlign: 'center',
    },
    successMessage: {
        color: colors.onSurfaceVariant,
        textAlign: 'center',
        marginBottom: spacing.xl,
        paddingHorizontal: spacing.md,
    },
    backToLoginButton: {
        backgroundColor: colors.primaryContainer,
        width: '100%',
        height: 50,
        borderRadius: spacing.borderRadiusFull,
        alignItems: 'center',
        justifyContent: 'center',
    },
    backToLoginText: {
        color: colors.onPrimary,
        fontSize: 16,
    },
});