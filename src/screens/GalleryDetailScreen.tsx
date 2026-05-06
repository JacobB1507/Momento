import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
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
import type { RootStackParamList } from '../navigation/types';
import type { GalleryPrivacy, Photo } from '../types/database';
import { InviteModal } from '../components/InviteModal';
import { SettingsModal } from '../components/SettingsModal';
import { PhotoGrid } from '../components/PhotoGrid';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'GalleryDetail'>;
type RouteProps = RouteProp<RootStackParamList, 'GalleryDetail'>;

export default function GalleryDetailScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProps>();
  const { galleryId } = route.params;
  const { session } = useAuth();

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteVisible, setInviteVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [galleryMeta, setGalleryMeta] = useState<{ title: string; created_by: string; privacy: GalleryPrivacy } | null>(null);

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

  useEffect(() => {
    Promise.all([load(), loadGalleryMeta()]).finally(() => setLoading(false));
  }, [load, loadGalleryMeta]);

  const handleDeletePhoto = (photo: Photo) => {
    Alert.alert('Delete photo?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const { error: dbError } = await supabase.from('gallery_photos').delete().eq('id', photo.id);
          if (dbError) { Alert.alert('Error', dbError.message); return; }
          await supabase.storage.from('gallery-photos').remove([photo.storage_path]);
          setPhotos(prev => prev.filter(p => p.id !== photo.id));
        },
      },
    ]);
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
        />
      )}

      <InviteModal
        visible={inviteVisible}
        galleryId={galleryId}
        onClose={() => setInviteVisible(false)}
      />

      <SettingsModal
        visible={settingsVisible}
        galleryId={galleryId}
        currentPrivacy={galleryMeta?.privacy ?? 'friends'}
        onClose={() => setSettingsVisible(false)}
        onPrivacySaved={(privacy) => setGalleryMeta(prev => prev ? { ...prev, privacy } : prev)}
        onGalleryDeleted={() => navigation.goBack()}
      />

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
});
