import { Stack } from 'expo-router';

export default function FriendsLayout() {
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
                name="add-friend" 
                options={{ 
                    title: 'Add Friend',
                    headerBackVisible: true,
                }} 
            />
        </Stack>
    );
}