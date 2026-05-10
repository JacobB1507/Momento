import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  Dimensions,
  StatusBar,
  StyleSheet,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import type { RootStackParamList } from '../navigation/types';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

type Uploader = { id: string; username: string; display_name: string | null; avatar_url: string | null };

export default function PhotoViewerScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RootStackParamList, 'PhotoViewer'>>();
  const { photos, initialIndex, galleryTitle } = route.params;

  const [currentIndex, setCurrentIndex] = useState(initialIndex ?? 0);
  const [uploaderMap, setUploaderMap] = useState<Map<string, Uploader>>(new Map());

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

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      <FlatList
        data={photos}
        keyExtractor={(item: any, idx) => `${item.id ?? idx}`}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        initialScrollIndex={initialIndex}
        getItemLayout={(_, index) => ({
          length: SCREEN_W,
          offset: SCREEN_W * index,
          index,
        })}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_W);
          setCurrentIndex(idx);
        }}
        renderItem={({ item }: any) => (
          <View style={styles.imageWrap}>
            <Image
              source={{ uri: item.url }}
              style={styles.image}
              contentFit="contain"
              transition={150}
            />
          </View>
        )}
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
      {currentUploader && (
        <SafeAreaView edges={['bottom']} style={styles.footerWrap} pointerEvents="box-none">
          <View style={styles.footer}>
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
          </View>
        </SafeAreaView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  imageWrap: { width: SCREEN_W, height: SCREEN_H, justifyContent: 'center', alignItems: 'center' },
  image: { width: SCREEN_W, height: SCREEN_H },
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
