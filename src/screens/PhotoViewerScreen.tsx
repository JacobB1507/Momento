import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  StatusBar,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import ImageViewer from 'react-native-image-zoom-viewer';
import type { RootStackParamList } from '../navigation/types';
import { supabase } from '../lib/supabase';
import { SkeletonCircle, SkeletonText } from '../components/Skeleton';

type Uploader = { id: string; username: string; display_name: string | null; avatar_url: string | null };

export default function PhotoViewerScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RootStackParamList, 'PhotoViewer'>>();
  const { photos, initialIndex, galleryTitle } = route.params;

  const [currentIndex, setCurrentIndex] = useState(initialIndex ?? 0);
  const [uploaderMap, setUploaderMap] = useState<Map<string, Uploader>>(new Map());

  // Preload all uploader profiles at once to prevent flash on swipe
  useEffect(() => {
    const uniqueIds = [...new Set(photos.map((p: any) => p.uploaded_by).filter(Boolean))];
    if (uniqueIds.length === 0) return;
    supabase
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .in('id', uniqueIds)
      .then(({ data }) => {
        if (!data) return;
        const map = new Map<string, Uploader>();
        data.forEach((u: any) => map.set(u.id, u));
        setUploaderMap(map);
      });
  }, [photos]);

  const currentUploader = useMemo(() => {
    const photo = photos[currentIndex];
    return photo ? uploaderMap.get(photo.uploaded_by) ?? null : null;
  }, [currentIndex, photos, uploaderMap]);

  const imageUrls = useMemo(
    () => photos.map((p: any) => ({ url: p.url })),
    [photos]
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      <ImageViewer
        imageUrls={imageUrls}
        index={currentIndex}
        onChange={(idx) => {
          if (typeof idx === 'number') setCurrentIndex(idx);
        }}
        onSwipeDown={() => navigation.goBack()}
        enableSwipeDown={true}
        saveToLocalByLongPress={false}
        renderIndicator={() => null as any}
        backgroundColor="#000"
      />

      {/* Header overlay */}
      <SafeAreaView edges={['top']} style={styles.headerWrap} pointerEvents="box-none">
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
            <Ionicons name="close" size={28} color="#fff" />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>{galleryTitle}</Text>
            <Text style={styles.headerCounter}>{currentIndex + 1} / {photos.length}</Text>
          </View>
          <View style={{ width: 28 }} />
        </View>
      </SafeAreaView>

      {/* Uploader overlay at bottom */}
      {photos[currentIndex]?.uploaded_by && (
        <SafeAreaView edges={['bottom']} style={styles.footerWrap} pointerEvents="box-none">
          <View style={styles.footer}>
            {currentUploader ? (
              <>
                {currentUploader.avatar_url ? (
                  <Image
                    source={{ uri: currentUploader.avatar_url }}
                    style={styles.avatar}
                    contentFit="cover"
                    transition={0}
                  />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Text style={styles.avatarLetter}>
                      {(currentUploader.display_name ?? currentUploader.username ?? '?')[0].toUpperCase()}
                    </Text>
                  </View>
                )}
                <Text style={styles.uploaderName}>
                  @{currentUploader.username}
                </Text>
              </>
            ) : (
              <>
                <SkeletonCircle size={32} />
                <View style={{ marginLeft: 10 }}>
                  <SkeletonText width={100} height={14} />
                </View>
              </>
            )}
          </View>
        </SafeAreaView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  headerWrap: { position: 'absolute', top: 0, left: 0, right: 0 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  headerCounter: { color: '#bbb', fontSize: 12, marginTop: 2 },
  footerWrap: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  avatar: { width: 32, height: 32, borderRadius: 16 },
  avatarPlaceholder: { backgroundColor: '#444', justifyContent: 'center', alignItems: 'center' },
  avatarLetter: { color: '#fff', fontWeight: '600' },
  uploaderName: { color: '#fff', fontSize: 14, fontWeight: '500' },
});
