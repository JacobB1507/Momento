import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { sendFriendRequest, getMutualFriends, removeFriend } from '../lib/friends';
import { createConversation, requestMessagePermission } from '../lib/messages';
import { GalleryCard } from '../components/GalleryCard';
import ProfileActionButtons from '../components/ProfileActionButtons';
import MutualFriendsModal from '../components/MutualFriendsModal';
import type { RootStackParamList } from '../navigation/types';
import type { Gallery } from '../types/database';
import styles, { AVATAR_SIZE } from '../styles/friendProfileStyles';

type NavProp = NativeStackNavigationProp<RootStackParamList, 'FriendProfile'>;
type RouteProps = RouteProp<RootStackParamList, 'FriendProfile'>;

export default function FriendProfileScreen() {
  const navigation = useNavigation<NavProp>();
  const route = useRoute<RouteProps>();
  const { userId, username } = route.params;
  const { session } = useAuth();
  const currentUserId = session?.user?.id ?? '';

  const [profileUsername, setProfileUsername] = useState(username);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [bio, setBio] = useState<string | null>(null);
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [friendIds, setFriendIds] = useState<string[]>([]);
  const [friendCount, setFriendCount] = useState(0);
  const [isFriend, setIsFriend] = useState(false);
  const [hasPendingRequest, setHasPendingRequest] = useState(false);
  const [mutuals, setMutuals] = useState<any[]>([]);
  const [showMutualsModal, setShowMutualsModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [profileRes, ownedRes, membershipsRes, statusRes, myFriendsRes] =
        await Promise.all([
          supabase.from('profiles').select('username, avatar_url, bio, display_name').eq('id', userId).single(),
          supabase.from('galleries').select('*').eq('created_by', userId).order('created_at', { ascending: false }),
          supabase.from('gallery_members').select('gallery_id').eq('user_id', userId),
          supabase.from('friends').select('id, status, sender_id')
            .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${currentUserId})`)
            .maybeSingle(),
          supabase.from('friends').select('sender_id, receiver_id')
            .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
            .eq('status', 'accepted'),
        ]);

      if (profileRes.data) {
        setProfileUsername(profileRes.data.username ?? username);
        setDisplayName(profileRes.data.display_name ?? null);
        setAvatarUrl(profileRes.data.avatar_url ?? null);
        setBio(profileRes.data.bio ?? null);
      }

      const memberIds = (membershipsRes.data ?? []).map((m: any) => m.gallery_id);
      const { data: collab } = memberIds.length > 0
        ? await supabase.from('galleries').select('*').in('id', memberIds).neq('created_by', userId)
        : { data: [] };
      const all = [...(ownedRes.data ?? []), ...(collab ?? [])];
      setGalleries(all.filter((g, i, arr) => arr.findIndex((x: any) => x.id === g.id) === i));

      const fr = statusRes.data;
      if (fr) {
        setIsFriend(fr.status === 'accepted');
        setHasPendingRequest(fr.status === 'pending' && fr.sender_id === currentUserId);
      }
      const { count: friendsCount } = await supabase
        .from('friends')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'accepted')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
      setFriendCount(friendsCount ?? 0);
      setFriendIds(
        (myFriendsRes.data ?? []).map((r: any) =>
          r.sender_id === currentUserId ? r.receiver_id : r.sender_id
        )
      );
      const m = await getMutualFriends(currentUserId, userId);
      setMutuals(m);
      setLoading(false);
    };
    load();
  }, [userId, currentUserId]);

  const handleFriendPress = async () => {
    const result = await sendFriendRequest(currentUserId, profileUsername);
    if (result === 'sent') setHasPendingRequest(true);
    else if (result === 'already_friends') setIsFriend(true);
  };

  const handleMessagePress = async () => {
    if (!isFriend) {
      try { await requestMessagePermission(currentUserId, userId); } catch {}
      Alert.alert('Message request sent', 'Your message request has been sent.');
      return;
    }
    try {
      const convo = await createConversation(currentUserId, userId);
      navigation.navigate('Chat', { conversationId: convo.id, otherUserId: userId, otherUsername: profileUsername });
    } catch {}
  };

  const letter = profileUsername.charAt(0).toUpperCase();

  const ListHeader = (
    <View>
      <View style={styles.profileSection}>
        {avatarUrl
          ? <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
          : <View style={[styles.avatarPlaceholder, { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2 }]}>
              <Text style={styles.avatarLetter}>{letter}</Text>
            </View>
        }
        {displayName ? <Text style={styles.displayName}>{displayName}</Text> : null}

        {!!bio && <Text style={styles.bio}>{bio}</Text>}
      </View>
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{galleries.length}</Text>
          <Text style={styles.statLabel}>Galleries</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{friendCount}</Text>
          <Text style={styles.statLabel}>Friends</Text>
        </View>
        <View style={styles.statDivider} />
        <Pressable style={styles.statItem} onPress={() => setShowMutualsModal(true)}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Text style={styles.statNumber}>{mutuals.length}</Text>
            {mutuals.length > 0 && (
              <View style={{ flexDirection: 'row', marginLeft: 2 }}>
                {mutuals.slice(0, 3).map((m, i) => (
                  m.avatar_url
                    ? <Image key={m.id} source={{ uri: m.avatar_url }} style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: '#fff', marginLeft: i === 0 ? 0 : -6 }} />
                    : <View key={m.id} style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: '#fff', marginLeft: i === 0 ? 0 : -6, backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 8, fontWeight: '700', color: '#9ca3af' }}>{(m.display_name || m.username)?.[0]?.toUpperCase()}</Text>
                      </View>
                ))}
              </View>
            )}
          </View>
          <Text style={styles.statLabel}>Mutual</Text>
        </Pressable>
      </View>
      <ProfileActionButtons
        userId={userId}
        currentUserId={currentUserId}
        isFriend={isFriend}
        hasPendingRequest={hasPendingRequest}
        onFriendPress={handleFriendPress}
        onMessagePress={handleMessagePress}
      />
      <View style={styles.galleriesSection}>
        <Text style={styles.galleriesSectionTitle}>Galleries</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backButton}>
          <Text style={styles.backIcon}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>@{profileUsername}</Text>
        <TouchableOpacity onPress={() => setShowMenu(v => !v)} hitSlop={12} style={styles.backButton}>
          <Ionicons name="ellipsis-horizontal" size={22} color="#111827" />
        </TouchableOpacity>
      </View>
      {showMenu && (
        <>
          <TouchableOpacity style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }} onPress={() => setShowMenu(false)} activeOpacity={1} />
          <View style={{ position: 'absolute', top: 56, right: 16, backgroundColor: '#1a1a1a', borderRadius: 12, zIndex: 999, minWidth: 180, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 8 }}>
            {isFriend && (
              <Pressable
                style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 }}
                onPress={() => {
                  setShowMenu(false);
                  Alert.alert(
                    'Remove Friend',
                    `Remove ${displayName || profileUsername} as a friend?`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Remove',
                        style: 'destructive',
                        onPress: async () => {
                          const { data: row } = await supabase
                            .from('friends')
                            .select('id')
                            .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${currentUserId})`)
                            .eq('status', 'accepted')
                            .maybeSingle();
                          if (row) await removeFriend(row.id);
                          setIsFriend(false);
                          setShowMenu(false);
                        },
                      },
                    ],
                  );
                }}
              >
                <Text style={{ color: '#ef4444', fontSize: 15, fontWeight: '500' }}>Remove Friend</Text>
              </Pressable>
            )}
            <Pressable
              style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 }}
              onPress={() => setShowMenu(false)}
            >
              <Text style={{ color: '#9ca3af', fontSize: 15, fontWeight: '500' }}>Cancel</Text>
            </Pressable>
          </View>
        </>
      )}
      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#FF6B6B" /></View>
      ) : (
        <FlatList
          data={galleries}
          keyExtractor={item => item.id}
          numColumns={2}
          ListHeaderComponent={ListHeader}
          columnWrapperStyle={styles.galleryRow}
          contentContainerStyle={styles.galleryGrid}
          ListEmptyComponent={<Text style={styles.galleryEmpty}>No galleries yet</Text>}
          renderItem={({ item }) => (
            <GalleryCard
              gallery={item}
              onPress={() => navigation.navigate('GalleryDetail', { galleryId: item.id, galleryTitle: item.title })}
              currentUserId={currentUserId}
              friendIds={friendIds}
            />
          )}
        />
      )}
      <MutualFriendsModal
        visible={showMutualsModal}
        onClose={() => setShowMutualsModal(false)}
        mutuals={mutuals}
        currentUserId={currentUserId}
        onFriendRequestSent={() => {}}
      />
    </SafeAreaView>
  );
}
