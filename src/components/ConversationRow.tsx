import React, { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
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
  is_pinned?: boolean;
};

type Props = {
  conversation: ConversationItem;
  currentUserId: string;
  onPress: () => void;
  onLongPress?: () => void;
  customPreview?: string;
  isPinned?: boolean;
};

type Profile = { username: string | null; display_name: string | null; avatar_url: string | null };

function tintForId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  const h = Math.abs(hash) % 360;
  return `hsla(${h}, 60%, 50%, 0.08)`;
}

function formatRelativeShort(iso: string | null | undefined): string {
  if (!iso) return '';
  const ms = new Date(iso).getTime();
  if (isNaN(ms)) return '';
  const diffSec = Math.floor((Date.now() - ms) / 1000);
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function ConversationRow({ conversation, currentUserId, onPress, onLongPress, customPreview, isPinned }: Props) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const isUnread = (conversation.unread_count ?? 0) > 0;
  const unreadDisplay = (conversation.unread_count ?? 0) > 99 ? '99+' : String(conversation.unread_count ?? 0);

  const lastSenderId = conversation.last_message_sender_id ?? null;
  const lastRead = conversation.last_message_read ?? null;
  const lastReadAt = conversation.last_message_read_at ?? null;
  const lastAt = conversation.last_message_at ?? null;

  let previewLabel: string;
  let previewIsUnread = false;
  let previewIsRead = false;

  if (!lastSenderId || !lastAt) {
    previewLabel = 'No messages yet';
  } else if (lastSenderId !== currentUserId) {
    if (lastRead === false) {
      previewLabel = `New message · ${formatRelativeShort(lastAt)}`;
      previewIsUnread = true;
    } else {
      previewLabel = `Received · ${formatRelativeShort(lastAt)}`;
    }
  } else {
    if (lastRead === true && lastReadAt) {
      previewLabel = `Read · ${formatRelativeShort(lastReadAt)}`;
      previewIsRead = true;
    } else {
      previewLabel = `Sent · ${formatRelativeShort(lastAt)}`;
    }
  }

  const otherId =
    conversation.participant_1 !== currentUserId
      ? conversation.participant_1
      : conversation.participant_2;

  useEffect(() => {
    if (!otherId) return;
    supabase
      .from('profiles')
      .select('username, display_name, avatar_url')
      .eq('id', otherId)
      .single()
      .then(({ data }) => setProfile(data));
  }, [otherId]);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: tintForId(conversation.id) },
        pressed && { opacity: 0.7 },
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={400}
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
        <View style={styles.nameRow}>
          {profile === null ? (
            <View style={styles.nameSkeleton} />
          ) : (
            <Text style={[styles.username, isUnread && styles.nameUnread]} numberOfLines={1} ellipsizeMode="tail">
              {profile.display_name || profile.username || ''}
            </Text>
          )}
          {isUnread && !customPreview && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText} allowFontScaling={false}>{unreadDisplay}</Text>
            </View>
          )}
          {(isPinned || conversation.is_pinned) && (
            <MaterialCommunityIcons name="pin" size={18} color="#9CA3AF" style={{ marginLeft: 4 }} />
          )}
        </View>
        <Text
          style={[
            styles.preview,
            customPreview ? { fontStyle: 'italic', color: '#9ca3af' } : {},
            (isUnread || previewIsUnread) && !customPreview && styles.previewUnread,
          ]}
          numberOfLines={1}
        >
          {customPreview ?? previewLabel}
        </Text>
      </View>
      <View style={styles.rightColumn}>
        <Text style={styles.time}>{formatTime(conversation.last_message_at)}</Text>
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
  nameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2, flex: 1 },
  nameSkeleton: { width: 80, height: 12, borderRadius: 4, backgroundColor: '#E5E7EB' },
  username: { fontSize: 15, fontWeight: '700', color: '#111827', flexShrink: 1 },
  preview: { fontSize: 13, color: '#6b7280' },
  rightColumn: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginLeft: 8,
  },
  time: { fontSize: 11, color: '#9CA3AF' },
  nameUnread: { fontWeight: '700' },
  previewUnread: { fontWeight: '600', color: '#111827' },
  unreadBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
