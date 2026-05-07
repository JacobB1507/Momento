import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ViewToken } from 'react-native';
import { supabase } from '../lib/supabase';
import type { RootStackParamList, PhotoViewerPhoto } from '../navigation/types';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'PhotoViewer'>;
type RouteProps = RouteProp<RootStackParamList, 'PhotoViewer'>;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const PLACEHOLDER_COLORS = ['#FF6B6B', '#FF8E53', '#F97316', '#EC4899', '#8B5CF6', '#06B6D4'];
function placeholderColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return PLACEHOLDER_COLORS[hash % PLACEHOLDER_COLORS.length];
}

function relativeTime(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

type UploaderProfile = { username: string | null; avatar_url: string | null };

export default function PhotoViewerScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProps>();
  const { photos, initialIndex } = route.params;

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [uploaderProfile, setUploaderProfile] = useState<UploaderProfile | null>(null);
  const flatListRef = useRef<FlatList<PhotoViewerPhoto>>(null);

  const currentPhoto = photos[currentIndex];

  useEffect(() => {
    const photo = photos[currentIndex];
    if (!photo?.uploaded_by) return;
    setUploaderProfile(null);
    let cancelled = false;
    supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', photo.uploaded_by)
      .single()
      .then(({ data }) => {
        if (!cancelled && data) setUploaderProfile(data as UploaderProfile);
      });
    return () => { cancelled = true; };
  }, [currentIndex, photos]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0 && viewableItems[0].index != null) {
      setCurrentIndex(viewableItems[0].index);
    }
  });
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 });

  const getItemLayout = useCallback(
    (_: ArrayLike<PhotoViewerPhoto> | null | undefined, index: number) => ({
      length: SCREEN_WIDTH,
      offset: SCREEN_WIDTH * index,
      index,
    }),
    [],
  );

  const renderItem = useCallback(({ item }: { item: PhotoViewerPhoto }) => (
    <View style={styles.photoContainer}>
      <Image
        source={{ uri: item.url }}
        style={styles.photo}
        resizeMode="contain"
      />
    </View>
  ), []);

  const goTo = (index: number) => {
    flatListRef.current?.scrollToIndex({ index, animated: true });
  };

  return (
    <View style={styles.root}>
      <FlatList
        ref={flatListRef}
        data={photos}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={initialIndex}
        getItemLayout={getItemLayout}
        onViewableItemsChanged={onViewableItemsChanged.current}
        viewabilityConfig={viewabilityConfig.current}
        renderItem={renderItem}
      />

      {/* Top chrome */}
      <SafeAreaView style={styles.topChrome} edges={['top']} pointerEvents="box-none">
        <View style={styles.topRow} pointerEvents="box-none">
          <Pressable
            style={({ pressed }) => [styles.closeButton, pressed && { opacity: 0.6 }]}
            onPress={() => navigation.goBack()}
            hitSlop={8}
          >
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
          <Text style={styles.counter} pointerEvents="none">
            {currentIndex + 1} / {photos.length}
          </Text>
          <View style={styles.topRight} pointerEvents="none" />
        </View>
      </SafeAreaView>

      {/* Left arrow */}
      {currentIndex > 0 && (
        <Pressable
          style={({ pressed }) => [styles.arrowLeft, pressed && { opacity: 0.4 }]}
          onPress={() => goTo(currentIndex - 1)}
          hitSlop={16}
        >
          <Text style={styles.arrowText}>‹</Text>
        </Pressable>
      )}

      {/* Right arrow */}
      {currentIndex < photos.length - 1 && (
        <Pressable
          style={({ pressed }) => [styles.arrowRight, pressed && { opacity: 0.4 }]}
          onPress={() => goTo(currentIndex + 1)}
          hitSlop={16}
        >
          <Text style={styles.arrowText}>›</Text>
        </Pressable>
      )}

      {/* Bottom chrome */}
      <SafeAreaView style={styles.bottomChrome} edges={['bottom']} pointerEvents="none">
        <View style={styles.bottomRow}>
          {uploaderProfile?.avatar_url ? (
            <Image
              source={{ uri: uploaderProfile.avatar_url }}
              style={styles.avatar}
            />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: currentPhoto ? placeholderColor(currentPhoto.uploaded_by) : '#333' }]}>
              {uploaderProfile && (
                <Text style={styles.avatarLetter}>
                  {(uploaderProfile.username ?? '?').charAt(0).toUpperCase()}
                </Text>
              )}
            </View>
          )}
          <View style={styles.uploaderInfo}>
            <Text style={styles.uploaderUsername}>
              @{uploaderProfile?.username ?? '…'}
            </Text>
            {currentPhoto && (
              <Text style={styles.photoTime}>{relativeTime(currentPhoto.created_at)}</Text>
            )}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },

  photoContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT },

  topChrome: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 18,
  },
  closeText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  counter: {
    flex: 1,
    textAlign: 'center',
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  topRight: { width: 36 },

  arrowLeft: {
    position: 'absolute',
    left: 4,
    top: SCREEN_HEIGHT / 2 - 32,
  },
  arrowRight: {
    position: 'absolute',
    right: 4,
    top: SCREEN_HEIGHT / 2 - 32,
  },
  arrowText: {
    color: '#fff',
    fontSize: 56,
    fontWeight: '200',
    textShadowColor: 'rgba(0,0,0,0.7)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
    lineHeight: 64,
  },

  bottomChrome: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  avatar: { width: 32, height: 32, borderRadius: 16 },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { color: '#fff', fontSize: 13, fontWeight: '700' },
  uploaderInfo: { gap: 2 },
  uploaderUsername: { color: '#fff', fontSize: 14, fontWeight: '600' },
  photoTime: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
});
