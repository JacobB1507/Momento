import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../navigation/types';
import {
  getNotifications,
  markAllRead,
  markOneRead,
} from '../lib/notifications';

type Notification = {
  id: string;
  user_id: string;
  body: string;
  read: boolean;
  created_at: string;
  type: string | null;
  related_id: string | null;
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

export default function NotificationsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { session } = useAuth();
  const userId = session?.user.id ?? '';

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const loadNotifications = async () => {
    if (!userId) return;
    const data = await getNotifications(userId);
    setNotifications(data as Notification[]);
  };

  useFocusEffect(
    useCallback(() => {
      loadNotifications().finally(() => setInitialLoading(false));
    }, []),
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  };

  const handleMarkAllRead = async () => {
    if (!userId) return;
    setMarkingAll(true);
    const ok = await markAllRead(userId);
    if (ok) setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setMarkingAll(false);
  };

  const handleTap = async (notification: Notification) => {
    await markOneRead(notification.id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)),
    );

    const { type, related_id, id } = notification;

    if (type === 'friend_request' || type === 'friend_accepted') {
      navigation.navigate('Friends');
    } else if (type === 'gallery_invite' && related_id) {
      navigation.navigate('GalleryInvite', { galleryId: related_id, notificationId: id });
    } else if (type === 'gallery_photo_added' && related_id) {
      navigation.navigate('GalleryDetail', { galleryId: related_id, galleryTitle: '' });
    } else if (type === 'comment' && related_id) {
      navigation.navigate('GalleryDetail', { galleryId: related_id, galleryTitle: '' });
    } else if (type === 'message') {
      navigation.navigate('Messages' as any);
    }
  };

  const hasUnread = notifications.some((n) => !n.read);

  if (initialLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>‹ Back</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Notifications</Text>
        </View>
        <View style={styles.centered}>
          <ActivityIndicator color="#FF6B6B" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Back</Text>
        </Pressable>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Notifications</Text>
          <Pressable
            onPress={handleMarkAllRead}
            disabled={!hasUnread || markingAll}
            style={({ pressed }) => [styles.markAllButton, pressed && hasUnread && { opacity: 0.7 }]}
          >
            {markingAll ? (
              <ActivityIndicator color="#007AFF" size="small" />
            ) : (
              <Text style={[styles.markAllText, { color: hasUnread ? '#007AFF' : '#999' }]}>
                Mark all read
              </Text>
            )}
          </Pressable>
        </View>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        contentContainerStyle={notifications.length === 0 ? styles.emptyContainer : styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No notifications yet</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [
              styles.row,
              !item.read && styles.rowUnread,
              pressed && styles.rowPressed,
            ]}
            onPress={() => handleTap(item)}
          >
            {!item.read && <View style={styles.unreadDot} />}
            <View style={styles.rowContent}>
              <Text style={styles.bodyText}>{item.body}</Text>
              <Text style={styles.timeText}>{timeAgo(item.created_at)}</Text>
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },
  backButton: { alignSelf: 'flex-start', paddingVertical: 6, marginBottom: 4 },
  backText: { fontSize: 16, color: '#FF6B6B', fontWeight: '500' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  markAllButton: { paddingVertical: 4, paddingHorizontal: 2 },
  markAllText: { fontSize: 14, color: '#FF6B6B', fontWeight: '600' },

  listContent: { paddingBottom: 32 },
  emptyContainer: { flex: 1 },

  separator: { height: 1, backgroundColor: '#F3F4F6' },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    gap: 10,
  },
  rowUnread: { backgroundColor: '#EFF6FF' },
  rowPressed: { opacity: 0.75 },

  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
    flexShrink: 0,
  },

  rowContent: { flex: 1, gap: 4 },
  bodyText: { fontSize: 15, color: '#111827', lineHeight: 21 },
  timeText: { fontSize: 12, color: '#9CA3AF' },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 15, color: '#9CA3AF' },
});
