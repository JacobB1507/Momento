import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import type { ProfileTag } from '../lib/tags';

type Props = {
  tags: ProfileTag[];
  selectedTagIds: Set<string>;
  onToggle: (tagId: string) => void;
  onClear: () => void;
};

export default function TagFilterRow({ tags, selectedTagIds, onToggle, onClear }: Props) {
  if (!tags || tags.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingRight: 32,
        gap: 8,
        alignItems: 'center',
      }}
    >
      {tags.map((tag) => {
        const selected = selectedTagIds.has(tag.id);
        const chipLabel = tag.emoji ? `${tag.emoji} ${tag.label}` : tag.label;
        return (
          <Pressable
            key={tag.id}
            onPress={() => onToggle(tag.id)}
            style={{
              height: 32,
              borderRadius: 16,
              paddingHorizontal: 14,
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: selected ? tag.color : 'white',
              borderWidth: selected ? 0 : 1,
              borderColor: '#E5E5EA',
            }}
          >
            <Text
              style={{
                color: selected ? 'white' : '#1C1C1E',
                fontSize: 14,
                fontWeight: '500',
              }}
            >
              {chipLabel}
            </Text>
          </Pressable>
        );
      })}
      {selectedTagIds.size > 0 && (
        <Pressable
          onPress={onClear}
          style={{
            height: 32,
            borderRadius: 16,
            paddingHorizontal: 14,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: 'white',
            borderWidth: 1,
            borderColor: '#FF3B30',
          }}
        >
          <Text style={{ color: '#FF3B30', fontSize: 14, fontWeight: '500' }}>Clear</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}
