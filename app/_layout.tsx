import { getCurrentUserData } from '@/services/firebase/auth';
import { auth, onAuthStateChanged } from '@/services/firebase/config';
import { initPresence } from '@/services/firebase/presence';
import { useAuthStore } from '@/stores/authStore';
import { colors } from '@/styles';
import { Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold, Poppins_800ExtraBold, useFonts } from '@expo-google-fonts/poppins';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

export default function RootLayout() {
    const { setUser, setLoading, user, isLoading: authIsLoading } = useAuthStore();
    const [isAuthChecked, setIsAuthChecked] = useState(false);

    const [fontsLoaded] = useFonts({
        Poppins_400Regular,
        Poppins_500Medium,
        Poppins_600SemiBold,
        Poppins_700Bold,
        Poppins_800ExtraBold,
    });

    useEffect(() => {
        if (!user?.id) return;
        const cleanup = initPresence(user.id);
        return cleanup;
    }, [user?.id]);

    useEffect(() => {

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            
            if (firebaseUser) {
                try {
                    const userData = await getCurrentUserData(firebaseUser.uid);
                    setUser(userData);
                } catch (error) {
                    console.error('Error fetching user data:', error);
                    setUser(null);
                }
            } else {
                setUser(null);
            }
            setLoading(false);
            setIsAuthChecked(true);
        });

        return () => {
            unsubscribe();
        };
    }, []);

    if (!fontsLoaded || !isAuthChecked || authIsLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={{ marginTop: 10, color: colors.outline, fontFamily: 'Poppins_400Regular' }}>
                    Loading...
                </Text>
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
                    fontFamily: 'Poppins_600SemiBold',
                    fontSize: 18,
                },
                headerShadowVisible: false,
                contentStyle: {
                    backgroundColor: colors.background,
                },
            }}
        >
            {/* Splash Screen */}
            <Stack.Screen 
                name="index" 
                options={{ 
                    headerShown: false,
                    animation: 'fade',
                }} 
            />
            
            {/* Auth Screens */}
            <Stack.Screen 
                name="(auth)" 
                options={{ 
                    headerShown: false,
                    animation: 'slide_from_right',
                }} 
            />
            
            {/* Main Tabs */}
            <Stack.Screen 
                name="(tabs)" 
                options={{ 
                    headerShown: false,
                    animation: 'fade',
                }} 
            />
            
            <Stack.Screen 
                name="groups/create" 
                options={{ 
                    headerShown: false,
                    presentation: 'modal',
                }} 
            />
            
            <Stack.Screen 
                name="groups/[id]" 
                options={{ 
                    headerShown: false,
                }} 
            />

            <Stack.Screen 
                name="groups/[id]/expenses/add" 
                options={{ 
                    headerShown: false,  
                    presentation: 'modal',
                }} 
            />

            <Stack.Screen 
                name="(friends)" 
                options={{ 
                    headerShown: false,
                }} 
            />

            <Stack.Screen 
                name="groups/[id]/members/add" 
                options={{ 
                    headerShown: false,
                }} 
            />

            <Stack.Screen 
                name="groups/[id]/balances" 
                options={{ 
                    headerShown: false,
                    animation: 'slide_from_right',
                }} 
            />

            <Stack.Screen 
                name="groups/[id]/expenses/[expenseId]" 
                options={{ 
                    headerShown: false,
                    animation: 'slide_from_right',
                }} 
            />

            <Stack.Screen 
                name="groups/[id]/expenses/expenseId/edit" 
                options={{ 
                    headerShown: false,
                    presentation: 'modal',
                    animation: 'slide_from_bottom',
                }} 
            />

            <Stack.Screen 
                name="groups/[id]/settlements" 
                options={{ 
                    headerShown: false,
                    animation: 'slide_from_right',
                }} 
            />

            <Stack.Screen 
                name="groups/[id]/expenses/list" 
                options={{ 
                    headerShown: false,
                    animation: 'slide_from_right',
                }} 
            />

            <Stack.Screen
                name="groups/[id]/members/list"
                options={{
                    headerShown: false,
                    animation: 'slide_from_right',
                }}
            />

            <Stack.Screen
                name="groups/[id]/settings"
                options={{
                    headerShown: false,
                    animation: 'slide_from_right',
                }}
            />

            <Stack.Screen
                name="profile/edit"
                options={{
                    headerShown: false,
                    animation: 'slide_from_right',
                }}
            />

            <Stack.Screen
                name="notifications/[notificationId]"
                options={{
                    headerShown: false,
                    animation: 'slide_from_right',
                }}
            />

        </Stack>
    );
}