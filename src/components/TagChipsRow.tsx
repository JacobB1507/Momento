import React from 'react';
import { View, Text, Pressable } from 'react-native';
import type { GalleryTagInfo } from '../lib/tags';

type Props = {
  tags: GalleryTagInfo[];
  maxVisible?: number;
  onOpenAll: () => void;
};

export default function TagChipsRow({ tags, maxVisible = 2, onOpenAll }: Props) {
  if (!tags || tags.length === 0) return null;

  const visible = tags.slice(0, maxVisible);
  const overflow = tags.length - maxVisible;

  return (
    <Pressable onPress={onOpenAll}>
      <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'nowrap', overflow: 'hidden' }}>
        {visible.map((tag) => {
          const truncated = tag.label.length > 12 ? tag.label.slice(0, 12) + '…' : tag.label;
          const chipLabel = tag.emoji ? `${tag.emoji} ${truncated}` : truncated;
          return (
            <View
              key={tag.tag_id}
              style={{
                height: 22,
                paddingHorizontal: 8,
                borderRadius: 11,
                backgroundColor: tag.color,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{ color: 'white', fontSize: 11, fontWeight: '500' }}
                numberOfLines={1}
              >
                {chipLabel}
              </Text>
            </View>
          );
        })}
        {overflow > 0 && (
          <View
            style={{
              height: 22,
              paddingHorizontal: 8,
              borderRadius: 11,
              backgroundColor: '#E5E5EA',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#1C1C1E', fontSize: 11, fontWeight: '600' }}>+{overflow}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}
