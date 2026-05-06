import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
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
import { fetchGalleryPhotos, inviteUserToGallery, uploadGalleryPhoto } from '../lib/galleries';
import type { RootStackParamList } from '../navigation/types';
import type { GalleryPrivacy, Photo } from '../types/database';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const PRIVACY_OPTIONS: { value: GalleryPrivacy; label: string; description: string }[] = [
  { value: 'private', label: 'Private', description: 'Only members' },
  { value: 'friends', label: 'Friends', description: 'Your friends only' },
  { value: 'public', label: 'Public', description: 'Anyone on Momento' },
];

const GAP = 2;
const COLUMNS = 3;
const PHOTO_SIZE = Math.floor((SCREEN_WIDTH - GAP * (COLUMNS - 1)) / COLUMNS);

type NavProp = NativeStackNavigationProp<RootStackParamList, 'GalleryDetail'>;
type RouteProps = RouteProp<RootStackParamList, 'GalleryDetail'>;

export default function GalleryDetailScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProps>();
  const { galleryId, galleryTitle } = route.params;
  const { session } = useAuth();

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteVisible, setInviteVisible] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [noAccountVisible, setNoAccountVisible] = useState(false);
  const [galleryMeta, setGalleryMeta] = useState<{ created_by: string; privacy: GalleryPrivacy } | null>(null);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [draftPrivacy, setDraftPrivacy] = useState<GalleryPrivacy>('friends');
  const [savingPrivacy, setSavingPrivacy] = useState(false);

  const isOwner = !!session?.user.id && session.user.id === galleryMeta?.created_by;

  const loadGalleryMeta = useCallback(async () => {
    const { data } = await supabase
      .from('galleries')
      .select('created_by, privacy')
      .eq('id', galleryId)
      .single();
    if (data) setGalleryMeta(data);
  }, [galleryId]);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchGalleryPhotos(galleryId);
      console.log('photos loaded:', data);
      setPhotos(data);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load photos');
    }
  }, [galleryId]);

  useEffect(() => {
    Promise.all([load(), loadGalleryMeta()]).finally(() => setLoading(false));
  }, [load, loadGalleryMeta]);

  const handleInvite = async () => {
    const email = inviteEmail.trim();
    if (!email) return;
    setInviting(true);
    try {
      const result = await inviteUserToGallery(galleryId, email);
      if (result === 'no_account') {
        setInviteVisible(false);
        setNoAccountVisible(true);
        return;
      }
      setInviteVisible(false);
      setInviteEmail('');
      Alert.alert('Invited', `${email} has been added to this gallery.`);
    } catch (e: any) {
      Alert.alert('Could not invite', e?.message ?? 'Something went wrong.');
    } finally {
      setInviting(false);
    }
  };

  const handleTextInvite = () => {
    const msg = `Hey! I've been using Momento to share photos privately with friends and family. Download the app and I'll add you to my gallery!`;
    Linking.openURL(`sms:?body=${encodeURIComponent(msg)}`);
    setNoAccountVisible(false);
    setInviteEmail('');
  };

  const handleEmailInvite = () => {
    const subject = encodeURIComponent('Join me on Momento');
    const body = encodeURIComponent(
      `Hey!\n\nI've been using Momento to share photos privately with friends and family. Download the app and I'll add you to my gallery!\n\nSee you there!`
    );
    Linking.openURL(`mailto:${inviteEmail.trim()}?subject=${subject}&body=${body}`);
    setNoAccountVisible(false);
    setInviteEmail('');
  };

  const handleSavePrivacy = async () => {
    setSavingPrivacy(true);
    const { error } = await supabase
      .from('galleries')
      .update({ privacy: draftPrivacy })
      .eq('id', galleryId);
    setSavingPrivacy(false);
    if (error) {
      Alert.alert('Error', error.message);
    } else {
      setGalleryMeta(prev => prev ? { ...prev, privacy: draftPrivacy } : prev);
      setSettingsVisible(false);
    }
  };

  const handleDeletePhoto = (photo: Photo) => {
    Alert.alert('Delete photo?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const { error: dbError } = await supabase
            .from('gallery_photos')
            .delete()
            .eq('id', photo.id);
          if (dbError) { Alert.alert('Error', dbError.message); return; }
          await supabase.storage.from('gallery-photos').remove([photo.storage_path]);
          setPhotos(prev => prev.filter(p => p.id !== photo.id));
        },
      },
    ]);
  };

  const handleDeleteGallery = () => {
    Alert.alert(
      'Delete gallery?',
      'All photos and members will be removed. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setSettingsVisible(false);
            const { error } = await supabase.from('galleries').delete().eq('id', galleryId);
            if (error) { Alert.alert('Error', error.message); return; }
            navigation.goBack();
          },
        },
      ]
    );
  };

  const handleUpload = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission needed',
        'Allow Momento to access your photos in Settings.',
        [{ text: 'OK' }]
      );
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
        result.assets.map((asset) =>
          uploadGalleryPhoto({
            galleryId,
            uri: asset.uri,
            mimeType: asset.mimeType ?? undefined,
          })
        )
      );
    } catch (e: any) {
      Alert.alert('Upload failed', e?.message ?? 'Something went wrong. Please try again.');
    } finally {
      await load();
      setUploading(false);
    }
  };

  const renderPhoto = ({ item, index }: { item: Photo; index: number }) => {
    const isLastInRow = (index + 1) % COLUMNS === 0;
    const canDelete = isOwner || session?.user.id === item.uploaded_by;
    return (
      <Pressable
        style={({ pressed }) => [
          styles.photoCell,
          !isLastInRow && { marginRight: GAP },
          pressed && styles.photoCellPressed,
        ]}
        onLongPress={canDelete ? () => handleDeletePhoto(item) : undefined}
        delayLongPress={400}
      >
        <Image source={{ uri: item.url }} style={styles.photo} resizeMode="cover" />
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{galleryTitle}</Text>
        <View style={styles.headerActions}>
          {isOwner && (
            <Pressable
              style={({ pressed }) => [styles.settingsButton, pressed && { opacity: 0.7 }]}
              onPress={() => { setDraftPrivacy(galleryMeta?.privacy ?? 'friends'); setSettingsVisible(true); }}
              hitSlop={8}
            >
              <Text style={styles.settingsIcon}>⚙</Text>
            </Pressable>
          )}
          <Pressable
            style={({ pressed }) => [styles.inviteButton, pressed && { opacity: 0.7 }]}
            onPress={() => setInviteVisible(true)}
            hitSlop={8}
          >
            <Text style={styles.inviteButtonText}>Invite</Text>
          </Pressable>
          {photos.length > 0 && !loading && (
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{photos.length}</Text>
            </View>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FF6B6B" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={load}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : photos.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyIcon}>📷</Text>
          <Text style={styles.emptyTitle}>No photos yet</Text>
          <Text style={styles.emptySubtitle}>Tap the button below to add photos from your camera roll.</Text>
          <Pressable
            style={({ pressed }) => [styles.emptyButton, pressed && styles.emptyButtonPressed]}
            onPress={handleUpload}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.emptyButtonText}>Add Photos</Text>
            )}
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={photos}
          keyExtractor={(item) => item.id}
          numColumns={COLUMNS}
          renderItem={renderPhoto}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.grid}
          ItemSeparatorComponent={() => <View style={{ height: GAP }} />}
        />
      )}

      <Modal
        visible={inviteVisible}
        transparent
        animationType="fade"
        onRequestClose={() => { setInviteVisible(false); setInviteEmail(''); }}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Invite by email</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="friend@example.com"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              value={inviteEmail}
              onChangeText={setInviteEmail}
              onSubmitEditing={handleInvite}
              returnKeyType="send"
            />
            <View style={styles.modalButtons}>
              <Pressable
                style={({ pressed }) => [styles.modalCancel, pressed && { opacity: 0.7 }]}
                onPress={() => { setInviteVisible(false); setInviteEmail(''); }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.modalSend,
                  (!inviteEmail.trim() || inviting) && styles.modalSendDisabled,
                  pressed && { opacity: 0.8 },
                ]}
                onPress={handleInvite}
                disabled={!inviteEmail.trim() || inviting}
              >
                {inviting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalSendText}>Send</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={noAccountVisible}
        transparent
        animationType="fade"
        onRequestClose={() => { setNoAccountVisible(false); setInviteEmail(''); }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.noAccountIcon}>👋</Text>
            <Text style={styles.modalTitle}>This person isn't on Momento yet!</Text>
            <Text style={styles.noAccountSubtitle}>
              Invite {inviteEmail} to join and you'll be able to add them to your gallery.
            </Text>
            <Pressable
              style={({ pressed }) => [styles.noAccountButton, pressed && { opacity: 0.8 }]}
              onPress={handleTextInvite}
            >
              <Text style={styles.noAccountButtonText}>Send Text Invite</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.noAccountButtonOutline, pressed && { opacity: 0.8 }]}
              onPress={handleEmailInvite}
            >
              <Text style={styles.noAccountButtonOutlineText}>Send Email Invite</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.noAccountDismiss, pressed && { opacity: 0.6 }]}
              onPress={() => { setNoAccountVisible(false); setInviteEmail(''); }}
            >
              <Text style={styles.noAccountDismissText}>Maybe Later</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={settingsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSettingsVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSettingsVisible(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <Text style={styles.modalTitle}>Gallery Settings</Text>
            <Text style={styles.settingsSection}>Privacy</Text>
            <View style={styles.privacyRow}>
              {PRIVACY_OPTIONS.map((opt) => {
                const selected = draftPrivacy === opt.value;
                return (
                  <Pressable
                    key={opt.value}
                    style={({ pressed }) => [
                      styles.privacyOption,
                      selected && styles.privacyOptionSelected,
                      pressed && !selected && { opacity: 0.7 },
                    ]}
                    onPress={() => setDraftPrivacy(opt.value)}
                  >
                    <Text style={[styles.privacyOptionLabel, selected && styles.privacyOptionLabelSelected]}>
                      {opt.label}
                    </Text>
                    <Text style={[styles.privacyOptionDesc, selected && styles.privacyOptionDescSelected]}>
                      {opt.description}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.modalButtons}>
              <Pressable
                style={({ pressed }) => [styles.modalCancel, pressed && { opacity: 0.7 }]}
                onPress={() => setSettingsVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.modalSend,
                  savingPrivacy && styles.modalSendDisabled,
                  pressed && { opacity: 0.8 },
                ]}
                onPress={handleSavePrivacy}
                disabled={savingPrivacy}
              >
                {savingPrivacy ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalSendText}>Save</Text>
                )}
              </Pressable>
            </View>
            <Pressable
              style={({ pressed }) => [styles.deleteGalleryButton, pressed && { opacity: 0.7 }]}
              onPress={handleDeleteGallery}
            >
              <Text style={styles.deleteGalleryText}>Delete Gallery</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* FAB — only shown when photos exist */}
      {photos.length > 0 && !loading && (
        <Pressable
          style={({ pressed }) => [styles.fab, pressed && styles.fabPressed, uploading && styles.fabDisabled]}
          onPress={handleUpload}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.fabIcon}>+</Text>
          )}
        </Pressable>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  backIcon: {
    fontSize: 32,
    color: '#FF6B6B',
    lineHeight: 36,
    fontWeight: '300',
  },
  headerTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.4,
  },
  headerRight: { width: 36 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  settingsButton: {
    borderWidth: 1.5,
    borderColor: '#9CA3AF',
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  settingsIcon: { color: '#6B7280', fontSize: 15 },
  inviteButton: {
    borderWidth: 1.5,
    borderColor: '#FF6B6B',
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  inviteButtonText: { color: '#FF6B6B', fontSize: 13, fontWeight: '600' },
  countBadge: {
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
    minWidth: 36,
    alignItems: 'center',
  },
  countText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  grid: { paddingBottom: 100 },

  photoCell: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
  },
  photoCellPressed: { opacity: 0.85 },
  photo: { width: PHOTO_SIZE, height: PHOTO_SIZE },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 8 },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
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
  emptyButtonPressed: { opacity: 0.85 },
  emptyButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  errorText: { color: '#EF4444', fontSize: 15, marginBottom: 12, textAlign: 'center' },
  retryButton: {
    borderWidth: 1.5,
    borderColor: '#FF6B6B',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 28,
  },
  retryText: { color: '#FF6B6B', fontWeight: '600' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#111827', marginBottom: 16 },
  modalInput: {
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#111827',
    marginBottom: 20,
  },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalCancel: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  modalCancelText: { color: '#6B7280', fontWeight: '600', fontSize: 15 },
  modalSend: {
    flex: 1,
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  modalSendDisabled: { opacity: 0.45, shadowOpacity: 0 },
  modalSendText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  noAccountIcon: { fontSize: 36, textAlign: 'center', marginBottom: 12 },
  noAccountSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  noAccountButton: {
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  noAccountButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  noAccountButtonOutline: {
    borderWidth: 1.5,
    borderColor: '#FF6B6B',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 16,
  },
  noAccountButtonOutlineText: { color: '#FF6B6B', fontWeight: '600', fontSize: 15 },
  noAccountDismiss: { alignItems: 'center', paddingVertical: 4 },
  noAccountDismissText: { color: '#9CA3AF', fontSize: 14, fontWeight: '500' },

  settingsSection: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: 0.2,
    marginBottom: 10,
  },
  privacyRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  privacyOption: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  privacyOptionSelected: {
    borderColor: '#FF6B6B',
    backgroundColor: '#FFF5F5',
  },
  privacyOptionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 2,
  },
  privacyOptionLabelSelected: { color: '#FF6B6B' },
  privacyOptionDesc: { fontSize: 10, color: '#9CA3AF' },
  privacyOptionDescSelected: { color: '#FF6B6B' },
  deleteGalleryButton: { alignItems: 'center', paddingVertical: 4, marginTop: 4 },
  deleteGalleryText: { color: '#EF4444', fontSize: 14, fontWeight: '600' },
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
  fabPressed: { opacity: 0.85 },
  fabDisabled: { opacity: 0.6 },
  fabIcon: {
    fontSize: 28,
    color: '#fff',
    fontWeight: '300',
    lineHeight: Platform.OS === 'ios' ? 32 : 30,
  },
});
