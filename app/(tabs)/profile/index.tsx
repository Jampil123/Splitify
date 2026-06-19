import { updateUserProfile } from '@/services/firebase/auth';
import { uploadUserAvatar } from '@/services/supabase';
import { useAuthStore } from '@/stores/authStore';
import { colors, spacing, typographyStyles } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

// Menu Item Component
interface MenuItemProps {
    icon: string;
    title: string;
    subtitle?: string;
    onPress: () => void;
    showArrow?: boolean;
    badge?: number;
    variant?: 'default' | 'destructive';
}

function MenuItem({ icon, title, subtitle, onPress, showArrow = true, badge, variant = 'default' }: MenuItemProps) {
    const isDestructive = variant === 'destructive';
    
    return (
        <TouchableOpacity style={[styles.menuItem, isDestructive && styles.menuItemDestructive]} onPress={onPress} activeOpacity={0.7}>
            <View style={[styles.menuIconContainer, isDestructive && styles.menuIconContainerDestructive]}>
                <Ionicons name={icon as any} size={22} color={isDestructive ? colors.error : colors.primary} />
            </View>
            <View style={styles.menuContent}>
                <Text style={[typographyStyles.bodyMedium, styles.menuTitle, isDestructive && styles.menuTitleDestructive]}>{title}</Text>
                {subtitle && (
                    <Text style={[typographyStyles.bodySmall, styles.menuSubtitle, isDestructive && styles.menuSubtitleDestructive]}>{subtitle}</Text>
                )}
            </View>
            {badge && (
                <View style={styles.menuBadge}>
                    <Text style={styles.menuBadgeText}>{badge}</Text>
                </View>
            )}
            {showArrow && (
                <Ionicons name="chevron-forward-outline" size={20} color={isDestructive ? colors.error : colors.outline} />
            )}
        </TouchableOpacity>
    );
}

