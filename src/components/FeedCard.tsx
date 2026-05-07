import React from 'react';
import { Dimensions, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { FeedPhoto } from '../lib/feed';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const PLACEHOLDER_COLORS = ['#FF6B6B', '#FF8E53', '#F97316', '#EC4899', '#8B5CF6', '#06B6D4'];
function placeholderColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return PLACEHOLDER_COLORS[hash % PLACEHOLDER_COLORS.length];
}

function relativeTime(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

type Props = {
  photo: FeedPhoto;
  onPress: () => void;
};

export function FeedCard({ photo, onPress }: Props) {
  const { url, gallery_title, uploader_username, uploader_avatar_url, created_at, uploaded_by } = photo;

  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && { opacity: 0.95 }]} onPress={onPress}>
      <View style={styles.topRow}>
        <View style={styles.uploaderRow}>
          {uploader_avatar_url ? (
            <Image source={{ uri: uploader_avatar_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: placeholderColor(uploaded_by) }]}>
              <Text style={styles.avatarLetter}>
                {(uploader_username ?? '?').charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
          <Text style={styles.username} numberOfLines={1}>@{uploader_username ?? 'unknown'}</Text>
        </View>
        <Text style={styles.galleryTitle} numberOfLines={1}>{gallery_title}</Text>
      </View>
      <Image source={{ uri: url }} style={styles.photo} resizeMode="cover" />
      <View style={styles.bottomRow}>
        <Text style={styles.timestamp}>{relativeTime(created_at)}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 12,
  },
  uploaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { color: '#fff', fontSize: 14, fontWeight: '700' },
  username: { fontSize: 14, fontWeight: '600', color: '#111827', flexShrink: 1 },
  galleryTitle: { fontSize: 13, color: '#9CA3AF', flexShrink: 1, textAlign: 'right' },
  photo: { width: SCREEN_WIDTH, height: 300 },
  bottomRow: { paddingHorizontal: 14, paddingVertical: 10 },
  timestamp: { fontSize: 12, color: '#9CA3AF' },
});
