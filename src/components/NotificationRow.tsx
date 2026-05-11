import React, { useEffect, useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { addTrustedFriend } from '../lib/trustedFriends';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
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
  gallery_cover_photo_url?: string | null;
  gallery_title?: string | null;
  gallery_contributor_count?: number;
};

type Props = {
  notification: NotificationItem;
  senderProfileMap: Record<string, { id: string; username: string; display_name?: string | null; avatar_url?: string | null }>;
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
  const { session } = useAuth();
  const { body, read, created_at, type } = notification;
  const [trustedAdded, setTrustedAdded] = useState(false);
  const [actionState, setActionState] = useState<'pending' | 'accepted' | 'declined' | 'joined' | 'loading'>('loading');

  useEffect(() => {
    const checkState = async () => {
      const uid = session?.user?.id;
      if (!uid) { setActionState('pending'); return; }

      if (type === 'friend_request') {
        const { data } = await supabase
          .from('friends')
          .select('status')
          .eq('id', notification.related_id)
          .limit(1);
        if (!data || data.length === 0) { setActionState('declined'); return; }
        const status = data[0].status;
        if (status === 'accepted') setActionState('accepted');
        else if (status === 'declined') setActionState('declined');
        else setActionState('pending');
      } else if (type === 'message_request') {
        const { data } = await supabase
          .from('message_requests')
          .select('status')
          .eq('id', notification.related_id)
          .limit(1);
        if (!data || data.length === 0) { setActionState('declined'); return; }
        if (data[0].status === 'accepted') setActionState('accepted');
        else if (data[0].status === 'declined') setActionState('declined');
        else setActionState('pending');
      } else if (type === 'gallery_invite') {
        const { data } = await supabase
          .from('gallery_members')
          .select('status')
          .eq('gallery_id', notification.related_id)
          .eq('user_id', uid)
          .limit(1);
        if (!data || data.length === 0) { setActionState('pending'); return; }
        const status = data[0].status;
        if (status === 'accepted') setActionState('joined');
        else setActionState('pending');
      } else {
        setActionState('pending');
      }
    };
    checkState();
  }, [notification.related_id, type, session?.user?.id]);
  const parts = body.split(' ');
  const parsedUsername = parts[0]?.toLowerCase();
  const rest = parts.slice(1).join(' ');
  const isSystemNotification = !notification.sender_id;
  const senderProfile = senderProfileMap[notification.sender_id ?? ''];
  const displayLabel = isSystemNotification ? 'Momento' : (senderProfile?.display_name || senderProfile?.username || parsedUsername);
  const icon = typeIcon(type);

  const swipeableRef = useRef<any>(null);

  const resolveNotificationImage = () => {
    if (type === 'gallery_invite') return notification.gallery_cover_photo_url ?? null;
    if (type === 'gallery_photo_added') return notification.related_id ? coverMap[notification.related_id] ?? null : null;
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
          {isSystemNotification ? (
            <View style={[styles.avatar, styles.momentoAvatar]}>
              <Text style={styles.momentoAvatarLetter}>M</Text>
            </View>
          ) : imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.avatar} />
          ) : type === 'gallery_invite' ? (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Ionicons name="images-outline" size={20} color="#9ca3af" />
            </View>
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
          {type === 'gallery_invite' ? (
            <Text style={styles.body}>
              {'You\'ve been invited to join '}
              <Text style={{ fontWeight: '600' }}>{notification.gallery_title ?? 'a gallery'}</Text>
            </Text>
          ) : isSystemNotification ? (
            <Text style={styles.body}>
              <Text style={styles.username}>Momento </Text>
              {body}
            </Text>
          ) : (
            <Text style={styles.body}>
              <Text style={styles.username}>{displayLabel} </Text>
              {rest}
            </Text>
          )}
          {type === 'gallery_invite' && !!notification.gallery_contributor_count && (
            <Text style={styles.time}>{notification.gallery_contributor_count} contributor{notification.gallery_contributor_count === 1 ? '' : 's'}</Text>
          )}
          <Text style={styles.time}>{timeAgo(created_at)}</Text>
          {type === 'friend_request' && actionState !== 'loading' && (
            actionState === 'pending' ? (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <TouchableOpacity
                  onPress={async () => {
                    await supabase.from('friends').update({ status: 'accepted' }).eq('id', notification.related_id);
                    setActionState('accepted');
                  }}
                  style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, backgroundColor: '#E91E8C' }}
                >
                  <Text style={{ color: 'white', fontSize: 13, fontWeight: '600' }}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={async () => {
                    await supabase.from('friends').update({ status: 'declined' }).eq('id', notification.related_id);
                    setActionState('declined');
                  }}
                  style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, backgroundColor: '#E5E7EB' }}
                >
                  <Text style={{ color: '#6B7280', fontSize: 13, fontWeight: '600' }}>Decline</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={{ color: '#9CA3AF', fontSize: 12, marginTop: 6 }}>
                {actionState === 'accepted' ? 'Accepted ✓' : 'Declined'}
              </Text>
            )
          )}
          {type === 'gallery_invite' && actionState !== 'loading' && (
            actionState === 'pending' ? (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <TouchableOpacity
                  onPress={async () => {
                    const uid = session?.user?.id;
                    if (!uid) return;
                    const { data } = await supabase.from('gallery_members').update({ status: 'accepted' }).eq('gallery_id', notification.related_id).eq('user_id', uid).select();
                    if (!data || data.length === 0) {
                      await supabase.from('gallery_members').insert({ gallery_id: notification.related_id, user_id: uid, role: 'member', status: 'accepted' });
                    }
                    setActionState('joined');
                  }}
                  style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, backgroundColor: '#E91E8C' }}
                >
                  <Text style={{ color: 'white', fontSize: 13, fontWeight: '600' }}>Join</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={async () => {
                    const uid = session?.user?.id;
                    if (!uid) return;
                    await supabase.from('gallery_members').delete().eq('gallery_id', notification.related_id).eq('user_id', uid);
                    setActionState('declined');
                  }}
                  style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, backgroundColor: '#E5E7EB' }}
                >
                  <Text style={{ color: '#6B7280', fontSize: 13, fontWeight: '600' }}>Decline</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={{ color: '#9CA3AF', fontSize: 12, marginTop: 6 }}>
                {actionState === 'joined' ? 'Joined ✓' : 'Declined'}
              </Text>
            )
          )}
          {type === 'message_request' && (
            actionState === 'loading' ? null :
            actionState === 'pending' ? (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <TouchableOpacity
                  onPress={async () => {
                    const uid = session?.user?.id;
                    if (!uid) return;
                    const { data } = await supabase
                      .from('message_requests')
                      .select('id, requester_id')
                      .eq('id', notification.related_id)
                      .limit(1);
                    if (!data || data.length === 0) return;
                    const { respondToMessageRequest } = await import('../lib/messages');
                    await respondToMessageRequest(data[0].id, true, data[0].requester_id, uid);
                    setActionState('accepted');
                  }}
                  style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, backgroundColor: '#E91E8C' }}
                >
                  <Text style={{ color: 'white', fontSize: 13, fontWeight: '600' }}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={async () => {
                    const uid = session?.user?.id;
                    if (!uid) return;
                    const { data } = await supabase
                      .from('message_requests')
                      .select('id, requester_id')
                      .eq('id', notification.related_id)
                      .limit(1);
                    if (!data || data.length === 0) return;
                    const { respondToMessageRequest } = await import('../lib/messages');
                    await respondToMessageRequest(data[0].id, false, data[0].requester_id, uid);
                    setActionState('declined');
                  }}
                  style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, backgroundColor: '#E5E7EB' }}
                >
                  <Text style={{ color: '#6B7280', fontSize: 13, fontWeight: '600' }}>Decline</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={{ color: '#9CA3AF', fontSize: 12, marginTop: 6 }}>
                {actionState === 'accepted' ? 'Accepted ✓' : 'Declined'}
              </Text>
            )
          )}
          {type === 'trusted_friend' && notification.sender_id && (
            <Pressable
              style={[styles.trustedBtn, trustedAdded && styles.trustedBtnAdded]}
              disabled={trustedAdded}
              onPress={async () => {
                await addTrustedFriend(supabase, notification.sender_id!);
                setTrustedAdded(true);
              }}
            >
              <Text style={styles.trustedBtnText}>{trustedAdded ? 'Added ✓' : 'Add to your trusted friends'}</Text>
            </Pressable>
          )}
        </View>
        {type === 'trusted_friend' && (
          <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
        )}
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
  trustedBtn: { alignSelf: 'flex-start', marginTop: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#E91E8C' },
  trustedBtnAdded: { backgroundColor: '#9CA3AF' },
  trustedBtnText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  momentoAvatar: { backgroundColor: '#FF6B6B', alignItems: 'center', justifyContent: 'center' },
  momentoAvatarLetter: { fontSize: 18, fontWeight: '800', color: '#fff' },
});
