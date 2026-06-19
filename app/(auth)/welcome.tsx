import { colors, spacing, typographyStyles } from '@/styles';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Image,
    NativeScrollEvent,
    NativeSyntheticEvent,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const { width, height } = Dimensions.get('window');

// Onboarding data
const onboardingData = [
    {
        id: '1',
        title: 'Split Bills Effortlessly',
        description: 'Create groups with friends and split expenses evenly',
        image: require('@/assets/images/onboarding1.png'),
    },
    {
        id: '2',
        title: 'Track Who Owes Whom',
        description: 'See exactly how much each person should pay or receive',
        image: require('@/assets/images/onboarding2.png'),
    },
    {
        id: '3',
        title: 'Settle Up Quickly',
        description: 'Get settlement suggestions and mark payments as complete',
        image: require('@/assets/images/onboarding3.png'),
    },
];

export default function WelcomeScreen() {
    const router = useRouter();
    const [currentIndex, setCurrentIndex] = useState(0);
    const scrollViewRef = useRef<ScrollView>(null);
    const scrollX = useRef(new Animated.Value(0)).current;

    const handleNext = () => {
        if (currentIndex < onboardingData.length - 1) {
            const nextIndex = currentIndex + 1;
            setCurrentIndex(nextIndex);
            // Scroll to next slide
            scrollViewRef.current?.scrollTo({
                x: width * nextIndex,
                y: 0,
                animated: true
            });
        } else {
            // Navigate to Login screen when finished
            router.replace('/(auth)/login');
        }
    };

    const handleSkip = () => {
        router.replace('/(auth)/login');
    };

    const handleScroll = Animated.event(
        [{ nativeEvent: { contentOffset: { x: scrollX } } }],
        {
            useNativeDriver: false,
            listener: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
                const offsetX = event.nativeEvent.contentOffset.x;
                setCurrentIndex(Math.round(offsetX / width));
            },
        }
    );

    const renderDots = () => (
        <View style={styles.dotContainer}>
            {onboardingData.map((_, i) => {
                const dotWidth = scrollX.interpolate({
                    inputRange: [(i - 1) * width, i * width, (i + 1) * width],
                    outputRange: [8, 24, 8],
                    extrapolate: 'clamp',
                });
                const dotOpacity = scrollX.interpolate({
                    inputRange: [(i - 1) * width, i * width, (i + 1) * width],
                    outputRange: [0.35, 1, 0.35],
                    extrapolate: 'clamp',
                });
                return (
                    <Animated.View
                        key={i}
                        style={[styles.dot, { width: dotWidth, opacity: dotOpacity, backgroundColor: colors.primary }]}
                    />
                );
            })}
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            
            {/* Header */}
            <View style={styles.header}>
                <Text style={[typographyStyles.headlineSmall, styles.logo]}>
                    Splitify
                </Text>
                <TouchableOpacity onPress={handleSkip} activeOpacity={0.7}>
                    <Text style={[typographyStyles.labelMedium, styles.skipButton]}>
                        Skip
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Carousel - Using ScrollView instead of FlatList */}
            <ScrollView
                ref={scrollViewRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                style={styles.carousel}
                contentContainerStyle={styles.carouselContent}
            >
                {onboardingData.map((item, index) => (
                    <View key={item.id} style={styles.slide}>
                        <View style={styles.imageContainer}>
                            <Image
                                source={item.image}
                                style={styles.image}
                                resizeMode="contain"
                            />
                        </View>
                        <Text style={[typographyStyles.headlineMedium, styles.title]}>
                            {item.title}
                        </Text>
                        <Text style={[typographyStyles.bodyLarge, styles.description]}>
                            {item.description}
                        </Text>
                    </View>
                ))}
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
                {renderDots()}
                
                <TouchableOpacity
                    style={styles.nextButton}
                    onPress={handleNext}
                    activeOpacity={0.8}
                >
                    <Text style={[typographyStyles.buttonLarge, styles.nextButtonText]}>
                        {currentIndex === onboardingData.length - 1 ? 'Get Started' : 'Next'}
                    </Text>
                </TouchableOpacity>
            </View>
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
        paddingTop: spacing.xl,
        paddingBottom: spacing.md,
        zIndex: 10,
    },
    logo: {
        color: colors.primary,
        fontWeight: '600',
    },
    skipButton: {
        color: colors.primaryContainer,
    },
    carousel: {
        flex: 1,
    },
    carouselContent: {
        flexGrow: 1,
    },
    slide: {
        width: width,
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xl,
    },
    imageContainer: {
        width: width - spacing.xl * 2,
        maxWidth: 350,
        marginBottom: spacing.xl,
        alignItems: 'center',
        justifyContent: 'center',
    },
    image: {
        width: '100%',
        height: 250,
    },
    title: {
        color: colors.onSurface,
        textAlign: 'center',
        marginBottom: spacing.md,
        maxWidth: 280,
    },
    description: {
        color: colors.onSurfaceVariant,
        textAlign: 'center',
        maxWidth: 280,
    },
    footer: {
        paddingHorizontal: spacing.gutter,
        paddingBottom: spacing.xl,
        paddingTop: spacing.lg,
        alignItems: 'center',
        gap: spacing.xl,
        backgroundColor: colors.background,
    },
    dotContainer: {
        flexDirection: 'row',
        gap: spacing.sm,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dot: {
        height: 8,
        borderRadius: 999,
    },
    nextButton: {
        width: '100%',
        maxWidth: 320,
        backgroundColor: colors.primaryContainer,
        paddingVertical: spacing.md,
        borderRadius: 999,
        alignItems: 'center',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    nextButtonText: {
        color: colors.onPrimary,
    },
});