import { colors, spacing } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface TabBarProps {
    state: any;
    descriptors: any;
    navigation: any;
}

export function TabBar({ state, descriptors, navigation }: TabBarProps) {
    const getIconName = (routeName: string, isFocused: boolean) => {
        const iconMap: Record<string, { focused: string; unfocused: string }> = {
            'home/index': { focused: 'home', unfocused: 'home-outline' },
            'friends/index': { focused: 'people', unfocused: 'people-outline' },
            'notifications/index': { focused: 'notifications', unfocused: 'notifications-outline' },
            'profile/index': { focused: 'person', unfocused: 'person-outline' },
        };
        
        const icons = iconMap[routeName] || { focused: 'apps', unfocused: 'apps-outline' };
        return isFocused ? icons.focused : icons.unfocused;
    };

    const getLabel = (routeName: string) => {
        const labelMap: Record<string, string> = {
            'home/index': 'Home',
            'friends/index': 'Friends',
            'notifications/index': 'Alerts',
            'profile/index': 'Profile',
        };
        return labelMap[routeName] || routeName;
    };

    return (
        <View style={styles.container}>
            {state.routes.map((route: any, index: number) => {
                const isFocused = state.index === index;
                const label = getLabel(route.name);
                const iconName = getIconName(route.name, isFocused);

                const onPress = () => {
                    const event = navigation.emit({
                        type: 'tabPress',
                        target: route.key,
                        canPreventDefault: true,
                    });

                    if (!isFocused && !event.defaultPrevented) {
                        navigation.navigate(route.name);
                    }
                };

                return (
                    <TouchableOpacity
                        key={route.key}
                        onPress={onPress}
                        style={styles.tabItem}
                        activeOpacity={0.7}
                    >
                        <Ionicons 
                            name={iconName as any} 
                            size={24} 
                            color={isFocused ? colors.primary : colors.outline} 
                        />
                        <Text
                            style={[
                                styles.label,
                                { color: isFocused ? colors.primary : colors.outline },
                            ]}
                        >
                            {label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        backgroundColor: colors.surfaceContainerLowest,
        borderTopLeftRadius: spacing.borderRadiusLg,
        borderTopRightRadius: spacing.borderRadiusLg,
        paddingBottom: 8,
        paddingTop: 8,
        shadowColor: colors.onSurface,
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 8,
        paddingHorizontal: spacing.xs,
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingVertical: spacing.xs,
    },
    label: {
        fontSize: 11,
        fontFamily: 'Inter_500Medium',
    },
});