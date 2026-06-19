import { useFriends } from '@/services/hooks/useFriends';
import { useAuthStore } from '@/stores/authStore';
import { colors, spacing, typographyStyles } from '@/styles';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface SearchResult {
    id: string;
    fullName: string;
    email: string;
    photoURL: string | null;
    isFriend: boolean;
    hasPendingRequest: boolean;
}

function SearchResultItem({
    item,
    onAddFriend,
    isLoading,
}: {
    item: SearchResult;
    onAddFriend: (userId: string) => void;
    isLoading: boolean;
}) {
    return (
        <View style={styles.resultCard}>
            <View style={styles.avatarContainer}>
                {item.photoURL ? (
                    <Image source={{ uri: item.photoURL }} style={styles.avatar} />
                ) : (
                    <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarText}>{item.fullName.charAt(0)}</Text>
                    </View>
                )}
            </View>
            <View style={styles.resultInfo}>
                <Text style={[typographyStyles.titleMedium, styles.resultName]}>
                    {item.fullName}
                </Text>
                <Text style={[typographyStyles.bodySmall, styles.resultEmail]}>
                    {item.email}
                </Text>
            </View>
            {item.isFriend ? (
                <View style={styles.friendBadge}>
                    <Text style={styles.friendBadgeText}>Friends</Text>
                </View>
            ) : item.hasPendingRequest ? (
                <View style={styles.pendingBadge}>
                    <Text style={styles.pendingBadgeText}>Pending</Text>
                </View>
            ) : (
                <TouchableOpacity
                    style={styles.addFriendButton}
                    onPress={() => onAddFriend(item.id)}
                    disabled={isLoading}
                >
                    <Ionicons name="person-add-outline" size={20} color={colors.onPrimary} />
                    <Text style={styles.addFriendText}>Add</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

export default function AddFriendScreen() {
    const router = useRouter();
    const { user } = useAuthStore();
    const { searchForUsers, sendRequest } = useFriends(user?.id);
    
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [sendingRequest, setSendingRequest] = useState<string | null>(null);

    const handleSearch = async () => {
        if (searchQuery.length < 2) {
            Alert.alert('Info', 'Please enter at least 2 characters to search');
            return;
        }

        setIsLoading(true);
        try {
            const results = await searchForUsers(searchQuery);
            setSearchResults(results);
        } catch (error) {
            Alert.alert('Error', 'Failed to search users');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddFriend = async (userId: string) => {
        setSendingRequest(userId);
        try {
            const success = await sendRequest(userId);
            if (success) {
                Alert.alert('Success', 'Friend request sent!');
                // Refresh search results
                handleSearch();
            } else {
                Alert.alert('Error', 'Failed to send friend request');
            }
        } catch (error) {
            Alert.alert('Error', 'Something went wrong');
        } finally {
            setSendingRequest(null);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            {/* Search Section */}
            <View style={styles.searchSection}>
                <View style={styles.searchContainer}>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search by name or email..."
                        placeholderTextColor={colors.outline}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onSubmitEditing={handleSearch}
                        returnKeyType="search"
                    />
                    <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
                        <Ionicons name="search-outline" size={20} color={colors.onPrimary} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Results */}
            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : searchResults.length > 0 ? (
                <FlatList
                    data={searchResults}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <SearchResultItem
                            item={item}
                            onAddFriend={handleAddFriend}
                            isLoading={sendingRequest === item.id}
                        />
                    )}
                    contentContainerStyle={styles.resultsList}
                    showsVerticalScrollIndicator={false}
                />
            ) : searchQuery.length > 0 ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="people-outline" size={48} color={colors.outline} />
                    <Text style={[typographyStyles.bodyMedium, styles.emptyText]}>
                        No users found
                    </Text>
                </View>
            ) : (
                <View style={styles.emptyContainer}>
                    <Ionicons name="search-outline" size={48} color={colors.outline} />
                    <Text style={[typographyStyles.bodyMedium, styles.emptyText]}>
                        Search for friends by name or email
                    </Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.gutter,
        paddingTop: spacing.md,
        paddingBottom: spacing.md,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        color: colors.onSurface,
    },
    placeholder: {
        width: 40,
    },
    searchSection: {
        paddingHorizontal: spacing.gutter,
        marginBottom: spacing.lg,
    },
    searchContainer: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    searchInput: {
        flex: 1,
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
    searchButton: {
        backgroundColor: colors.primary,
        width: 48,
        height: 48,
        borderRadius: spacing.borderRadiusLg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    resultsList: {
        paddingHorizontal: spacing.gutter,
        paddingBottom: spacing.xl,
    },
    resultCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surfaceContainer,
        borderRadius: spacing.borderRadiusLg,
        padding: spacing.md,
        marginBottom: spacing.md,
        gap: spacing.md,
    },
    avatarContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        overflow: 'hidden',
    },
    avatar: {
        width: '100%',
        height: '100%',
    },
    avatarPlaceholder: {
        width: '100%',
        height: '100%',
        borderRadius: 25,
        backgroundColor: colors.primaryContainer,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.onPrimary,
    },
    resultInfo: {
        flex: 1,
    },
    resultName: {
        color: colors.onSurface,
        fontSize: 16,
        marginBottom: 2,
    },
    resultEmail: {
        color: colors.onSurfaceVariant,
        fontSize: 12,
    },
    friendBadge: {
        backgroundColor: colors.successContainer,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: spacing.borderRadiusFull,
    },
    friendBadgeText: {
        fontSize: 12,
        color: colors.onSuccessContainer,
        fontWeight: '500',
    },
    pendingBadge: {
        backgroundColor: colors.warningContainer,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: spacing.borderRadiusFull,
    },
    pendingBadgeText: {
        fontSize: 12,
        color: colors.onWarningContainer,
        fontWeight: '500',
    },
    addFriendButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderRadius: spacing.borderRadiusFull,
        gap: 4,
    },
    addFriendText: {
        fontSize: 12,
        color: colors.onPrimary,
        fontWeight: '600',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
    },
    emptyText: {
        color: colors.outline,
        textAlign: 'center',
        marginTop: spacing.md,
    },
});