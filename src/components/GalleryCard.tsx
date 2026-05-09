import React, { useCallback, useEffect, useState } from 'react';
import { Dimensions, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Ionicons } from '@expo/vector-icons';
import CommentsSheet from './CommentsSheet';
import { useFocusEffect } from '@react-navigation/native';
import type { Gallery } from '../types/database';
import { supabase } from '../lib/supabase';

export const CARD_GAP = 12;
export const SCREEN_PADDING = 16;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - SCREEN_PADDING * 2 - CARD_GAP) / 2;
const CARD_HEIGHT = CARD_WIDTH * 1.2;

const BUBBLE = 24;
const OVERLAP = 8;
const MAX_VISIBLE = 4;

const PLACEHOLDER_COLORS = ['#FF6B6B', '#FF8E53', '#F97316', '#EC4899', '#8B5CF6', '#06B6D4'];

function placeholderColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return PLACEHOLDER_COLORS[hash % PLACEHOLDER_COLORS.length];
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  const diff = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return `${diff} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

type Contributor = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export function GalleryCard({
  gallery,
  onPress,
  onLongPress,
  onCommentPress,
  currentUserId,
  friendIds = [],
  refreshKey,
}: {
  gallery: Gallery;
  onPress: () => void;
  onLongPress?: () => void;
  onCommentPress?: () => void;
  currentUserId?: string;
  friendIds?: string[];
  refreshKey?: number;
}) {
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [showContributors, setShowContributors] = useState(false);
  const [showComments, setShowComments] = useState(false);

  const load = useCallback(async () => {
    const { data: memberRows } = await supabase
      .from('gallery_members')
      .select('user_id')
      .eq('gallery_id', gallery.id)
      .eq('status', 'accepted');

    if (!memberRows || memberRows.length === 0) return;

    const userIds = memberRows.map((m: any) => m.user_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .in('id', userIds);

    setContributors(
      (profiles ?? []).map((p: any) => ({
        user_id: p.id,
        username: p.username ?? null,
        display_name: p.display_name ?? null,
        avatar_url: p.avatar_url ?? null,
      }))
    );
  }, [gallery.id]);

  useEffect(() => {
    load();
  }, [gallery.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [gallery.id])
  );

  const knownIds = new Set([...(friendIds ?? []), ...(currentUserId ? [currentUserId] : [])]);
  const isPublic = gallery.privacy === 'public';
  const showBubbles = isPublic || contributors.some(c => knownIds.has(c.user_id));

  const visible = contributors.slice(0, MAX_VISIBLE);
  const overflow = contributors.length - MAX_VISIBLE;

  return (
    <>
    <Pressable
      style={({ pressed }) => [
        styles.card,
        pressed && !showContributors && styles.cardPressed,
        showContributors && { zIndex: 10 },
      ]}
      onPress={() => {
        if (showContributors) { setShowContributors(false); return; }
        onPress();
      }}
      onLongPress={onLongPress}
      delayLongPress={400}
    >
      <View style={[styles.cardImage, { backgroundColor: placeholderColor(gallery.id) }]}>
        {gallery.cover_photo_url ? (
          <Image source={{ uri: gallery.cover_photo_url }} style={StyleSheet.absoluteFill} />
        ) : (
          <Text style={styles.cardInitial}>{gallery.title.charAt(0).toUpperCase()}</Text>
        )}
        <View style={styles.cardOverlay} />
        {gallery.pinned && (
          <View style={styles.pinBadge}>
            <MaterialCommunityIcons name="pin" size={14} color="#fff" />
          </View>
        )}
        {gallery.role === 'member' && (
          <View style={styles.memberBadge}>
            <Text style={styles.memberBadgeText}>Invited</Text>
          </View>
        )}
      </View>
      <View style={styles.cardInfo}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardTitle} numberOfLines={1}>{gallery.title}</Text>
          <Text style={styles.cardPrivacy}>
            {gallery.privacy === 'private' ? 'Private' : gallery.privacy === 'friends' ? 'Friends' : 'Public'}
          </Text>
        </View>
        <View style={styles.cardDateRow}>
          <Text style={styles.cardDate}>{formatDate(gallery.created_at)}</Text>
        </View>
        {showBubbles && contributors.length > 0 && (
          <>
            <Pressable
              style={styles.bubblesRow}
              onPress={() => setShowContributors(s => !s)}
              hitSlop={6}
            >
              {visible.map((c, index) => (
                <View
                  key={c.user_id}
                  style={[
                    styles.bubble,
                    index > 0 && { marginLeft: -OVERLAP },
                    { zIndex: MAX_VISIBLE - index },
                  ]}
                >
                  {c.avatar_url ? (
                    <Image source={{ uri: c.avatar_url }} style={styles.bubbleImage} />
                  ) : (
                    <View style={[styles.bubblePlaceholder, { backgroundColor: placeholderColor(c.user_id) }]}>
                      <Text style={styles.bubbleInitial}>
                        {(c.username ?? '?').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
              {overflow > 0 && (
                <View style={[styles.bubble, styles.overflowBubble, { marginLeft: -OVERLAP }]}>
                  <Text style={styles.overflowText}>+{overflow}</Text>
                </View>
              )}
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{contributors.length}</Text>
              </View>
              <Text style={styles.chevron}>{showContributors ? '▴' : '▾'}</Text>
            </Pressable>
            {showContributors && (
              <View style={styles.dropdown}>
                <ScrollView style={{ maxHeight: 150 }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                  {contributors.map(c => (
                    <View key={c.user_id} style={styles.dropdownRow}>
                      {c.avatar_url ? (
                        <Image source={{ uri: c.avatar_url }} style={styles.dropdownAvatar} />
                      ) : (
                        <View style={[styles.dropdownAvatar, styles.dropdownAvatarPlaceholder, { backgroundColor: placeholderColor(c.user_id) }]}>
                          <Text style={styles.dropdownAvatarInitial}>
                            {(c.username ?? '?').charAt(0).toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <Text style={styles.dropdownUsername} numberOfLines={1}>
                        {c.display_name || c.username}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}
          </>
        )}
        <Pressable
          style={styles.commentRow}
          onPress={() => { setShowComments(true); onCommentPress?.(); }}
          hitSlop={4}
        >
          <Ionicons name="chatbubble-outline" size={14} color="#6b7280" />
          <Text style={styles.commentCount}>{(gallery as any).comment_count ?? 0}</Text>
        </Pressable>
      </View>
    </Pressable>
    <CommentsSheet galleryId={gallery.id} visible={showComments} onClose={() => setShowComments(false)} />
  </>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    borderRadius: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardPressed: { opacity: 0.88 },
  cardImage: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInitial: { fontSize: 48, fontWeight: '800', color: 'rgba(255,255,255,0.9)' },
  cardOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'transparent' },
  pinBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 8,
    padding: 4,
  },
  memberBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  memberBadgeText: { color: '#fff', fontSize: 10, fontWeight: '600' },
  cardInfo: { padding: 10 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#111827', flexShrink: 1, marginRight: 6 },
  cardPrivacy: { fontSize: 11, fontWeight: '500', color: '#9CA3AF', flexShrink: 0 },
  cardDateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardDate: { fontSize: 12, color: '#9CA3AF' },

  bubblesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  bubble: {
    width: BUBBLE,
    height: BUBBLE,
    borderRadius: BUBBLE / 2,
    borderWidth: 1.5,
    borderColor: '#fff',
    overflow: 'hidden',
  },
  bubbleImage: { width: BUBBLE, height: BUBBLE },
  bubblePlaceholder: {
    width: BUBBLE,
    height: BUBBLE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleInitial: { fontSize: 9, fontWeight: '700', color: '#fff' },
  overflowBubble: {
    backgroundColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  overflowText: { fontSize: 9, fontWeight: '700', color: '#374151' },
  countBadge: {
    marginLeft: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  countText: { fontSize: 11, fontWeight: '600', color: '#6B7280' },
  chevron: { fontSize: 20, color: '#9CA3AF', marginLeft: 'auto' },

  dropdown: {
    marginTop: 6,
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 999,
    overflow: 'hidden',
  },
  dropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 8,
  },
  dropdownAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    overflow: 'hidden',
  },
  dropdownAvatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropdownAvatarInitial: { fontSize: 11, fontWeight: '700', color: '#fff' },
  dropdownUsername: { fontSize: 12, fontWeight: '500', color: '#374151', flex: 1 },
  commentRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  commentCount: { fontSize: 12, color: '#6b7280' },
});