// Edit Profile Modal Component
function EditProfileModal({
    visible,
    onClose,
    onSave,
    user,
}: {
    visible: boolean;
    onClose: () => void;
    onSave: (data: { fullName: string }) => Promise<void>;
    user: any;
}) {
    const [fullName, setFullName] = useState(user?.fullName || '');
    const [isLoading, setIsLoading] = useState(false);

    const handleSave = async () => {
        if (!fullName.trim()) {
            Alert.alert('Error', 'Name cannot be empty');
            return;
        }

        setIsLoading(true);
        try {
            await onSave({ fullName: fullName.trim() });
            onClose();
        } catch (error) {
            Alert.alert('Error', 'Failed to update profile');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={true}>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <Text style={[typographyStyles.headlineSmall, styles.modalTitle]}>
                            Edit Profile
                        </Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close-outline" size={24} color={colors.onSurface} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.modalBody}>
                        <Text style={[typographyStyles.labelMedium, styles.inputLabel]}>
                            Full Name
                        </Text>
                        <TextInput
                            style={styles.input}
                            value={fullName}
                            onChangeText={setFullName}
                            placeholder="Enter your name"
                            placeholderTextColor={colors.outline}
                        />
                    </View>

                    <View style={styles.modalFooter}>
                        <TouchableOpacity style={styles.modalCancelButton} onPress={onClose}>
                            <Text style={styles.modalCancelText}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.modalSaveButton}
                            onPress={handleSave}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator size="small" color={colors.onPrimary} />
                            ) : (
                                <Text style={styles.modalSaveText}>Save Changes</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

export default function ProfileScreen() {
    const router = useRouter();
    const { user, logout, refreshUserData } = useAuthStore();
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [emailNotifications, setEmailNotifications] = useState(true);
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
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

    const handleEditProfile = () => {
        router.push('/profile/edit');
    };

    const handleAvatarPress = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Please allow access to your photo library to change your profile picture.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: 'images' as any,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (result.canceled || !result.assets[0]) return;
        if (!user?.id) return;

        setIsUploadingPhoto(true);
        try {
            const uri = result.assets[0].uri;
            const photoURL = await uploadUserAvatar(user.id, uri);
            if (!photoURL) {
                Alert.alert('Upload failed', 'Could not upload photo. Please try again.');
                return;
            }
            await updateUserProfile(user.id, { photoURL });
            await refreshUserData(user.id);
        } catch (err) {
            Alert.alert('Error', 'Something went wrong while uploading your photo.');
        } finally {
            setIsUploadingPhoto(false);
        }
    };

    const handleUpdateProfile = async (data: { fullName: string }) => {
        if (user?.id) {
            await updateUserProfile(user.id, data);
            await refreshUserData(user.id);
            Alert.alert('Success', 'Profile updated successfully');
        }
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        if (user?.id) {
            await refreshUserData(user.id);
        }
        setIsRefreshing(false);
    };

    const handleSettings = () => {
        Alert.alert('Settings', 'Settings page coming soon');
    };

    const handleHelp = () => {
        Alert.alert('Help Center', 'Help content coming soon');
    };

    const handleAbout = () => {
        Alert.alert('About', 'Splitify v1.0.0\nSplit expenses. Stay friends.');
    };

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[colors.primary]} />
                }
            >
                {/* Profile Header */}
                <View style={styles.header}>
                    <View style={styles.avatarContainer}>
                        {user?.photoURL ? (
                            <Image source={{ uri: user.photoURL }} style={styles.avatar} />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Text style={styles.avatarText}>
                                    {user?.fullName?.charAt(0) || 'U'}
                                </Text>
                            </View>
                        )}
                        {isUploadingPhoto && (
                            <View style={styles.avatarUploadingOverlay}>
                                <ActivityIndicator size="small" color={colors.onPrimary} />
                            </View>
                        )}
                        <TouchableOpacity
                            style={styles.editAvatarButton}
                            onPress={handleAvatarPress}
                            disabled={isUploadingPhoto}
                        >
                            <Ionicons name="camera-outline" size={16} color={colors.onPrimary} />
                        </TouchableOpacity>
                    </View>
                    <Text style={[typographyStyles.headlineMedium, styles.userName]}>
                        {user?.fullName || 'User'}
                    </Text>
                    <Text style={[typographyStyles.bodyMedium, styles.userEmail]}>
                        {user?.email || 'user@example.com'}
                    </Text>
                    <TouchableOpacity style={styles.editProfileButton} onPress={handleEditProfile}>
                        <Text style={styles.editProfileText}>Edit Profile</Text>
                    </TouchableOpacity>
                </View>

                {/* Stats Section */}
                <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                        <Text style={[typographyStyles.headlineMedium, styles.statValue]}>
                            {user?.friends?.length || 0}
                        </Text>
                        <Text style={[typographyStyles.bodySmall, styles.statLabel]}>Friends</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={[typographyStyles.headlineMedium, styles.statValue]}>
                            {user?.groups?.length || 0}
                        </Text>
                        <Text style={[typographyStyles.bodySmall, styles.statLabel]}>Groups</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={[typographyStyles.headlineMedium, styles.statValue]}>
                            ₱{user?.totalOwed?.toFixed(2) || '0.00'}
                        </Text>
                        <Text style={[typographyStyles.bodySmall, styles.statLabel]}>To Receive</Text>
                    </View>
                </View>

                {/* Menu Section */}
                <View style={styles.menuSection}>
                    <Text style={[typographyStyles.labelMedium, styles.menuSectionTitle]}>
                    </Text>
                    
                    <MenuItem
                        icon="notifications-outline"
                        title="Notifications"
                        subtitle="Manage your notification preferences"
                        onPress={() => {}}
                        showArrow={false}
                    />
                    
                    <View style={styles.switchItem}>
                        <View style={styles.switchItemLeft}>
                            <View style={styles.menuIconContainer}>
                                <Ionicons name="notifications" size={22} color={colors.primary} />
                            </View>
                            <View style={styles.switchItemText}>
                                <Text style={[typographyStyles.bodyMedium, styles.menuTitle]}>
                                    Push Notifications
                                </Text>
                                <Text style={[typographyStyles.bodySmall, styles.menuSubtitle]}>
                                    Receive alerts about expenses and payments
                                </Text>
                            </View>
                        </View>
                        <Switch
                            value={notificationsEnabled}
                            onValueChange={setNotificationsEnabled}
                            trackColor={{ false: colors.outlineVariant, true: colors.primaryContainer }}
                            thumbColor={notificationsEnabled ? colors.primary : colors.surface}
                        />
                    </View>

                    <View style={styles.switchItem}>
                        <View style={styles.switchItemLeft}>
                            <View style={styles.menuIconContainer}>
                                <Ionicons name="mail-outline" size={22} color={colors.primary} />
                            </View>
                            <View style={styles.switchItemText}>
                                <Text style={[typographyStyles.bodyMedium, styles.menuTitle]}>
                                    Email Notifications
                                </Text>
                                <Text style={[typographyStyles.bodySmall, styles.menuSubtitle]}>
                                    Receive email updates about your account
                                </Text>
                            </View>
                        </View>
                        <Switch
                            value={emailNotifications}
                            onValueChange={setEmailNotifications}
                            trackColor={{ false: colors.outlineVariant, true: colors.primaryContainer }}
                            thumbColor={emailNotifications ? colors.primary : colors.surface}
                        />
                    </View>

                    <MenuItem
                        icon="settings-outline"
                        title="Settings"
                        subtitle="App settings and preferences"
                        onPress={handleSettings}
                    />

                    <MenuItem
                        icon="help-circle-outline"
                        title="Help Center"
                        subtitle="FAQs and support"
                        onPress={handleHelp}
                    />

                    <MenuItem
                        icon="information-circle-outline"
                        title="About"
                        subtitle="Version 1.0.0"
                        onPress={handleAbout}
                    />

                    <MenuItem
                        icon="log-out-outline"
                        title="Logout"
                        subtitle="Sign out of your account"
                        onPress={handleLogout}
                        showArrow={false}
                        variant="destructive"
                    />
                </View>

                {/* Version Footer */}
                <View style={styles.footer}>
                    <Text style={[typographyStyles.bodySmall, styles.versionText]}>
                        Splitify v1.0.0
                    </Text>
                </View>
            </ScrollView>

            {/* Edit Profile Modal */}
            <EditProfileModal
                visible={isEditModalVisible}
                onClose={() => setIsEditModalVisible(false)}
                onSave={handleUpdateProfile}
                user={user}
            />
        </View>
    );
}

