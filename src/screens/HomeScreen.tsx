import React, { useCallback, useState } from 'react';
import {
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
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAuth } from '../context/AuthContext';
import { getUnreadCount } from '../lib/notifications';
import { getFeedGalleries } from '../lib/feed';
import type { FeedGallery } from '../lib/feed';
import { GalleryCard, CARD_GAP } from '../components/GalleryCard';
import { supabase } from '../lib/supabase';
import type { RootStackParamList } from '../navigation/types';
import type { Gallery } from '../types/database';

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type Tab = 'friends' | 'discover';

export default function HomeScreen() {
  const { session } = useAuth();
  const navigation = useNavigation();
  const rootNav = navigation.getParent<NavProp>();
  const userId = session?.user.id ?? '';

  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState<Tab>('friends');
  const [friendGalleries, setFriendGalleries] = useState<FeedGallery[]>([]);
  const [discoverGalleries, setDiscoverGalleries] = useState<Gallery[]>([]);
  const [friendIds, setFriendIds] = useState<string[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadFriendGalleries = useCallback(async () => {
    if (!userId) return;
    const [feedGalleries, count] = await Promise.all([
      getFeedGalleries(userId),
      getUnreadCount(userId),
    ]);
    setFriendGalleries(feedGalleries);
    setUnreadCount(count);

    const { data: friendRows } = await supabase
      .from('friends')
      .select('sender_id, receiver_id')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .eq('status', 'accepted');
    setFriendIds(
      (friendRows ?? []).map((r: any) =>
        r.sender_id === userId ? r.receiver_id : r.sender_id
      )
    );
  }, [userId]);

  const loadDiscover = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from('galleries')
      .select('*')
      .eq('privacy', 'public')
      .neq('created_by', userId)
      .order('created_at', { ascending: false })
      .limit(20);
    setDiscoverGalleries((data as Gallery[]) ?? []);
  }, [userId]);

  const loadAll = useCallback(async () => {
    await Promise.all([loadFriendGalleries(), loadDiscover()]);
  }, [loadFriendGalleries, loadDiscover]);

  useFocusEffect(useCallback(() => { loadAll(); }, [loadAll]));

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  const refreshControl = (
    <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#FF6B6B" />
  );

  const navigateToGallery = (galleryId: string, galleryTitle: string) => {
    rootNav?.navigate('GalleryDetail', { galleryId, galleryTitle });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Momento</Text>
        <Pressable
          onPress={() => rootNav?.navigate('Notifications')}
          style={({ pressed }) => [styles.bellButton, pressed && { opacity: 0.7 }]}
        >
          <MaterialCommunityIcons
            name={unreadCount > 0 ? 'bell-badge' : 'bell'}
            size={26}
            color={unreadCount > 0 ? '#FF3B30' : '#333'}
          />
        </Pressable>
      </View>

      <View style={styles.tabs}>
        {(['friends', 'discover'] as Tab[]).map(tab => (
          <Pressable
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'friends' ? 'Friends' : 'Discover'}
            </Text>
          </Pressable>
        ))}
      </View>

      {activeTab === 'friends' ? (
        <FlatList
          key="friends_list"
          data={friendGalleries}
          keyExtractor={item => item.id}
          numColumns={2}
          refreshControl={refreshControl}
          columnWrapperStyle={styles.galleryRow}
          contentContainerStyle={styles.galleryGrid}
          ListEmptyComponent={
            <Text style={styles.empty}>
              No friends yet — add some friends to see their galleries!
            </Text>
          }
          renderItem={({ item }) => (
            <GalleryCard
              gallery={item as unknown as Gallery}
              onPress={() => navigateToGallery(item.id, item.title)}
              onCommentSheetClose={loadFriendGalleries}
              currentUserId={userId}
              friendIds={friendIds}
            />
          )}
        />
      ) : (
        <FlatList
          key="discover_list"
          data={discoverGalleries}
          keyExtractor={item => item.id}
          numColumns={2}
          refreshControl={refreshControl}
          columnWrapperStyle={styles.galleryRow}
          contentContainerStyle={styles.galleryGrid}
          ListEmptyComponent={
            <Text style={styles.empty}>No public galleries yet</Text>
          }
          renderItem={({ item }) => (
            <GalleryCard
              gallery={item}
              onPress={() => navigateToGallery(item.id, item.title)}
              onCommentSheetClose={loadDiscover}
              currentUserId={userId}
              friendIds={friendIds}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTitle: { flex: 1, fontSize: 28, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  bellButton: { padding: 4 },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  tabActive: { backgroundColor: '#FF6B6B' },
  tabText: { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  tabTextActive: { color: '#fff' },
  empty: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 14,
    paddingTop: 48,
    paddingHorizontal: 32,
    lineHeight: 22,
  },
  galleryGrid: { paddingHorizontal: 16, paddingBottom: 24, gap: CARD_GAP },
  galleryRow: { gap: CARD_GAP },
});
