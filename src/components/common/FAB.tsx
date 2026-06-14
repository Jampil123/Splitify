import { colors, spacing } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';

interface FABProps {
    onPress: () => void;
    icon?: string;
    style?: ViewStyle;
    size?: 'small' | 'medium' | 'large';
}

export function FAB({ onPress, icon = 'add', style, size = 'medium' }: FABProps) {
    const getSize = () => {
        switch (size) {
            case 'small':
                return 48;
            case 'large':
                return 64;
            default:
                return 56;
        }
    };

    const getIconSize = () => {
        switch (size) {
            case 'small':
                return 24;
            case 'large':
                return 32;
            default:
                return 28;
        }
    };

    return (
        <TouchableOpacity
            style={[
                styles.fab,
                {
                    width: getSize(),
                    height: getSize(),
                    borderRadius: getSize() / 2,
                },
                style,
            ]}
            onPress={onPress}
            activeOpacity={0.8}
        >
            <Ionicons name={icon as any} size={getIconSize()} color={colors.onPrimary} />
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    fab: {
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
        position: 'absolute',
        bottom: spacing.xl,
        right: spacing.lg,
    },
});