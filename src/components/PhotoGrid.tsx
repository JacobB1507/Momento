import React, { useEffect, useState } from 'react';
import { Alert, Dimensions, FlatList, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Photo } from '../types/database';
import { supabase } from '../lib/supabase';
import { deleteOwnPhoto } from '../lib/photoRemoval';

type UploaderProfile = { id: string; username: string | null; avatar_url: string | null };

const AVATAR_BADGE = 28;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GAP = 2;
const COLUMNS = 3;
const PHOTO_SIZE = Math.floor((SCREEN_WIDTH - GAP * (COLUMNS - 1)) / COLUMNS);

type Props = {
  photos: Photo[];
  isOwner: boolean;
  currentUserId?: string;
  onDeletePhoto: (photo: Photo) => void;
  onRemovalRequest?: (photoId: string) => void;
};

export function PhotoGrid({ photos, isOwner, currentUserId, onDeletePhoto, onRemovalRequest }: Props) {
  const [uploaderProfiles, setUploaderProfiles] = useState<Record<string, UploaderProfile>>({});

  useEffect(() => {
    const uniqueIds = [...new Set(photos.map((p) => p.uploaded_by).filter(Boolean))];
    if (uniqueIds.length === 0) return;
    supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .in('id', uniqueIds)
      .then(({ data }) => {
        if (!data) return;
        const map: Record<string, UploaderProfile> = {};
        data.forEach((p) => { map[p.id] = p; });
        setUploaderProfiles(map);
      });
  }, [photos]);

  const handleLongPress = (item: Photo) => {
    const isOwn = !!currentUserId && currentUserId === item.uploaded_by;
    if (isOwn) {
      Alert.alert('Delete Photo', 'Remove this photo? This cannot be undone.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Photo',
          style: 'destructive',
          onPress: async () => {
            const ok = await deleteOwnPhoto(item.id);
            if (ok) onDeletePhoto(item);
            else Alert.alert('Error', 'Could not delete photo. Please try again.');
          },
        },
      ]);
    } else if (onRemovalRequest) {
      Alert.alert('Request Removal', 'Ask the gallery to review this photo for removal?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Request Removal', onPress: () => onRemovalRequest(item.id) },
      ]);
    }
  };

  return (
    <FlatList
      data={photos}
      keyExtractor={(item) => item.id}
      numColumns={COLUMNS}
      renderItem={({ item, index }) => {
        const isLastInRow = (index + 1) % COLUMNS === 0;
        const canInteract = currentUserId === item.uploaded_by || !!onRemovalRequest;
        const uploader = uploaderProfiles[item.uploaded_by];
        return (
          <Pressable
            style={({ pressed }) => [
              styles.cell,
              !isLastInRow && { marginRight: GAP },
              pressed && styles.cellPressed,
            ]}
            onLongPress={canInteract ? () => handleLongPress(item) : undefined}
            delayLongPress={400}
          >
            <Image source={{ uri: item.url }} style={styles.photo} resizeMode="cover" />
            {uploader && (
              <View style={styles.avatarBadge}>
                {uploader.avatar_url ? (
                  <Image
                    source={{ uri: uploader.avatar_url }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarLetter}>
                      {(uploader.username ?? '?').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </Pressable>
        );
      }}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.grid}
      ItemSeparatorComponent={() => <View style={{ height: GAP }} />}
    />
  );
}

const styles = StyleSheet.create({
  grid: { paddingBottom: 100 },
  cell: { width: PHOTO_SIZE, height: PHOTO_SIZE },
  cellPressed: { opacity: 0.85 },
  photo: { width: PHOTO_SIZE, height: PHOTO_SIZE },

  avatarBadge: { position: 'absolute', bottom: 4, right: 4 },
  avatarImage: {
    width: AVATAR_BADGE,
    height: AVATAR_BADGE,
    borderRadius: AVATAR_BADGE / 2,
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarPlaceholder: {
    width: AVATAR_BADGE,
    height: AVATAR_BADGE,
    borderRadius: AVATAR_BADGE / 2,
    backgroundColor: '#FF6B6B',
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
