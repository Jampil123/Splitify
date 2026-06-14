import { TabBar } from '@/components/navigation/TabBar';
import { Tabs } from 'expo-router';

export default function TabLayout() {
    return (
        <Tabs
            tabBar={(props) => <TabBar {...props} />}
            screenOptions={{
                headerShown: false,
            }}
        >
            <Tabs.Screen name="home/index" options={{ title: 'Home' }} />
            <Tabs.Screen name="friends/index" options={{ title: 'Friends' }} />
            <Tabs.Screen name="notifications/index" options={{ title: 'Alerts' }} />
            <Tabs.Screen name="profile/index" options={{ title: 'Profile' }} />
        </Tabs>
    );
}