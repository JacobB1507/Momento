import React, { useEffect, useState } from 'react';
import { Dimensions, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { Gallery } from '../types/database';
import { supabase } from '../lib/supabase';

export const CARD_GAP = 12;
export const SCREEN_PADDING = 16;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - SCREEN_PADDING * 2 - CARD_GAP) / 2;
const CARD_HEIGHT = CARD_WIDTH * 1.2;

const AVATAR_SIZE = 28;
const AVATAR_OVERLAP = 10;

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

type Member = {
  user_id: string;
  profiles: { avatar_url: string | null; username: string | null } | null;
};

export function GalleryCard({
  gallery,
  onPress,
  onLongPress,
}: {
  gallery: Gallery;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    supabase
      .from('gallery_members')
      .select('user_id, profiles(avatar_url, username)')
      .eq('gallery_id', gallery.id)
      .then(({ data }) => {
        if (data) setMembers(data as Member[]);
      });
  }, [gallery.id]);

  const visibleMembers = members.slice(0, 4);

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={onPress}
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
        <Text style={styles.cardDate}>{formatDate(gallery.created_at)}</Text>
        {visibleMembers.length > 0 && (
          <View style={styles.avatarRow}>
            {visibleMembers.map((member, index) => (
              <View
                key={member.user_id}
                style={[
                  styles.avatarCircle,
                  index > 0 && styles.avatarOverlap,
                  { zIndex: 4 - index },
                ]}
              >
                {member.profiles?.avatar_url ? (
                  <Image
                    source={{ uri: member.profiles.avatar_url }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <View style={[styles.avatarPlaceholder, { backgroundColor: placeholderColor(member.user_id) }]}>
                    <Text style={styles.avatarInitial}>
                      {(member.profiles?.username ?? '?').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    borderRadius: 16,
    backgroundColor: '#fff',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardPressed: { opacity: 0.88 },
  cardImage: { width: CARD_WIDTH, height: CARD_HEIGHT, alignItems: 'center', justifyContent: 'center' },
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
  cardDate: { fontSize: 12, color: '#9CA3AF' },

  avatarRow: { flexDirection: 'row', marginTop: 8 },
  avatarCircle: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: 1.5,
    borderColor: '#fff',
    overflow: 'hidden',
  },
  avatarOverlap: { marginLeft: -AVATAR_OVERLAP },
  avatarImage: { width: AVATAR_SIZE, height: AVATAR_SIZE },
  avatarPlaceholder: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { fontSize: 11, fontWeight: '700', color: '#fff' },
});
