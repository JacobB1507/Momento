import React from 'react';
import { FlatList } from 'react-native';
import { GalleryCard, CARD_GAP } from './GalleryCard';
import type { Gallery } from '../types/database';

type Props = {
  results: Gallery[];
  onPress: (galleryId: string, galleryTitle: string) => void;
  currentUserId?: string;
  friendIds?: string[];
};

export function GallerySearchResults({ results, onPress, currentUserId, friendIds }: Props) {
  return (
    <FlatList
      key="galleries_list"
      data={results}
      keyExtractor={item => item.id}
      numColumns={2}
      keyboardShouldPersistTaps="handled"
      columnWrapperStyle={{ gap: CARD_GAP }}
      contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: CARD_GAP }}
      renderItem={({ item }) => (
        <GalleryCard
          gallery={item}
          onPress={() => onPress(item.id, item.title)}
          currentUserId={currentUserId}
          friendIds={friendIds}
        />
      )}
    />
  );
}
