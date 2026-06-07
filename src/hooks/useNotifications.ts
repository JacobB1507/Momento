import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { getNotifications, markAllRead, markOneRead, markNotificationUnread, deleteNotification } from '../lib/notifications';
import type { NotificationItem } from '../components/NotificationRow';

type SenderProfileMap = Record<string, { id: string; username: string; display_name?: string | null; avatar_url?: string | null }>;
type CoverMap = Record<string, string | null>;

export function useNotifications(navigation: any) {
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  const currentUserId = session?.user?.id ?? '';

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [senderProfileMap, setSenderProfileMap] = useState<SenderProfileMap>({});
  const [coverMap, setCoverMap] = useState<CoverMap>({});
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadNotifications = async () => {
    if (!userId) return;
    const data = await getNotifications(userId) as NotificationItem[];
    setNotifications(data);

    const senderIds = [...new Set(
      (data ?? [])
        .filter(n => n.sender_id)
        .map(n => n.sender_id)
    )];

    const { data: senderProfiles } = senderIds.length > 0
      ? await supabase.from('profiles').select('id, username, display_name, avatar_url').in('id', senderIds)
      : { data: [] };

    setSenderProfileMap(Object.fromEntries(
      (senderProfiles ?? []).map(p => [p.id, p])
    ));

    const galleryRelatedIds = [...new Set(
      data
        .filter(n => n.related_id && (n.type === 'gallery_photo_added' || n.type === 'gallery_invite'))
        .map(n => n.related_id!)
    )];
    if (galleryRelatedIds.length) {
      const { data: galleries } = await supabase
        .from('galleries')
        .select('id, cover_photo_url')
        .in('id', galleryRelatedIds);
      if (galleries) {
        setCoverMap(Object.fromEntries(galleries.map(g => [g.id, g.cover_photo_url ?? null])));
      }
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadNotifications().finally(() => setInitialLoading(false));
    }, []),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  }, [loadNotifications]);

  const handleMarkAllRead = async () => {
    if (!userId) return;
    setLoading(true);
    const ok = await markAllRead(userId);
    if (ok) setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setLoading(false);
  };

  const handleClearAll = () => {
    Alert.alert('Clear All', 'Delete all notifications?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear All', style: 'destructive', onPress: async () => {
          await supabase.from('notifications').delete().eq('user_id', userId);
          setNotifications([]);
        },
      },
    ]);
  };

  const handleNotificationPress = async (notification: any) => {
    await markOneRead(notification.id);
    setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, read: true } : n));

    switch (notification.type) {
      case 'message': {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', notification.sender_id)
          .single();
        navigation.navigate('Chat', {
          conversationId: notification.related_id,
          otherUserId: notification.sender_id,
          otherUsername: profile?.username ?? '',
        });
        break;
      }
      case 'gallery_photo_added':
      case 'comment': {
        navigation.navigate('GalleryDetail', {
          galleryId: notification.related_id,
          openComments: true,
          highlightUserId: notification.sender_id,
        });
        setTimeout(() => navigation.setParams({ highlightUserId: null }), 1000);
        break;
      }
      case 'friend_request': {
        navigation.navigate('Friends', {
          highlightRequestId: notification.related_id,
        });
        setTimeout(() => navigation.setParams({ highlightRequestId: null }), 1000);
        break;
      }
      case 'friend_accepted': {
        navigation.navigate('FriendProfile', {
          userId: notification.sender_id,
          username: notification.sender_profile?.username || '',
        });
        break;
      }
      case 'removal_request': {
        navigation.navigate('GalleryDetail', {
          galleryId: notification.related_id,
          openRemovalRequest: notification.id,
        });
        setTimeout(() => navigation.setParams({ openRemovalRequest: null }), 1000);
        break;
      }
      case 'trusted_friend': {
        navigation.navigate('TrustedFriends');
        break;
      }
      case 'gallery_invite': {
        const { data: member } = await supabase
          .from('gallery_members')
          .select('user_id')
          .eq('gallery_id', notification.related_id)
          .eq('user_id', currentUserId)
          .single();
        if (member) {
          navigation.navigate('GalleryDetail', { galleryId: notification.related_id });
        } else {
          navigation.navigate('GalleryInvitePrompt', { galleryId: notification.related_id });
        }
        break;
      }
      case 'message_request': {
        const { data: reqData } = await supabase
          .from('message_requests')
          .select('id, requester_id, status')
          .eq('id', notification.related_id)
          .limit(1);
        if (!reqData || reqData.length === 0) break;
        if (reqData[0].status === 'declined') break;
        const { getOrCreateConversation } = await import('../lib/messages');
        const conv = await getOrCreateConversation(notification.sender_id, session?.user?.id);
        navigation.navigate('Chat', {
          conversationId: conv.id,
          otherUserId: notification.sender_id,
          otherUsername: notification.sender_profile?.username || '',
          isPendingRequest: reqData[0].status === 'pending',
        });
        break;
      }
      default:
        break;
    }
  };

  const hasUnread = notifications.some(n => !n.read);

  return {
    notifications,
    senderProfileMap,
    coverMap,
    loading,
    initialLoading,
    refreshing,
    hasUnread,
    onRefresh,
    handleMarkAllRead,
    handleClearAll,
    handleNotificationPress,
    setNotifications,
    markNotificationUnread,
    deleteNotification,
  };
}
