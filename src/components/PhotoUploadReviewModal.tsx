import React, { useState } from 'react';
import {
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

export type ReviewablePhoto = {
  uri: string;
  [key: string]: any;
};

type Props = {
  visible: boolean;
  photos: ReviewablePhoto[];
  onCancel: () => void;
  onConfirm: (finalPhotos: ReviewablePhoto[]) => void;
};

export function PhotoUploadReviewModal({
  visible,
  photos,
  onCancel,
  onConfirm,
}: Props) {
  const [workingSet, setWorkingSet] = useState<ReviewablePhoto[]>(photos);
  const [total, setTotal] = useState(photos.length);
  const [enlargedIndex, setEnlargedIndex] = useState<number | null>(null);

  React.useEffect(() => {
    if (visible) {
      setWorkingSet(photos);
      setTotal(photos.length);
      setEnlargedIndex(null);
    }
  }, [visible, photos]);

  const removePhoto = (uri: string) => {
    setWorkingSet((prev) => prev.filter((p) => p.uri !== uri));
  };

  const removeEnlargedPhoto = () => {
    if (enlargedIndex === null) return;
    const newSet = workingSet.filter((_, i) => i !== enlargedIndex);
    setWorkingSet(newSet);
    if (newSet.length === 0) {
      setEnlargedIndex(null);
    } else if (enlargedIndex >= newSet.length) {
      // removed the last item — step back to the new last
      setEnlargedIndex(newSet.length - 1);
    }
    // otherwise keep enlargedIndex — it now points at the next photo in line
  };

  const handleConfirm = () => {
    onConfirm(workingSet);
  };

  const renderItem = ({ item, index }: { item: ReviewablePhoto; index: number }) => (
    <View style={styles.tile}>
      <Pressable
        style={StyleSheet.absoluteFillObject}
        onPress={() => setEnlargedIndex(index)}
      >
        <Image source={{ uri: item.uri }} style={styles.tileImage} />
      </Pressable>
      <Pressable
        style={styles.tileXBtn}
        onPress={() => removePhoto(item.uri)}
        hitSlop={8}
      >
        <Ionicons name="close" size={16} color="#fff" />
      </Pressable>
    </View>
  );

  const enlargedPhoto = enlargedIndex !== null ? workingSet[enlargedIndex] : null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onCancel}
    >
      <StatusBar barStyle={enlargedIndex !== null ? 'light-content' : 'dark-content'} />

      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Pressable onPress={onCancel} hitSlop={12} style={styles.headerCancelBtn}>
              <Text style={styles.headerCancelText}>Cancel</Text>
            </Pressable>
          </View>

          <Text style={styles.headerTitle}>
            {workingSet.length} {workingSet.length === 1 ? 'photo' : 'photos'}
          </Text>

          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Pressable
              onPress={handleConfirm}
              disabled={workingSet.length === 0}
              hitSlop={12}
            >
              <Text style={[
                styles.headerUpload,
                workingSet.length === 0 && styles.headerUploadDisabled,
              ]}>
                Upload
              </Text>
            </Pressable>
          </View>
        </View>

        <FlatList
          data={workingSet}
          keyExtractor={(item) => item.uri}
          renderItem={renderItem}
          numColumns={3}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.gridContent}
          style={{ flex: 1 }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No photos to upload.</Text>
            </View>
          }
        />
      </SafeAreaView>

      {enlargedPhoto !== null && enlargedIndex !== null && (
        <View style={styles.enlargedOverlay}>
          <Image
            source={{ uri: enlargedPhoto.uri }}
            style={styles.enlargedImage}
            contentFit="contain"
          />

          <View style={styles.enlargedTopBar}>
            <Pressable
              onPress={() => setEnlargedIndex(null)}
              style={styles.enlargedCloseBtn}
              hitSlop={12}
            >
              <Ionicons name="close" size={28} color="#fff" />
            </Pressable>
            <Text style={styles.enlargedCounter}>
              {enlargedIndex + 1} / {workingSet.length}
            </Text>
            <View style={styles.enlargedCloseSpacer} />
          </View>

          {enlargedIndex > 0 && (
            <Pressable
              style={styles.enlargedArrowLeft}
              onPress={() => setEnlargedIndex(enlargedIndex - 1)}
              hitSlop={16}
            >
              <Ionicons name="chevron-back" size={36} color="#fff" />
            </Pressable>
          )}

          {enlargedIndex < workingSet.length - 1 && (
            <Pressable
              style={styles.enlargedArrowRight}
              onPress={() => setEnlargedIndex(enlargedIndex + 1)}
              hitSlop={16}
            >
              <Ionicons name="chevron-forward" size={36} color="#fff" />
            </Pressable>
          )}

          <Pressable style={styles.enlargedRemoveBtn} onPress={removeEnlargedPhoto}>
            <Ionicons name="trash-outline" size={18} color="#fff" />
            <Text style={styles.enlargedRemoveText}>Remove from upload</Text>
          </Pressable>
        </View>
      )}
    </Modal>
  );
}

const TILE_GAP = 4;
const SCREEN_WIDTH = Dimensions.get('window').width;
const NUM_COLUMNS = 3;
const CONTAINER_PADDING = 4;
const TILE_SIZE = Math.floor(
  (SCREEN_WIDTH - CONTAINER_PADDING * 2 - TILE_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    minHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
    backgroundColor: '#fff',
  },
  headerCancelBtn: {
    paddingVertical: 4,
  },
  headerCancelText: {
    color: '#FF3B30',
    fontSize: 17,
    fontWeight: '600',
  },
  headerTitle: {
    color: '#111',
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  headerUpload: {
    color: '#007AFF',
    fontSize: 17,
    fontWeight: '600',
  },
  headerUploadDisabled: {
    color: '#C7C7CC',
  },
  gridContent: {
    padding: CONTAINER_PADDING,
    paddingBottom: 16,
  },
  row: {
    gap: TILE_GAP,
    justifyContent: 'flex-start',
  },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    marginBottom: TILE_GAP,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  tileImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  tileXBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyText: {
    color: '#8E8E93',
    fontSize: 16,
  },
  // Enlarged photo overlay — full-bleed dark viewer
  enlargedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  enlargedImage: {
    width: '100%',
    height: '100%',
  },
  enlargedTopBar: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  enlargedCloseBtn: {
    width: 40,
  },
  enlargedCloseSpacer: {
    width: 40,
  },
  enlargedCounter: {
    flex: 1,
    color: '#fff',
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
  enlargedArrowLeft: {
    position: 'absolute',
    left: 12,
    top: '50%',
    transform: [{ translateY: -18 }],
  },
  enlargedArrowRight: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: [{ translateY: -18 }],
  },
  enlargedRemoveBtn: {
    position: 'absolute',
    bottom: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,59,48,0.95)',
    paddingHorizontal: 22,
    paddingVertical: 11,
    borderRadius: 22,
  },
  enlargedRemoveText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
