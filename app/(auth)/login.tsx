import { getCurrentUserData, loginWithEmail } from '@/services/firebase/auth';
import { signInWithGoogleCredential } from '@/services/firebase/googleAuth';
import { useAuthStore } from '@/stores/authStore';
import { colors, spacing, typographyStyles } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import * as Google from 'expo-auth-session/providers/google';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';

WebBrowser.maybeCompleteAuthSession();
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
    View
} from 'react-native';

export default function LoginScreen() {
    const router = useRouter();
    const { setUser } = useAuthStore();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState({ email: '', password: '' });
    const [loginError, setLoginError] = useState('');

    const [, googleResponse, promptAsync] = Google.useAuthRequest({
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
        androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    });

    useEffect(() => {
        if (googleResponse?.type === 'success') {
            const { authentication } = googleResponse;
            handleGoogleCredential(
                authentication?.idToken ?? null,
                authentication?.accessToken ?? null
            );
        }
    }, [googleResponse]);

    const handleGoogleCredential = async (idToken: string | null, accessToken: string | null) => {
        setIsLoading(true);
        try {
            const result = await signInWithGoogleCredential(idToken, accessToken);
            if (result.success && result.user) {
                const userData = await getCurrentUserData(result.user.uid);
                setUser(userData);
                router.replace('/home');
            } else {
                Alert.alert('Google Sign In Failed', result.error || 'Please try again');
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Something went wrong');
        } finally {
            setIsLoading(false);
        }
    };

    const validateForm = () => {
        let isValid = true;
        const newErrors = { email: '', password: '' };

        if (!email.trim()) {
            newErrors.email = 'Email is required';
            isValid = false;
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            newErrors.email = 'Please enter a valid email';
            isValid = false;
        }

        if (!password) {
            newErrors.password = 'Password is required';
            isValid = false;
        } else if (password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters';
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };

    const handleLogin = async () => {
        if (!validateForm()) return;

        setLoginError('');
        setIsLoading(true);

        try {
            const result = await loginWithEmail({ email, password });

            if (result.success && result.user) {
                let userData = await getCurrentUserData(result.user.uid);
                if (!userData) {
                    // Firestore doc may not be ready immediately — retry once
                    await new Promise(r => setTimeout(r, 800));
                    userData = await getCurrentUserData(result.user.uid);
                }
                if (userData) setUser(userData);
                router.replace('/home');
            } else {
                setLoginError(result.error || 'Invalid email or password. Please try again.');
            }
        } catch (error: any) {
            setLoginError(error.message || 'Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleSignIn = () => {
        promptAsync();
    };

    const handleForgotPassword = () => {
        router.push('/(auth)/forgot-password');
    };

    const handleSignUp = () => {
        router.push('/(auth)/register');
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <StatusBar style="dark" />
            
            {/* Background Blur Effects */}
            <View style={styles.blurTop} />
            <View style={styles.blurBottom} />

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Header Section */}
                <View style={styles.header}>
                    <View style={styles.logoContainer}>
                        <Image
                            source={require('@/assets/images/splitify-logo.png')}
                            style={styles.logoImage}
                        />
                    </View>
                    <Text style={[typographyStyles.headlineMedium, styles.title]}>
                        Welcome Back
                    </Text>
                    <Text style={[typographyStyles.bodySmall, styles.subtitle]}>
                        Sign in to continue
                    </Text>
                </View>

                {/* Login Card */}
                <View style={styles.card}>
                    {/* Email Field */}
                    <View style={styles.inputGroup}>
                        <Text style={[typographyStyles.labelMedium, styles.label]}>
                            Email
                        </Text>
                        <TextInput
                            style={[
                                styles.input,
                                errors.email ? styles.inputError : null
                            ]}
                            placeholder="you@example.com"
                            placeholderTextColor={colors.outline}
                            value={email}
                            onChangeText={(text) => {
                                setEmail(text);
                                if (errors.email) setErrors({ ...errors, email: '' });
                                if (loginError) setLoginError('');
                            }}
                            autoCapitalize="none"
                            keyboardType="email-address"
                            editable={!isLoading}
                        />
                        {errors.email ? (
                            <Text style={styles.errorText}>{errors.email}</Text>
                        ) : null}
                    </View>

                    {/* Password Field */}
                    <View style={styles.inputGroup}>
                        <Text style={[typographyStyles.labelMedium, styles.label]}>
                            Password
                        </Text>
                        <View style={styles.passwordContainer}>
                            <TextInput
                                style={[styles.input, styles.passwordInput]}
                                placeholder="••••••••"
                                placeholderTextColor={colors.outline}
                                value={password}
                                onChangeText={(text) => {
                                    setPassword(text);
                                    if (errors.password) setErrors({ ...errors, password: '' });
                                    if (loginError) setLoginError('');
                                }}
                                secureTextEntry={!showPassword}
                                editable={!isLoading}
                            />
                            <TouchableOpacity
                                style={styles.eyeIcon}
                                onPress={() => setShowPassword(!showPassword)}
                            >
                                <Ionicons
                                    name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                                    size={20}
                                    color={colors.outline}
                                />
                            </TouchableOpacity>
                        </View>
                        {errors.password ? (
                            <Text style={styles.errorText}>{errors.password}</Text>
                        ) : null}
                        
                        <TouchableOpacity
                            style={styles.forgotButton}
                            onPress={handleForgotPassword}
                        >
                            <Text style={[typographyStyles.labelMedium, styles.forgotText]}>
                                Forgot Password?
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Inline login error */}
                    {loginError ? (
                        <View style={styles.loginErrorBanner}>
                            <Ionicons name="alert-circle-outline" size={16} color={colors.error} />
                            <Text style={styles.loginErrorText}>{loginError}</Text>
                        </View>
                    ) : null}

                    {/* Sign In Button */}
                    <TouchableOpacity
                        style={[styles.signInButton, isLoading && styles.disabledButton]}
                        onPress={handleLogin}
                        disabled={isLoading}
                        activeOpacity={0.8}
                    >
                        {isLoading ? (
                            <ActivityIndicator color={colors.onPrimary} />
                        ) : (
                            <Text style={[typographyStyles.headlineMedium, styles.signInText]}>
                                Sign In
                            </Text>
                        )}
                    </TouchableOpacity>

                    {/* Divider */}
                    <View style={styles.divider}>
                        <View style={styles.dividerLine} />
                        <Text style={[typographyStyles.labelMedium, styles.dividerText]}>
                            OR
                        </Text>
                        <View style={styles.dividerLine} />
                    </View>

                    {/* Google Sign In Button */}
                    <TouchableOpacity
                        style={styles.googleButton}
                        onPress={handleGoogleSignIn}
                        disabled={isLoading}
                        activeOpacity={0.7}
                    >
                        <View style={styles.googleIconContainer}>
                            <Image
                                source={require('@/assets/icon/google-icon.png')}
                                style={styles.googleIconImage}
                            />
                        </View>
                        <Text style={[typographyStyles.bodyMedium, styles.googleText]}>
                            Sign in with Google
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={[typographyStyles.bodySmall, styles.footerText]}>
                        Don't have an account?{' '}
                    </Text>
                    <TouchableOpacity onPress={handleSignUp}>
                        <Text style={[typographyStyles.labelMedium, styles.signUpText]}>
                            Sign Up
                        </Text>
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
        paddingHorizontal: spacing.md,
        paddingTop: spacing.xl,
        paddingBottom: spacing.xl,
    },
    // Background blur effects
    blurTop: {
        position: 'absolute',
        top: -100,
        left: -100,
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: colors.primaryContainer,
        opacity: 0.1,
    },
    blurBottom: {
        position: 'absolute',
        bottom: -100,
        right: -100,
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: colors.secondaryContainer,
        opacity: 0.1,
    },
    // Header styles
    header: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    logoContainer: {
        marginBottom: spacing.md,
        alignItems: 'center',
    },
    logoImage: {
        width: 120,
        height: 120,
        resizeMode: 'contain',
    },
    title: {
        color: colors.onSurface,
        marginBottom: spacing.xs,
    },
    subtitle: {
        color: colors.outline,
    },
    // Card styles
    card: {
        backgroundColor: colors.secondaryContainer,
        borderRadius: spacing.borderRadiusLg,
        padding: spacing.lg,
        marginBottom: spacing.lg,
        shadowColor: colors.onSurface,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    // Input styles
    inputGroup: {
        marginBottom: spacing.md,
    },
    label: {
        color: colors.onSurfaceVariant,
        marginBottom: spacing.xs,
        marginLeft: spacing.xs,
    },
    input: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.outlineVariant,
        borderRadius: spacing.borderRadiusLg,
        padding: spacing.md,
        fontSize: 14,
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
    passwordContainer: {
        position: 'relative',
    },
    passwordInput: {
        paddingRight: 48,
    },
    eyeIcon: {
        position: 'absolute',
        right: spacing.md,
        top: '50%',
        transform: [{ translateY: -12 }],
    },
    forgotButton: {
        alignSelf: 'flex-end',
        marginTop: spacing.xs,
    },
    forgotText: {
        color: colors.primary,
    },
    loginErrorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        backgroundColor: colors.error + '15',
        borderWidth: 1,
        borderColor: colors.error + '40',
        borderRadius: spacing.borderRadiusMd,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        marginBottom: spacing.sm,
    },
    loginErrorText: {
        flex: 1,
        fontSize: 13,
        color: colors.error,
        fontFamily: 'Poppins_400Regular',
        lineHeight: 18,
    },
    // Button styles
    signInButton: {
        backgroundColor: colors.primaryContainer,
        height: 48,
        borderRadius: spacing.borderRadiusFull,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: spacing.sm,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    signInText: {
        color: colors.onPrimary,
        fontSize: 16,
    },
    disabledButton: {
        opacity: 0.6,
    },
    // Divider styles
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: spacing.md,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: colors.outlineVariant,
    },
    dividerText: {
        color: colors.outline,
        marginHorizontal: spacing.md,
    },
    // Google button styles
    googleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.outlineVariant,
        borderRadius: spacing.borderRadiusFull,
        paddingVertical: spacing.md,
        gap: spacing.md,
    },
    googleIconContainer: {
        width: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    googleIconImage: {
        width: 20,
        height: 20,
        resizeMode: 'contain',
    },
    googleIcon: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.onSurface,
    },
    googleText: {
        color: colors.onSurface,
    },
    // Footer styles
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: spacing.md,
    },
    footerText: {
        color: colors.onSurfaceVariant,
    },
    signUpText: {
        color: colors.primaryContainer,
        fontWeight: '600',
    },
});