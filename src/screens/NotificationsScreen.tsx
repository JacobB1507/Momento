import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/types';
import { getNotifications, markAllRead, markOneRead, markNotificationUnread, deleteNotification } from '../lib/notifications';
import { supabase } from '../lib/supabase';
import NotificationRow, { type NotificationItem } from '../components/NotificationRow';

type SenderProfileMap = Record<string, { id: string; username: string; avatar_url?: string | null }>;
type CoverMap = Record<string, string | null>;

export default function NotificationsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { session } = useAuth();
  const userId = session?.user.id ?? '';
  const currentUserId = session?.user?.id ?? '';

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [senderProfileMap, setSenderProfileMap] = useState<SenderProfileMap>({});
  const [coverMap, setCoverMap] = useState<CoverMap>({});
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

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
      ? await supabase.from('profiles').select('id, username, avatar_url').in('id', senderIds)
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
    setMarkingAll(true);
    const ok = await markAllRead(userId);
    if (ok) setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setMarkingAll(false);
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
          username: notification.body?.split(' ')[0] ?? '',
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
          navigation.navigate('GalleryInvite', {
            galleryId: notification.related_id,
            notificationId: notification.id,
          });
        }
        break;
      }
      default:
        break;
    }
  };

  const hasUnread = notifications.some(n => !n.read);

  if (initialLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.centered}><ActivityIndicator color="#FF6B6B" size="large" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={12}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerActions}>
          {hasUnread && (
            <Pressable
              onPress={handleMarkAllRead}
              disabled={markingAll}
              style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.6 }]}
            >
              {markingAll
                ? <ActivityIndicator color="#007AFF" size="small" />
                : <Text style={styles.markAllText}>Mark read</Text>}
            </Pressable>
          )}
          {notifications.length > 0 && (
            <Pressable
              onPress={handleClearAll}
              style={({ pressed }) => [styles.actionBtn, pressed && { opacity: 0.6 }]}
            >
              <Text style={styles.clearText}>Clear all</Text>
            </Pressable>
          )}
        </View>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B6B" />
        }
        alwaysBounceVertical={true}
        contentContainerStyle={notifications.length === 0 ? styles.emptyContainer : undefined}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No notifications yet</Text>
          </View>
        }
        renderItem={({ item }) => (
          <NotificationRow
            notification={item}
            senderProfileMap={senderProfileMap}
            coverMap={coverMap}
            onPress={() => handleNotificationPress(item)}
            onMarkUnread={async () => {
              await markNotificationUnread(item.id);
              setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, read: false } : n));
            }}
            onClear={async () => {
              await deleteNotification(item.id);
              setNotifications(prev => prev.filter(n => n.id !== item.id));
            }}
          />
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 4, paddingBottom: 12, gap: 8 },
  backButton: { paddingVertical: 4, paddingRight: 4 },
  backText: { fontSize: 32, color: '#FF6B6B', fontWeight: '300', lineHeight: 36 },
  headerTitle: { flex: 1, fontSize: 22, fontWeight: '800', color: '#111827', letterSpacing: -0.4 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  actionBtn: { paddingVertical: 4, paddingHorizontal: 2 },
  markAllText: { fontSize: 13, color: '#007AFF', fontWeight: '600' },
  clearText: { fontSize: 13, color: '#ef4444', fontWeight: '600' },
  separator: { height: 1, backgroundColor: '#F3F4F6' },
  emptyContainer: { flex: 1 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 15, color: '#9CA3AF' },
});
