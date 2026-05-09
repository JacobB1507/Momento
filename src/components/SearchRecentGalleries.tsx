import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GallerySearchResults } from './GallerySearchResults';

type Props = {
  recentGalleries: any[];
  onClearAll: () => void;
  onGalleryPress: (id: string, title: string) => void;
  currentUserId: string | undefined;
  friendIds: string[];
};

export function SearchRecentGalleries({
  recentGalleries,
  onClearAll,
  onGalleryPress,
  currentUserId,
  friendIds,
}: Props) {
  if (recentGalleries.length === 0) return null;

  return (
    <View>
      <View style={styles.headerRow}>
        <Text style={styles.headerText}>Recent</Text>
        <TouchableOpacity onPress={onClearAll}>
          <Text style={styles.clearAll}>Clear all</Text>
        </TouchableOpacity>
      </View>
      <GallerySearchResults
        results={recentGalleries}
        onPress={onGalleryPress}
        currentUserId={currentUserId}
        friendIds={friendIds}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
  },
  clearAll: {
    color: '#9CA3AF',
    fontSize: 13,
  },
});
