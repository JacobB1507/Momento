import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { useTutorial } from '../tutorial/TutorialContext';
import type { RootStackParamList } from '../navigation/types';
import type { Gallery } from '../types/database';
import { supabase } from '../lib/supabase';
import { getProfile, uploadAvatarFile, setProfileAvatarUrl, fetchUserGalleries } from '../lib/galleries';
import { reportError } from '../lib/errorReport';

import { GalleryCard, CARD_GAP } from '../components/GalleryCard';
import { Skeleton, SkeletonCircle, SkeletonText } from '../components/Skeleton';
import { FriendsListModal } from '../components/FriendsListModal';
import { GalleryLongPressSheet } from '../components/GalleryLongPressSheet';
import TagFilterRow from '../components/TagFilterRow';
import { getMyTags, getMyTagsAppliedToGalleries, getGalleryIdsWithMyTags } from '../lib/tags';
import type { ProfileTag, GalleryTagInfo } from '../lib/tags';

const AVATAR_SIZE = 96;
const BADGE_SIZE = 26;

function describeUploadError(e: any): string {
  if (!e) return '';
  if (typeof e === 'string') return e;
  const parts: string[] = [];
  if (e.message) parts.push(String(e.message));
  if (e.error && e.error !== e.message) parts.push(String(e.error));
  if (e.statusCode) parts.push(`(${e.statusCode})`);
  else if (e.code) parts.push(`(${e.code})`);
  return parts.join(' ').trim();
}

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
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [longPressSheetGallery, setLongPressSheetGallery] = useState<Gallery | null>(null);
  const [ownerTags, setOwnerTags] = useState<ProfileTag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const [galleryTagsMap, setGalleryTagsMap] = useState<Map<string, GalleryTagInfo[]>>(new Map());
  const [taggedSharedGalleries, setTaggedSharedGalleries] = useState<Gallery[]>([]);
  const [notNowIds, setNotNowIds] = useState<Set<string>>(new Set());
  const [pendingRejectGallery, setPendingRejectGallery] = useState<Gallery | null>(null);
  const pendingRejectRef = useRef<{ gallery: Gallery; timer: ReturnType<typeof setTimeout> } | null>(null);

  const filteredGalleries = useMemo(() => {
    const merged = selectedTagIds.size > 0
      ? [...galleries, ...taggedSharedGalleries]
      : galleries;
    const seen = new Set<string>();
    const deduped = merged.filter(g => {
      if (seen.has(g.id)) return false;
      seen.add(g.id);
      return true;
    }).filter(g => !notNowIds.has(g.id));
    const pendingFirst = [...deduped].sort((a, b) => {
      const aPending = (a as any).membershipStatus === 'pending' ? -1 : 0;
      const bPending = (b as any).membershipStatus === 'pending' ? -1 : 0;
      return aPending - bPending;
    });
    if (selectedTagIds.size === 0) return pendingFirst;
    return pendingFirst.filter(g => {
      const gTags = galleryTagsMap.get(g.id) ?? [];
      return gTags.some(t => selectedTagIds.has(t.tag_id));
    });
  }, [galleries, taggedSharedGalleries, selectedTagIds, galleryTagsMap, notNowIds]);

  const pendingCount = useMemo(
    () => galleries.filter(g => (g as any).membershipStatus === 'pending').length,
    [galleries],
  );

  const tutorial = useTutorial();
  const friendsIconRef = useRef(null);

  useEffect(() => {
    tutorial.registerRef('friendsIcon', friendsIconRef);
    return () => tutorial.unregisterRef('friendsIcon');
  }, []);

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
    const result = await fetchUserGalleries(user.id);
    setGalleries(result);
    try {
      const [ownerTagsData, tagsMap] = await Promise.all([
        getMyTags(user!.id),
        getMyTagsAppliedToGalleries(result.map((g) => g.id), user!.id),
      ]);
      setOwnerTags(ownerTagsData);
      setGalleryTagsMap(tagsMap);
    } catch {
      // non-critical
    }
  };

  const handleGalleryLongPress = (gallery: Gallery) => {
    setLongPressSheetGallery(gallery);
  };

  const handlePinToggle = async () => {
    if (!longPressSheetGallery) return;
    const gallery = longPressSheetGallery;
    const isPinned = !!gallery.pinned;
    await supabase.from('galleries').update({ pinned: !isPinned }).eq('id', gallery.id);
    loadGalleries();
  };

  const handleDeleteGallery = () => {
    if (!longPressSheetGallery) return;
    const gallery = longPressSheetGallery;
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
  };

  const handleRejectWithUndo = (gallery: Gallery) => {
    if (pendingRejectRef.current) {
      clearTimeout(pendingRejectRef.current.timer);
      const prior = pendingRejectRef.current.gallery;
      pendingRejectRef.current = null;
      setPendingRejectGallery(null);
      supabase.rpc('respond_gallery_invite', { p_gallery_id: prior.id, p_accept: false }).catch(() => {});
    }
    setGalleries(prev => prev.filter(g => g.id !== gallery.id));
    setPendingRejectGallery(gallery);
    const timer = setTimeout(async () => {
      pendingRejectRef.current = null;
      setPendingRejectGallery(null);
      const { data, error } = await supabase.rpc('respond_gallery_invite', { p_gallery_id: gallery.id, p_accept: false });
      if (error || data === 'not_pending' || data === 'error') {
        Alert.alert('Could not decline', 'Something went wrong. Please try again.');
        setGalleries(prev => prev.some(g => g.id === gallery.id) ? prev : [...prev, gallery]);
      }
    }, 5000);
    pendingRejectRef.current = { gallery, timer };
  };

  const handleUndoReject = () => {
    if (!pendingRejectRef.current) return;
    clearTimeout(pendingRejectRef.current.timer);
    const { gallery } = pendingRejectRef.current;
    pendingRejectRef.current = null;
    setPendingRejectGallery(null);
    setGalleries(prev => prev.some(g => g.id === gallery.id) ? prev : [...prev, gallery]);
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
    Promise.all([loadProfile(), loadGalleries(), loadPhotoCount()]).then(() => {
      setHasLoadedOnce(true);
    });
  }, [user?.id]));

  useFocusEffect(
    useCallback(() => {
      loadFriendCount();
    }, [user?.id])
  );

  useEffect(() => {
    if (!userId) return;
    if (selectedTagIds.size === 0) {
      setTaggedSharedGalleries([]);
      return;
    }
    (async () => {
      try {
        const ids = await getGalleryIdsWithMyTags(userId, Array.from(selectedTagIds));
        const ownedIds = new Set(galleries.map(g => g.id));
        const nonOwnedIds = Array.from(ids).filter(id => !ownedIds.has(id));
        if (nonOwnedIds.length === 0) { setTaggedSharedGalleries([]); return; }
        const { data, error } = await supabase.from('galleries').select('*').in('id', nonOwnedIds);
        if (error || !data) { setTaggedSharedGalleries([]); return; }
        setTaggedSharedGalleries(data);
      } catch {
        setTaggedSharedGalleries([]);
      }
    })();
  }, [selectedTagIds, userId, galleries]);

  useEffect(() => {
    if (!userId || taggedSharedGalleries.length === 0) return;
    const allIds = [...galleries.map(g => g.id), ...taggedSharedGalleries.map(g => g.id)];
    getMyTagsAppliedToGalleries(allIds, userId).then(setGalleryTagsMap).catch(() => {});
  }, [taggedSharedGalleries, userId]);

  useEffect(() => {
    return () => {
      if (pendingRejectRef.current) {
        clearTimeout(pendingRejectRef.current.timer);
        const { gallery } = pendingRejectRef.current;
        supabase.rpc('respond_gallery_invite', { p_gallery_id: gallery.id, p_accept: false }).catch(() => {});
      }
    };
  }, []);

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
    try {
      const { publicUrl, displayUrl } = await uploadAvatarFile({
        uri,
        mimeType: 'image/jpeg',
      });
      await setProfileAvatarUrl(session!.user.id, publicUrl);
      setAvatarUrl(displayUrl);
    } catch (err: any) {
      console.log('[ProfileScreen] avatar upload caught error:', err);
      try {
        Alert.alert('Upload failed', err?.message ?? 'Upload failed. Please try again.');
      } catch {
        Alert.alert('Upload failed', 'Unknown error.');
      }
    } finally {
      setUploading(false);
    }
  };

  const placeholderLetter = (username || email).charAt(0).toUpperCase();

  if (!hasLoadedOnce) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={{ padding: 16 }}>
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            <SkeletonCircle size={96} />
            <View style={{ height: 16 }} />
            <SkeletonText width={140} height={20} />
            <View style={{ height: 8 }} />
            <SkeletonText width={100} height={14} />
            <View style={{ height: 20 }} />
            <View style={{ flexDirection: 'row', gap: 24 }}>
              <View style={{ alignItems: 'center' }}>
                <SkeletonText width={32} height={18} />
                <View style={{ height: 4 }} />
                <SkeletonText width={50} height={12} />
              </View>
              <View style={{ alignItems: 'center' }}>
                <SkeletonText width={32} height={18} />
                <View style={{ height: 4 }} />
                <SkeletonText width={50} height={12} />
              </View>
            </View>
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <View key={i} style={{ width: '50%', padding: 4 }}>
                <Skeleton height={180} borderRadius={12} />
                <View style={{ height: 8 }} />
                <SkeletonText width="70%" height={14} />
              </View>
            ))}
          </View>
        </View>
      </SafeAreaView>
    );
  }

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
            {(pendingCount > 0 || notNowIds.size > 0) && (
              <Pressable
                style={({ pressed }) => [styles.invitesButton, pressed && { opacity: 0.6 }]}
                onPress={() => navigation.navigate('Invites')}
              >
                <Text style={styles.invitesButtonText}>Invites ({pendingCount})</Text>
              </Pressable>
            )}
            <Pressable
              ref={friendsIconRef}
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

        <View style={{ marginTop: 12 }}>
          {ownerTags.length > 0 && (
            <Text style={{
              fontSize: 13,
              fontWeight: '500',
              color: '#8E8E93',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              paddingHorizontal: 16,
              marginBottom: 6,
              marginTop: 4,
            }}>
              Tags
            </Text>
          )}
          <TagFilterRow
            tags={ownerTags}
            selectedTagIds={selectedTagIds}
            onToggle={(id) => setSelectedTagIds(prev => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id); else next.add(id);
              return next;
            })}
            onClear={() => setSelectedTagIds(new Set())}
          />
        </View>

        {/* Galleries grid */}
        <View style={styles.galleriesSection}>
          <Text style={styles.galleriesSectionTitle}>My Galleries</Text>
          <FlatList
            data={filteredGalleries}
            keyExtractor={(item) => item.id}
            numColumns={2}
            scrollEnabled={false}
            columnWrapperStyle={styles.galleryRow}
            contentContainerStyle={styles.galleryGrid}
            ListEmptyComponent={
              selectedTagIds.size > 0
                ? <Text style={[styles.galleryEmpty, { marginTop: 40 }]}>No galleries match this filter.</Text>
                : galleries.length === 0 && pendingCount === 0
                  ? (
                    <View style={styles.firstRunPrompt}>
                      <Text style={styles.firstRunTitle}>No galleries yet</Text>
                      <Text style={styles.firstRunSub}>Create your first gallery and start sharing photos with friends.</Text>
                      <Pressable
                        style={({ pressed }) => [styles.firstRunButton, pressed && { opacity: 0.8 }]}
                        onPress={() => (navigation as any).navigate('MainTabs', { screen: 'Create' })}
                      >
                        <Text style={styles.firstRunButtonText}>Create your first gallery</Text>
                      </Pressable>
                    </View>
                  )
                  : <Text style={styles.galleryEmpty}>No galleries yet.</Text>
            }
            renderItem={({ item }) => (
              <GalleryCard
                gallery={item}
                onPress={() => {
                  if ((item as any).membershipStatus === 'pending') {
                    navigation.navigate('GalleryInvitePrompt', { galleryId: item.id });
                  } else {
                    navigation.navigate('GalleryDetail', { galleryId: item.id, galleryTitle: item.title });
                  }
                }}
                onLongPress={() => handleGalleryLongPress(item)}
                onCommentSheetClose={loadGalleries}
                currentUserId={user?.id}
                friendIds={friendIds}
                tags={galleryTagsMap.get(item.id) ?? []}
                membershipStatus={(item as any).membershipStatus}
                onAcceptInvite={async () => {
                  const { data, error } = await supabase.rpc('respond_gallery_invite', { p_gallery_id: item.id, p_accept: true });
                  if (error || data === 'not_pending' || data === 'error') {
                    Alert.alert('Could not accept', 'This invite may have already been used or expired.');
                    return;
                  }
                  loadGalleries();
                }}
                onRejectInvite={() => handleRejectWithUndo(item)}
                onNotNowInvite={() => setNotNowIds(prev => { const next = new Set(prev); next.add(item.id); return next; })}
              />
            )}
          />
        </View>
      </ScrollView>

      {pendingRejectGallery && (
        <View style={styles.undoBanner}>
          <Text style={styles.undoBannerText}>Gallery invite rejected</Text>
          <Pressable onPress={handleUndoReject} style={styles.undoBtn} hitSlop={8}>
            <Text style={styles.undoBtnText}>Undo</Text>
          </Pressable>
        </View>
      )}

      <FriendsListModal
        visible={showFriendsList}
        onClose={() => setShowFriendsList(false)}
        userId={userId}
      />

      {longPressSheetGallery && (
        <GalleryLongPressSheet
          visible={!!longPressSheetGallery}
          onClose={() => setLongPressSheetGallery(null)}
          gallery={longPressSheetGallery}
          currentUserId={userId}
          onPinToggled={handlePinToggle}
          onRenamed={loadGalleries}
          onPrivacyChanged={loadGalleries}
          onCoverPhotoUpdated={loadGalleries}
          onDeleted={handleDeleteGallery}
        />
      )}
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
  firstRunPrompt: { alignItems: 'center', paddingTop: 32, paddingHorizontal: 32, paddingBottom: 16 },
  firstRunTitle: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 8 },
  firstRunSub: { fontSize: 14, color: '#9CA3AF', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  firstRunButton: { backgroundColor: '#FF6B6B', borderRadius: 12, paddingVertical: 13, paddingHorizontal: 28 },
  firstRunButtonText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  undoBanner: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    backgroundColor: '#1F2937',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  undoBannerText: { color: '#fff', fontSize: 14, fontWeight: '500' },
  undoBtn: { paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#374151', borderRadius: 8 },
  undoBtnText: { color: '#FF6B6B', fontSize: 14, fontWeight: '700' },

  invitesButton: {
    backgroundColor: '#FFF0F0',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 2,
  },
  invitesButtonText: { fontSize: 12, fontWeight: '600', color: '#FF3B30' },
});
