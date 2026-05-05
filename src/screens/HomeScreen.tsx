import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
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
import { fetchUserGalleries } from '../lib/galleries';
import type { Gallery } from '../types/database';

const CARD_GAP = 12;
const SCREEN_PADDING = 16;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - SCREEN_PADDING * 2 - CARD_GAP) / 2;
const CARD_HEIGHT = CARD_WIDTH * 1.2;

const PLACEHOLDER_COLORS = [
  '#FF6B6B',
  '#FF8E53',
  '#F97316',
  '#EC4899',
  '#8B5CF6',
  '#06B6D4',
];

function placeholderColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return PLACEHOLDER_COLORS[hash % PLACEHOLDER_COLORS.length];
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  const diff = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return `${diff} days ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function GalleryCard({ gallery, onPress }: { gallery: Gallery; onPress: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.cardPressed]} onPress={onPress}>
      <View style={[styles.cardImage, { backgroundColor: placeholderColor(gallery.id) }]}>
        {gallery.cover_photo_url ? (
          <Image source={{ uri: gallery.cover_photo_url }} style={StyleSheet.absoluteFill} />
        ) : (
          <Text style={styles.cardInitial}>{gallery.title.charAt(0).toUpperCase()}</Text>
        )}
        <View style={styles.cardOverlay} />
        {gallery.role === 'member' && (
          <View style={styles.memberBadge}>
            <Text style={styles.memberBadgeText}>Invited</Text>
          </View>
        )}
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardTitle} numberOfLines={1}>{gallery.title}</Text>
        <Text style={styles.cardDate}>{formatDate(gallery.created_at)}</Text>
      </View>
    </Pressable>
  );
}

function EmptyState() {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyIcon}>🖼️</Text>
      <Text style={styles.emptyTitle}>No galleries yet</Text>
      <Text style={styles.emptySubtitle}>Tap + to create your first gallery or get invited to one.</Text>
    </View>
  );
}

export default function HomeScreen() {
  const { session } = useAuth();
  const navigation = useNavigation();
  const rootNav = navigation.getParent<NativeStackNavigationProp<RootStackParamList>>();
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialLoadDone = useRef(false);

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

  useEffect(() => {
    load().finally(() => {
      setLoading(false);
      initialLoadDone.current = true;
    });
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      if (initialLoadDone.current) load();
    }, [load])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Galleries</Text>
        {galleries.length > 0 && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{galleries.length}</Text>
          </View>
        )}
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
                onPress={() =>
                  rootNav?.navigate('GalleryDetail', {
                    galleryId: item.id,
                    galleryTitle: item.title,
                  })
                }
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
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  countBadge: {
    marginLeft: 10,
    backgroundColor: '#FF6B6B',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  list: { paddingHorizontal: SCREEN_PADDING, paddingBottom: 24 },
  row: { gap: CARD_GAP, marginBottom: CARD_GAP },

  card: {
    width: CARD_WIDTH,
    borderRadius: 16,
    backgroundColor: '#fff',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardPressed: { opacity: 0.88 },
  cardImage: {
    width: '100%',
    height: CARD_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInitial: {
    fontSize: 48,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.9)',
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  memberBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  memberBadgeText: { color: '#fff', fontSize: 10, fontWeight: '600' },

  cardInfo: { padding: 10 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#111827', marginBottom: 2 },
  cardDate: { fontSize: 12, color: '#9CA3AF' },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: '#EF4444', fontSize: 15, marginBottom: 12, textAlign: 'center' },
  retryButton: {
    borderWidth: 1.5,
    borderColor: '#FF6B6B',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 28,
  },
  retryText: { color: '#FF6B6B', fontWeight: '600' },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyIcon: { fontSize: 56, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#111827', marginBottom: 8 },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 20,
  },
});
