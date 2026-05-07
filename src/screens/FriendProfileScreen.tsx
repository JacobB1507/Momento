import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { GalleryCard, CARD_GAP } from '../components/GalleryCard';
import type { RootStackParamList } from '../navigation/types';
import type { Gallery } from '../types/database';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'FriendProfile'>;
type RouteProps = RouteProp<RootStackParamList, 'FriendProfile'>;

type ProfileData = {
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
};

export default function FriendProfileScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProps>();
  const { userId, username } = route.params;
  const { session } = useAuth();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [friendIds, setFriendIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('username, avatar_url, bio')
        .eq('id', userId)
        .single();

      if (profileData) setProfile(profileData as ProfileData);

      // Galleries the friend created
      const { data: owned } = await supabase
        .from('galleries')
        .select('*')
        .eq('created_by', userId)
        .order('created_at', { ascending: false });

      // Galleries the friend is a member of (collaborative)
      const { data: memberships } = await supabase
        .from('gallery_members')
        .select('gallery_id')
        .eq('user_id', userId);

      const memberGalleryIds = (memberships ?? []).map((m: any) => m.gallery_id);

      const { data: collaborative } = memberGalleryIds.length > 0
        ? await supabase
            .from('galleries')
            .select('*')
            .in('id', memberGalleryIds)
            .neq('created_by', userId)
        : { data: [] };

      // Merge and deduplicate — RLS automatically filters what current user can see
      const all = [...(owned ?? []), ...(collaborative ?? [])];
      const unique = all.filter((g, i, arr) =>
        arr.findIndex((x: any) => x.id === g.id) === i
      );
      setGalleries(unique);

      if (session?.user.id) {
        const { data: friendRows } = await supabase
          .from('friends')
          .select('sender_id, receiver_id')
          .or(`sender_id.eq.${session.user.id},receiver_id.eq.${session.user.id}`)
          .eq('status', 'accepted');
        setFriendIds(
          (friendRows ?? []).map((r: any) =>
            r.sender_id === session.user.id ? r.receiver_id : r.sender_id
          )
        );
      }

      setLoading(false);
    };
    load();
  }, [userId, session?.user.id]);

  const letter = (profile?.username ?? username ?? '?').charAt(0).toUpperCase();

  const Header = (
    <View style={styles.profileSection}>
      {profile?.avatar_url ? (
        <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarLetter}>{letter}</Text>
        </View>
      )}
      <Text style={styles.username}>@{profile?.username ?? username}</Text>
      {!!profile?.bio && <Text style={styles.bio}>{profile.bio}</Text>}
      <View style={styles.galleriesLabel}>
        <Text style={styles.galleriesLabelText}>Public Galleries</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backButton}>
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          @{username}
        </Text>
        <View style={styles.backButton} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#FF6B6B" />
        </View>
      ) : (
        <FlatList
          data={galleries}
          keyExtractor={item => item.id}
          numColumns={2}
          ListHeaderComponent={Header}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.grid}
          ListEmptyComponent={
            <Text style={styles.empty}>No public galleries yet</Text>
          }
          renderItem={({ item }) =>
            <GalleryCard
              gallery={item}
              onPress={() => navigation.navigate('GalleryDetail', {
                galleryId: item.id,
                galleryTitle: item.title,
              })}
              currentUserId={session?.user.id}
              friendIds={friendIds}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const AVATAR_SIZE = 88;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
  },
  backButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 32, color: '#FF6B6B', lineHeight: 36, fontWeight: '300' },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#111827', textAlign: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  profileSection: { alignItems: 'center', paddingTop: 12, paddingBottom: 24, paddingHorizontal: 16 },
  avatar: { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2 },
  avatarPlaceholder: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: '#FF6B6B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { color: '#fff', fontSize: 32, fontWeight: '700' },
  username: { marginTop: 12, fontSize: 20, fontWeight: '800', color: '#111827', letterSpacing: -0.3 },
  bio: { marginTop: 6, fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 20, paddingHorizontal: 24 },
  galleriesLabel: { marginTop: 20, alignSelf: 'flex-start' },
  galleriesLabelText: { fontSize: 13, fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.5 },

  grid: { paddingHorizontal: 16, paddingBottom: 32, gap: CARD_GAP },
  row: { gap: CARD_GAP },
  empty: { textAlign: 'center', color: '#9CA3AF', fontSize: 14, paddingTop: 24 },
});
