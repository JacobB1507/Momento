import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Dimensions, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import type { Photo } from '../types/database';
import { supabase } from '../lib/supabase';
import { deleteOwnPhoto } from '../lib/photoRemoval';
import { Skeleton, SkeletonCircle } from './Skeleton';

type UploaderProfile = { id: string; username: string | null; display_name: string | null; avatar_url: string | null };

const AVATAR_BADGE = 28;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GAP = 2;
const COLUMNS = 3;
const PHOTO_SIZE = Math.floor((SCREEN_WIDTH - GAP * (COLUMNS - 1)) / COLUMNS);
const SELECT_RED = '#FF3B30';

type Props = {
  photos: Photo[];
  isOwner: boolean;
  isMember?: boolean;
  currentUserId?: string;
  onDeletePhoto: (photo: Photo) => void;
  onRemovalRequest?: (photoId: string) => void;
  onPhotoPress?: (photo: Photo, index: number) => void;
  selectionMode?: boolean;
  selectedIds?: string[];
  onToggleSelect?: (photoId: string) => void;
  onEnterSelection?: () => void;
};

function SelectionCircle({ selected }: { selected: boolean }) {
  return (
    <View style={[styles.selCircle, selected && styles.selCircleActive]}>
      {selected && <Ionicons name="checkmark" size={16} color="#fff" />}
    </View>
  );
}

