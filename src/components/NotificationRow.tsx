import React, { useRef } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';

export type NotificationItem = {
  id: string;
  body: string;
  read: boolean;
  created_at: string;
  type: string | null;
  related_id: string | null;
  sender_id: string | null;
};

type Props = {
  notification: NotificationItem;
  senderProfileMap: Record<string, { id: string; username: string; avatar_url?: string | null }>;
  coverMap: Record<string, string | null>;
  onPress: () => void;
  onMarkUnread?: () => void;
  onClear?: () => void;
};

function timeAgo(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function typeIcon(type: string | null): { name: string; color: string } {
  switch (type) {
    case 'comment':            return { name: 'chatbubble',  color: '#FF6B6B' };
    case 'gallery_photo_added':return { name: 'heart',       color: '#FF6B6B' };
    case 'friend_request':     return { name: 'person-add',  color: '#3b82f6' };
    case 'friend_accepted':    return { name: 'people',      color: '#10b981' };
    case 'message':            return { name: 'mail',        color: '#FF6B6B' };
    case 'gallery_invite':     return { name: 'images',      color: '#8B5CF6' };
    default:                   return { name: 'notifications',color: '#9ca3af' };
  }
}

export default function NotificationRow({ notification, senderProfileMap, coverMap, onPress, onMarkUnread, onClear }: Props) {
  const { body, read, created_at, type } = notification;
  const parts = body.split(' ');
  const username = parts[0]?.toLowerCase();
  const rest = parts.slice(1).join(' ');
  const icon = typeIcon(type);

  const swipeableRef = useRef<any>(null);

  const resolveNotificationImage = () => {
    if (type === 'gallery_invite' || type === 'gallery_photo_added') {
      return notification.related_id ? coverMap[notification.related_id] ?? null : null;
    }
    return senderProfileMap[notification.sender_id ?? '']?.avatar_url ?? null;
  };
  const imageUrl = resolveNotificationImage();

  const renderRightActions = () => (
    <View style={styles.actions}>
      {read && onMarkUnread && (
        <Pressable style={[styles.action, styles.actionUnread]} onPress={() => { onMarkUnread?.(); swipeableRef.current?.close(); }}>
          <Ionicons name="mail-unread-outline" size={17} color="#fff" />
          <Text style={styles.actionText}>Unread</Text>
        </Pressable>
      )}
      {onClear && (
        <Pressable style={[styles.action, styles.actionClear]} onPress={onClear}>
          <Ionicons name="trash-outline" size={17} color="#fff" />
          <Text style={styles.actionText}>Clear</Text>
        </Pressable>
      )}
    </View>
  );

  return (
    <Swipeable ref={swipeableRef} renderRightActions={renderRightActions} overshootRight={false}>
      <Pressable
        style={({ pressed }) => [styles.row, !read && styles.rowUnread, pressed && { opacity: 0.75 }]}
        onPress={onPress}
      >
        <View style={styles.avatarWrap}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Text style={styles.avatarInitial}>{notification.body?.[0]?.toUpperCase() ?? '?'}</Text>
            </View>
          )}
          <View style={[styles.iconBadge, { backgroundColor: icon.color }]}>
            <Ionicons name={icon.name as any} size={10} color="#fff" />
          </View>
        </View>
        <View style={styles.content}>
          <Text style={styles.body}>
            <Text style={styles.username}>{username} </Text>
            {rest}
          </Text>
          <Text style={styles.time}>{timeAgo(created_at)}</Text>
        </View>
      </Pressable>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, backgroundColor: '#fff', gap: 12 },
  rowUnread: { backgroundColor: '#fff5f5' },
  avatarWrap: { position: 'relative', width: 44, height: 44 },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  avatarFallback: { backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontSize: 16, fontWeight: '700', color: '#9ca3af' },
  iconBadge: { position: 'absolute', bottom: -2, right: -2, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  content: { flex: 1, gap: 3 },
  body: { fontSize: 14, color: '#111827', lineHeight: 20 },
  username: { fontWeight: '700' },
  time: { fontSize: 12, color: '#9CA3AF' },
  thumbnail: { width: 44, height: 44, borderRadius: 8 },
  actions: { flexDirection: 'row' },
  action: { width: 72, alignItems: 'center', justifyContent: 'center', gap: 4 },
  actionUnread: { backgroundColor: '#3b82f6' },
  actionClear: { backgroundColor: '#ef4444' },
  actionText: { color: '#fff', fontSize: 11, fontWeight: '600' },
});
