import React from 'react';
import { Dimensions, FlatList, Image, Pressable, StyleSheet, View } from 'react-native';
import type { Photo } from '../types/database';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GAP = 2;
const COLUMNS = 3;
const PHOTO_SIZE = Math.floor((SCREEN_WIDTH - GAP * (COLUMNS - 1)) / COLUMNS);

type Props = {
  photos: Photo[];
  isOwner: boolean;
  currentUserId: string | undefined;
  onDeletePhoto: (photo: Photo) => void;
};

export function PhotoGrid({ photos, isOwner, currentUserId, onDeletePhoto }: Props) {
  return (
    <FlatList
      data={photos}
      keyExtractor={(item) => item.id}
      numColumns={COLUMNS}
      renderItem={({ item, index }) => {
        const isLastInRow = (index + 1) % COLUMNS === 0;
        const canDelete = isOwner || currentUserId === item.uploaded_by;
        return (
          <Pressable
            style={({ pressed }) => [
              styles.cell,
              !isLastInRow && { marginRight: GAP },
              pressed && styles.cellPressed,
            ]}
            onLongPress={canDelete ? () => onDeletePhoto(item) : undefined}
            delayLongPress={400}
          >
            <Image source={{ uri: item.url }} style={styles.photo} resizeMode="cover" />
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
});
