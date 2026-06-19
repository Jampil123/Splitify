import { Stack } from 'expo-router';

export default function AuthLayout() {
    return (
        <Stack
            screenOptions={{
                headerStyle: {
                    backgroundColor: '#F7FBFD',
                },
                headerTintColor: '#081E2A',
                headerTitleStyle: {
                    fontFamily: 'Poppins_600SemiBold',
                    fontSize: 18,
                },
                headerShadowVisible: false,
            }}
        >
            <Stack.Screen 
                name="welcome" 
                options={{ 
                    headerShown: false,
                    title: '',
                }} 
            />
            <Stack.Screen 
                name="login" 
                options={{ 
                    title: '',
                    headerBackVisible: false,
                    headerShown: false,
                }} 
            />
            <Stack.Screen 
                name="register" 
                options={{ 
                    title: 'Create Account',
                    headerBackVisible: true,
                    headerShown: false,
                }} 
            />
            <Stack.Screen 
                name="forgot-password" 
                options={{ 
                    title: 'Reset Password',
                    headerBackVisible: true,
                    headerShown: false,
                }} 
            />
        </Stack>
    );
}