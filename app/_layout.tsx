import { getCurrentUserData } from '@/services/firebase/auth';
import { auth, onAuthStateChanged } from '@/services/firebase/config';
import { useAuthStore } from '@/stores/authStore';
import { colors } from '@/styles';
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold, useFonts } from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

export default function RootLayout() {
    const { setUser, setLoading } = useAuthStore();
    const [isAuthChecked, setIsAuthChecked] = useState(false);

    // Load Google Fonts
    const [fontsLoaded] = useFonts({
        Inter_400Regular,
        Inter_500Medium,
        Inter_600SemiBold,
        Inter_700Bold,
        Inter_800ExtraBold,
    });

    // Check authentication state on mount
    useEffect(() => {
        console.log('🔐 RootLayout: Setting up auth listener');
        
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            console.log('🔐 RootLayout: Auth state changed', firebaseUser?.uid || 'No user');
            
            if (firebaseUser) {
                // Fetch user data from Firestore
                try {
                    const userData = await getCurrentUserData(firebaseUser.uid);
                    console.log('🔐 RootLayout: User data fetched', userData?.id);
                    setUser(userData);
                } catch (error) {
                    console.error('Error fetching user data:', error);
                    setUser(null);
                }
            } else {
                console.log('🔐 RootLayout: No user, clearing auth');
                setUser(null);
            }
            setIsAuthChecked(true);
        });

        return () => {
            console.log('🔐 RootLayout: Cleaning up auth listener');
            unsubscribe();
        };
    }, []);

    // Show loading screen while fonts load or auth checks
    if (!fontsLoaded || !isAuthChecked) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{ marginTop: 10, color: colors.outline }}>Loading...</Text>
            </View>
        );
    }

    return (
        <Stack
            screenOptions={{
                headerStyle: {
                    backgroundColor: colors.surface,
                },
                headerTintColor: colors.onSurface,
                headerTitleStyle: {
                    fontFamily: 'Inter_600SemiBold',
                    fontSize: 18,
                },
                headerShadowVisible: false,
                contentStyle: {
                    backgroundColor: colors.background,
                },
            }}
        >
            {/* Splash Screen - No Header */}
            <Stack.Screen 
                name="index" 
                options={{ 
                    headerShown: false,
                    animation: 'fade',
                }} 
            />
            
            {/* Auth Screens - No Header */}
            <Stack.Screen 
                name="(auth)" 
                options={{ 
                    headerShown: false,
                    animation: 'slide_from_right',
                }} 
            />
            
            {/* Main Tabs - No Header */}
            <Stack.Screen 
                name="(tabs)" 
                options={{ 
                    headerShown: false,
                    animation: 'fade',
                }} 
            />
            
            {/* Group Screens */}
            <Stack.Screen 
                name="groups" 
                options={{ 
                    headerShown: false,
                    animation: 'slide_from_right',
                }} 
            />
        </Stack>
    );
}