export function PhotoGrid({
  photos, isOwner, isMember, currentUserId,
  onDeletePhoto, onRemovalRequest, onPhotoPress,
  selectionMode = false, selectedIds = [], onToggleSelect, onEnterSelection,
}: Props) {
  const [uploaderProfiles, setUploaderProfiles] = useState<Record<string, UploaderProfile>>({});
  const [hiddenPhotoIds, setHiddenPhotoIds] = useState<string[]>([]);
  const [loadedPhotoIds, setLoadedPhotoIds] = useState<Set<string>>(new Set());
  const [pinnedBannerPhotoId, setPinnedBannerPhotoId] = useState<string | null>(null);

  const markLoaded = useCallback((photoId: string) => {
    setLoadedPhotoIds((prev) => {
      if (prev.has(photoId)) return prev;
      const next = new Set(prev);
      next.add(photoId);
      return next;
    });
  }, []);

  useEffect(() => {
    const uniqueIds = [...new Set(photos.map((p) => p.uploaded_by).filter(Boolean))];
    if (uniqueIds.length === 0) return;
    supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .in('id', uniqueIds)
      .then(({ data }) => {
        if (!data) return;
        const map: Record<string, UploaderProfile> = {};
        data.forEach((p) => { map[p.id] = p; });
        setUploaderProfiles(map);
      });
  }, [photos]);

  const handleLongPress = (item: Photo) => {
    if (selectionMode) return;
    if (!isMember) {
      Alert.alert('Not a contributor', 'You must be a contributor to this gallery to request photo removal.');
      return;
    }
    const isOwn = !!currentUserId && currentUserId === item.uploaded_by;
    const hideOption = { text: 'Hide from My View', onPress: () => setHiddenPhotoIds(prev => [...prev, item.id]) };
    const selectOption = onEnterSelection ? [{ text: 'Select', onPress: onEnterSelection }] : [];
    if (isOwn) {
      Alert.alert(undefined, undefined, [
        ...selectOption,
        { text: 'Delete Photo', style: 'destructive' as const, onPress: async () => {
            const ok = await deleteOwnPhoto(item.id);
            if (ok) onDeletePhoto(item);
            else Alert.alert('Error', 'Could not delete photo. Please try again.');
          },
        },
        hideOption,
        { text: 'Cancel', style: 'cancel' as const },
      ]);
    } else {
      Alert.alert(undefined, undefined, [
        ...selectOption,
        { text: 'Request Removal', onPress: () => onRemovalRequest?.(item.id) },
        hideOption,
        { text: 'Cancel', style: 'cancel' as const },
      ]);
    }
  };

  const visiblePhotos = photos.filter(p => !hiddenPhotoIds.includes(p.id));
  const selectedSet = new Set(selectedIds);

  return (
    <Pressable style={{ flex: 1 }} onPress={() => setPinnedBannerPhotoId(null)}>
    <FlatList
      data={visiblePhotos}
      keyExtractor={(item) => item.id}
      numColumns={COLUMNS}
      renderItem={({ item, index }) => {
        const canInteract = currentUserId === item.uploaded_by || !!onRemovalRequest;
        const uploader = uploaderProfiles[item.uploaded_by];
        const isSelected = !hiddenPhotoIds.includes(item.id) && selectedSet.has(item.id);
        return (
          <Pressable
            style={({ pressed }) => [styles.cell, pressed && styles.cellPressed]}
            onPress={selectionMode && isMember
              ? () => { setPinnedBannerPhotoId(null); onToggleSelect?.(item.id); }
              : onPhotoPress
                ? () => { setPinnedBannerPhotoId(null); onPhotoPress(item, index); }
                : () => setPinnedBannerPhotoId(null)}
            onLongPress={!selectionMode && canInteract ? () => handleLongPress(item) : undefined}
            delayLongPress={400}
          >
            {!loadedPhotoIds.has(item.id) && (
              <View style={StyleSheet.absoluteFill}>
                <Skeleton width={PHOTO_SIZE} height={PHOTO_SIZE} borderRadius={0} />
              </View>
            )}
            <ExpoImage
              source={{ uri: item.url }}
              style={styles.photo}
              contentFit="cover"
              recyclingKey={item.id}
              cachePolicy="memory-disk"
              transition={150}
              onLoad={() => markLoaded(item.id)}
              onError={() => markLoaded(item.id)}
            />
            {isSelected && <View style={styles.selOverlay} />}
            {item.uploaded_by && (
              <>
                {pinnedBannerPhotoId === item.id && (
                  <View style={styles.uploaderBanner}>
                    <Text style={styles.uploaderBannerText} numberOfLines={1} ellipsizeMode="tail">
                      {uploader?.display_name || (uploader?.username ? `@${uploader.username}` : 'Unknown user')}
                    </Text>
                  </View>
                )}
                <Pressable
                  style={styles.avatarBadge}
                  hitSlop={6}
                  onPress={() => {
                    if (selectionMode) return;
                    setPinnedBannerPhotoId(item.id);
                  }}
                >
                  {uploader ? (
                    uploader.avatar_url ? (
                      <Image source={{ uri: uploader.avatar_url }} style={styles.avatarImage} />
                    ) : (
                      <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarLetter}>{(uploader.username ?? '?').charAt(0).toUpperCase()}</Text>
                      </View>
                    )
                  ) : (
                    <SkeletonCircle size={AVATAR_BADGE} />
                  )}
                </Pressable>
              </>
            )}
            {selectionMode && isMember && (
              <View style={styles.selCircleWrap}><SelectionCircle selected={isSelected} /></View>
            )}
          </Pressable>
        );
      }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.grid}
      columnWrapperStyle={{ justifyContent: 'flex-start', gap: GAP }}
      ItemSeparatorComponent={() => <View style={{ height: GAP }} />}
    />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grid: { paddingBottom: 100 },
  cell: { width: PHOTO_SIZE, height: PHOTO_SIZE },
  cellPressed: { opacity: 0.85 },
  photo: { width: PHOTO_SIZE, height: PHOTO_SIZE },

  avatarBadge: { position: 'absolute', bottom: 4, right: 4 },
  avatarImage: {
    width: AVATAR_BADGE, height: AVATAR_BADGE, borderRadius: AVATAR_BADGE / 2,
    borderWidth: 2, borderColor: '#fff',
  },
  avatarPlaceholder: {
    width: AVATAR_BADGE, height: AVATAR_BADGE, borderRadius: AVATAR_BADGE / 2,
    backgroundColor: '#FF6B6B', borderWidth: 2, borderColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarLetter: { color: '#fff', fontSize: 11, fontWeight: '700' },

  selOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.25)' },
  selCircleWrap: { position: 'absolute', top: 6, right: 6 },
  selCircle: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: '#fff',
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  selCircleActive: { backgroundColor: SELECT_RED, borderColor: '#fff' },

  uploaderBanner: {
    position: 'absolute',
    bottom: 38,
    right: 4,
    maxWidth: 180,
    backgroundColor: 'rgba(0,0,0,0.85)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    zIndex: 10,
  },
  uploaderBannerText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
  },
});
