import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
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
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { markOneRead } from '../lib/notifications';
import type { RootStackParamList } from '../navigation/types';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'GalleryInvite'>;
type RouteProps = RouteProp<RootStackParamList, 'GalleryInvite'>;

const SCREEN_WIDTH = Dimensions.get('window').width;
const COVER_HEIGHT = 300;

export default function GalleryInviteScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProps>();
  const { galleryId, notificationId } = route.params;
  const { session } = useAuth();
  const userId = session?.user.id ?? '';

  const [title, setTitle] = useState('');
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    supabase
      .from('galleries')
      .select('*')
      .eq('id', galleryId)
      .single()
      .then(({ data }) => {
        if (data) {
          setTitle(data.title ?? '');
          setCoverUrl(data.cover_photo_url ?? null);
        }
        setLoading(false);
      });
  }, [galleryId]);

  const handleJoin = async () => {
    setJoining(true);
    const { error } = await supabase
      .from('gallery_members')
      .update({ role: 'member' })
      .eq('gallery_id', galleryId)
      .eq('user_id', userId);

    if (error) {
      setJoining(false);
      Alert.alert('Error', error.message);
      return;
    }

    await markOneRead(notificationId);
    setJoining(false);
    navigation.navigate('GalleryDetail', { galleryId, galleryTitle: title });
  };

  const handleDecline = async () => {
    await markOneRead(notificationId);
    navigation.goBack();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>‹ Back</Text>
          </Pressable>
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
      </View>

      {coverUrl ? (
        <Image
          source={{ uri: coverUrl }}
          style={styles.cover}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.coverPlaceholder} />
      )}

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
        <Text style={styles.subtitle}>You've been invited to join this gallery</Text>

        <Pressable
          style={({ pressed }) => [styles.joinButton, pressed && { opacity: 0.8 }, joining && styles.buttonDisabled]}
          onPress={handleJoin}
          disabled={joining}
        >
          {joining ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.joinText}>Join Gallery</Text>
          )}
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.declineButton, pressed && { opacity: 0.8 }]}
          onPress={handleDecline}
          disabled={joining}
        >
          <Text style={styles.declineText}>Decline</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },
  backButton: { alignSelf: 'flex-start', paddingVertical: 6 },
  backText: { fontSize: 16, color: '#FF6B6B', fontWeight: '500' },

  cover: { width: SCREEN_WIDTH, height: COVER_HEIGHT },
  coverPlaceholder: { width: SCREEN_WIDTH, height: COVER_HEIGHT, backgroundColor: '#E5E7EB' },

  content: { flex: 1, paddingHorizontal: 24, paddingTop: 28 },
  title: { fontSize: 26, fontWeight: '800', color: '#111827', letterSpacing: -0.5, marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#6B7280', marginBottom: 32 },

  joinButton: {
    backgroundColor: '#34C759',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  joinText: { color: '#fff', fontSize: 17, fontWeight: '700' },

  declineButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  declineText: { color: '#fff', fontSize: 17, fontWeight: '700' },

  buttonDisabled: { opacity: 0.6 },
});
