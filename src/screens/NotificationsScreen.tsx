import React from 'react';
import { ActivityIndicator, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { useNotifications } from '../hooks/useNotifications';
import { NotificationsHeader } from '../components/NotificationsHeader';
import NotificationRow from '../components/NotificationRow';
import { markOneRead } from '../lib/notifications';
import { SkeletonCircle, SkeletonText } from '../components/Skeleton';

export default function NotificationsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    notifications,
    senderProfileMap,
    coverMap,
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
  } = useNotifications(navigation);

  if (initialLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
          {Array.from({ length: 10 }).map((_, i) => (
            <View
              key={i}
              style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                paddingVertical: 12,
              }}
            >
              <SkeletonCircle size={36} />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <SkeletonText width="85%" height={14} />
                <View style={{ height: 4 }} />
                <SkeletonText width={60} height={11} />
              </View>
            </View>
          ))}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <NotificationsHeader
        onBack={() => navigation.goBack()}
        onMarkAllRead={handleMarkAllRead}
        onClearAll={handleClearAll}
        hasUnread={hasUnread}
      />
      <FlatList
        data={notifications}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF6B6B" />}
        alwaysBounceVertical
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
            onPress={() => {
              if (item.type === 'trusted_friend') {
                markOneRead(item.id);
                setNotifications(prev => prev.map(n => n.id === item.id ? { ...n, read: true } : n));
                navigation.navigate('TrustedFriends');
              } else {
                handleNotificationPress(item);
              }
            }}
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
  separator: { height: 1, backgroundColor: '#F3F4F6' },
  emptyContainer: { flex: 1 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 15, color: '#9CA3AF' },
});
