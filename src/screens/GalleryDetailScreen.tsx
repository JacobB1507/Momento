import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { fetchGalleryPhotos, uploadGalleryPhoto } from '../lib/galleries';
import { requestPhotoRemoval, getRemovalRequests } from '../lib/photoRemoval';
import type { RootStackParamList } from '../navigation/types';
import type { GalleryPrivacy, Photo } from '../types/database';
import CommentsSheet from '../components/CommentsSheet';
import { ContributorsModal } from '../components/ContributorsModal';
import { RemovalRequestsModal } from '../components/RemovalRequestsModal';
import { SettingsModal } from '../components/SettingsModal';
import { PhotoGrid } from '../components/PhotoGrid';
import styles from '../styles/galleryDetailStyles';

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
  const [showContributors, setShowContributors] = useState(false);
  const [contributorRefreshKey, setContributorRefreshKey] = useState(0);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [showRemovalRequests, setShowRemovalRequests] = useState(false);
  const [removalRequestCount, setRemovalRequestCount] = useState(0);
  const [contributorCount, setContributorCount] = useState(0);
  const [galleryMeta, setGalleryMeta] = useState<{ title: string; created_by: string; privacy: GalleryPrivacy; comment_count?: number } | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [highlightedRequestId, setHighlightedRequestId] = useState<string | null>(null);
  const highlightConsumed = useRef(false);

  const isOwner = !!session?.user.id && session.user.id === galleryMeta?.created_by;
  const [isMember, setIsMember] = useState(false);

  const loadGalleryMeta = useCallback(async () => {
    const { data } = await supabase
      .from('galleries')
      .select('title, created_by, privacy, comment_count')
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
    if (!highlightConsumed.current) {
      highlightConsumed.current = true;
      if (route.params?.openRemovalRequest) {
        setShowRemovalRequests(true);
        setHighlightedRequestId(route.params.openRemovalRequest);
      }
      if (route.params?.openComments) {
        setTimeout(() => setShowComments(true), 500);
      }
    }
  }, []);

  useEffect(() => {
    Promise.all([load(), loadGalleryMeta()]).finally(() => setLoading(false));
    getRemovalRequests(galleryId).then(data => setRemovalRequestCount(data.length));
    supabase.from('gallery_members').select('user_id', { count: 'exact', head: true }).eq('gallery_id', galleryId).then(({ count }) => setContributorCount(count ?? 0));
    if (session?.user.id) {
      supabase
        .from('gallery_members')
        .select('user_id')
        .eq('gallery_id', galleryId)
        .eq('user_id', session.user.id)
        .maybeSingle()
        .then(({ data }) => setIsMember(!!data));
    }
  }, [load, loadGalleryMeta, galleryId, session?.user.id]);

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

  const handleUpload = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow Momento to access your photos in Settings.', [{ text: 'OK' }]);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 100,
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
          <Pressable
            style={({ pressed }) => [styles.inviteButton, pressed && { opacity: 0.7 }]}
            onPress={() => setShowContributors(true)}
            hitSlop={8}
          >
            <Ionicons name="people-outline" size={16} color="#fff" />
            {contributorCount > 1 && (
              <View style={styles.contributorBadge}>
                <Text style={styles.contributorBadgeText}>{contributorCount}</Text>
              </View>
            )}
          </Pressable>
          {removalRequestCount > 0 && (
            <Pressable
              style={({ pressed }) => [styles.removalButton, pressed && { opacity: 0.7 }]}
              onPress={() => setShowRemovalRequests(true)}
              hitSlop={8}
            >
              <Ionicons name="flag-outline" size={16} color="#F59E0B" />
              <View style={styles.removalDot} />
            </Pressable>
          )}
          {isOwner && (
            <Pressable
              style={({ pressed }) => [styles.settingsButton, pressed && { opacity: 0.7 }]}
              onPress={() => setSettingsVisible(true)}
              hitSlop={8}
            >
              <Ionicons name="settings-outline" size={16} color="#fff" />
            </Pressable>
          )}
          {photos.length > 0 && !loading && (
            <View style={styles.countBadge}>
              <Ionicons name="apps-outline" size={13} color="#fff" />
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
          isMember={isOwner || isMember}
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

      <Pressable onPress={() => setShowComments(true)} style={styles.commentBtn}>
        <Ionicons name="chatbubble-outline" size={18} color="#FF6B6B" />
        <Text style={styles.commentBtnText}>
          {(galleryMeta?.comment_count ?? 0) > 0 ? `${galleryMeta!.comment_count} Comments` : 'Add a comment'}
        </Text>
      </Pressable>

      <CommentsSheet galleryId={galleryId} visible={showComments} onClose={() => { setShowComments(false); loadGalleryMeta(); }} highlightUserId={route.params?.highlightUserId} />

      <RemovalRequestsModal
        visible={showRemovalRequests}
        onClose={() => {
          setShowRemovalRequests(false);
          setHighlightedRequestId(null);
          getRemovalRequests(galleryId).then(data => setRemovalRequestCount(data.length));
        }}
        galleryId={galleryId}
        highlightedRequestId={highlightedRequestId}
      />

      <ContributorsModal
        visible={showContributors}
        onClose={() => { setShowContributors(false); setContributorRefreshKey(k => k + 1); }}
        galleryId={galleryId}
        isOwner={isOwner}
        ownerId={galleryMeta?.created_by ?? ''}
      />

      <SettingsModal
        visible={settingsVisible}
        galleryId={galleryId}
        currentPrivacy={galleryMeta?.privacy ?? 'friends'}
        onClose={() => setSettingsVisible(false)}
        onPrivacySaved={(privacy) => setGalleryMeta(prev => prev ? { ...prev, privacy } : prev)}
        onGalleryDeleted={() => navigation.goBack()}
        onTransferOwnership={() => {
          setSettingsVisible(false);
          navigation.navigate('TransferOwnership', { galleryId, galleryTitle: galleryMeta?.title ?? '' });
        }}
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

