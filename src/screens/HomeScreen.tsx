import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { supabase } from '../lib/supabase';
import { getUnreadCount } from '../lib/notifications';
import type { RootStackParamList } from '../navigation/types';
import { fetchUserGalleries } from '../lib/galleries';
import type { Gallery, GalleryPrivacy } from '../types/database';
import { GalleryCard, CARD_GAP, SCREEN_PADDING } from '../components/GalleryCard';
import { EmptyState } from '../components/EmptyState';
import { GalleryActionSheet } from '../components/GalleryActionSheet';

export default function HomeScreen() {
  const { session } = useAuth();
  const navigation = useNavigation();
  const rootNav = navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionGallery, setActionGallery] = useState<Gallery | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const load = useCallback(async () => {
    if (!session?.user.id) return;
    try {
      setError(null);
      const data = await fetchUserGalleries(session.user.id);
      setGalleries(data);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load galleries');
    }
  }, [session?.user.id]);

  useFocusEffect(
    useCallback(() => {
      load().finally(() => setLoading(false));
    }, [load])
  );

  useFocusEffect(
    useCallback(() => {
      if (!session?.user.id) return;
      getUnreadCount(session.user.id).then(setUnreadCount);
    }, [session?.user.id])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleSaveRename = async (title: string) => {
    const { error: err } = await supabase.from('galleries').update({ title }).eq('id', actionGallery!.id);
    if (err) { Alert.alert('Error', err.message); return; }
    await load();
    setActionGallery(null);
  };

  const handleSavePrivacy = async (privacy: GalleryPrivacy) => {
    const { error: err } = await supabase.from('galleries').update({ privacy }).eq('id', actionGallery!.id);
    if (err) { Alert.alert('Error', err.message); return; }
    await load();
    setActionGallery(null);
  };

  const handleSelectCover = async (photoUrl: string) => {
    const id = actionGallery!.id;
    setActionGallery(null);
    const { error: err } = await supabase.from('galleries').update({ cover_photo_url: photoUrl }).eq('id', id);
    if (err) { Alert.alert('Error', err.message); return; }
    await load();
  };

  const handleDelete = async () => {
    const id = actionGallery!.id;
    setActionGallery(null);
    const { error: err } = await supabase.from('galleries').delete().eq('id', id);
    if (err) { Alert.alert('Error', err.message); return; }
    setGalleries(prev => prev.filter(g => g.id !== id));
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Galleries</Text>
        {galleries.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{galleries.length}</Text>
          </View>
        )}
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

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FF6B6B" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={load}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={galleries}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.list}
          columnWrapperStyle={styles.row}
          renderItem={({ item }) => (
            <GalleryCard
              gallery={item}
              onPress={() => rootNav?.navigate('GalleryDetail', { galleryId: item.id, galleryTitle: item.title })}
              onLongPress={() => { if (item.role === 'owner') setActionGallery(item); }}
            />
          )}
          ListEmptyComponent={<EmptyState />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#FF6B6B"
              colors={['#FF6B6B']}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      <GalleryActionSheet
        gallery={actionGallery}
        onClose={() => setActionGallery(null)}
        onSaveRename={handleSaveRename}
        onSavePrivacy={handleSavePrivacy}
        onSelectCover={handleSelectCover}
        onDelete={handleDelete}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SCREEN_PADDING,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  countBadge: { marginLeft: 10, backgroundColor: '#FF6B6B', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
  countText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  bellButton: { marginLeft: 'auto', padding: 4 },
  list: { paddingHorizontal: SCREEN_PADDING, paddingBottom: 24 },
  row: { gap: CARD_GAP, marginBottom: CARD_GAP },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: '#EF4444', fontSize: 15, marginBottom: 12, textAlign: 'center' },
  retryButton: { borderWidth: 1.5, borderColor: '#FF6B6B', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 28 },
  retryText: { color: '#FF6B6B', fontWeight: '600' },
});
