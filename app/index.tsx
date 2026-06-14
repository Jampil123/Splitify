import { useAuthStore } from '@/stores/authStore';
import { colors, spacing, typographyStyles } from '@/styles';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  StyleSheet,
  Text,
  View,
} from 'react-native';

// Key for checking if user has seen onboarding
const ONBOARDING_COMPLETED_KEY = '@splitify_onboarding_completed';

export default function SplashScreen() {
    const router = useRouter();
    const { isAuthenticated, isLoading: authLoading, user } = useAuthStore();
    
    // Animation values
    const scaleAnim = useRef(new Animated.Value(0.9)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const taglineOpacity = useRef(new Animated.Value(0.7)).current;

    useEffect(() => {
        // Logo animation: fade in + scale
        Animated.parallel([
            Animated.timing(opacityAnim, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
            }),
        ]).start();

        // Tagline pulse animation
        const pulseAnimation = Animated.loop(
            Animated.sequence([
                Animated.timing(taglineOpacity, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(taglineOpacity, {
                    toValue: 0.7,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        );
        pulseAnimation.start();

        // Wait for auth to load, then navigate
        const timer = setTimeout(() => {
            handleNavigation();
        }, 2000);

        return () => {
            clearTimeout(timer);
            pulseAnimation.stop();
        };
    }, [authLoading, isAuthenticated, user]);

    const handleNavigation = async () => {
        // Case 1: User is logged in - go directly to Home
        if (isAuthenticated && user) {
            router.replace('/(tabs)/home');
            return;
        }
        
        // Case 2: User is NOT logged in - check if they've seen onboarding
        try {
            const AsyncStorage = require('@react-native-async-storage/async-storage').default;
            const hasSeenOnboarding = await AsyncStorage.getItem(ONBOARDING_COMPLETED_KEY);
            
            if (hasSeenOnboarding === 'true') {
                // User has seen onboarding before - go to Login
                router.replace('/(auth)/login');
            } else {
                // New user - show welcome/onboarding screen
                router.replace('/(auth)/welcome');
            }
        } catch (error) {
            console.error('Error checking onboarding status:', error);
            // Default to welcome screen if error
            router.replace('/(auth)/welcome');
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            
            <View style={styles.centerContent}>
                <Animated.View
                    style={[
                        styles.logoWrapper,
                        {
                            opacity: opacityAnim,
                            transform: [{ scale: scaleAnim }],
                        },
                    ]}
                >
                    <Image
                        source={require('@/assets/images/splitify-logo.png')}
                        style={styles.logoImage}
                    />
                </Animated.View>

                <Text style={[typographyStyles.headlineLarge, styles.brandName]}>
                    Splitify
                </Text>

                <Animated.Text style={[typographyStyles.bodyLarge, styles.tagline, { opacity: taglineOpacity }]}>
                    Split expenses. Stay friends.
                </Animated.Text>
            </View>

            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primaryContainer} />
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    centerContent: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.xl,
    },
    logoWrapper: {
        width: 120,
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    logoImage: {
        width: 120,
        height: 120,
        resizeMode: 'contain',
    },
    brandName: {
        color: colors.onSurface,
        marginBottom: spacing.sm,
        textAlign: 'center',
    },
    tagline: {
        color: colors.primaryContainer,
        textAlign: 'center',
    },
    loadingContainer: {
        position: 'absolute',
        bottom: spacing.xxxl,
        alignItems: 'center',
    },
});