import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActionSheetIOS,
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
import * as MediaLibrary from 'expo-media-library';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { fetchGalleryPhotos, uploadGalleryPhoto, deleteGalleryPhotosBatch } from '../lib/galleries';
import { requestPhotoRemoval, getRemovalRequests } from '../lib/photoRemoval';
import { getMyTagsAppliedToGallery, getOwnerTagsForGallery } from '../lib/tags';
import type { GalleryTagInfo } from '../lib/tags';
import type { RootStackParamList } from '../navigation/types';
import type { GalleryPrivacy, Photo } from '../types/database';
import CommentsSheet from '../components/CommentsSheet';
import GalleryHeaderTagsRow from '../components/GalleryHeaderTagsRow';
import TagApplyDropdown from '../components/TagApplyDropdown';
import TagChipsRow from '../components/TagChipsRow';
import TagsPopover from '../components/TagsPopover';
import { ContributorsModal } from '../components/ContributorsModal';
import { RemovalRequestsModal } from '../components/RemovalRequestsModal';
import { SettingsModal } from '../components/SettingsModal';
import { GalleryActionSheet } from '../components/GalleryActionSheet';
import { PhotoGrid } from '../components/PhotoGrid';
import UploadProgressOverlay from '../components/UploadProgressOverlay';
import { PhotoUploadReviewModal } from '../components/PhotoUploadReviewModal';
import { Skeleton } from '../components/Skeleton';
import styles from '../styles/galleryDetailStyles';
import SelectionActionBar, { SelectionHeader } from '../components/SelectionActionBar';
import SaveConfirmSheet from '../components/SaveConfirmSheet';
import { savePhotosToCameraRoll, sharePhotos, type SavablePhoto } from '../lib/photoSave';
import DuplicatesAlert from '../components/DuplicatesAlert';
import { hashPhotoFile } from '../lib/photoHash';
import { classifyForDuplicates, type PickedPhoto, type ClassifiedPhoto } from '../lib/duplicateCheck';

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
  const [uploadState, setUploadState] = useState({ total: 0, completed: 0, failed: 0, currentIndex: 0, inProgress: false });
  const [error, setError] = useState<string | null>(null);
  const [showContributors, setShowContributors] = useState(false);
  const [contributorRefreshKey, setContributorRefreshKey] = useState(0);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [showRemovalRequests, setShowRemovalRequests] = useState(false);
  const [removalRequestCount, setRemovalRequestCount] = useState(0);
  const [contributorCount, setContributorCount] = useState(0);
  const [galleryMeta, setGalleryMeta] = useState<{ title: string; created_by: string; privacy: GalleryPrivacy; comment_count?: number } | null>(null);
  const [showComments, setShowComments] = useState(false);
  const [pendingReviewPhotos, setPendingReviewPhotos] = useState<any[] | null>(null);
  const [highlightedRequestId, setHighlightedRequestId] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [saveConfirmVisible, setSaveConfirmVisible] = useState(false);
  const [saveInProgress, setSaveInProgress] = useState(false);
  const [duplicatesAlertVisible, setDuplicatesAlertVisible] = useState(false);
  const [pendingClassified, setPendingClassified] = useState<ClassifiedPhoto[]>([]);
  const [pendingUniqueCount, setPendingUniqueCount] = useState(0);
  const [pendingDuplicateCount, setPendingDuplicateCount] = useState(0);
  const [galleryTags, setGalleryTags] = useState<GalleryTagInfo[]>([]);
  const [ownerTags, setOwnerTags] = useState<GalleryTagInfo[]>([]);
  const [ownerTagsPopoverVisible, setOwnerTagsPopoverVisible] = useState(false);
  const [tagDropdownVisible, setTagDropdownVisible] = useState(false);
  const highlightConsumed = useRef(false);

  const isOwner = !!session?.user.id && session.user.id === galleryMeta?.created_by;
  const [isMember, setIsMember] = useState(false);
  const [canTag, setCanTag] = useState(false);

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
    if (session?.user?.id) getMyTagsAppliedToGallery(galleryId, session.user.id).then(setGalleryTags).catch(() => {});
    getOwnerTagsForGallery(galleryId).then(setOwnerTags).catch(() => {});
    getRemovalRequests(galleryId).then(data => setRemovalRequestCount(data.length));
    supabase.from('gallery_members').select('user_id', { count: 'exact', head: true }).eq('gallery_id', galleryId).eq('status', 'accepted').then(({ count }) => setContributorCount(count ?? 0));
    if (session?.user.id) {
      supabase
        .from('gallery_members')
        .select('user_id, status')
        .eq('gallery_id', galleryId)
        .eq('user_id', session.user.id)
        .maybeSingle()
        .then(({ data }) => {
          const isMemberAccepted = !!data && data.status === 'accepted';
          setIsMember(isMemberAccepted);
          setCanTag(isMemberAccepted);
        });
    }
  }, [load, loadGalleryMeta, galleryId, session?.user.id]);

  useEffect(() => {
    if (!session?.user?.id || !galleryMeta) return;
    if (galleryMeta.created_by === session.user.id) setCanTag(true);
  }, [galleryMeta, session?.user?.id]);

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

  const performUpload = async (toUpload: ClassifiedPhoto[]) => {
    if (toUpload.length === 0) {
      Alert.alert('Nothing to upload', 'All selected photos are already in this gallery.');
      await load();
      setUploading(false);
      setUploadState(prev => ({ ...prev, inProgress: false }));
      return;
    }
    const total = toUpload.length;
    let completed = 0;
    let failed = 0;
    setUploading(true);
    setUploadState({ total, completed: 0, failed: 0, currentIndex: 0, inProgress: true });
    for (let i = 0; i < toUpload.length; i++) {
      const p = toUpload[i];
      setUploadState(prev => ({ ...prev, currentIndex: i + 1 }));
      try {
        await uploadGalleryPhoto({
          galleryId,
          uri: p.uri,
          mimeType: p.mimeType,
          contentHash: p.contentHash,
          sourceAssetId: p.assetId,
        });
        completed++;
        setUploadState(prev => ({ ...prev, completed }));
      } catch {
        failed++;
        setUploadState(prev => ({ ...prev, failed }));
      }
    }
    await load();
    setUploading(false);
    setUploadState(prev => ({ ...prev, inProgress: false }));
    if (failed > 0) {
      Alert.alert('Upload complete', `Uploaded ${completed} of ${total} photos. ${failed} failed.`);
    }
  };

  const runUploadLoop = async (assets: any[]) => {
    setPendingReviewPhotos(null);
    if (assets.length === 0) return;
    setUploading(true);
    let picked: PickedPhoto[];
    try {
      picked = await Promise.all(
        assets.map(async (asset) => ({
          uri: asset.uri,
          mimeType: asset.mimeType ?? undefined,
          assetId: asset.assetId ?? null,
          contentHash: await hashPhotoFile(asset.uri),
        })),
      );
    } catch {
      Alert.alert('Upload failed', "Couldn't read one or more photos. Please try again.");
      setUploading(false);
      return;
    }
    let classification;
    try {
      classification = await classifyForDuplicates(galleryId, picked);
    } catch {
      Alert.alert('Upload check failed', "Couldn't check for duplicates. Please try again.");
      setUploading(false);
      return;
    }
    const { classified, duplicateCount, uniqueCount } = classification;
    if (duplicateCount === 0) {
      await performUpload(classified);
      return;
    }
    setPendingClassified(classified);
    setPendingDuplicateCount(duplicateCount);
    setPendingUniqueCount(uniqueCount);
    setUploading(false);
    setDuplicatesAlertVisible(true);
  };

  const getRecentCameraRollPhotos = async (hoursBack: number = 6): Promise<Array<{ uri: string; assetId: string; creationTime: number; mimeType: string; width: number; height: number }>> => {
    const permission = await MediaLibrary.requestPermissionsAsync();
    if (permission.status !== 'granted') return [];
    const cutoff = Date.now() - hoursBack * 60 * 60 * 1000;
    const { assets } = await MediaLibrary.getAssetsAsync({
      mediaType: MediaLibrary.MediaType.photo,
      createdAfter: cutoff,
      first: 500,
    });
    const sorted = assets.slice().sort((a, b) => b.creationTime - a.creationTime);
    const results = await Promise.allSettled(
      sorted.map(async (asset) => {
        const info = await MediaLibrary.getAssetInfoAsync(asset);
        return {
          uri: info.localUri || asset.uri,
          assetId: asset.id,
          creationTime: asset.creationTime,
          mimeType: 'image/jpeg' as const,
          width: asset.width,
          height: asset.height,
        };
      }),
    );
    return results
      .filter((r): r is PromiseFulfilledResult<{ uri: string; assetId: string; creationTime: number; mimeType: string; width: number; height: number }> => r.status === 'fulfilled')
      .map(r => r.value);
  };

  const launchImagePickerFlow = async () => {
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
    if (result.canceled || !result.assets || result.assets.length === 0) return;
    setPendingReviewPhotos(result.assets);
  };

  const handleUpload = async () => {
    const recent = await getRecentCameraRollPhotos(6);
    if (recent.length === 0) {
      await launchImagePickerFlow();
      return;
    }
    const label = `Add ${recent.length} photo${recent.length === 1 ? '' : 's'} from last 6 hours`;
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: [label, 'Choose photos…', 'Cancel'], cancelButtonIndex: 2 },
        async (buttonIndex) => {
          if (buttonIndex === 0) {
            setPendingReviewPhotos(recent.map(a => ({ uri: a.uri, assetId: a.assetId, mimeType: a.mimeType, width: a.width, height: a.height })));
          } else if (buttonIndex === 1) {
            await launchImagePickerFlow();
          }
        },
      );
    } else {
      Alert.alert(
        'Add Photos',
        undefined,
        [
          { text: label, onPress: () => setPendingReviewPhotos(recent.map(a => ({ uri: a.uri, assetId: a.assetId, mimeType: a.mimeType, width: a.width, height: a.height }))) },
          { text: 'Choose photos…', onPress: launchImagePickerFlow },
          { text: 'Cancel', style: 'cancel' },
        ],
      );
    }
  };

  const enterSelectionMode = () => { setSelectionMode(true); setSelectedIds([]); };
  const exitSelectionMode = () => { setSelectionMode(false); setSelectedIds([]); };
  const toggleSelect = (photoId: string) => setSelectedIds(prev =>
    prev.includes(photoId) ? prev.filter(id => id !== photoId) : [...prev, photoId],
  );
  const selectAll = () => setSelectedIds(photos.map(p => p.id));
  const deselectAll = () => setSelectedIds([]);
  const handleSavePress = () => { if (selectedIds.length === 0) return; setSaveConfirmVisible(true); };
  const handleSaveConfirm = async (dedupe: boolean) => {
    if (!session?.user.id) return;
    setSaveConfirmVisible(false);
    setSaveInProgress(true);
    const chosen: SavablePhoto[] = photos.filter(p => selectedIds.includes(p.id)).map(p => ({ id: p.id, url: p.url }));
    try {
      const result = await savePhotosToCameraRoll({ photos: chosen, userId: session.user.id, galleryId, dedupe });
      if (result.permissionDenied) {
        Alert.alert('Permission Needed', 'Please enable Photos access for Momento in iOS Settings.');
      } else {
        const parts: string[] = [];
        if (result.savedCount > 0) parts.push(`Saved ${result.savedCount} photo${result.savedCount === 1 ? '' : 's'}.`);
        if (result.skippedDuplicateCount > 0) parts.push(`Skipped ${result.skippedDuplicateCount} duplicate${result.skippedDuplicateCount === 1 ? '' : 's'}.`);
        if (result.failedCount > 0) parts.push(`${result.failedCount} failed to save.`);
        Alert.alert('Saved', parts.join(' ') || 'Done.');
      }
      setSaveInProgress(false);
      exitSelectionMode();
    } catch (e: any) {
      Alert.alert('Save Failed', e?.message ?? 'An error occurred.');
      setSaveInProgress(false);
    }
  };
  const handleSharePress = async () => {
    if (selectedIds.length === 0) return;
    setSaveInProgress(true);
    const chosen: SavablePhoto[] = photos.filter(p => selectedIds.includes(p.id)).map(p => ({ id: p.id, url: p.url }));
    try {
      await sharePhotos(chosen);
    } catch (e: any) {
      Alert.alert('Share Failed', e?.message ?? 'An error occurred.');
    } finally {
      setSaveInProgress(false);
    }
  };

  const handleDeleteSelectedRequest = () => {
    const count = selectedIds.length;
    if (count === 0) return;
    Alert.alert(
      `Delete ${count} photo${count === 1 ? '' : 's'}?`,
      'This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const ids = [...selectedIds];
            if (ids.length === 0) return;
            try {
              await deleteGalleryPhotosBatch(galleryId, ids);
              exitSelectionMode();
              await load();
            } catch (err: any) {
              Alert.alert('Delete failed', err?.message ?? 'Could not delete photos. Please try again.');
            }
          },
        },
      ],
    );
  };

  const shouldShowOwnerTags = !isOwner && ownerTags.length > 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{galleryMeta?.title ?? ''}</Text>
        <View style={styles.headerActions}>
          {isMember && photos.length > 0 && !selectionMode && (
            <Pressable
              style={({ pressed }) => [styles.settingsButton, pressed && { opacity: 0.7 }]}
              onPress={enterSelectionMode}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="checkmark-circle-outline" size={22} color="#fff" />
            </Pressable>
          )}
          <Pressable
            style={({ pressed }) => [styles.inviteButton, pressed && { opacity: 0.7 }]}
            onPress={() => setShowContributors(true)}
            hitSlop={8}
          >
            <View style={{ position: 'relative' }}>
              <Ionicons name="people-outline" size={16} color="#fff" />
              {contributorCount > 1 && (
                <View style={{ position: 'absolute', bottom: -13, right: -14, backgroundColor: '#FF6B6B', borderRadius: 9, minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3, borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)' }}>
                  <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700', lineHeight: undefined, includeFontPadding: false, textAlignVertical: 'center' }}>{contributorCount}</Text>
                </View>
              )}
            </View>
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
        </View>
      </View>

      {shouldShowOwnerTags && (
        <View style={{ marginTop: 4, marginBottom: 8, paddingHorizontal: 16 }}>
          <TagChipsRow
            tags={ownerTags}
            maxVisible={4}
            onOpenAll={() => setOwnerTagsPopoverVisible(true)}
          />
        </View>
      )}
      {selectionMode ? (
        <SelectionHeader
          selectedCount={selectedIds.length}
          onCancel={exitSelectionMode}
          onDeleteRequest={isOwner ? handleDeleteSelectedRequest : undefined}
        />
      ) : (
        <GalleryHeaderTagsRow
          tags={galleryTags}
          isOwner={canTag}
          onPressTags={() => setTagDropdownVisible(true)}
        />
      )}

      {loading ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', padding: 4 }}>
          {Array.from({ length: 9 }).map((_, i) => (
            <View key={i} style={{ width: '33.333%', padding: 2 }}>
              <Skeleton
                width="100%"
                style={{ aspectRatio: 1 }}
                borderRadius={4}
              />
            </View>
          ))}
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={load}><Text style={styles.retryText}>Retry</Text></Pressable>
        </View>
      ) : photos.length === 0 ? (
        (isOwner || isMember) ? (
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
          <View style={styles.center}>
            <Text style={styles.emptyIcon}>📷</Text>
            <Text style={styles.emptyTitle}>No photos yet</Text>
            <Text style={styles.emptySubtitle}>The contributors of this gallery haven't uploaded any photos yet.</Text>
          </View>
        )
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
          selectionMode={selectionMode}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
          onEnterSelection={enterSelectionMode}
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
        onPrivacySaved={(privacy) => { setGalleryMeta(prev => prev ? { ...prev, privacy } : prev); if (session?.user?.id) getMyTagsAppliedToGallery(galleryId, session.user.id).then(setGalleryTags).catch(() => {}); getOwnerTagsForGallery(galleryId).then(setOwnerTags).catch(() => {}); }}
        onGalleryDeleted={() => navigation.goBack()}
        onCoverPhotoUpdated={() => { loadGalleryMeta(); if (session?.user?.id) getMyTagsAppliedToGallery(galleryId, session.user.id).then(setGalleryTags).catch(() => {}); getOwnerTagsForGallery(galleryId).then(setOwnerTags).catch(() => {}); }}
        onTransferOwnership={() => {
          setSettingsVisible(false);
          navigation.navigate('TransferOwnership', { galleryId, galleryTitle: galleryMeta?.title ?? '' });
        }}
      />
      <GalleryActionSheet
        gallery={actionSheetVisible && galleryMeta ? { ...galleryMeta, id: galleryId } as any : null}
        onClose={() => {
          setActionSheetVisible(false);
          if (session?.user?.id) getMyTagsAppliedToGallery(galleryId, session.user.id).then(setGalleryTags).catch(() => {});
          getOwnerTagsForGallery(galleryId).then(setOwnerTags).catch(() => {});
        }}
        onSaveRename={async (_title) => {
          await loadGalleryMeta();
          await load();
        }}
        onSavePrivacy={async (_privacy) => {
          await loadGalleryMeta();
          await load();
        }}
        onSelectCover={async (_photoUrl) => {
          await loadGalleryMeta();
          await load();
        }}
        onDelete={() => {
          setActionSheetVisible(false);
          setSettingsVisible(true);
        }}
        currentUserId={session?.user?.id}
      />
      <TagsPopover
        visible={ownerTagsPopoverVisible}
        tags={ownerTags}
        onClose={() => setOwnerTagsPopoverVisible(false)}
      />
      <TagApplyDropdown
        visible={tagDropdownVisible}
        viewerId={session?.user?.id ?? ''}
        galleryId={galleryId}
        onClose={() => setTagDropdownVisible(false)}
        onChanged={() => {
          if (session?.user?.id) getMyTagsAppliedToGallery(galleryId, session.user.id).then(setGalleryTags).catch(() => {});
          getOwnerTagsForGallery(galleryId).then(setOwnerTags).catch(() => {});
        }}
      />
      <UploadProgressOverlay
        visible={uploadState.inProgress}
        totalCount={uploadState.total}
        completedCount={uploadState.completed}
        failedCount={uploadState.failed}
        currentIndex={uploadState.currentIndex}
      />
      <PhotoUploadReviewModal
        visible={pendingReviewPhotos !== null}
        photos={pendingReviewPhotos ?? []}
        onCancel={() => setPendingReviewPhotos(null)}
        onConfirm={(finalPhotos) => runUploadLoop(finalPhotos)}
      />


      {photos.length > 0 && !loading && (isOwner || isMember) && (
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
      {selectionMode && (
        <SelectionActionBar
          selectedCount={selectedIds.length}
          totalCount={photos.length}
          onSelectAll={selectAll}
          onDeselectAll={deselectAll}
          onSave={handleSavePress}
          onShare={handleSharePress}
          onCancel={exitSelectionMode}
          disabled={saveInProgress}
        />
      )}
      <SaveConfirmSheet
        visible={saveConfirmVisible}
        selectedCount={selectedIds.length}
        userId={session?.user?.id ?? ''}
        onCancel={() => setSaveConfirmVisible(false)}
        onConfirm={handleSaveConfirm}
      />
      <DuplicatesAlert
        visible={duplicatesAlertVisible}
        duplicateCount={pendingDuplicateCount}
        uniqueCount={pendingUniqueCount}
        onUploadAnyway={() => { setDuplicatesAlertVisible(false); performUpload(pendingClassified); }}
        onSkipDuplicates={() => { setDuplicatesAlertVisible(false); performUpload(pendingClassified.filter(p => !p.isDuplicate)); }}
        onCancel={() => { setDuplicatesAlertVisible(false); setPendingClassified([]); setPendingDuplicateCount(0); setPendingUniqueCount(0); }}
      />
    </SafeAreaView>
  );
}

