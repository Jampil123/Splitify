import { deleteGroup, updateGroup } from '@/services/api/groups';
import { useAuthStore } from '@/stores/authStore';
import { colors, spacing, typographyStyles } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { db } from '@/services/firebase/config';

export default function GroupSettingsScreen() {
    const router = useRouter();
    const { id: groupId } = useLocalSearchParams<{ id: string }>();
    const { user } = useAuthStore();

    const [groupName, setGroupName] = useState('');
    const [description, setDescription] = useState('');
    const [originalName, setOriginalName] = useState('');
    const [originalDescription, setOriginalDescription] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const fetchGroup = async () => {
            if (!groupId) return;
            try {
                const groupRef = doc(db, 'groups', groupId);
                const groupSnap = await getDoc(groupRef);
                if (groupSnap.exists()) {
                    const data = groupSnap.data();
                    setGroupName(data.groupName || '');
                    setOriginalName(data.groupName || '');
                    setDescription(data.groupDescription || '');
                    setOriginalDescription(data.groupDescription || '');
                    setIsAdmin(data.createdBy === user?.id);
                } else {
                    Alert.alert('Error', 'Group not found');
                    router.back();
                }
            } catch {
                Alert.alert('Error', 'Failed to load group settings');
            } finally {
                setIsLoading(false);
            }
        };
        fetchGroup();
    }, [groupId]);

    const hasChanges = groupName !== originalName || description !== originalDescription;

    const handleSave = async () => {
        if (!groupName.trim()) {
            Alert.alert('Error', 'Group name cannot be empty');
            return;
        }
        if (!hasChanges) return;

        setIsSaving(true);
        try {
            const success = await updateGroup(groupId, {
                groupName: groupName.trim(),
                groupDescription: description.trim(),
            } as any);
            if (success) {
                setOriginalName(groupName.trim());
                setOriginalDescription(description.trim());
                Alert.alert('Saved', 'Group settings updated');
            } else {
                Alert.alert('Error', 'Failed to save changes');
            }
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteGroup = () => {
        Alert.alert(
            'Delete Group',
            'This will archive the group and remove it from all members\' view. This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        setIsSaving(true);
                        try {
                            const success = await deleteGroup(groupId);
                            if (success) {
                                router.dismissAll();
                            } else {
                                Alert.alert('Error', 'Failed to delete group');
                            }
                        } finally {
                            setIsSaving(false);
                        }
                    },
                },
            ]
        );
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <StatusBar style="dark" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back-outline" size={24} color={colors.primary} />
                </TouchableOpacity>
                <Text style={[typographyStyles.headlineMedium, styles.headerTitle]}>
                    Group Settings
                </Text>
                <TouchableOpacity
                    style={[styles.saveBtn, (!hasChanges || isSaving) && styles.saveBtnDisabled]}
                    onPress={handleSave}
                    disabled={!hasChanges || isSaving}
                >
                    {isSaving ? (
                        <ActivityIndicator size="small" color={colors.onPrimary} />
                    ) : (
                        <Text style={styles.saveBtnText}>Save</Text>
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                {/* Group Avatar */}
                <View style={styles.avatarSection}>
                    <View style={styles.avatarContainer}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>
                                {groupName.charAt(0).toUpperCase() || 'G'}
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={styles.avatarEdit}
                            onPress={() => Alert.alert('Coming Soon', 'Photo upload requires expo-image-picker')}
                        >
                            <Ionicons name="camera-outline" size={16} color={colors.onPrimary} />
                        </TouchableOpacity>
                    </View>
                    <Text style={[typographyStyles.bodySmall, styles.avatarHint]}>
                        Tap to change group photo
                    </Text>
                </View>

                {/* Form */}
                <View style={styles.formSection}>
                    <View style={styles.inputGroup}>
                        <Text style={[typographyStyles.labelMedium, styles.label]}>Group Name</Text>
                        <TextInput
                            style={styles.input}
                            value={groupName}
                            onChangeText={setGroupName}
                            placeholder="Enter group name"
                            placeholderTextColor={colors.outline}
                            editable={isAdmin}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={[typographyStyles.labelMedium, styles.label]}>Description</Text>
                        <TextInput
                            style={[styles.input, styles.textArea]}
                            value={description}
                            onChangeText={setDescription}
                            placeholder="What is this group for?"
                            placeholderTextColor={colors.outline}
                            multiline
                            numberOfLines={3}
                            textAlignVertical="top"
                            editable={isAdmin}
                        />
                    </View>

                    {!isAdmin && (
                        <View style={styles.infoBox}>
                            <Ionicons name="information-circle-outline" size={18} color={colors.outline} />
                            <Text style={[typographyStyles.bodySmall, styles.infoText]}>
                                Only the group admin can edit these settings.
                            </Text>
                        </View>
                    )}
                </View>

                {/* Danger Zone */}
                {isAdmin && (
                    <View style={styles.dangerSection}>
                        <Text style={[typographyStyles.labelMedium, styles.dangerTitle]}>Danger Zone</Text>
                        <TouchableOpacity style={styles.dangerCard} onPress={handleDeleteGroup} disabled={isSaving}>
                            <View style={styles.dangerLeft}>
                                <View style={styles.dangerIcon}>
                                    <Ionicons name="trash-outline" size={20} color={colors.error} />
                                </View>
                                <View>
                                    <Text style={[typographyStyles.bodyMedium, styles.dangerLabel]}>
                                        Delete Group
                                    </Text>
                                    <Text style={[typographyStyles.bodySmall, styles.dangerSub]}>
                                        Archive and remove group for all members
                                    </Text>
                                </View>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={colors.error} />
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.gutter,
        paddingTop: spacing.md,
        paddingBottom: spacing.sm,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.outlineVariant,
    },
    backButton: {
        padding: spacing.sm,
    },
    headerTitle: {
        color: colors.onSurface,
        fontSize: 18,
        flex: 1,
        textAlign: 'center',
    },
    saveBtn: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: spacing.borderRadiusFull,
        minWidth: 60,
        alignItems: 'center',
    },
    saveBtnDisabled: {
        opacity: 0.45,
    },
    saveBtnText: {
        color: colors.onPrimary,
        fontFamily: 'Poppins_600SemiBold',
        fontSize: 14,
    },
    scrollContent: {
        paddingHorizontal: spacing.gutter,
        paddingBottom: 60,
        gap: spacing.xl,
        paddingTop: spacing.lg,
    },
    avatarSection: {
        alignItems: 'center',
        gap: spacing.sm,
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: colors.primaryContainer,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 36,
        fontFamily: 'Poppins_700Bold',
        color: colors.onPrimary,
    },
    avatarEdit: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: colors.background,
    },
    avatarHint: {
        color: colors.outline,
    },
    formSection: {
        gap: spacing.lg,
    },
    inputGroup: {
        gap: spacing.xs,
    },
    label: {
        color: colors.primary,
        marginLeft: spacing.xs,
    },
    input: {
        backgroundColor: colors.surfaceContainerLow,
        borderWidth: 1,
        borderColor: colors.outlineVariant,
        borderRadius: spacing.borderRadiusLg,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        fontSize: 16,
        fontFamily: 'Poppins_400Regular',
        color: colors.onSurface,
    },
    textArea: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        backgroundColor: colors.secondaryContainer,
        padding: spacing.md,
        borderRadius: spacing.borderRadiusLg,
    },
    infoText: {
        color: colors.onSurfaceVariant,
        flex: 1,
    },
    dangerSection: {
        gap: spacing.sm,
    },
    dangerTitle: {
        color: colors.outline,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginLeft: spacing.xs,
    },
    dangerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.errorContainer + '30',
        borderRadius: spacing.borderRadiusLg,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.errorContainer,
    },
    dangerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        flex: 1,
    },
    dangerIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.errorContainer,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dangerLabel: {
        color: colors.error,
        fontFamily: 'Poppins_600SemiBold',
    },
    dangerSub: {
        color: colors.onSurfaceVariant,
        marginTop: 2,
    },
});
