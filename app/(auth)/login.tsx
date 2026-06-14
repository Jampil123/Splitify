import { loginWithEmail, signInWithGoogle } from '@/services/firebase/auth';
import { useAuthStore } from '@/stores/authStore';
import { colors, spacing, typographyStyles } from '@/styles';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
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
    const { setUser, setLoading: setStoreLoading } = useAuthStore();
    
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState({ email: '', password: '' });

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

        console.log('🔐 Login: Starting login process');
        setIsLoading(true);
        
        try {
            const result = await loginWithEmail({ email, password });
            console.log('🔐 Login: Result', result.success, result.user?.uid);
            
            if (result.success && result.user) {
                // Wait a moment for the auth state to update
                console.log('🔐 Login: Success, waiting for auth state...');
                
                // Force wait for auth state to propagate
                setTimeout(() => {
                    console.log('🔐 Login: Navigating to home');
                    router.replace('/home');
                }, 500);
            } else {
                console.log('🔐 Login: Failed', result.error);
                Alert.alert('Login Failed', result.error || 'Invalid email or password');
            }
        } catch (error: any) {
            console.error('🔐 Login: Error', error);
            Alert.alert('Error', error.message || 'Something went wrong');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        console.log('🔐 Login: Starting Google Sign In');
        setIsLoading(true);
        
        try {
            const result = await signInWithGoogle();
            console.log('🔐 Login: Google result', result.success, result.user?.uid);
            
            if (result.success && result.user) {
                setTimeout(() => {
                    console.log('🔐 Login: Navigating to home');
                    router.replace('/home');
                }, 500);
            } else {
                console.log('🔐 Login: Google failed', result.error);
                Alert.alert('Google Sign In Failed', result.error || 'Please try again');
            }
        } catch (error: any) {
            console.error('🔐 Login: Google error', error);
            Alert.alert('Error', error.message || 'Something went wrong');
        } finally {
            setIsLoading(false);
        }
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
                        <View style={styles.logoWrapper}>
                            <Image
                                source={require('@/assets/images/splitify-logo.png')}
                                style={styles.logoImage}
                            />
                        </View>
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
                                }}
                                secureTextEntry={!showPassword}
                                editable={!isLoading}
                            />
                            <TouchableOpacity
                                style={styles.eyeIcon}
                                onPress={() => setShowPassword(!showPassword)}
                            >
                                <Text style={styles.eyeIconText}>
                                    {showPassword ? '👁️' : '👁️‍🗨️'}
                                </Text>
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
                        <Text style={[typographyStyles.bodySmall, styles.googleText]}>
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
    },
    logoWrapper: {
        width: 60,
        height: 60,
        borderRadius: spacing.borderRadiusLg,
        backgroundColor: colors.primaryFixed,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    logoImage: {
        width: 60,
        height: 60,
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
        fontFamily: 'Inter_400Regular',
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
    eyeIconText: {
        fontSize: 20,
        color: colors.outline,
    },
    forgotButton: {
        alignSelf: 'flex-end',
        marginTop: spacing.xs,
    },
    forgotText: {
        color: colors.primary,
    },
    // Button styles
    signInButton: {
        backgroundColor: colors.primaryContainer,
        paddingVertical: spacing.md,
        borderRadius: spacing.borderRadiusFull,
        alignItems: 'center',
        marginTop: spacing.md,
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
        color: colors.primary,
        fontWeight: '600',
    },
});