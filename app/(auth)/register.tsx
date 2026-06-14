import { registerWithEmail, signInWithGoogle } from '@/services/firebase/auth';
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

export default function RegisterScreen() {
    const router = useRouter();
    const { setUser } = useAuthStore();
    
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [agreeToTerms, setAgreeToTerms] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState({
        fullName: '',
        email: '',
        password: '',
        confirmPassword: '',
        terms: '',
    });

    const validateForm = () => {
        let isValid = true;
        const newErrors = {
            fullName: '',
            email: '',
            password: '',
            confirmPassword: '',
            terms: '',
        };

        // Full Name validation
        if (!fullName.trim()) {
            newErrors.fullName = 'Full name is required';
            isValid = false;
        } else if (fullName.trim().length < 2) {
            newErrors.fullName = 'Name must be at least 2 characters';
            isValid = false;
        }

        // Email validation
        if (!email.trim()) {
            newErrors.email = 'Email is required';
            isValid = false;
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            newErrors.email = 'Please enter a valid email';
            isValid = false;
        }

        // Password validation
        if (!password) {
            newErrors.password = 'Password is required';
            isValid = false;
        } else if (password.length < 6) {
            newErrors.password = 'Password must be at least 6 characters';
            isValid = false;
        }

        // Confirm Password validation
        if (!confirmPassword) {
            newErrors.confirmPassword = 'Please confirm your password';
            isValid = false;
        } else if (password !== confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
            isValid = false;
        }

        // Terms validation
        if (!agreeToTerms) {
            newErrors.terms = 'You must agree to the Terms of Service';
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };

    const handleRegister = async () => {
        if (!validateForm()) return;

        setIsLoading(true);
        try {
            const result = await registerWithEmail({
                email,
                password,
                fullName: fullName.trim(),
            });
            
            if (result.success && result.user) {
                Alert.alert(
                    'Account Created',
                    'Your account has been created successfully!',
                    // [{ text: 'OK', onPress: () => router.replace('/(tabs)/home') }]
                );
            } else {
                Alert.alert('Registration Failed', result.error || 'Please try again');
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Something went wrong');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setIsLoading(true);
        try {
            const result = await signInWithGoogle();
            
            if (result.success && result.user) {
                // router.replace('/(tabs)/home');
            } else {
                Alert.alert('Google Sign In Failed', result.error || 'Please try again');
            }
        } catch (error: any) {
            Alert.alert('Error', error.message || 'Something went wrong');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSignIn = () => {
        router.back();
    };

    const handleTermsPress = () => {
        // Navigate to Terms of Service screen
        Alert.alert('Terms of Service', 'Terms and Conditions would go here');
    };

    const handlePrivacyPress = () => {
        // Navigate to Privacy Policy screen
        Alert.alert('Privacy Policy', 'Privacy policy would go here');
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <StatusBar style="dark" />
            
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Header */}
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
                        Create Account
                    </Text>
                    <Text style={[typographyStyles.bodyLarge, styles.subtitle]}>
                        Join Splitify today
                    </Text>
                </View>

                {/* Registration Card */}
                <View style={styles.card}>
                    {/* Full Name Field */}
                    <View style={styles.inputGroup}>
                        <Text style={[typographyStyles.labelMedium, styles.label]}>
                            Full Name
                        </Text>
                        <TextInput
                            style={[
                                styles.input,
                                errors.fullName ? styles.inputError : null
                            ]}
                            placeholder="John Doe"
                            placeholderTextColor={colors.outline}
                            value={fullName}
                            onChangeText={(text) => {
                                setFullName(text);
                                if (errors.fullName) setErrors({ ...errors, fullName: '' });
                            }}
                            editable={!isLoading}
                        />
                        {errors.fullName ? (
                            <Text style={styles.errorText}>{errors.fullName}</Text>
                        ) : null}
                    </View>

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
                        <TextInput
                            style={[
                                styles.input,
                                errors.password ? styles.inputError : null
                            ]}
                            placeholder="••••••••"
                            placeholderTextColor={colors.outline}
                            value={password}
                            onChangeText={(text) => {
                                setPassword(text);
                                if (errors.password) setErrors({ ...errors, password: '' });
                            }}
                            secureTextEntry
                            editable={!isLoading}
                        />
                        <Text style={styles.passwordHint}>
                            Min. 6 characters
                        </Text>
                        {errors.password ? (
                            <Text style={styles.errorText}>{errors.password}</Text>
                        ) : null}
                    </View>

                    {/* Confirm Password Field */}
                    <View style={styles.inputGroup}>
                        <Text style={[typographyStyles.labelMedium, styles.label]}>
                            Confirm Password
                        </Text>
                        <TextInput
                            style={[
                                styles.input,
                                errors.confirmPassword ? styles.inputError : null
                            ]}
                            placeholder="••••••••"
                            placeholderTextColor={colors.outline}
                            value={confirmPassword}
                            onChangeText={(text) => {
                                setConfirmPassword(text);
                                if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' });
                            }}
                            secureTextEntry
                            editable={!isLoading}
                        />
                        {errors.confirmPassword ? (
                            <Text style={styles.errorText}>{errors.confirmPassword}</Text>
                        ) : null}
                    </View>

                    {/* Terms Checkbox */}
                    <View style={styles.termsContainer}>
                        <TouchableOpacity
                            style={styles.checkbox}
                            onPress={() => setAgreeToTerms(!agreeToTerms)}
                            activeOpacity={0.8}
                        >
                            <View style={[
                                styles.checkboxBox,
                                agreeToTerms && styles.checkboxChecked
                            ]}>
                                {agreeToTerms && (
                                    <Text style={styles.checkboxCheck}>✓</Text>
                                )}
                            </View>
                        </TouchableOpacity>
                        <Text style={[typographyStyles.bodySmall, styles.termsText]}>
                            I agree to the{' '}
                            <Text style={styles.termsLink} onPress={handleTermsPress}>
                                Terms of Service
                            </Text>
                            {' '}and{' '}
                            <Text style={styles.termsLink} onPress={handlePrivacyPress}>
                                Privacy Policy
                            </Text>
                        </Text>
                    </View>
                    {errors.terms ? (
                        <Text style={styles.errorText}>{errors.terms}</Text>
                    ) : null}

                    {/* Create Account Button */}
                    <TouchableOpacity
                        style={[styles.registerButton, isLoading && styles.disabledButton]}
                        onPress={handleRegister}
                        disabled={isLoading}
                        activeOpacity={0.8}
                    >
                        {isLoading ? (
                            <ActivityIndicator color={colors.onPrimary} />
                        ) : (
                            <Text style={[typographyStyles.buttonLarge, styles.registerText]}>
                                Create Account
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

                    {/* Google OAuth Button */}
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
                            Continue with Google
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Footer Link */}
                <View style={styles.footer}>
                    <Text style={[typographyStyles.bodySmall, styles.footerText]}>
                        Already have an account?{' '}
                    </Text>
                    <TouchableOpacity onPress={handleSignIn}>
                        <Text style={[typographyStyles.labelMedium, styles.signInText]}>
                            Sign In
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
        paddingHorizontal: spacing.gutter,
        paddingTop: spacing.xl,
        paddingBottom: spacing.xl,
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
    },
    title: {
        color: colors.onSurface,
        marginBottom: spacing.xs,
        textAlign: 'center',
    },
    subtitle: {
        color: colors.primaryContainer,
        textAlign: 'center',
    },
    // Card styles
    card: {
        backgroundColor: colors.secondaryContainer,
        borderRadius: spacing.borderRadiusLg,
        padding: spacing.lg,
        marginBottom: spacing.lg,
        shadowColor: colors.onSurface,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
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
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.secondaryFixed,
        borderRadius: spacing.borderRadiusLg,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        height: 48,
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
    passwordHint: {
        fontSize: 11,
        color: colors.primaryContainer,
        marginTop: spacing.xs,
        marginLeft: spacing.xs,
    },
    // Terms styles
    termsContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.sm,
        marginBottom: spacing.md,
        paddingHorizontal: spacing.xs,
    },
    checkbox: {
        paddingTop: 2,
    },
    checkboxBox: {
        width: 20,
        height: 20,
        borderRadius: spacing.borderRadiusSm,
        borderWidth: 2,
        borderColor: colors.secondaryFixed,
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxChecked: {
        backgroundColor: colors.primaryContainer,
        borderColor: colors.primaryContainer,
    },
    checkboxCheck: {
        color: colors.onPrimary,
        fontSize: 12,
        fontWeight: 'bold',
    },
    termsText: {
        flex: 1,
        color: colors.onSurfaceVariant,
        lineHeight: 20,
    },
    termsLink: {
        color: colors.primaryContainer,
        fontWeight: '500',
    },
    // Button styles
    registerButton: {
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
    registerText: {
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
        marginVertical: spacing.lg,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: colors.secondaryFixed,
    },
    dividerText: {
        color: colors.onSurfaceVariant,
        marginHorizontal: spacing.md,
    },
    // Google button styles
    googleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.onSurface,
        borderRadius: spacing.borderRadiusFull,
        height: 48,
        gap: spacing.sm,
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
    signInText: {
        color: colors.primaryContainer,
        fontWeight: '600',
    },
});