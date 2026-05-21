import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { GalleryTagInfo } from '../lib/tags';

type Props = {
  tags: GalleryTagInfo[];
  isOwner: boolean;
  onPressTags: () => void;
};

export default function GalleryHeaderTagsRow({ tags, isOwner, onPressTags }: Props) {
  if (tags.length === 0 && !isOwner) return null;

  if (tags.length === 0 && isOwner) {
    return (
      <Pressable onPress={onPressTags} style={styles.emptyRow}>
        <View style={styles.addButton}>
          <Ionicons name="add" size={18} color="#8E8E93" />
        </View>
        <Text style={styles.addLabel}>Add a tag</Text>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onPressTags} style={styles.rowWrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {tags.map(tag => (
          <View key={tag.tag_id} style={[styles.chip, { backgroundColor: tag.color }]}>
            <Text style={styles.chipText}>
              {tag.emoji ? `${tag.emoji} ` : ''}{tag.label}
            </Text>
          </View>
        ))}
        {isOwner && (
          <Pressable style={styles.addButton} onPress={onPressTags}>
            <Ionicons name="add" size={18} color="#8E8E93" />
          </Pressable>
        )}
      </ScrollView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    paddingBottom: 8,
    gap: 6,
    alignItems: 'center',
  },
  chip: {
    height: 26,
    paddingHorizontal: 10,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  addButton: {
    height: 32,
    width: 32,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    borderWidth: 1,
    borderColor: '#8E8E93',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowWrapper: {
    marginBottom: 4,
  },
  emptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 4,
  },
  addLabel: {
    fontSize: 13,
    color: '#8E8E93',
    marginLeft: 6,
  },
});
