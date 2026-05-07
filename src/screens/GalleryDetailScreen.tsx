import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { fetchGalleryPhotos, uploadGalleryPhoto } from '../lib/galleries';
import { requestPhotoRemoval, getRemovalRequests, voteOnRemoval } from '../lib/photoRemoval';
import type { RootStackParamList } from '../navigation/types';
import type { GalleryPrivacy, Photo } from '../types/database';
import { SettingsModal } from '../components/SettingsModal';
import { PhotoGrid } from '../components/PhotoGrid';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'GalleryDetail'>;
type RouteProps = RouteProp<RootStackParamList, 'GalleryDetail'>;

type RemovalRequest = {
  id: string;
  photo_id: string;
  reason: string;
  requested_by_username: string | null;
  yes_votes: number;
  no_votes: number;
  created_at: string;
};

export default function GalleryDetailScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProps>();
  const { galleryId } = route.params;
  const { session } = useAuth();

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contributorsVisible, setContributorsVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [removalRequestsVisible, setRemovalRequestsVisible] = useState(false);
  const [galleryMeta, setGalleryMeta] = useState<{ title: string; created_by: string; privacy: GalleryPrivacy } | null>(null);
  const [removalRequests, setRemovalRequests] = useState<RemovalRequest[]>([]);
  const [members, setMembers] = useState<{ user_id: string; username: string | null; avatar_url: string | null }[]>([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: string; username: string | null; avatar_url: string | null }[]>([]);
  const [addingUser, setAddingUser] = useState(false);
  const [addSuccess, setAddSuccess] = useState('');
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isOwner = !!session?.user.id && session.user.id === galleryMeta?.created_by;

  const loadGalleryMeta = useCallback(async () => {
    const { data } = await supabase
      .from('galleries')
      .select('title, created_by, privacy')
      .eq('id', galleryId)
      .single();
    if (data) setGalleryMeta(data);
  }, [galleryId]);

  const load = useCallback(async () => {
    try {
      setError(null);
      setPhotos(await fetchGalleryPhotos(galleryId));
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load photos');
    }
  }, [galleryId]);

  const loadRemovalRequests = useCallback(async () => {
    const data = await getRemovalRequests(galleryId);
    setRemovalRequests(data as RemovalRequest[]);
  }, [galleryId]);

  const loadMembers = useCallback(async () => {
    const { data } = await supabase
      .from('gallery_members')
      .select('user_id, profiles(username, avatar_url)')
      .eq('gallery_id', galleryId);
    if (data) {
      setMembers(data.map((m: any) => ({
        user_id: m.user_id,
        username: (m.profiles as any)?.username ?? null,
        avatar_url: (m.profiles as any)?.avatar_url ?? null,
      })));
    }
  }, [galleryId]);

  const handleUsernameSearch = (text: string) => {
    setMemberSearch(text);
    setAddSuccess('');
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!text.trim()) { setSearchResults([]); return; }
    searchTimeoutRef.current = setTimeout(async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .ilike('username', `%${text}%`)
        .limit(5);
      setSearchResults(data ?? []);
    }, 300);
  };

  const handleAddMember = async (profile: { id: string; username: string | null; avatar_url: string | null }) => {
    setAddingUser(true);
    try {
      const { error: insertError } = await supabase
        .from('gallery_members')
        .insert({ gallery_id: galleryId, user_id: profile.id, role: 'member' });
      if (insertError) {
        if (insertError.code === '23505') {
          setAddSuccess(`${profile.username ?? 'User'} is already a member.`);
        } else {
          Alert.alert('Error', insertError.message);
        }
      } else {
        try {
          await supabase.from('notifications').insert({
            user_id: profile.id,
            type: 'gallery_invite',
            data: { gallery_id: galleryId, gallery_title: galleryMeta?.title ?? '' },
          });
        } catch {}
        setAddSuccess('User added!');
        setMemberSearch('');
        setSearchResults([]);
        loadMembers();
      }
    } finally {
      setAddingUser(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    const { error: removeError } = await supabase
      .from('gallery_members')
      .delete()
      .eq('gallery_id', galleryId)
      .eq('user_id', userId);
    if (!removeError) loadMembers();
    else Alert.alert('Error', 'Could not remove member.');
  };

  useEffect(() => {
    if (contributorsVisible) loadMembers();
  }, [contributorsVisible, loadMembers]);

  useEffect(() => {
    Promise.all([load(), loadGalleryMeta(), loadRemovalRequests()]).finally(() => setLoading(false));
  }, [load, loadGalleryMeta, loadRemovalRequests]);

  const handleDeletePhoto = (photo: Photo) => {
    setPhotos(prev => prev.filter(p => p.id !== photo.id));
  };

  const handleRemovalRequest = (photoId: string) => {
    const userId = session?.user.id;
    if (!userId) return;

    const submit = async (reason: string) => {
      const result = await requestPhotoRemoval(photoId, galleryId, userId, reason);
      if (result === 'ok') {
        Alert.alert('Submitted', 'Removal request submitted — the photo owner and gallery members will be notified.');
        loadRemovalRequests();
      } else if (result === 'already_requested') {
        Alert.alert('Already requested', "You've already submitted a removal request for this photo.");
      } else {
        Alert.alert('Error', 'Could not submit removal request. Please try again.');
      }
    };

    if (Platform.OS === 'ios') {
      Alert.prompt(
        'Request Removal',
        'Why should this photo be removed?',
        (reason) => { if (reason?.trim()) submit(reason.trim()); },
        'plain-text',
      );
    } else {
      Alert.alert(
        'Request Removal',
        'Submit a request to remove this photo?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Request', onPress: () => submit('') },
        ],
      );
    }
  };

  const handleVote = async (requestId: string, vote: boolean) => {
    const userId = session?.user.id;
    if (!userId) return;
    const ok = await voteOnRemoval(requestId, userId, vote);
    if (ok) await loadRemovalRequests();
    else Alert.alert('Error', 'Could not submit vote. Please try again.');
  };

  const handleUpload = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow Momento to access your photos in Settings.', [{ text: 'OK' }]);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 10,
      quality: 0.85,
    });
    if (result.canceled || !result.assets.length) return;
    setUploading(true);
    try {
      await Promise.all(
        result.assets.map(asset => uploadGalleryPhoto({ galleryId, uri: asset.uri, mimeType: asset.mimeType ?? undefined }))
      );
    } catch (e: any) {
      Alert.alert('Upload failed', e?.message ?? 'Something went wrong. Please try again.');
    } finally {
      await load();
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{galleryMeta?.title ?? ''}</Text>
        <View style={styles.headerActions}>
          {isOwner && (
            <Pressable
              style={({ pressed }) => [styles.settingsButton, pressed && { opacity: 0.7 }]}
              onPress={() => setSettingsVisible(true)}
              hitSlop={8}
            >
              <Text style={styles.settingsIcon}>⚙</Text>
            </Pressable>
          )}
          {removalRequests.length > 0 && (
            <Pressable
              style={({ pressed }) => [styles.removalButton, pressed && { opacity: 0.7 }]}
              onPress={() => setRemovalRequestsVisible(true)}
              hitSlop={8}
            >
              <Text style={styles.removalButtonText}>Requests ({removalRequests.length})</Text>
            </Pressable>
          )}
          <Pressable
            style={({ pressed }) => [styles.inviteButton, pressed && { opacity: 0.7 }]}
            onPress={() => setContributorsVisible(true)}
            hitSlop={8}
          >
            <Text style={styles.inviteButtonText}>Contributors</Text>
          </Pressable>
          {photos.length > 0 && !loading && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{photos.length}</Text>
            </View>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#FF6B6B" /></View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={load}><Text style={styles.retryText}>Retry</Text></Pressable>
        </View>
      ) : photos.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>📷</Text>
          <Text style={styles.emptyTitle}>No photos yet</Text>
          <Text style={styles.emptySubtitle}>Tap the button below to add photos from your camera roll.</Text>
          <Pressable
            style={({ pressed }) => [styles.emptyButton, pressed && { opacity: 0.85 }]}
            onPress={handleUpload}
            disabled={uploading}
          >
            {uploading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.emptyButtonText}>Add Photos</Text>}
          </Pressable>
        </View>
      ) : (
        <PhotoGrid
          photos={photos}
          isOwner={isOwner}
          currentUserId={session?.user.id}
          onDeletePhoto={handleDeletePhoto}
          onRemovalRequest={handleRemovalRequest}
          onPhotoPress={(photo, index) =>
            navigation.navigate('PhotoViewer', {
              photos: photos.map(p => ({ id: p.id, url: p.url, uploaded_by: p.uploaded_by, created_at: p.created_at })),
              initialIndex: index,
              galleryTitle: galleryMeta?.title ?? '',
            })
          }
        />
      )}

      <Modal
        visible={contributorsVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setContributorsVisible(false)}
      >
        <SafeAreaView style={styles.modalSafe} edges={['top']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Contributors</Text>
            <Pressable
              onPress={() => { setContributorsVisible(false); setMemberSearch(''); setSearchResults([]); setAddSuccess(''); }}
              style={({ pressed }) => [styles.modalClose, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.modalCloseText}>Done</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.contributorsSectionLabel}>Add Member</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by username..."
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              autoCorrect={false}
              value={memberSearch}
              onChangeText={handleUsernameSearch}
            />
            {searchResults.length > 0 && (
              <View style={styles.searchDropdown}>
                {searchResults.map((profile) => (
                  <Pressable
                    key={profile.id}
                    style={({ pressed }) => [styles.searchResultRow, pressed && { opacity: 0.7 }]}
                    onPress={() => handleAddMember(profile)}
                    disabled={addingUser}
                  >
                    {profile.avatar_url ? (
                      <Image source={{ uri: profile.avatar_url }} style={styles.memberAvatar} />
                    ) : (
                      <View style={styles.memberAvatarPlaceholder}>
                        <Text style={styles.memberAvatarLetter}>
                          {(profile.username ?? '?').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <Text style={styles.searchResultUsername}>@{profile.username ?? 'unknown'}</Text>
                    <Text style={styles.searchResultAdd}>{addingUser ? '…' : '+'}</Text>
                  </Pressable>
                ))}
              </View>
            )}
            {!!addSuccess && <Text style={styles.addSuccessText}>{addSuccess}</Text>}
            <Text style={[styles.contributorsSectionLabel, { marginTop: 24 }]}>Members</Text>
            {members.length === 0 ? (
              <Text style={styles.modalEmpty}>No members yet.</Text>
            ) : (
              members.map((member) => (
                <View key={member.user_id} style={styles.memberRow}>
                  {member.avatar_url ? (
                    <Image source={{ uri: member.avatar_url }} style={styles.memberAvatar} />
                  ) : (
                    <View style={styles.memberAvatarPlaceholder}>
                      <Text style={styles.memberAvatarLetter}>
                        {(member.username ?? '?').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.memberUsername}>@{member.username ?? 'unknown'}</Text>
                  {isOwner && (
                    <Pressable
                      style={({ pressed }) => [styles.removeButton, pressed && { opacity: 0.7 }]}
                      onPress={() => handleRemoveMember(member.user_id)}
                    >
                      <Text style={styles.removeButtonText}>Remove</Text>
                    </Pressable>
                  )}
                </View>
              ))
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <SettingsModal
        visible={settingsVisible}
        galleryId={galleryId}
        currentPrivacy={galleryMeta?.privacy ?? 'friends'}
        onClose={() => setSettingsVisible(false)}
        onPrivacySaved={(privacy) => setGalleryMeta(prev => prev ? { ...prev, privacy } : prev)}
        onGalleryDeleted={() => navigation.goBack()}
      />

      <Modal
        visible={removalRequestsVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setRemovalRequestsVisible(false)}
      >
        <SafeAreaView style={styles.modalSafe} edges={['top']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Removal Requests</Text>
            <Pressable
              onPress={() => setRemovalRequestsVisible(false)}
              style={({ pressed }) => [styles.modalClose, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.modalCloseText}>Done</Text>
            </Pressable>
          </View>
          <FlatList
            data={removalRequests}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.modalContent}
            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
            ListEmptyComponent={
              <Text style={styles.modalEmpty}>No removal requests</Text>
            }
            renderItem={({ item }) => (
              <View style={styles.requestRow}>
                <Text style={styles.requestUser}>@{item.requested_by_username ?? 'unknown'}</Text>
                <Text style={styles.requestReason}>{item.reason || 'No reason provided'}</Text>
                <Text style={styles.requestVotes}>👍 {item.yes_votes}  👎 {item.no_votes}</Text>
                <View style={styles.requestActions}>
                  <Pressable
                    style={({ pressed }) => [styles.agreeButton, pressed && { opacity: 0.7 }]}
                    onPress={() => handleVote(item.id, true)}
                  >
                    <Text style={styles.agreeText}>Agree</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.disagreeButton, pressed && { opacity: 0.7 }]}
                    onPress={() => handleVote(item.id, false)}
                  >
                    <Text style={styles.disagreeText}>Disagree</Text>
                  </Pressable>
                </View>
              </View>
            )}
          />
        </SafeAreaView>
      </Modal>

      {photos.length > 0 && !loading && (
        <Pressable
          style={({ pressed }) => [styles.fab, pressed && { opacity: 0.85 }, uploading && { opacity: 0.6 }]}
          onPress={handleUpload}
          disabled={uploading}
        >
          {uploading
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.fabIcon}>+</Text>}
        </Pressable>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 4, paddingBottom: 12 },
  backButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
  backIcon: { fontSize: 32, color: '#FF6B6B', lineHeight: 36, fontWeight: '300' },
  headerTitle: { flex: 1, fontSize: 22, fontWeight: '800', color: '#111827', letterSpacing: -0.4 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  settingsButton: { borderWidth: 1.5, borderColor: '#9CA3AF', borderRadius: 10, paddingVertical: 4, paddingHorizontal: 8 },
  settingsIcon: { color: '#6B7280', fontSize: 15 },
  removalButton: { borderWidth: 1.5, borderColor: '#F59E0B', borderRadius: 10, paddingVertical: 4, paddingHorizontal: 8 },
  removalButtonText: { color: '#F59E0B', fontSize: 13, fontWeight: '600' },
  inviteButton: { borderWidth: 1.5, borderColor: '#FF6B6B', borderRadius: 10, paddingVertical: 4, paddingHorizontal: 10 },
  inviteButtonText: { color: '#FF6B6B', fontSize: 13, fontWeight: '600' },
  countBadge: { backgroundColor: '#FF6B6B', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3, minWidth: 36, alignItems: 'center' },
  countText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20, marginBottom: 28 },
  emptyButton: {
    backgroundColor: '#FF6B6B',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 36,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  emptyButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  errorText: { color: '#EF4444', fontSize: 15, marginBottom: 12, textAlign: 'center' },
  retryButton: { borderWidth: 1.5, borderColor: '#FF6B6B', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 28 },
  retryText: { color: '#FF6B6B', fontWeight: '600' },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF6B6B',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },
  fabIcon: { fontSize: 28, color: '#fff', fontWeight: '300', lineHeight: Platform.OS === 'ios' ? 32 : 30 },

  modalSafe: { flex: 1, backgroundColor: '#F9FAFB' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827' },
  modalClose: { paddingVertical: 4, paddingHorizontal: 4 },
  modalCloseText: { fontSize: 16, color: '#FF6B6B', fontWeight: '600' },
  modalContent: { padding: 16 },
  modalEmpty: { textAlign: 'center', color: '#9CA3AF', fontSize: 14, marginTop: 32 },

  requestRow: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  requestUser: { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 4 },
  requestReason: { fontSize: 14, color: '#6B7280', marginBottom: 10 },
  requestVotes: { fontSize: 13, color: '#6B7280', marginBottom: 12 },
  requestActions: { flexDirection: 'row', gap: 8 },
  agreeButton: {
    flex: 1,
    backgroundColor: '#34C759',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  agreeText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  disagreeButton: {
    flex: 1,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
  },
  disagreeText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  contributorsSectionLabel: { fontSize: 13, fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  searchInput: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#111827',
    marginBottom: 4,
  },
  searchDropdown: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
    overflow: 'hidden',
  },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  searchResultUsername: { flex: 1, fontSize: 15, color: '#111827', fontWeight: '500' },
  searchResultAdd: { fontSize: 22, color: '#FF6B6B', fontWeight: '600', lineHeight: 24 },
  addSuccessText: { fontSize: 14, color: '#34C759', fontWeight: '600', marginBottom: 4 },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  memberAvatar: { width: 32, height: 32, borderRadius: 16 },
  memberAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FF6B6B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberAvatarLetter: { color: '#fff', fontSize: 13, fontWeight: '700' },
  memberUsername: { flex: 1, fontSize: 15, color: '#111827', fontWeight: '500' },
  removeButton: { borderWidth: 1.5, borderColor: '#EF4444', borderRadius: 8, paddingVertical: 4, paddingHorizontal: 10 },
  removeButtonText: { color: '#EF4444', fontSize: 13, fontWeight: '600' },
});
