import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  FlatList,
  Pressable,
  Alert,
  StyleSheet,
  Dimensions,
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
  const [selectMode, setSelectMode] = useState(false);
  const [selectedUris, setSelectedUris] = useState<Set<string>>(new Set());

  React.useEffect(() => {
    if (visible) {
      setWorkingSet(photos);
      setSelectMode(false);
      setSelectedUris(new Set());
    }
  }, [visible, photos]);

  const removeOne = (uri: string) => {
    setWorkingSet((prev) => prev.filter((p) => p.uri !== uri));
  };

  const toggleSelected = (uri: string) => {
    setSelectedUris((prev) => {
      const next = new Set(prev);
      if (next.has(uri)) next.delete(uri);
      else next.add(uri);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedUris(new Set(workingSet.map((p) => p.uri)));
  };

  const deselectAll = () => {
    exitSelectMode();
  };

  const enterSelectMode = () => {
    setSelectMode(true);
    setSelectedUris(new Set());
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedUris(new Set());
  };

  const deleteSelected = () => {
    const count = selectedUris.size;
    if (count === 0) return;
    Alert.alert(
      `Remove ${count} ${count === 1 ? 'photo' : 'photos'}?`,
      'They will not be uploaded. You can re-pick them from your camera roll.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setWorkingSet((prev) =>
              prev.filter((p) => !selectedUris.has(p.uri))
            );
            exitSelectMode();
          },
        },
      ]
    );
  };

  const handleConfirm = () => {
    onConfirm(workingSet);
  };

  const renderItem = ({ item }: { item: ReviewablePhoto }) => {
    const isSelected = selectedUris.has(item.uri);
    return (
      <Pressable
        style={[
          styles.tile,
          selectMode && isSelected && styles.tileSelected,
        ]}
        onPress={() => {
          if (selectMode) toggleSelected(item.uri);
        }}
      >
        <Image source={{ uri: item.uri }} style={styles.tileImage} />

        {!selectMode && (
          <Pressable
            hitSlop={8}
            style={styles.xBadge}
            onPress={() => removeOne(item.uri)}
          >
            <Ionicons name="close" size={16} color="#fff" />
          </Pressable>
        )}

        {selectMode && (
          <View
            style={[
              styles.checkBadge,
              isSelected && styles.checkBadgeOn,
            ]}
          >
            {isSelected && (
              <Ionicons name="checkmark" size={16} color="#fff" />
            )}
          </View>
        )}
      </Pressable>
    );
  };

  const allSelected =
    workingSet.length > 0 && selectedUris.size === workingSet.length;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onCancel}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          {selectMode ? (
            selectedUris.size === 0 ? (
              <Pressable onPress={exitSelectMode} hitSlop={8}>
                <Text style={styles.headerAction}>Cancel</Text>
              </Pressable>
            ) : (
              <Pressable onPress={deleteSelected} hitSlop={8}>
                <Text style={styles.headerActionDestructive}>
                  Delete ({selectedUris.size})
                </Text>
              </Pressable>
            )
          ) : (
            <Pressable onPress={onCancel} hitSlop={8}>
              <Text style={styles.headerActionDestructive}>Cancel</Text>
            </Pressable>
          )}

          <Text style={styles.headerTitle}>
            {selectMode
              ? `${selectedUris.size} selected`
              : `${workingSet.length} ${workingSet.length === 1 ? 'photo' : 'photos'}`}
          </Text>

          {selectMode ? (
            <Pressable
              onPress={allSelected ? deselectAll : selectAll}
              hitSlop={8}
            >
              <Text style={styles.headerAction}>
                {allSelected ? 'Deselect All' : 'Select All'}
              </Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={enterSelectMode}
              hitSlop={8}
              disabled={workingSet.length === 0}
            >
              <Text
                style={[
                  styles.headerAction,
                  workingSet.length === 0 && styles.headerActionDisabled,
                ]}
              >
                Select
              </Text>
            </Pressable>
          )}
        </View>

        {workingSet.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>
              No photos to upload. Tap Cancel to go back.
            </Text>
          </View>
        ) : (
          <FlatList
            data={workingSet}
            keyExtractor={(item) => item.uri}
            renderItem={renderItem}
            numColumns={3}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.gridContent}
          />
        )}

        {!selectMode && (
          <View style={styles.bottomBar}>
            <Pressable
              onPress={handleConfirm}
              disabled={workingSet.length === 0}
              style={({ pressed }) => [
                styles.uploadButton,
                workingSet.length === 0 && styles.uploadButtonDisabled,
                pressed && { opacity: 0.85 },
              ]}
            >
              <Text style={styles.uploadButtonText}>
                Upload {workingSet.length}{' '}
                {workingSet.length === 1 ? 'photo' : 'photos'}
              </Text>
            </Pressable>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const TILE_GAP = 8;
const SCREEN_WIDTH = Dimensions.get('window').width;
const NUM_COLUMNS = 3;
const CONTAINER_PADDING = 8;
const TILE_SIZE = Math.floor(
  (SCREEN_WIDTH - CONTAINER_PADDING * 2 - TILE_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#222',
  },
  headerAction: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '500',
  },
  headerActionDestructive: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '600',
  },
  headerActionDisabled: {
    color: '#444',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  gridContent: {
    padding: TILE_GAP,
    paddingBottom: 100,
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
    position: 'relative',
    backgroundColor: '#111',
  },
  tileSelected: {
    borderWidth: 3,
    borderColor: '#3b82f6',
  },
  tileImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  xBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBadgeOn: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 24,
    paddingHorizontal: 16,
  },
  uploadButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadButtonDisabled: {
    backgroundColor: '#333',
  },
  uploadButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    color: '#999',
    fontSize: 15,
    textAlign: 'center',
  },
});
