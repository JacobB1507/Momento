import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import {
  getFriends,
  getPendingRequests,
  respondToFriendRequest,
  removeFriend,
} from '../lib/friends';

type Profile = { id: string; username: string | null; avatar_url: string | null };
type FriendItem = { friendshipId: string; profile: Profile };
type PendingItem = { friendshipId: string; profile: Profile };

const AVATAR = 40;
const COLLAPSED_COUNT = 2;

export default function FriendsScreen() {
  const navigation = useNavigation();
  const { session } = useAuth();
  const userId = session?.user.id ?? '';

  const [friends, setFriends] = useState<FriendItem[]>([]);
  const [pending, setPending] = useState<PendingItem[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requestsExpanded, setRequestsExpanded] = useState(false);

  const loadData = async () => {
    if (!userId) return;

    const [friendProfiles, pendingRequests] = await Promise.all([
      getFriends(userId),
      getPendingRequests(userId),
    ]);

    // getFriends returns profiles only; fetch row IDs in parallel to enable removal
    const { data: friendRows } = await supabase
      .from('friends')
      .select('id, sender_id, receiver_id')
      .eq('status', 'accepted')
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

    const friendsWithIds: FriendItem[] = (friendProfiles as Profile[]).map((profile) => {
      const row = friendRows?.find(
        (r) => r.sender_id === profile.id || r.receiver_id === profile.id,
      );
      return { friendshipId: row?.id ?? '', profile };
    });

    setFriends(friendsWithIds);
    setPending(pendingRequests as PendingItem[]);
  };

  useFocusEffect(
    useCallback(() => {
      loadData().finally(() => setInitialLoading(false));
    }, []),
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleRemove = (friendshipId: string, username: string | null) => {
    Alert.alert(
      'Remove Friend',
      `Remove ${username ? '@' + username : 'this person'} from your friends?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const ok = await removeFriend(friendshipId);
            if (ok) await loadData();
            else Alert.alert('Error', 'Could not remove friend. Please try again.');
          },
        },
      ],
    );
  };

  const handleRespond = async (friendshipId: string, accept: boolean) => {
    const ok = await respondToFriendRequest(friendshipId, accept);
    if (ok) await loadData();
    else Alert.alert('Error', 'Could not update request. Please try again.');
  };

  const visibleRequests =
    requestsExpanded ? pending : pending.slice(0, COLLAPSED_COUNT);
  const hasMore = pending.length > COLLAPSED_COUNT;

  if (initialLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Text style={styles.backText}>‹ Back</Text>
          </Pressable>
          <View style={styles.headerRow}>
            <Text style={styles.headerTitle}>Friends</Text>
          </View>
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
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Friends</Text>
          <Pressable
            onPress={() => navigation.navigate('AddFriend' as never)}
            style={({ pressed }) => [styles.addButton, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.addButtonText}>+ Add</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Section 1 — Friend Requests */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionLabel}>Friend Requests</Text>
          <Text style={styles.sectionCount}>({pending.length})</Text>
        </View>

        {pending.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No pending requests</Text>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              {visibleRequests.map(({ friendshipId, profile }, index) => (
                <View key={friendshipId}>
                  {index > 0 && <View style={styles.separator} />}
                  <View style={styles.row}>
                    <AvatarThumb profile={profile} />
                    <Text style={[styles.rowUsername, styles.rowUsernameFlex]} numberOfLines={1}>
                      @{profile.username ?? 'unknown'}
                    </Text>
                    <Pressable
                      onPress={() => handleRespond(friendshipId, true)}
                      style={({ pressed }) => [styles.acceptButton, pressed && { opacity: 0.7 }]}
                    >
                      <Text style={styles.acceptText}>Accept</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handleRespond(friendshipId, false)}
                      style={({ pressed }) => [styles.declineButton, pressed && { opacity: 0.7 }]}
                    >
                      <Text style={styles.declineText}>Decline</Text>
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>

            {hasMore && (
              <Pressable
                onPress={() => setRequestsExpanded((v) => !v)}
                style={({ pressed }) => [styles.expandLink, pressed && { opacity: 0.6 }]}
              >
                <Text style={styles.expandLinkText}>
                  {requestsExpanded
                    ? 'Show less'
                    : `See all ${pending.length} requests`}
                </Text>
              </Pressable>
            )}
          </>
        )}

        {/* Section 2 — Friends list */}
        <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>Friends</Text>

        {friends.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No friends yet. Tap + Add to get started.</Text>
          </View>
        ) : (
          <View style={styles.card}>
            {friends.map(({ friendshipId, profile }, index) => (
              <View key={friendshipId}>
                {index > 0 && <View style={styles.separator} />}
                <View style={styles.row}>
                  <AvatarThumb profile={profile} />
                  <Text style={[styles.rowUsername, styles.rowUsernameFlex]} numberOfLines={1}>
                    @{profile.username ?? 'unknown'}
                  </Text>
                  <Pressable
                    onPress={() => handleRemove(friendshipId, profile.username)}
                    style={({ pressed }) => [styles.removeButton, pressed && { opacity: 0.7 }]}
                  >
                    <Text style={styles.removeText}>Remove</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function AvatarThumb({ profile }: { profile: Pick<Profile, 'username' | 'avatar_url'> }) {
  const letter = (profile.username ?? '?').charAt(0).toUpperCase();
  if (profile.avatar_url) {
    return <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />;
  }
  return (
    <View style={styles.avatarPlaceholder}>
      <Text style={styles.avatarLetter}>{letter}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F9FAFB' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },
  backButton: { alignSelf: 'flex-start', paddingVertical: 6, marginBottom: 4 },
  backText: { fontSize: 16, color: '#FF6B6B', fontWeight: '500' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#111827', letterSpacing: -0.5 },
  addButton: {
    backgroundColor: '#FF6B6B',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  addButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  content: { paddingHorizontal: 16, paddingBottom: 32 },

  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionCount: {
    fontSize: 13,
    fontWeight: '500',
    color: '#9CA3AF',
  },
  sectionLabelSpaced: { marginTop: 28, marginBottom: 8 },

  expandLink: { marginTop: 8, alignSelf: 'flex-start' },
  expandLinkText: { fontSize: 14, color: '#3B82F6', fontWeight: '500' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 24,
    paddingHorizontal: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyText: { color: '#9CA3AF', fontSize: 14 },

  separator: { height: 1, backgroundColor: '#F3F4F6', marginLeft: 64 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 10,
  },

  avatarImage: { width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2 },
  avatarPlaceholder: {
    width: AVATAR,
    height: AVATAR,
    borderRadius: AVATAR / 2,
    backgroundColor: '#FF6B6B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { color: '#fff', fontSize: 16, fontWeight: '700' },

  rowUsername: { fontSize: 15, color: '#111827', fontWeight: '500' },
  rowUsernameFlex: { flex: 1 },

  removeButton: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  removeText: { color: '#6B7280', fontSize: 13, fontWeight: '500' },

  acceptButton: {
    backgroundColor: '#34C759',
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  acceptText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  declineButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  declineText: { color: '#fff', fontSize: 13, fontWeight: '600' },
});
