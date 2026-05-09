import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/types';
import type { Gallery } from '../types/database';
import { supabase } from '../lib/supabase';
import { getProfile, uploadAvatar } from '../lib/galleries';

import { GalleryCard, CARD_GAP } from '../components/GalleryCard';
import { FriendsListModal } from '../components/FriendsListModal';

const AVATAR_SIZE = 96;
const BADGE_SIZE = 26;

export default function ProfileScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { session } = useAuth();
  const user = session?.user;
  const userId = user?.id ?? '';
  const email = user?.email ?? '';

  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [friendCount, setFriendCount] = useState(0);
  const [friendIds, setFriendIds] = useState<string[]>([]);
  const [photoCount, setPhotoCount] = useState(0);
  const [bio, setBio] = useState<string | null>(null);
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [showFriendsList, setShowFriendsList] = useState(false);

  const loadFriendCount = async () => {
    if (!user?.id) return;
    const { count } = await supabase
      .from('friends')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'accepted')
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);
    setFriendCount(count ?? 0);
  };

  const loadProfile = async () => {
    if (!userId) return;
    const [profile] = await Promise.all([
      getProfile(userId),
    ]);
    await loadFriendCount();
    if (user?.id) {
      const { data: friendRows } = await supabase
        .from('friends')
        .select('sender_id, receiver_id')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .eq('status', 'accepted');
      setFriendIds(
        (friendRows ?? []).map((r: any) =>
          r.sender_id === user.id ? r.receiver_id : r.sender_id
        )
      );
    }
    if (profile) {
      if (profile.username) setUsername(profile.username);
      if (profile.avatar_url) setAvatarUrl(profile.avatar_url);
      setBio(profile.bio ?? null);
    }
    const { data } = await supabase
      .from('profiles')
      .select('id, username, email, avatar_url, bio, display_name')
      .eq('id', userId)
      .maybeSingle();
    if (data?.username) setUsername(data.username);
    if (data?.avatar_url) setAvatarUrl(data.avatar_url);
    setBio(data?.bio ?? null);
    setDisplayName(data?.display_name ?? null);
  };

  const loadGalleries = async () => {
    if (!user?.id) return;

    // Get galleries user owns
    const { data: owned } = await supabase
      .from('galleries')
      .select('*')
      .eq('created_by', user.id);

    // Get gallery_ids user is a member of
    const { data: memberships } = await supabase
      .from('gallery_members')
      .select('gallery_id')
      .eq('user_id', user.id);

    const memberGalleryIds = (memberships ?? []).map((m: any) => m.gallery_id);

    // Fetch those galleries separately
    const { data: memberGalleries } = memberGalleryIds.length > 0
      ? await supabase.from('galleries').select('*').in('id', memberGalleryIds).neq('created_by', user.id)
      : { data: [] };

    // Merge and deduplicate
    const all = [...(owned ?? []), ...(memberGalleries ?? [])];
    const unique = all.filter((g, i, arr) => arr.findIndex((x: any) => x.id === g.id) === i);
    const sorted = unique.sort((a: any, b: any) => {
      if (a.pinned === b.pinned) {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      return a.pinned ? -1 : 1;
    });

    console.log('loadGalleries owned:', owned?.length, 'member:', memberGalleries?.length);
    setGalleries(sorted);
  };

  const handleGalleryLongPress = (gallery: Gallery) => {
    const isPinned = !!gallery.pinned;
    Alert.alert(gallery.title, undefined, [
      {
        text: isPinned ? 'Unpin' : 'Pin to Top',
        onPress: async () => {
          await supabase
            .from('galleries')
            .update({ pinned: !isPinned })
            .eq('id', gallery.id);
          loadGalleries();
        },
      },
      {
        text: 'Rename',
        onPress: () => {
          Alert.prompt(
            'Rename Gallery',
            'Enter a new name:',
            async (newTitle) => {
              if (!newTitle?.trim()) return;
              await supabase
                .from('galleries')
                .update({ title: newTitle.trim() })
                .eq('id', gallery.id);
              loadGalleries();
            },
            'plain-text',
            gallery.title,
          );
        },
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          Alert.alert(
            'Delete Gallery',
            `Delete "${gallery.title}"? This cannot be undone.`,
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                  await supabase.from('galleries').delete().eq('id', gallery.id);
                  loadGalleries();
                },
              },
            ],
          );
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const loadPhotoCount = async () => {
    if (!user?.id) return;
    const { count } = await supabase
      .from('gallery_photos')
      .select('id', { count: 'exact', head: true })
      .eq('uploaded_by', user.id);
    setPhotoCount(count ?? 0);
  };

  useFocusEffect(useCallback(() => {
    if (!user?.id) return;
    loadProfile();
    loadGalleries();
    loadPhotoCount();
  }, [user?.id]));

  useFocusEffect(
    useCallback(() => {
      loadFriendCount();
    }, [user?.id])
  );

  const handleAvatarPress = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Allow photo library access to change your avatar.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled) return;

    const uri = result.assets[0].uri;
    setUploading(true);
    const url = await uploadAvatar(userId, uri);
    setUploading(false);

    if (url) {
      setAvatarUrl(url);
    } else {
      Alert.alert('Upload failed', 'Could not update your avatar. Please try again.');
    }
  };

  const placeholderLetter = (username || email).charAt(0).toUpperCase();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await Promise.all([loadProfile(), loadGalleries(), loadPhotoCount()]);
              setRefreshing(false);
            }}
          />
        }
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          <Text style={styles.topBarTitle}>Profile</Text>
          <View style={styles.topBarIcons}>
            <Pressable
              style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.6 }]}
              onPress={() => navigation.navigate('Friends')}
            >
              <MaterialCommunityIcons name="account-multiple-outline" size={24} color="#111827" />
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.6 }]}
              onPress={() => navigation.navigate('Settings')}
            >
              <MaterialCommunityIcons name="cog-outline" size={24} color="#111827" />
            </Pressable>
          </View>
        </View>

        {/* Avatar + info row */}
        <View style={styles.profileHeader}>
          <Pressable onPress={handleAvatarPress} style={styles.avatarWrapper}>
            {uploading ? (
              <View style={styles.avatarPlaceholder}>
                <ActivityIndicator color="#fff" size="large" />
              </View>
            ) : avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{placeholderLetter}</Text>
              </View>
            )}
            <View style={styles.editBadge}>
              <Text style={styles.editBadgeIcon}>✎</Text>
            </View>
          </Pressable>

          <View style={styles.profileInfo}>
            {displayName ? <Text style={styles.displayName}>{displayName}</Text> : null}
            <Text style={displayName ? styles.usernameSmall : styles.usernameLarge}>{displayName ? `@${username}` : (username || 'unknown')}</Text>
            <Text style={styles.friendCountLabel}>{friendCount} Friends</Text>
            {bio ? (
              <Text style={styles.bio}>{bio}</Text>
            ) : (
              <Text style={styles.bioPlaceholder}>Add a bio...</Text>
            )}
          </View>
        </View>

        {/* Stats bar */}
        <View style={styles.statsBar}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{galleries.length}</Text>
            <Text style={styles.statLabel}>Galleries</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{photoCount}</Text>
            <Text style={styles.statLabel}>Photos</Text>
          </View>
          <View style={styles.statDivider} />
          <Pressable style={styles.statItem} onPress={() => setShowFriendsList(true)}>
            <Text style={styles.statNumber}>{friendCount}</Text>
            <Text style={styles.statLabel}>Friends</Text>
          </Pressable>
        </View>

        {/* Edit Profile button */}
        <View style={styles.actionsRow}>
          <Pressable
            style={({ pressed }) => [styles.editProfileButton, pressed && { opacity: 0.75 }]}
            onPress={() => navigation.navigate('Settings')}
          >
            <Text style={styles.editProfileText}>Edit Profile</Text>
          </Pressable>
        </View>

        {/* Galleries grid */}
        <View style={styles.galleriesSection}>
          <Text style={styles.galleriesSectionTitle}>My Galleries</Text>
          <FlatList
            data={galleries}
            keyExtractor={(item) => item.id}
            numColumns={2}
            scrollEnabled={false}
            columnWrapperStyle={styles.galleryRow}
            contentContainerStyle={styles.galleryGrid}
            ListEmptyComponent={
              <Text style={styles.galleryEmpty}>No galleries yet.</Text>
            }
            renderItem={({ item }) => (
              <GalleryCard
                gallery={item}
                onPress={() => navigation.navigate('GalleryDetail', { galleryId: item.id, galleryTitle: item.title })}
                onLongPress={() => handleGalleryLongPress(item)}
                currentUserId={user?.id}
                friendIds={friendIds}
              />
            )}
          />
        </View>
      </ScrollView>

      <FriendsListModal
        visible={showFriendsList}
        onClose={() => setShowFriendsList(false)}
        userId={userId}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  scrollContent: { paddingBottom: 40 },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  topBarTitle: { fontSize: 22, fontWeight: '800', color: '#111827', letterSpacing: -0.3 },
  topBarIcons: { flexDirection: 'row', gap: 2 },
  iconButton: { padding: 6 },

  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 20,
  },
  avatarWrapper: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
  },
  avatarImage: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  avatarPlaceholder: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: '#FF6B6B',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  avatarText: { fontSize: 36, fontWeight: '800', color: '#fff' },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: BADGE_SIZE / 2,
    backgroundColor: '#FF6B6B',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  editBadgeIcon: { color: '#fff', fontSize: 12, lineHeight: 15 },

  profileInfo: { flex: 1, justifyContent: 'center', gap: 4 },
  displayName: { fontSize: 20, fontWeight: '800', color: '#111827' },
  usernameLarge: { fontSize: 20, fontWeight: '800', color: '#111827' },
  usernameSmall: { fontSize: 14, color: '#6B7280' },
  friendCountLabel: { fontSize: 14, color: '#6B7280' },
  bio: { fontSize: 14, color: '#374151' },
  bioPlaceholder: { fontSize: 14, color: '#9CA3AF', fontStyle: 'italic' },

  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 20, fontWeight: '800', color: '#111827' },
  statLabel: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
  statDivider: { width: 1, height: 32, backgroundColor: '#E5E7EB' },

  actionsRow: { paddingHorizontal: 16, marginTop: 12 },
  editProfileButton: {
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  editProfileText: { fontSize: 15, fontWeight: '600', color: '#111827' },

  galleriesSection: { paddingHorizontal: 16, marginTop: 24 },
  galleriesSectionTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 12 },
  galleryGrid: { gap: CARD_GAP },
  galleryRow: { gap: CARD_GAP },
  galleryEmpty: { color: '#9CA3AF', fontSize: 14, textAlign: 'center', paddingVertical: 16 },
});
