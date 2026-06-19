import { updateUserProfile } from '@/services/firebase/auth';
import { useAuthStore } from '@/stores/authStore';
import { colors, spacing, typographyStyles } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function EditProfileScreen() {
    const router = useRouter();
    const { user, logout, refreshUserData } = useAuthStore();

    const [fullName, setFullName] = useState(user?.fullName || '');
    const [originalName] = useState(user?.fullName || '');
    const [isSaving, setIsSaving] = useState(false);

    const hasChanges = fullName.trim() !== originalName;

    const handleSave = async () => {
        if (!fullName.trim()) {
            Alert.alert('Error', 'Name cannot be empty');
            return;
        }
        if (!hasChanges) return;

        setIsSaving(true);
        try {
            if (user?.id) {
                await updateUserProfile(user.id, { fullName: fullName.trim() });
                await refreshUserData(user.id);
                Alert.alert('Saved', 'Profile updated successfully', [
                    { text: 'OK', onPress: () => router.back() },
                ]);
            }
        } catch {
            Alert.alert('Error', 'Failed to update profile');
        } finally {
            setIsSaving(false);
        }
    };

    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to log out?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        await logout();
                        router.replace('/(auth)/login');
                    },
                },
            ]
        );
    };

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
                <Text style={[typographyStyles.headlineMedium, styles.headerTitle]}>Edit Profile</Text>
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
                {/* Avatar */}
                <View style={styles.avatarSection}>
                    <View style={styles.avatarContainer}>
                        {user?.photoURL ? (
                            <Image source={{ uri: user.photoURL }} style={styles.avatar} />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Text style={styles.avatarText}>
                                    {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
                                </Text>
                            </View>
                        )}
                        <TouchableOpacity
                            style={styles.avatarEdit}
                            onPress={() => Alert.alert('Coming Soon', 'Photo upload requires expo-image-picker')}
                        >
                            <Ionicons name="camera-outline" size={16} color={colors.onPrimary} />
                        </TouchableOpacity>
                    </View>
                    <Text style={[typographyStyles.bodySmall, styles.avatarHint]}>
                        Tap to change photo
                    </Text>
                </View>

                {/* Info */}
                <View style={styles.section}>
                    <Text style={[typographyStyles.labelMedium, styles.sectionLabel]}>
                        Account Info
                    </Text>
                    <View style={styles.card}>
                        <View style={styles.inputGroup}>
                            <Text style={[typographyStyles.labelMedium, styles.label]}>Full Name</Text>
                            <TextInput
                                style={styles.input}
                                value={fullName}
                                onChangeText={setFullName}
                                placeholder="Enter your name"
                                placeholderTextColor={colors.outline}
                                autoCapitalize="words"
                            />
                        </View>
                        <View style={styles.inputGroup}>
                            <Text style={[typographyStyles.labelMedium, styles.label]}>Email</Text>
                            <View style={styles.disabledInput}>
                                <Text style={styles.disabledText}>{user?.email}</Text>
                                <Ionicons name="lock-closed-outline" size={16} color={colors.outline} />
                            </View>
                            <Text style={[typographyStyles.bodySmall, styles.fieldHint]}>
                                Email cannot be changed
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Account section */}
                <View style={styles.section}>
                    <Text style={[typographyStyles.labelMedium, styles.sectionLabel]}>Account</Text>
                    <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                        <View style={styles.logoutIcon}>
                            <Ionicons name="log-out-outline" size={20} color={colors.error} />
                        </View>
                        <Text style={[typographyStyles.bodyMedium, styles.logoutText]}>
                            Log Out
                        </Text>
                        <Ionicons name="chevron-forward" size={18} color={colors.error} />
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
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
        width: 96,
        height: 96,
        borderRadius: 48,
    },
    avatarPlaceholder: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: colors.primaryContainer,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 40,
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
    section: {
        gap: spacing.sm,
    },
    sectionLabel: {
        color: colors.outline,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginLeft: spacing.xs,
    },
    card: {
        backgroundColor: colors.surface,
        borderRadius: spacing.borderRadiusLg,
        padding: spacing.md,
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
    disabledInput: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.surfaceContainerHighest,
        borderWidth: 1,
        borderColor: colors.outlineVariant,
        borderRadius: spacing.borderRadiusLg,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
    },
    disabledText: {
        fontSize: 16,
        fontFamily: 'Poppins_400Regular',
        color: colors.outline,
    },
    fieldHint: {
        color: colors.outline,
        marginLeft: spacing.xs,
    },
    logoutBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(186, 26, 26, 0.06)',
        borderRadius: spacing.borderRadiusLg,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.errorContainer,
        gap: spacing.md,
    },
    logoutIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.errorContainer,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoutText: {
        color: colors.error,
        flex: 1,
        fontFamily: 'Poppins_600SemiBold',
    },
});
