import React, { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { supabase } from '../lib/supabase';

function formatTime(iso: string | null): string {
  if (!iso) return '';
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 3600) return `${Math.max(1, Math.floor(diff / 60))}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'short' });
}

type ConversationItem = {
  id: string;
  participant_1: string;
  participant_2: string;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
};

type Props = {
  conversation: ConversationItem;
  currentUserId: string;
  onPress: () => void;
};

type Profile = { username: string | null; avatar_url: string | null };

export default function ConversationRow({ conversation, currentUserId, onPress }: Props) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const otherId =
    conversation.participant_1 !== currentUserId
      ? conversation.participant_1
      : conversation.participant_2;

  useEffect(() => {
    if (!otherId) return;
    supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', otherId)
      .single()
      .then(({ data }) => setProfile(data));
  }, [otherId]);

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
      onPress={onPress}
    >
      {profile?.avatar_url ? (
        <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarLetter}>
            {(profile?.username ?? '?').charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={styles.center}>
        <Text style={styles.username} numberOfLines={1}>
          {profile?.username ?? '…'}
        </Text>
        <Text style={styles.preview} numberOfLines={1}>
          {conversation.last_message ?? 'No messages yet'}
        </Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.time}>{formatTime(conversation.last_message_at)}</Text>
        {conversation.unread_count > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{conversation.unread_count}</Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FF6B6B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { color: '#fff', fontSize: 18, fontWeight: '700' },
  center: { flex: 1 },
  username: { fontSize: 15, fontWeight: '700', color: '#111827', marginBottom: 2 },
  preview: { fontSize: 13, color: '#6b7280' },
  right: { alignItems: 'flex-end', gap: 4 },
  time: { fontSize: 11, color: '#9CA3AF' },
  badge: {
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