// Add RefreshControl import
import { RefreshControl } from 'react-native';

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollContent: {
        paddingBottom: spacing.xl,
    },
    // Header
    header: {
        alignItems: 'center',
        paddingTop: spacing.xxl,
        paddingBottom: spacing.lg,
        backgroundColor: colors.surface,
        borderBottomLeftRadius: spacing.borderRadiusLg,
        borderBottomRightRadius: spacing.borderRadiusLg,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: spacing.md,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
    },
    avatarPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: colors.primaryContainer,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 40,
        fontWeight: '600',
        color: colors.onPrimary,
    },
    editAvatarButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: colors.surface,
    },
    avatarUploadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(0,0,0,0.45)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    userName: {
        color: colors.onSurface,
        marginBottom: spacing.xs,
    },
    userEmail: {
        color: colors.outline,
        marginBottom: spacing.md,
    },
    editProfileButton: {
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: spacing.borderRadiusFull,
        borderWidth: 1,
        borderColor: colors.primary,
    },
    editProfileText: {
        fontSize: 14,
        color: colors.primary,
        fontWeight: '500',
    },
    // Stats
    statsContainer: {
        flexDirection: 'row',
        backgroundColor: colors.surfaceContainer,
        borderRadius: spacing.borderRadiusLg,
        marginHorizontal: spacing.gutter,
        marginTop: spacing.lg,
        marginBottom: spacing.lg,
        paddingVertical: spacing.lg,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        color: colors.onSurface,
        fontSize: 20,
        marginBottom: spacing.xs,
    },
    statLabel: {
        color: colors.outline,
    },
    statDivider: {
        width: 1,
        backgroundColor: colors.outlineVariant,
    },
    // Menu
    menuSection: {
        backgroundColor: colors.surface,
        borderRadius: spacing.borderRadiusLg,
        marginHorizontal: spacing.gutter,
        marginBottom: spacing.lg,
        overflow: 'hidden',
    },
    menuSectionTitle: {
        color: colors.outline,
        marginHorizontal: spacing.md,
        marginTop: spacing.md,
        marginBottom: spacing.sm,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.outlineVariant,
    },
    menuIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.surfaceContainer,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    menuContent: {
        flex: 1,
    },
    menuTitle: {
        color: colors.onSurface,
    },
    menuSubtitle: {
        color: colors.outline,
        marginTop: 2,
    },
    menuBadge: {
        backgroundColor: colors.error,
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 6,
        marginRight: spacing.sm,
    },
    menuBadgeText: {
        fontSize: 10,
        color: colors.onError,
        fontWeight: 'bold',
    },
    menuItemDestructive: {
        backgroundColor: 'rgba(245, 67, 54, 0.05)',
    },
    menuIconContainerDestructive: {
        backgroundColor: 'rgba(245, 67, 54, 0.15)',
    },
    menuTitleDestructive: {
        color: colors.error,
    },
    menuSubtitleDestructive: {
        color: colors.error,
        opacity: 0.7,
    },
    switchItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.outlineVariant,
        gap: spacing.sm,
    },
    switchItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: spacing.sm,
    },
    switchItemText: {
        flex: 1,
    },
    // Footer
    footer: {
        alignItems: 'center',
        paddingVertical: spacing.lg,
    },
    versionText: {
        color: colors.outline,
    },
    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: colors.surface,
        borderRadius: spacing.borderRadiusLg,
        width: '90%',
        maxWidth: 400,
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.outlineVariant,
    },
    modalTitle: {
        color: colors.onSurface,
        fontSize: 18,
    },
    modalBody: {
        padding: spacing.lg,
    },
    inputLabel: {
        color: colors.onSurfaceVariant,
        marginBottom: spacing.xs,
    },
    input: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.outlineVariant,
        borderRadius: spacing.borderRadiusLg,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.md,
        fontSize: 16,
        fontFamily: 'Poppins_400Regular',
        color: colors.onSurface,
    },
    modalFooter: {
        flexDirection: 'row',
        padding: spacing.lg,
        gap: spacing.md,
        borderTopWidth: 1,
        borderTopColor: colors.outlineVariant,
    },
    modalCancelButton: {
        flex: 1,
        paddingVertical: spacing.sm,
        borderRadius: spacing.borderRadiusFull,
        borderWidth: 1,
        borderColor: colors.outline,
        alignItems: 'center',
    },
    modalCancelText: {
        color: colors.outline,
    },
    modalSaveButton: {
        flex: 1,
        backgroundColor: colors.primary,
        paddingVertical: spacing.sm,
        borderRadius: spacing.borderRadiusFull,
        alignItems: 'center',
    },
    modalSaveText: {
        color: colors.onPrimary,
        fontWeight: '600',
    },
});