import { colors, spacing, typographyStyles } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export interface DropdownItem {
    id: string;
    label: string;
    icon: string;
    variant?: 'default' | 'destructive';
    onPress: () => void;
}

interface DropdownMenuProps {
    items: DropdownItem[];
    triggerStyle?: object;
    offsetTop?: number;
}

export function DropdownMenu({ items, triggerStyle, offsetTop = 60 }: DropdownMenuProps) {
    const [visible, setVisible] = useState(false);

    return (
        <>
            <TouchableOpacity
                style={[styles.trigger, triggerStyle]}
                onPress={() => setVisible(true)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
                <Ionicons name="ellipsis-vertical" size={24} color={colors.primary} />
            </TouchableOpacity>

            <Modal
                visible={visible}
                transparent
                animationType="fade"
                onRequestClose={() => setVisible(false)}
            >
                <TouchableOpacity
                    style={[styles.overlay, { paddingTop: offsetTop }]}
                    activeOpacity={1}
                    onPress={() => setVisible(false)}
                >
                    <TouchableOpacity activeOpacity={1} style={styles.menu}>
                        {items.map((item, index) => (
                            <TouchableOpacity
                                key={item.id}
                                style={[
                                    styles.menuItem,
                                    index < items.length - 1 && styles.menuItemBorder,
                                    item.variant === 'destructive' && styles.menuItemDestructive,
                                ]}
                                onPress={() => {
                                    setVisible(false);
                                    setTimeout(item.onPress, 150);
                                }}
                            >
                                <Ionicons
                                    name={item.icon as any}
                                    size={20}
                                    color={item.variant === 'destructive' ? colors.error : colors.primary}
                                />
                                <Text
                                    style={[
                                        typographyStyles.bodyMedium,
                                        styles.menuItemText,
                                        item.variant === 'destructive' && styles.menuItemTextDestructive,
                                    ]}
                                >
                                    {item.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </TouchableOpacity>
                </TouchableOpacity>
            </Modal>
        </>
    );
}

const styles = StyleSheet.create({
    trigger: {
        padding: spacing.sm,
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.25)',
        justifyContent: 'flex-start',
        alignItems: 'flex-end',
        paddingRight: spacing.gutter,
    },
    menu: {
        backgroundColor: colors.surface,
        borderRadius: spacing.borderRadiusLg,
        minWidth: 210,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.14,
        shadowRadius: 16,
        elevation: 10,
        overflow: 'hidden',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md + 2,
        gap: spacing.sm,
    },
    menuItemBorder: {
        borderBottomWidth: 1,
        borderBottomColor: colors.outlineVariant,
    },
    menuItemDestructive: {
        backgroundColor: 'rgba(186, 26, 26, 0.05)',
    },
    menuItemText: {
        color: colors.onSurface,
        flex: 1,
    },
    menuItemTextDestructive: {
        color: colors.error,
    },
});
